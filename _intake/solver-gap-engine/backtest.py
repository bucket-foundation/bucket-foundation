import argparse, json, pathlib, re, subprocess, sys
import numpy as np
from sentence_transformers import SentenceTransformer

MODEL = "all-MiniLM-L6-v2"
PAT = re.compile(r'(/--(?P<doc>(?:(?!-/).)*?)-/\s*)?@\[category research (?P<st>open|solved)(?P<tags>[^\]]*)\]\s*(?:theorem|lemma)\s+(?P<name>\S+)', re.S)
ROOT = "FormalConjectures/"


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True).stdout


def snapshot(repo, commit):
    names = [n for n in git(repo, "ls-tree", "-r", "--name-only", commit, ROOT).decode().split("\n") if n.endswith(".lean")]
    feed = "".join(f"{commit}:{n}\n" for n in names).encode()
    raw = subprocess.run(["git", "-C", repo, "cat-file", "--batch"], input=feed, check=True, capture_output=True).stdout
    rows, pos = {}, 0
    for n in names:
        end = raw.index(b"\n", pos)
        size = int(raw[pos:end].split()[2])
        text = raw[end + 1:end + 1 + size].decode(errors="ignore")
        pos = end + 2 + size
        rel = n[len(ROOT):]
        for m in PAT.finditer(text):
            rows[f"{rel}::{m['name']}"] = {"status": m["st"], "file": rel, "collection": rel.split("/")[0], "ams": " ".join(re.findall(r"AMS ([0-9 ]+)", m["tags"])).split(),
                                           "lean_proof": "formal_proof" in m["tags"], "text": " ".join((m["doc"] or "").split())[:1200]}
    return rows


def auc(scores, labels):
    scores, labels = np.asarray(scores, float), np.asarray(labels, bool)
    pos, neg = scores[labels], scores[~labels]
    if len(pos) == 0 or len(neg) == 0:
        return None
    order = np.argsort(np.concatenate([pos, neg]), kind="mergesort")
    allv = np.concatenate([pos, neg])[order]
    ranks = np.empty(len(allv))
    i = 0
    while i < len(allv):
        j = i
        while j + 1 < len(allv) and allv[j + 1] == allv[i]:
            j += 1
        ranks[i:j + 1] = (i + j) / 2 + 1
        i = j + 1
    back = np.empty(len(allv))
    back[order] = ranks
    return float((back[:len(pos)].sum() - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg)))


def interval(scores, labels, rng, n=2000):
    scores, labels = np.asarray(scores, float), np.asarray(labels, bool)
    vals = []
    for _ in range(n):
        idx = rng.integers(0, len(scores), len(scores))
        a = auc(scores[idx], labels[idx])
        if a is not None:
            vals.append(a)
    return [round(float(np.percentile(vals, 2.5)), 3), round(float(np.percentile(vals, 97.5)), 3)]


def permutation_p(scores, labels, rng, n=5000):
    labels = np.asarray(labels, bool)
    seen = auc(scores, labels)
    hits = sum(auc(scores, rng.permutation(labels)) >= seen for _ in range(n))
    return round((hits + 1) / (n + 1), 4)


def stratified_auc(scores, labels, groups):
    num = den = 0.0
    for g in set(groups):
        idx = [i for i, x in enumerate(groups) if x == g]
        s, l = np.asarray(scores)[idx], np.asarray(labels, bool)[idx]
        a = auc(s, l)
        if a is None:
            continue
        w = l.sum() * (~l).sum()
        num += a * w
        den += w
    return round(num / den, 3) if den else None


def run(repo, model, date, head_rows, head, rng):
    commit = git(repo, "rev-list", "-1", f"--before={date}", head).decode().strip()
    rows = snapshot(repo, commit)
    ids = [i for i, r in rows.items() if len(r["text"]) > 30]
    emb = model.encode([rows[i]["text"] for i in ids], normalize_embeddings=True, batch_size=64)
    op = [k for k, i in enumerate(ids) if rows[i]["status"] == "open"]
    so = np.array([k for k, i in enumerate(ids) if rows[i]["status"] == "solved"])
    sims = emb[op] @ emb[so].T
    so_files = np.array([rows[ids[k]]["file"] for k in so])
    items, gone = [], 0
    for n, k in enumerate(op):
        pid = ids[k]
        later = head_rows.get(pid)
        if later is None:
            gone += 1
            continue
        cross = np.where(so_files == rows[pid]["file"], -1.0, sims[n])
        items.append({"id": pid, "score": float(cross.max()), "any_score": float(sims[n].max()), "length": len(rows[pid]["text"]),
                      "collection": rows[pid]["collection"], "solved_later": later["status"] == "solved",
                      "lean_proof_later": later["status"] == "solved" and later["lean_proof"]})
    s = [x["score"] for x in items]
    y = [x["solved_later"] for x in items]
    groups = [x["collection"] for x in items]
    base = float(np.mean(y))
    ranked = sorted(items, key=lambda x: -x["score"])
    out = {"date": date, "commit": commit[:7], "problems": len(rows), "open": len(op), "solved": int(len(so)), "open_missing_at_head": gone,
           "tracked": len(items), "solved_later": int(sum(y)), "base_rate": round(base, 4),
           "auc": round(auc(s, y), 3), "auc_ci95": interval(s, y, rng), "p_permutation": permutation_p(s, y, rng),
           "auc_within_collection": stratified_auc(s, y, groups),
           "auc_any_file": round(auc([x["any_score"] for x in items], y), 3),
           "auc_docstring_length": round(auc([x["length"] for x in items], y), 3),
           "top": {str(k): {"solved_later": int(sum(x["solved_later"] for x in ranked[:k])), "precision": round(float(np.mean([x["solved_later"] for x in ranked[:k]])), 3),
                            "lift": round(float(np.mean([x["solved_later"] for x in ranked[:k]])) / base, 2) if base else None} for k in (25, 50, 100) if k <= len(ranked)},
           "by_collection": {}}
    for g in sorted(set(groups)):
        sub = [x for x in items if x["collection"] == g]
        a = auc([x["score"] for x in sub], [x["solved_later"] for x in sub])
        out["by_collection"][g] = {"tracked": len(sub), "solved_later": int(sum(x["solved_later"] for x in sub)), "auc": round(a, 3) if a is not None else None}
    return out, items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--head", default="HEAD")
    ap.add_argument("--dates", nargs="+", default=["2025-09-01", "2025-12-01", "2026-03-01", "2026-06-01"])
    ap.add_argument("--out", default="backtest")
    a = ap.parse_args()
    head = git(a.repo, "rev-parse", a.head).decode().strip()
    head_rows = snapshot(a.repo, head)
    model = SentenceTransformer(MODEL)
    rng = np.random.default_rng(0)
    out = pathlib.Path(a.out)
    out.mkdir(exist_ok=True)
    results = []
    for d in a.dates:
        res, items = run(a.repo, model, d, head_rows, head, rng)
        results.append(res)
        (out / f"items-{d}.jsonl").write_text("\n".join(json.dumps(x) for x in items))
        print(json.dumps({k: v for k, v in res.items() if k != "by_collection"}), file=sys.stderr)
    json.dump({"model": MODEL, "head": head[:7], "head_date": git(a.repo, "show", "-s", "--format=%cs", head).decode().strip(), "snapshots": results},
              open(out / "backtest.json", "w"), indent=1)


if __name__ == "__main__":
    main()
