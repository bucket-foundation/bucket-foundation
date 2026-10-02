import csv, json, pathlib
import numpy as np

FORMAL = {"proved": 1.0, "partial": 0.6, "statement": 0.35, "none": 0.1}


def auc(scores, labels):
    s, y = np.asarray(scores, float), np.asarray(labels, bool)
    pos, neg = s[y], s[~y]
    return round(float(np.mean([(p > n) + 0.5 * (p == n) for p in pos for n in neg])), 3)


def interval(scores, labels, rng, n=2000):
    s, y = np.asarray(scores, float), np.asarray(labels, bool)
    vals = []
    for _ in range(n):
        i = rng.integers(0, len(s), len(s))
        if y[i].any() and (~y[i]).any():
            vals.append(auc(s[i], y[i]))
    return [round(float(np.percentile(vals, 2.5)), 3), round(float(np.percentile(vals, 97.5)), 3)]


def main():
    rows = list(csv.DictReader(open("problems.tsv"), delimiter="\t"))
    rng = np.random.default_rng(0)
    y = [bool(r["resolved"]) for r in rows]
    level = [int(r["level"]) for r in rows]
    formal = [FORMAL[r["lean"]] for r in rows]
    score = [0.55 * a + 0.45 * f for a, f in zip(y, formal)]
    markets = [len([m for m in r["market"].split(";") if m]) for r in rows]
    posed = [int(r["posed"]) for r in rows]
    wait = [int(r["resolved"]) - int(r["posed"]) for r in rows if r["resolved"]]
    features = {"solvability_score": score, "formal_term_alone": formal, "level_reversed": [-v for v in level], "year_posed": posed, "market_count": markets}
    table = lambda key: {k: {"problems": sum(1 for r in rows if r[key] == k), "resolved": sum(1 for r, v in zip(rows, y) if r[key] == k and v)} for k in sorted({r[key] for r in rows})}
    out = {"problems": len(rows), "resolved": int(sum(y)), "auc": {k: {"auc": auc(v, y), "ci95": interval(v, y, rng)} for k, v in features.items()},
           "by_level": table("level"), "by_branch": table("branch"), "by_lean": table("lean"),
           "years_to_resolution": {"n": len(wait), "median": float(np.median(wait)), "min": min(wait), "max": max(wait)},
           "resolved_since_2000": sum(1 for r in rows if r["resolved"] and int(r["resolved"]) >= 2000),
           "posed_before_resolved_check": all(int(r["resolved"]) >= int(r["posed"]) for r in rows if r["resolved"])}
    pathlib.Path("backtest.json").write_text(json.dumps(out, indent=1))
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
