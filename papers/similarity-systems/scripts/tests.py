from __future__ import annotations

import json
import os

import numpy as np
from scipy.stats import rankdata
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
B = 2000
SEED = 20261125
THRESHOLD = 0.8
ALPHA = 0.05


def spearman(x: np.ndarray, y: np.ndarray) -> float:
    return float(np.corrcoef(rankdata(x), rankdata(y))[0, 1])


def holm(ps: list[float]) -> list[float]:
    order = np.argsort(ps)
    m = len(ps)
    adj = np.empty(m)
    run = 0.0
    for k, i in enumerate(order):
        run = max(run, min(1.0, (m - k) * ps[i]))
        adj[i] = run
    return adj.tolist()


def bh(ps: list[float]) -> list[float]:
    m = len(ps)
    order = np.argsort(ps)[::-1]
    adj = np.empty(m)
    run = 1.0
    for k, i in enumerate(order):
        run = min(run, ps[i] * m / (m - k))
        adj[i] = run
    return adj.tolist()


def cluster_draws(groups: np.ndarray, rng: np.random.Generator):
    ids = np.unique(groups)
    members = {g: np.flatnonzero(groups == g) for g in ids}
    for _ in range(B):
        pick = rng.choice(ids, size=len(ids), replace=True)
        yield np.concatenate([members[g] for g in pick])


def fit_scores(X: np.ndarray, y: np.ndarray, groups: np.ndarray) -> np.ndarray:
    out = np.empty(len(y))
    for g in np.unique(groups):
        test = groups == g
        train = ~test
        mu, sd = X[train].mean(0), X[train].std(0) + 1e-12
        model = LogisticRegression(max_iter=1000).fit((X[train] - mu) / sd, y[train])
        out[test] = model.decision_function((X[test] - mu) / sd)
    return out


def safe_auc(y: np.ndarray, s: np.ndarray) -> float:
    return float(roc_auc_score(y, s)) if 0 < y.sum() < len(y) else float("nan")


def main() -> None:
    d = np.load(os.path.join(DATA, "pairs.npz"))
    names = d["names"].tolist()
    g = d["group"]
    W = np.nanmean(np.vstack([d["letter"], d["affix"], d["ngram"]]), axis=0)
    axes = {"M": d["M"], "P": d["P"], "S": d["S"], "W": W}
    rng = np.random.default_rng(SEED)
    result: dict = {"pairs": int(len(g)), "groups": names}
    result["coverage"] = {k: int(np.isfinite(v).sum()) for k, v in axes.items()}
    result["cognate_defined"] = int(np.isfinite(d["cognate"]).sum())
    result["cognate_positive"] = int(np.nansum(d["cognate"]))

    h1 = []
    keys = list(axes)
    for i in range(4):
        for j in range(i + 1, 4):
            a, b = keys[i], keys[j]
            ok = np.isfinite(axes[a]) & np.isfinite(axes[b])
            x, y, gg = axes[a][ok], axes[b][ok], g[ok]
            rho = spearman(x, y)
            boots = np.array([spearman(x[idx], y[idx]) for idx in cluster_draws(gg, rng)])
            p = float((np.abs(boots) >= THRESHOLD).mean())
            h1.append({
                "axes": f"{a}-{b}", "n": int(ok.sum()), "rho": rho,
                "ci": [float(np.quantile(boots, 0.025)), float(np.quantile(boots, 0.975))], "p": p,
            })
    for row, adj in zip(h1, holm([r["p"] for r in h1])):
        row["p_holm"] = adj
        row["distinct"] = adj < ALPHA
    result["h1"] = h1

    ok = np.isfinite(d["cognate"]) & np.isfinite(d["S"])
    y = d["cognate"][ok].astype(int)
    gg = g[ok]
    XA = d["S"][ok][:, None]
    XB = np.column_stack([d["S"][ok], d["letter"][ok], d["affix"][ok], d["ngram"][ok]])
    sA, sB = fit_scores(XA, y, gg), fit_scores(XB, y, gg)
    okC = ok & np.isfinite(d["M"]) & np.isfinite(d["P"])
    keepC = okC[ok]
    XC = np.column_stack([XB[keepC], d["M"][okC], d["P"][okC]])
    sB_C = fit_scores(XB[keepC], y[keepC], gg[keepC])
    sC = fit_scores(XC, y[keepC], gg[keepC])
    aucA, aucB = safe_auc(y, sA), safe_auc(y, sB)
    diffs = []
    for idx in cluster_draws(gg, rng):
        diffs.append(safe_auc(y[idx], sB[idx]) - safe_auc(y[idx], sA[idx]))
    diffs = np.array(diffs)
    diffs = diffs[np.isfinite(diffs)]
    result["h2"] = {
        "n": int(ok.sum()), "cognates": int(y.sum()), "auc_script": aucA, "auc_script_subword": aucB,
        "delta": aucB - aucA, "ci": [float(np.quantile(diffs, 0.025)), float(np.quantile(diffs, 0.975))],
        "p": float((diffs <= 0).mean()),
    }
    per = []
    for gid in np.unique(gg):
        m = gg == gid
        yy, a_, b_ = y[m], sA[m], sB[m]
        if yy.sum() < 30 or (len(yy) - yy.sum()) < 30:
            continue
        local = np.random.default_rng(SEED + int(gid))
        ds = []
        for _ in range(B):
            idx = local.integers(0, len(yy), len(yy))
            ds.append(safe_auc(yy[idx], b_[idx]) - safe_auc(yy[idx], a_[idx]))
        ds = np.array(ds)
        ds = ds[np.isfinite(ds)]
        per.append({
            "group": names[gid], "n": int(m.sum()), "cognates": int(yy.sum()),
            "auc_script": safe_auc(yy, a_), "auc_script_subword": safe_auc(yy, b_),
            "delta": safe_auc(yy, b_) - safe_auc(yy, a_),
            "ci": [float(np.quantile(ds, 0.025)), float(np.quantile(ds, 0.975))], "p": float((ds <= 0).mean()),
        })
    for row, adj in zip(per, bh([r["p"] for r in per])):
        row["q_bh"] = adj
    result["h2_per_pair"] = per

    yC = y[keepC]
    result["exploratory"] = {
        "model_c": {"n": int(keepC.sum()), "auc_b": safe_auc(yC, sB_C), "auc_c": safe_auc(yC, sC)},
    }
    all_ok = np.all(np.vstack([np.isfinite(v) for v in axes.values()]), axis=0)
    R = np.corrcoef(np.vstack([rankdata(v[all_ok]) for v in axes.values()]))
    eig = np.sort(np.linalg.eigvalsh(R))[::-1]
    result["exploratory"]["rank_corr"] = {"n": int(all_ok.sum()), "matrix": R.tolist(), "eigen": eig.tolist(),
                                          "explained": (eig / eig.sum()).tolist()}
    by_group = {}
    for gid, name in enumerate(names):
        m = (g == gid) & all_ok
        if m.sum() >= 50:
            by_group[name] = {f"{a}-{b}": spearman(axes[a][m], axes[b][m])
                              for i, a in enumerate(keys) for b in keys[i + 1:]}
    result["exploratory"]["rho_by_group"] = by_group
    means = {}
    for gid, name in enumerate(names):
        m = g == gid
        means[name] = {k: float(np.nanmean(v[m])) if np.isfinite(v[m]).any() else None for k, v in axes.items()}
        c = d["cognate"][m]
        means[name]["cognate_rate"] = float(np.nanmean(c)) if np.isfinite(c).any() else None
        means[name]["n"] = int(m.sum())
    result["group_means"] = means
    with open(os.path.join(DATA, "tests.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps({"h1": [(r["axes"], round(r["rho"], 3), r["p_holm"]) for r in h1], "h2": result["h2"]}, indent=1))


if __name__ == "__main__":
    main()
