import gzip
import json
import os
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.metrics import roc_auc_score

ROOT = Path(__file__).resolve().parent.parent
TRACES = ROOT / "data" / "settles.acl16.learning_traces.13m.csv.gz"
FEATURES = ROOT / "data" / "lexeme_features.csv"
OUT = ROOT / "results" / "hlr_results.json"

MIN_H = 15.0 / (24 * 60)
MAX_H = 274.0
HL_WEIGHT = 0.01
L2 = 1e-4
BOOT = int(sys.argv[1]) if len(sys.argv) > 1 else 200
WORKERS = int(os.environ.get("HLR_WORKERS", "12"))
_SHARED = {}


def _boot_fit(i):
    s = _SHARED
    rng = np.random.default_rng(SEED + 1 + i)
    w = rng.poisson(1.0, s["n_users"]).astype(float)[s["inv"]]
    return fit(s["X"], s["t"], s["p"], w, s["theta"])
SEED = 20261125

BASE = ["bias", "right", "wrong", "log_len"]
COGNATE = ["orth_sim", "phon_sim", "phon_missing", "etym_cognate", "trans_missing"]


def load():
    cols = ["p_recall", "timestamp", "delta", "user_id", "learning_language", "ui_language", "lexeme_id", "history_seen", "history_correct"]
    with gzip.open(TRACES, "rt") as fh:
        df = pd.read_csv(fh, usecols=cols)
    feats = pd.read_csv(FEATURES)
    df = df.merge(feats, on=["lexeme_id", "ui_language", "learning_language"], how="left")
    df["pair"] = df.ui_language + "->" + df.learning_language
    df["t_days"] = df.delta / 86400.0
    df["bias"] = 1.0
    df["right"] = np.sqrt(1 + df.history_correct)
    df["wrong"] = np.sqrt(1 + df.history_seen - df.history_correct)
    df["log_len"] = np.log2(1 + df.lemma_len.fillna(1))
    df["trans_missing"] = df.etym_cognate.isna().astype(float)
    df["phon_missing"] = df.phon_sim.isna().astype(float)
    for c in ("orth_sim", "phon_sim", "etym_cognate"):
        df[c] = df[c].fillna(0.0)
    df = df.sort_values("timestamp", kind="stable").reset_index(drop=True)
    cut = int(len(df) * 0.9)
    df["split"] = np.where(np.arange(len(df)) < cut, "train", "test")
    return df


def predict(theta, X, t):
    h = np.clip(np.exp2(np.clip(X @ theta, np.log2(MIN_H), np.log2(MAX_H))), MIN_H, MAX_H)
    return np.clip(np.exp2(-t / h), 1e-4, 1 - 1e-4), h


def objective(theta, X, t, p, h_obs, w):
    raw = X @ theta
    z = np.clip(raw, np.log2(MIN_H), np.log2(MAX_H))
    inside = (raw == z).astype(float)
    h = np.exp2(z)
    phat = np.exp2(-t / h)
    ln2 = np.log(2)
    dp = phat - p
    dh = h - h_obs
    wsum = w.sum()
    loss = (w * (dp ** 2 + HL_WEIGHT * dh ** 2)).sum() / wsum + L2 * (theta[1:] ** 2).sum()
    dphat_dz = phat * ln2 * ln2 * t / h
    dh_dz = h * ln2
    g = w * inside * (2 * dp * dphat_dz + HL_WEIGHT * 2 * dh * dh_dz)
    grad = X.T @ g / wsum
    grad[1:] += 2 * L2 * theta[1:]
    return loss, grad


def fit(X, t, p, w, theta0=None):
    pc = np.clip(p, 1e-4, 1 - 1e-4)
    h_obs = np.clip(-t / np.log2(pc), MIN_H, MAX_H)
    theta0 = np.zeros(X.shape[1]) if theta0 is None else theta0
    res = minimize(objective, theta0, args=(X, t, p, h_obs, w), jac=True, method="L-BFGS-B", options={"maxiter": 500})
    return res.x


def evaluate(theta, X, t, p):
    phat, _ = predict(theta, X, t)
    y = np.round(p)
    auc = roc_auc_score(y, phat) if 0 < y.mean() < 1 else float("nan")
    return float(np.abs(p - phat).mean()), float(auc)


def run(df, label):
    tr = df[df.split == "train"]
    te = df[df.split == "test"]
    t_tr, p_tr = tr.t_days.to_numpy(), tr.p_recall.to_numpy()
    t_te, p_te = te.t_days.to_numpy(), te.p_recall.to_numpy()
    out = {"label": label, "n_train": int(len(tr)), "n_test": int(len(te)), "users": int(df.user_id.nunique()), "lexemes": int(df.lexeme_id.nunique())}
    rng = np.random.default_rng(SEED)
    _, train_inv = np.unique(tr.user_id.to_numpy(), return_inverse=True)
    test_codes, test_inv = np.unique(te.user_id.to_numpy(), return_inverse=True)
    test_boot = [rng.poisson(1.0, len(test_codes)).astype(float)[test_inv] for _ in range(BOOT)]
    preds = {}
    for name, cols in (("base", BASE), ("cognate", BASE + COGNATE)):
        X_tr, X_te = tr[cols].to_numpy(float), te[cols].to_numpy(float)
        theta = fit(X_tr, t_tr, p_tr, np.ones(len(tr)))
        mae, auc = evaluate(theta, X_te, t_te, p_te)
        _SHARED.update(X=X_tr, t=t_tr, p=p_tr, theta=theta, inv=train_inv, n_users=int(train_inv.max()) + 1)
        with Pool(WORKERS) as pool:
            boots = np.array(pool.map(_boot_fit, range(BOOT), chunksize=1))
        lo, hi = np.percentile(boots, [2.5, 97.5], axis=0)
        preds[name] = predict(theta, X_te, t_te)[0]
        out[name] = {
            "mae": mae,
            "auc": auc,
            "coef": {c: {"est": float(theta[i]), "lo": float(lo[i]), "hi": float(hi[i]), "boot": boots[:, i].tolist()} for i, c in enumerate(cols)},
        }
    err_b = np.abs(p_te - preds["base"])
    err_c = np.abs(p_te - preds["cognate"])
    diffs = [float(((err_c - err_b) * w).sum() / w.sum()) for w in test_boot]
    out["mae_diff"] = {"est": float((err_c - err_b).mean()), "lo": float(np.percentile(diffs, 2.5)), "hi": float(np.percentile(diffs, 97.5)), "boot": diffs}
    print(json.dumps({k: out[k] for k in ("label", "n_train", "mae_diff")}), flush=True)
    return out


def main():
    df = load()
    results = {"boot": BOOT, "pooled": run(df, "pooled"), "pairs": {}}
    for pair, g in df.groupby("pair"):
        results["pairs"][pair] = run(g.reset_index(drop=True), pair)
    OUT.write_text(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    main()
