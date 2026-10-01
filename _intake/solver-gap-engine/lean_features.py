import argparse, json, pathlib, re, subprocess
import numpy as np
from backtest import PAT, ROOT, auc, git, interval, permutation_p, snapshot

OPENERS, CLOSERS = "([{⟨", ")]}⟩"
DECL = re.compile(r"^(?:@\[[^\]]*\]\s*)?(?:noncomputable\s+|private\s+|protected\s+|scoped\s+)*(?:def|abbrev|structure|class|inductive|instance|notation|local notation)\s+(?P<name>[^\s(:\[{]+)(?P<body>.*?)(?=\n\s*\n|\Z)", re.S | re.M)
IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_'!?]*(?:\.[A-Za-z_][A-Za-z0-9_'!?]*)*")
KEYWORDS = {"fun", "let", "in", "if", "then", "else", "by", "sorry", "answer", "True", "False", "have", "show", "from", "at", "with", "do", "match", "type_of"}
ASYMPTOTIC = re.compile(r"=O\[|=o\[|~\[|=Θ\[|atTop|atBot|Tendsto|∀ᶠ|∃ᶠ|≫|≪|IsBigO|IsLittleO|IsTheta|limsup|liminf|𝓝|HasDensity|Density|Asymptotics")
LET = re.compile(r"(?:letI?|haveI?)\s")
NAMES = ["log_statement_length", "log_tokens", "universal", "existential", "alternation_depth", "explicit_binders", "answer_sorry", "answer_fixed", "nat_fin_only", "mentions_real",
         "mentions_set", "asymptotic", "numeric_literals", "log_max_literal", "distinct_identifiers", "mathlib_identifiers", "local_definitions", "bare_definition", "iff", "negated",
         "set_finiteness", "bounded_quantifiers", "type_of"]


def read(repo, commit):
    names = [n for n in git(repo, "ls-tree", "-r", "--name-only", commit, ROOT).decode().split("\n") if n.endswith(".lean")]
    raw = subprocess.run(["git", "-C", repo, "cat-file", "--batch"], input="".join(f"{commit}:{n}\n" for n in names).encode(), check=True, capture_output=True).stdout
    pos = 0
    for n in names:
        end = raw.index(b"\n", pos)
        size = int(raw[pos:end].split()[2])
        yield n[len(ROOT):], raw[end + 1:end + 1 + size].decode(errors="ignore")
        pos = end + 2 + size


def cut(text, start):
    depth = lets = 0
    i = start
    while i < len(text):
        c = text[i]
        if c in OPENERS:
            depth += 1
        elif c in CLOSERS:
            depth -= 1
        elif c in "lh" and LET.match(text, i) and not (text[i - 1].isalnum() or text[i - 1] in "_."):
            lets += 1
        elif text.startswith(":=", i):
            if lets:
                lets -= 1
            elif depth <= 0:
                return text[start:i], text[i + 2:i + 400]
            i += 1
        elif text.startswith("\n\n@[", i) or text.startswith("\n\n/--", i):
            break
        i += 1
    return text[start:i], ""


def split_binders(stmt):
    depth = 0
    for i, c in enumerate(stmt):
        if c in OPENERS:
            depth += 1
        elif c in CLOSERS:
            depth -= 1
        elif c == ":" and depth == 0 and stmt[i:i + 2] != ":=":
            return stmt[:i], stmt[i + 1:]
    return "", stmt


def binder_types(binders):
    out, depth, start = [], 0, 0
    for i, c in enumerate(binders):
        if c in OPENERS:
            if depth == 0:
                start = i
            depth += 1
        elif c in CLOSERS:
            depth -= 1
            if depth == 0:
                inner = binders[start + 1:i]
                if ":" in inner:
                    names, kind = inner.split(":", 1)
                    out.append((names.split(), " ".join(kind.split()), binders[start]))
    return out


def namespace(text, upto):
    stack = []
    for m in re.finditer(r"^(namespace|end)\s+([\w.'«»]+)\s*$", text[:upto], re.M):
        if m[1] == "namespace":
            stack.append(m[2])
        elif stack and stack[-1] == m[2]:
            stack.pop()
    return ".".join(stack)


def statements(repo, commit):
    rows = {}
    for rel, text in read(repo, commit):
        local = {m["name"].split(".")[-1]: " ".join(m["body"].split()) for m in DECL.finditer(text)}
        for m in PAT.finditer(text):
            stmt, tail = cut(text, m.end())
            ns = namespace(text, m.start())
            rows[f"{rel}::{m['name']}"] = {"status": m["st"], "file": rel, "name": m["name"], "namespace": ns, "statement": " ".join(stmt.split()),
                                           "stub": bool(re.match(r"\s*(?:by\s+)?sorry\b", tail)), "local": local}
    return rows


def quantifier_trace(binders, body):
    trace = ["A"] * len([k for names, kind, br in binder_types(binders) if br == "(" and not kind.startswith(("0 <", "¬")) for k in names])
    for m in re.finditer(r"∀ᶠ|∃ᶠ|∃!|∀|∃", body):
        trace.append("A" if m[0].startswith("∀") else "E")
    return trace


def lean_vector(row):
    stmt = row["statement"]
    binders, body = split_binders(stmt)
    trace = quantifier_trace(binders, body)
    alternation = sum(a != b for a, b in zip(trace, trace[1:])) + bool(trace)
    idents = {t for t in IDENT.findall(stmt) if t not in KEYWORDS}
    bound = {n for names, _, _ in binder_types(binders) for n in names} | set(re.findall(r"(?:∀|∃|fun|λ|∑|∏)\s*\(?\s*([A-Za-z_][\w']*)", body))
    used_local = {t for t in idents if t.split(".")[-1] in row["local"] or t.split(".")[0] in row["local"]}
    mathlib = {t for t in idents - used_local - bound if "." in t or t[0].isupper() or len(t) > 3}
    literals = [int(x) for x in re.findall(r"(?<![\w.])\d+(?![\w.]*\w)", stmt)]
    kinds = " ".join(kind for _, kind, _ in binder_types(binders)) + " " + " ".join(re.findall(r":\s*([^,)]+)", body))
    unbounded_other = bool(re.search(r"ℝ|ℂ|ℚ|\bSet\b|\bType\b|\bReal\b|→", kinds)) or bool(re.search(r"ℝ|ℂ|ℚ", stmt))
    return [float(np.log1p(len(stmt))), float(np.log1p(len(stmt.split()))), float(trace.count("A")), float(trace.count("E")), float(alternation),
            float(len(binder_types(binders))), float("answer(sorry)" in stmt), float(bool(re.search(r"answer\((?:True|False)\)", stmt))),
            float(bool(re.search(r"ℕ|\bFin\b|\bNat\b", stmt)) and not unbounded_other), float(bool(re.search(r"ℝ|\bReal\b", stmt))), float(bool(re.search(r"\bSet\b|\{[^{}]*\|", stmt))),
            float(bool(ASYMPTOTIC.search(stmt))), float(np.log1p(len(literals))), float(np.log10(1 + max(literals, default=0))), float(np.log1p(len(idents))),
            float(np.log1p(len(mathlib))), float(len(used_local)), float(len(body.split()) <= 3 and bool(used_local)), float("↔" in body), float(body.strip().startswith("¬")),
            float(bool(re.search(r"\.Infinite\b|\.Finite\b|Set\.Infinite|Set\.Finite", stmt))), float(len(re.findall(r"[∀∃]\s*\(?\s*[\w' ]+\s*(?:∈|<|≤)", stmt))), float("type_of%" in stmt)]


def top(scores, y, k):
    order = np.argsort(-np.asarray(scores), kind="mergesort")[:k]
    return {"solved_later": int(y[order].sum()), "precision": round(float(y[order].mean()), 3), "lift": round(float(y[order].mean() / y.mean()), 2)}


def report(p, y, seed=0):
    rng = np.random.default_rng(seed)
    return {"auc": round(auc(p, y), 3), "ci95": interval(p, y, rng), "p_permutation": permutation_p(p, y, rng), "top": {str(k): top(p, y, k) for k in (25, 50, 100)}}


def paired_gain(a, b, y, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        u, v = auc(a[idx], y[idx]), auc(b[idx], y[idx])
        if u is not None:
            vals.append(u - v)
    return {"gain": round(auc(a, y) - auc(b, y), 3), "ci95": [round(float(np.percentile(vals, 2.5)), 3), round(float(np.percentile(vals, 97.5)), 3)]}


def main():
    from sentence_transformers import SentenceTransformer
    from backtest import MODEL
    from predict import NAMES as META, features, fit
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--train", default="2025-12-01")
    ap.add_argument("--test", default="2026-06-01")
    ap.add_argument("--out", default="backtest")
    ap.add_argument("--head", default="HEAD")
    a = ap.parse_args()
    at = lambda d: git(a.repo, "rev-list", "-1", f"--before={d}", a.head).decode().strip()
    head = git(a.repo, "rev-parse", a.head).decode().strip()
    model = SentenceTransformer(MODEL)
    c_train, c_test = at(a.train), at(a.test)
    meta = {c: features(a.repo, model, c) for c in (c_train, c_test)}
    lean = {c: statements(a.repo, c) for c in (c_train, c_test)}
    later = {c_train: snapshot(a.repo, c_test), c_test: snapshot(a.repo, head)}

    def table(c):
        ids = [i for i in meta[c] if i in later[c] and i in lean[c]]
        return ids, np.array([meta[c][i]["x"] for i in ids]), np.array([lean_vector(lean[c][i]) for i in ids]), np.array([later[c][i]["status"] == "solved" for i in ids])

    _, mtr, ltr, ytr = table(c_train)
    ids, mte, lte, yte = table(c_test)
    sets = {"metadata": (mtr, mte), "lean": (ltr, lte), "metadata_plus_lean": (np.hstack([mtr, ltr]), np.hstack([mte, lte]))}
    scores, models, coefs = {}, {}, {}
    for name, (xtr, xte) in sets.items():
        clf = fit(xtr, ytr)
        scores[name] = clf.predict_proba(xte)[:, 1]
        models[name] = report(scores[name], yte)
        coefs[name] = clf[-1].coef_[0]
    single = []
    for k, n in enumerate(NAMES):
        v = auc(lte[:, k], yte)
        single.append({"feature": n, "auc_test": round(v, 3), "auc_train": round(auc(ltr[:, k], ytr), 3), "share_or_mean_test": round(float(lte[:, k].mean()), 3)})
    res = {"head": head[:8], "train": {"snapshot": a.train, "commit": c_train[:8], "labels_at": a.test, "n": int(len(ytr)), "solved_later": int(ytr.sum())},
           "test": {"snapshot": a.test, "commit": c_test[:8], "labels_at": git(a.repo, "show", "-s", "--format=%cs", head).decode().strip(), "n": int(len(yte)), "solved_later": int(yte.sum()),
                    "base_rate": round(float(yte.mean()), 4)},
           "feature_count": {"metadata": len(META), "lean": len(NAMES)}, "models": models,
           "gain_over_metadata": {"lean": paired_gain(scores["lean"], scores["metadata"], yte), "metadata_plus_lean": paired_gain(scores["metadata_plus_lean"], scores["metadata"], yte)},
           "single_feature": sorted(single, key=lambda t: -abs(t["auc_test"] - 0.5)),
           "coefficients": {"lean": sorted(([n, round(float(c), 3)] for n, c in zip(NAMES, coefs["lean"])), key=lambda t: -abs(t[1])),
                            "metadata_plus_lean": sorted(([n, round(float(c), 3)] for n, c in zip(META + NAMES, coefs["metadata_plus_lean"])), key=lambda t: -abs(t[1]))}}
    out = pathlib.Path(a.out)
    out.mkdir(exist_ok=True)
    json.dump(res, open(out / "lean-rank.json", "w"), indent=1, ensure_ascii=False)
    print(json.dumps({k: res[k] for k in ("train", "test", "models", "gain_over_metadata")}, indent=1))
    print(json.dumps(res["single_feature"], indent=0))


if __name__ == "__main__":
    main()
