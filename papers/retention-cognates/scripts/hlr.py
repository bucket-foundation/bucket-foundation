import gzip
import json
from pathlib import Path

import numpy as np
import pandas as pd
import scipy.sparse as sp
from scipy.stats import spearmanr
from scipy.optimize import minimize
from sklearn.metrics import roc_auc_score

ROOT = Path(__file__).resolve().parent.parent
TRACES = ROOT / "data" / "settles.acl16.learning_traces.13m.csv.gz"
FEATURES = ROOT / "data" / "lexeme_features.csv"
OUT = ROOT / "results" / "hlr_results.json"

MIN_H = 15.0 / (24 * 60)
MAX_H = 274.0
LO, HI = np.log2(MIN_H), np.log2(MAX_H)
HL_WEIGHT = 0.01
L2 = 1e-4
Z95 = 1.959963984540054

SAMPLE = 2_000_000
SEED = 20261125
TOTAL = 12_854_226
BASE = ["bias", "right", "wrong", "log_len", "log_ntrans"]
NO_HISTORY = ["bias", "log_len", "log_ntrans"]
COGNATE = ["orth_sim", "phon_sim", "phon_missing", "etym_cognate", "trans_missing"]
DTYPES = {
    "p_recall": "float32",
    "timestamp": "int64",
    "delta": "float32",
    "user_id": "category",
    "learning_language": "category",
    "ui_language": "category",
    "lexeme_id": "category",
    "history_seen": "int32",
    "history_correct": "int32",
}


def load():
    rng = np.random.default_rng(SEED)
    parts = []
    with gzip.open(TRACES, "rt") as fh:
        for chunk in pd.read_csv(fh, usecols=list(DTYPES), dtype={k: v for k, v in DTYPES.items() if v != "category"}, chunksize=1_000_000):
            pair = chunk.ui_language + "->" + chunk.learning_language
            keep = np.zeros(len(chunk), dtype=bool)
            for _, idx in chunk.groupby(pair).indices.items():
                keep[idx] = rng.random(len(idx)) < SAMPLE / TOTAL
            parts.append(chunk[keep])
    df = pd.concat(parts, ignore_index=True)
    del parts
    for c in ("user_id", "learning_language", "ui_language", "lexeme_id"):
        df[c] = df[c].astype("category")
    feats = pd.read_csv(FEATURES, usecols=["lexeme_id", "ui_language", "lemma_len", "n_translations", "orth_sim", "phon_sim", "etym_cognate"])
    key = df.lexeme_id.astype(str) + "|" + df.ui_language.astype(str)
    feats.index = feats.lexeme_id + "|" + feats.ui_language
    feats = feats.drop(columns=["lexeme_id", "ui_language"])
    joined = feats.reindex(key.to_numpy())
    out = pd.DataFrame({
        "p": df.p_recall.to_numpy(),
        "t": (df.delta / 86400.0).astype("float32").to_numpy(),
        "user": df.user_id.cat.codes.to_numpy(),
        "pair": (df.ui_language.astype(str) + "->" + df.learning_language.astype(str)).astype("category").to_numpy(),
        "lexeme": df.lexeme_id.cat.codes.to_numpy(),
        "timestamp": df.timestamp.to_numpy(),
        "bias": np.float32(1.0),
        "right": np.sqrt(1 + df.history_correct.to_numpy()).astype("float32"),
        "wrong": np.sqrt(1 + df.history_seen.to_numpy() - df.history_correct.to_numpy()).astype("float32"),
        "log_len": np.log2(1 + joined.lemma_len.fillna(1).to_numpy()).astype("float32"),
        "log_ntrans": np.log2(1 + joined.n_translations.fillna(0).to_numpy()).astype("float32"),
        "trans_missing": joined.etym_cognate.isna().to_numpy().astype("float32"),
        "phon_missing": joined.phon_sim.isna().to_numpy().astype("float32"),
        "orth_sim": joined.orth_sim.fillna(0).to_numpy().astype("float32"),
        "phon_sim": joined.phon_sim.fillna(0).to_numpy().astype("float32"),
        "etym_cognate": joined.etym_cognate.fillna(0).to_numpy().astype("float32"),
    })
    del df, joined, key
    out = out.sort_values("timestamp", kind="stable").reset_index(drop=True)
    cut = int(len(out) * 0.9)
    out["train"] = np.arange(len(out)) < cut
    return out


def row_terms(theta, X, t, p, h_obs):
    raw = X @ theta
    z = np.clip(raw, LO, HI)
    h = np.exp2(z)
    phat = np.exp2(-t / h)
    ln2 = np.log(2)
    dp = phat - p
    dh = h - h_obs
    loss = dp ** 2 + HL_WEIGHT * dh ** 2
    g = (raw == z) * (2 * dp * phat * ln2 * ln2 * t / h + HL_WEIGHT * 2 * dh * h * ln2)
    return loss, g


def objective(theta, X, t, p, h_obs):
    loss, g = row_terms(theta, X, t, p, h_obs)
    n = len(p)
    grad = np.asarray(X.T @ g).ravel() / n
    grad[1:] += 2 * L2 * theta[1:]
    return loss.mean() + L2 * (theta[1:] ** 2).sum(), grad


def half_life_obs(t, p):
    pc = np.clip(p, 1e-4, 1 - 1e-4)
    return np.clip(-t / np.log2(pc), MIN_H, MAX_H)


def fit(X, t, p):
    h_obs = half_life_obs(t, p)
    theta0 = np.zeros(X.shape[1])
    theta0[0] = float(np.median(np.log2(h_obs)))
    res = minimize(objective, theta0, args=(X, t, p, h_obs), jac=True, method="L-BFGS-B", options={"maxiter": 1000})
    return res.x, h_obs


def cluster_se(theta, X, t, p, h_obs, users):
    n = len(p)
    _, g = row_terms(theta, X, t, p, h_obs)
    k = X.shape[1]
    scores = np.zeros((users.max() + 1, k))
    for j in range(k):
        scores[:, j] = np.bincount(users, weights=g * X[:, j], minlength=users.max() + 1)
    meat = scores.T @ scores / n ** 2
    eps = 1e-5
    H = np.zeros((k, k))
    for j in range(k):
        e = np.zeros(k)
        e[j] = eps
        H[:, j] = (objective(theta + e, X, t, p, h_obs)[1] - objective(theta - e, X, t, p, h_obs)[1]) / (2 * eps)
    H = (H + H.T) / 2
    Hinv = np.linalg.pinv(H)
    V = Hinv @ meat @ Hinv
    return np.sqrt(np.clip(np.diag(V), 0, None))


def predict(theta, X, t):
    h = np.exp2(np.clip(X @ theta, LO, HI))
    return np.clip(np.exp2(-t / h), 1e-4, 1 - 1e-4), h


def design(frame, cols, lexemes=None):
    dense = frame[cols].to_numpy(np.float64)
    if lexemes is None:
        return dense
    idx = pd.Index(lexemes).get_indexer(frame.lexeme.to_numpy())
    rows = np.flatnonzero(idx >= 0)
    onehot = sp.csr_matrix((np.ones(len(rows)), (rows, idx[rows])), shape=(len(frame), len(lexemes)))
    return sp.hstack([sp.csr_matrix(dense), onehot], format="csr")


def diff_stats(p_te, a, b, users_te):
    d = np.abs(p_te - a) - np.abs(p_te - b)
    est, se = float(d.mean()), mean_cluster_se(d, users_te)
    return {"est": est, "se": se, "lo": est - Z95 * se, "hi": est + Z95 * se}


def mean_cluster_se(d, users):
    n = len(d)
    centered = d - d.mean()
    sums = np.bincount(users, weights=centered)
    return float(np.sqrt((sums ** 2).sum()) / n)


def run(df, label):
    tr = df[df.train.to_numpy()]
    te = df[~df.train.to_numpy()]
    t_tr, p_tr = tr.t.to_numpy(np.float64), tr.p.to_numpy(np.float64)
    t_te, p_te = te.t.to_numpy(np.float64), te.p.to_numpy(np.float64)
    users_tr = np.unique(tr.user.to_numpy(), return_inverse=True)[1]
    users_te = np.unique(te.user.to_numpy(), return_inverse=True)[1]
    out = {
        "label": label,
        "n_train": int(len(tr)),
        "n_test": int(len(te)),
        "users": int(df.user.nunique()),
        "lexemes": int(df.lexeme.nunique()),
    }
    preds = {}
    h_obs_te = half_life_obs(t_te, p_te)
    y = np.round(p_te)
    lexemes = np.unique(tr.lexeme.to_numpy())
    specs = (("base", BASE, None), ("cognate", BASE + COGNATE, None), ("no_history", NO_HISTORY, None), ("lexeme", BASE, lexemes))
    for name, cols, lex in specs:
        X_tr = design(tr, cols, lex)
        theta, h_obs = fit(X_tr, t_tr, p_tr)
        se = cluster_se(theta, X_tr, t_tr, p_tr, h_obs, users_tr) if lex is None else None
        del X_tr, h_obs
        phat, h = predict(theta, design(te, cols, lex), t_te)
        preds[name] = phat
        out[name] = {
            "mae": float(np.abs(p_te - phat).mean()),
            "auc": float(roc_auc_score(y, phat)) if 0 < y.mean() < 1 else None,
            "cor_h": float(spearmanr(h, h_obs_te).statistic),
        }
        if se is not None:
            out[name]["coef"] = {c: {"est": float(theta[i]), "se": float(se[i]), "lo": float(theta[i] - Z95 * se[i]), "hi": float(theta[i] + Z95 * se[i])} for i, c in enumerate(cols)}
    out["mae_diff"] = diff_stats(p_te, preds["cognate"], preds["base"], users_te)
    out["control_lexeme"] = diff_stats(p_te, preds["lexeme"], preds["base"], users_te)
    out["control_history"] = diff_stats(p_te, preds["no_history"], preds["base"], users_te)
    print(json.dumps({"label": label, "n_train": out["n_train"], "mae_diff": out["mae_diff"], "lexeme": out["control_lexeme"], "history": out["control_history"]}), flush=True)
    return out


def main():
    df = load()
    results = {"se_method": "cluster-robust sandwich by learner", "sample": SAMPLE, "seed": SEED, "events_in_sample": int(len(df)), "pooled": run(df, "pooled"), "pairs": {}}
    for pair in sorted(df.pair.unique()):
        results["pairs"][pair] = run(df[df.pair == pair], pair)
    OUT.write_text(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    main()
