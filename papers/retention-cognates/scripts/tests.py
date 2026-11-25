import json
from pathlib import Path

import numpy as np
from scipy.stats import norm

ROOT = Path(__file__).resolve().parent.parent
RESULTS = json.loads((ROOT / "results" / "hlr_results.json").read_text())
OUT = ROOT / "results" / "tests.json"

ALPHA = 0.05
POWER_Z = norm.ppf(1 - ALPHA / 2) + norm.ppf(0.8)
BOUNDS = {"mae_diff": 0.001, "orth_sim": 0.1, "phon_sim": 0.1, "etym_cognate": 0.1}
QUANTITIES = ("mae_diff", "orth_sim", "phon_sim", "etym_cognate")


def holm(pvals):
    order = np.argsort(pvals)
    m = len(pvals)
    adjusted = np.empty(m)
    running = 0.0
    for rank, i in enumerate(order):
        running = max(running, min(1.0, (m - rank) * pvals[i]))
        adjusted[i] = running
    return adjusted


def quantity(block, q):
    return block["mae_diff"] if q == "mae_diff" else block["cognate"]["coef"][q]


def test(entry, bound):
    est = entry["est"]
    se = float(np.std(entry["boot"], ddof=1))
    z = est / se
    p = float(2 * norm.sf(abs(z)))
    p_lower = float(norm.sf((est + bound) / se))
    p_upper = float(norm.cdf((est - bound) / se))
    return {
        "est": est,
        "se": se,
        "z": z,
        "p": p,
        "ci": [entry["lo"], entry["hi"]],
        "mde": float(POWER_Z * se),
        "tost_bound": bound,
        "tost_p": max(p_lower, p_upper),
    }


def verdict(t):
    if t["p_holm"] < ALPHA:
        return "effect"
    if t["tost_p"] < ALPHA:
        return "equivalent"
    return "inconclusive"


def main():
    out = {"alpha": ALPHA, "bounds": BOUNDS, "pooled": {}, "pairs": {}}
    pooled = {q: test(quantity(RESULTS["pooled"], q), BOUNDS[q]) for q in QUANTITIES}
    for q, adj in zip(QUANTITIES, holm(np.array([pooled[q]["p"] for q in QUANTITIES]))):
        pooled[q]["p_holm"] = float(adj)
    out["pooled"] = pooled
    pairs = sorted(RESULTS["pairs"])
    for p in pairs:
        out["pairs"][p] = {q: test(quantity(RESULTS["pairs"][p], q), BOUNDS[q]) for q in QUANTITIES}
    for q in QUANTITIES:
        adj = holm(np.array([out["pairs"][p][q]["p"] for p in pairs]))
        for p, a in zip(pairs, adj):
            out["pairs"][p][q]["p_holm"] = float(a)
    for block in [out["pooled"]] + list(out["pairs"].values()):
        for q, t in block.items():
            t["verdict"] = verdict(t)
            t["half_life_ratio"] = None if q == "mae_diff" else float(2 ** t["est"])
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    for label, block in [("pooled", out["pooled"])] + list(out["pairs"].items()):
        print(label, {q: (f"{t['est']:.4g}", f"z={t['z']:.2f}", f"pH={t['p_holm']:.3g}", f"tost={t['tost_p']:.3g}", f"mde={t['mde']:.3g}", t["verdict"]) for q, t in block.items()})


if __name__ == "__main__":
    main()
