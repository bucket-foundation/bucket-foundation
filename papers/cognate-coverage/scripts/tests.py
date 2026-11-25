from __future__ import annotations

import json
import os

import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
SEED = 20261125
ALPHA = 0.05
Z = stats.norm.ppf(0.95) + stats.norm.ppf(0.80)


def holm(p: list[float]) -> list[bool]:
    order = np.argsort(p)
    m = len(p)
    reject = [False] * m
    for rank, i in enumerate(order):
        if p[i] <= ALPHA / (m - rank):
            reject[i] = True
        else:
            break
    return reject


def bh(p: list[float]) -> list[bool]:
    order = np.argsort(p)
    m = len(p)
    k = 0
    for rank, i in enumerate(order, 1):
        if p[i] <= ALPHA * rank / m:
            k = rank
    reject = [False] * m
    for rank, i in enumerate(order, 1):
        reject[i] = rank <= k
    return reject


def h1(rng) -> dict:
    reg = json.load(open(os.path.join(DATA, "regression.json")))
    c = np.array(reg["C"])
    h = np.array(reg["hours"])
    n = len(c)
    rho = stats.spearmanr(c, h)[0]
    slope_log = stats.linregress(c, np.log(h)).slope
    perm_rho, perm_slope = [], []
    for _ in range(10000):
        hp = rng.permutation(h)
        perm_rho.append(stats.spearmanr(c, hp)[0])
        perm_slope.append(stats.linregress(c, np.log(hp)).slope)
    p_rho = (1 + np.sum(np.array(perm_rho) <= rho)) / 10001
    p_slope = (1 + np.sum(np.array(perm_slope) <= slope_log)) / 10001
    boot_rho, boot_slope = [], []
    for _ in range(10000):
        i = rng.integers(0, n, n)
        if np.ptp(c[i]) == 0 or np.ptp(h[i]) == 0:
            continue
        boot_rho.append(stats.spearmanr(c[i], h[i])[0])
        boot_slope.append(stats.linregress(c[i], h[i]).slope)
    detect = None
    for r in np.arange(0.05, 1.0, 0.05):
        cov = [[1, -r], [-r, 1]]
        hits = 0
        for _ in range(400):
            x = rng.multivariate_normal([0, 0], cov, n)
            hits += stats.spearmanr(x[:, 0], x[:, 1], alternative="less")[1] < ALPHA
        if hits / 400 >= 0.8:
            detect = float(r)
            break
    rej = holm([p_rho, p_slope])
    return {
        "n": n,
        "rho": float(rho),
        "rho_ci": [float(np.percentile(boot_rho, 2.5)), float(np.percentile(boot_rho, 97.5))],
        "p_rho": float(p_rho),
        "ols_slope": float(stats.linregress(c, h).slope),
        "ols_slope_ci": [float(np.percentile(boot_slope, 2.5)), float(np.percentile(boot_slope, 97.5))],
        "log_slope": float(slope_log),
        "p_log_slope": float(p_slope),
        "reject_rho": rej[0],
        "reject_log_slope": rej[1],
        "min_detectable_rho": detect,
    }


def boot_cov(w: np.ndarray, m: np.ndarray, rng, k: int) -> np.ndarray:
    n = len(w)
    idx = rng.integers(0, n, (k, n))
    ww = w[idx]
    return (ww * m[idx]).sum(1) / ww.sum(1)


def h2(masks, cov, rng) -> dict:
    rows = []
    for t in sorted(cov):
        w = masks[f"{t}__weight"]
        for s in sorted(cov[t]["pairs"]):
            m = masks[f"{t}__{s}"].astype(float)
            c = float(w @ m)
            b = boot_cov(w, m, rng, 1000)
            se = float(b.std(ddof=1))
            z = (c - 0.05) / se if se > 0 else (np.inf if c > 0.05 else -np.inf)
            rows.append({
                "s": s, "t": t, "C": c, "se": se, "z": float(z),
                "p": float(stats.norm.sf(z)),
                "ci": [float(np.percentile(b, 2.5) - 0.05), float(np.percentile(b, 97.5) - 0.05)],
                "mde": float(Z * se),
            })
    rej = bh([r["p"] for r in rows])
    for r, x in zip(rows, rej):
        r["reject"] = bool(x)
    return {
        "m": len(rows),
        "rejected": int(sum(rej)),
        "median_mde": float(np.median([r["mde"] for r in rows])),
        "rows": rows,
    }


def h3(masks, cov, rng) -> dict:
    rows = []
    for t in sorted(cov):
        if t == "en":
            continue
        w = masks[f"{t}__weight"]
        odd = np.arange(len(w)) % 2 == 0
        even = ~odd
        en = masks[f"{t}__en"]
        others = [s for s in cov[t]["pairs"] if s != "en"]

        def gain(s, part):
            ww = w[part]
            return float(ww @ (en | masks[f"{t}__{s}"])[part] - ww @ en[part]) / ww.sum()

        s_star = max(others, key=lambda s: gain(s, odd))
        ww = w[even]
        d = ((en | masks[f"{t}__{s_star}"]) & ~en)[even].astype(float)
        g = float(ww @ d / ww.sum())
        b = boot_cov(ww, d, rng, 2000)
        p = (1 + np.sum(b <= 0.02)) / 2001
        rows.append({
            "t": t, "s": s_star, "gain": g,
            "ci": [float(np.percentile(b, 2.5)), float(np.percentile(b, 97.5))],
            "p": float(p), "mde": float(Z * b.std(ddof=1)),
        })
    rej = holm([r["p"] for r in rows])
    for r, x in zip(rows, rej):
        r["reject"] = bool(x)
    return {"m": len(rows), "rejected": int(sum(rej)), "rows": rows}


def main() -> None:
    rng = np.random.default_rng(SEED)
    cov = json.load(open(os.path.join(DATA, "coverage.json")))["targets"]
    masks = np.load(os.path.join(DATA, "masks.npz"))
    out = {"seed": SEED, "alpha": ALPHA, "H1": h1(rng), "H2": h2(masks, cov, rng), "H3": h3(masks, cov, rng)}
    with open(os.path.join(DATA, "tests.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps(out["H1"], indent=1))
    print("H2", out["H2"]["m"], out["H2"]["rejected"], out["H2"]["median_mde"])
    for r in out["H3"]["rows"]:
        print("H3", r["t"], r["s"], round(r["gain"], 3), [round(x, 3) for x in r["ci"]], round(r["p"], 4), r["reject"])


if __name__ == "__main__":
    main()
