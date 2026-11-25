from __future__ import annotations

import json
import os

import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")


def fit(x: np.ndarray, y: np.ndarray) -> dict:
    r = stats.linregress(x, y)
    return {
        "slope": float(r.slope),
        "intercept": float(r.intercept),
        "r2": float(r.rvalue ** 2),
        "p": float(r.pvalue),
        "slope_se": float(r.stderr),
    }


def main() -> None:
    cov = json.load(open(os.path.join(DATA, "coverage.json")))["targets"]
    hours = json.load(open(os.path.join(DATA, "fsi_hours.json")))["hours"]
    langs = sorted(l for l in hours if l in cov)
    c = np.array([cov[l]["pairs"]["en"]["C"] for l in langs])
    cs = np.array([cov[l]["pairs"]["en"]["C_pie"] for l in langs])
    h = np.array([hours[l] for l in langs], float)
    keep = h < 2200
    out = {
        "n": len(langs),
        "langs": langs,
        "C": c.tolist(),
        "C_pie": cs.tolist(),
        "hours": h.tolist(),
        "linear": fit(c, h),
        "log_hours": fit(c, np.log(h)),
        "linear_pie": fit(cs, h),
        "spearman": dict(zip(("rho", "p"), map(float, stats.spearmanr(c, h)))),
        "without_cat4": fit(c[keep], h[keep]),
        "n_without_cat4": int(keep.sum()),
    }
    with open(os.path.join(DATA, "regression.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps({k: v for k, v in out.items() if k not in ("C", "C_pie", "hours", "langs")}, indent=1))


if __name__ == "__main__":
    main()
