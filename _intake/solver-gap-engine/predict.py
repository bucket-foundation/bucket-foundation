import argparse, json, pathlib, re
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from backtest import MODEL, auc, git, interval, permutation_p, snapshot

WORDS = ["proved", "proven", "showed", "shown", "known", "improved", "bound", "conjecture", "counterexample", "arxiv", "disproved", "true", "false"]
COLLECTIONS = ["ErdosProblems", "Wikipedia", "GreensOpenProblems", "Paper", "OEIS", "Arxiv", "Mathoverflow", "WrittenOnTheWallII", "Books", "OpenQuantumProblems"]
NAMES = (["gap_score", "any_file_score", "log_length", "solved_siblings", "open_siblings", "solved_sibling_share", "is_variant", "years_2020s", "ams_count"]
         + [f"word_{w}" for w in WORDS] + [f"in_{c}" for c in COLLECTIONS])


def features(repo, model, commit):
    rows = snapshot(repo, commit)
    ids = [i for i, r in rows.items() if len(r["text"]) > 30]
    emb = model.encode([rows[i]["text"] for i in ids], normalize_embeddings=True, batch_size=64)
    op = [k for k, i in enumerate(ids) if rows[i]["status"] == "open"]
    so = np.array([k for k, i in enumerate(ids) if rows[i]["status"] == "solved"])
    sims = emb[op] @ emb[so].T
    so_files = np.array([rows[ids[k]]["file"] for k in so])
    solved_in, open_in = {}, {}
    for r in rows.values():
        d = solved_in if r["status"] == "solved" else open_in
        d[r["file"]] = d.get(r["file"], 0) + 1
    out = {}
    for n, k in enumerate(op):
        pid = ids[k]
        r = rows[pid]
        text = r["text"].lower()
        s, o = solved_in.get(r["file"], 0), open_in.get(r["file"], 0) - 1
        cross = np.where(so_files == r["file"], -1.0, sims[n])
        vec = [float(cross.max()), float(sims[n].max()), float(np.log(len(text))), float(np.log1p(s)), float(np.log1p(o)), s / (s + o) if s + o else 0.0,
               float(".variants." in pid or ".parts." in pid), float(len(re.findall(r"\b20[2-9]\d\b|\[[A-Za-z]+2\d\w?\]", r["text"]))), float(len(r.get("ams", [])))]
        vec += [float(w in text) for w in WORDS] + [float(r["collection"] == c) for c in COLLECTIONS]
        out[pid] = {"x": vec, "text": r["text"], "collection": r["collection"]}
    return out


def labelled(feats, later):
    ids = [i for i in feats if i in later]
    return ids, np.array([feats[i]["x"] for i in ids]), np.array([later[i]["status"] == "solved" for i in ids])


def fit(x, y):
    return make_pipeline(StandardScaler(), LogisticRegression(C=0.3, max_iter=2000, class_weight="balanced")).fit(x, y)


def top(scores, y, k):
    order = np.argsort(-scores)[:k]
    return {"solved_later": int(y[order].sum()), "precision": round(float(y[order].mean()), 3), "lift": round(float(y[order].mean() / y.mean()), 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--train", default="2025-12-01")
    ap.add_argument("--test", default="2026-06-01")
    ap.add_argument("--out", default="backtest")
    ap.add_argument("--head", default="HEAD")
    a = ap.parse_args()
    at = lambda d: git(a.repo, "rev-list", "-1", f"--before={d}", a.head).decode().strip()
    model = SentenceTransformer(MODEL)
    rng = np.random.default_rng(0)
    head = git(a.repo, "rev-parse", a.head).decode().strip()
    f_train, f_test, f_head = features(a.repo, model, at(a.train)), features(a.repo, model, at(a.test)), features(a.repo, model, head)
    test_rows, head_rows = snapshot(a.repo, at(a.test)), snapshot(a.repo, head)
    _, xtr, ytr = labelled(f_train, test_rows)
    ids_te, xte, yte = labelled(f_test, head_rows)
    clf = fit(xtr, ytr)
    p = clf.predict_proba(xte)[:, 1]
    gap = xte[:, 0]
    length = xte[:, 2]
    coef = clf[-1].coef_[0]
    res = {"model": MODEL, "train": {"snapshot": a.train, "labels_at": a.test, "n": int(len(ytr)), "solved_later": int(ytr.sum())},
           "test": {"snapshot": a.test, "labels_at": git(a.repo, "show", "-s", "--format=%cs", head).decode().strip(), "n": int(len(yte)), "solved_later": int(yte.sum()), "base_rate": round(float(yte.mean()), 4)},
           "auc": {"model": round(auc(p, yte), 3), "model_ci95": interval(p, yte, rng), "model_p": permutation_p(p, yte, rng),
                   "gap_score": round(auc(gap, yte), 3), "docstring_length": round(auc(length, yte), 3)},
           "top": {str(k): {"model": top(p, yte, k), "gap_score": top(gap, yte, k)} for k in (25, 50, 100)},
           "coefficients": sorted(([n, round(float(c), 3)] for n, c in zip(NAMES, coef)), key=lambda t: -abs(t[1]))}
    out = pathlib.Path(a.out)
    out.mkdir(exist_ok=True)
    json.dump(res, open(out / "predict.json", "w"), indent=1)
    (out / "predict-test.jsonl").write_text("\n".join(json.dumps({"id": i, "p": round(float(q), 4), "gap_score": round(float(g), 3), "solved_later": bool(l)}) for i, q, g, l in zip(ids_te, p, gap, yte)))
    final = fit(np.vstack([xtr, xte]), np.concatenate([ytr, yte]))
    ids_h = list(f_head)
    ph = final.predict_proba(np.array([f_head[i]["x"] for i in ids_h]))[:, 1]
    ranked = sorted(zip(ids_h, ph), key=lambda t: -t[1])
    json.dump([{"rank": n, "id": i, "score": round(float(q), 4), "gap_score": round(f_head[i]["x"][0], 3), "collection": f_head[i]["collection"], "text": f_head[i]["text"]}
               for n, (i, q) in enumerate(ranked, 1)], open(out / "candidates-head.json", "w"), indent=1)
    print(json.dumps({k: res[k] for k in ("train", "test", "auc", "top")}, indent=1))
    print(res["coefficients"][:12])


if __name__ == "__main__":
    main()
