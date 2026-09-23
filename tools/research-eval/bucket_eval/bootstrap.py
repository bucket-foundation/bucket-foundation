from __future__ import annotations

from typing import Sequence

import numpy as np

from .metrics import PositiveCounts

def _replicate(c: PositiveCounts, idx: np.ndarray, ks: Sequence[int]) -> dict[str, float]:
    scores = c.scores[idx]
    neg_above = c.neg_above[idx]
    neg_tied = c.neg_tied[idx]
    ordered = np.sort(scores)
    right = np.searchsorted(ordered, scores, side="right")
    left = np.searchsorted(ordered, scores, side="left")
    pos_above = len(scores) - right
    pos_tied = right - left - 1
    ranks = 1 + neg_above + pos_above + (neg_tied + pos_tied) / 2
    out = {
        "auc": float(1 - np.mean((neg_above + neg_tied / 2) / c.negatives)),
        "ap": float(np.mean((1 + pos_above + pos_tied / 2) / ranks)),
    }
    for k in ks:
        out[f"p@{k}"] = float(np.sum(ranks <= k) / k)
    return out

def _draw(strata: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    parts = []
    for s in np.unique(strata):
        members = np.nonzero(strata == s)[0]
        parts.append(rng.choice(members, size=len(members), replace=True))
    return np.concatenate(parts) if parts else np.empty(0, dtype=np.int64)

def paired_positive_bootstrap(
    model: PositiveCounts,
    baseline: PositiveCounts,
    strata: Sequence[str],
    reps: int,
    seed: int,
    ks: Sequence[int] = (100, 1000),
) -> dict[str, dict[str, float]]:
    if len(model.scores) != len(baseline.scores) or model.negatives != baseline.negatives:
        raise ValueError("a paired bootstrap needs the same positives and negatives for both rankers")
    rng = np.random.default_rng(seed)
    strata_arr = np.asarray(strata)
    names = ["auc", "ap"] + [f"p@{k}" for k in ks]
    diffs = {n: np.empty(reps) for n in names}
    for b in range(reps):
        idx = _draw(strata_arr, rng)
        m = _replicate(model, idx, ks)
        base = _replicate(baseline, idx, ks)
        for n in names:
            diffs[n][b] = m[n] - base[n]
    full = np.arange(len(model.scores))
    point_m = _replicate(model, full, ks)
    point_b = _replicate(baseline, full, ks)
    return {
        n: {
            "difference": point_m[n] - point_b[n],
            "low": float(np.percentile(diffs[n], 2.5)),
            "high": float(np.percentile(diffs[n], 97.5)),
        }
        for n in names
    }

def weighted_auc(pos: np.ndarray, neg_sorted: np.ndarray, w_pos: np.ndarray, w_neg_sorted: np.ndarray) -> float:
    cum = np.concatenate([[0.0], np.cumsum(w_neg_sorted)])
    left = np.searchsorted(neg_sorted, pos, side="left")
    right = np.searchsorted(neg_sorted, pos, side="right")
    below = cum[left]
    tied = cum[right] - cum[left]
    total_neg = cum[-1]
    total_pos = w_pos.sum()
    if total_neg == 0 or total_pos == 0:
        return float("nan")
    return float(np.sum(w_pos * (below + tied / 2)) / (total_pos * total_neg))

def full_poisson_bootstrap_auc_difference(
    model_pos: np.ndarray,
    model_neg: np.ndarray,
    base_pos: np.ndarray,
    base_neg: np.ndarray,
    reps: int,
    seed: int,
    block: int = 2_000_000,
) -> dict[str, float]:
    rng = np.random.default_rng(seed)
    mo = np.argsort(model_neg, kind="stable")
    bo = np.argsort(base_neg, kind="stable")
    mn = model_neg[mo]
    bn = base_neg[bo]
    diffs = np.empty(reps)
    for b in range(reps):
        w_neg = np.concatenate([rng.poisson(1.0, size=min(block, len(model_neg) - s)).astype(np.float64) for s in range(0, len(model_neg), block)]) if len(model_neg) else np.empty(0)
        w_pos = rng.poisson(1.0, size=len(model_pos)).astype(np.float64)
        diffs[b] = weighted_auc(model_pos, mn, w_pos, w_neg[mo]) - weighted_auc(base_pos, bn, w_pos, w_neg[bo])
    ones_pos = np.ones(len(model_pos))
    ones_neg = np.ones(len(model_neg))
    point = weighted_auc(model_pos, mn, ones_pos, ones_neg) - weighted_auc(base_pos, bn, ones_pos, ones_neg)
    return {"difference": point, "low": float(np.percentile(diffs, 2.5)), "high": float(np.percentile(diffs, 97.5))}

def intervals_agree(a: dict[str, float], b: dict[str, float], tolerance: float = 0.10) -> bool:
    wa = a["high"] - a["low"]
    wb = b["high"] - b["low"]
    widest = max(wa, wb)
    overlap = min(a["high"], b["high"]) - max(a["low"], b["low"])
    centres = abs((a["high"] + a["low"]) / 2 - (b["high"] + b["low"]) / 2)
    return abs(wa - wb) <= tolerance * widest and overlap >= 0 and centres <= tolerance * widest

def independent_residual(a: np.ndarray, b: np.ndarray) -> dict[str, float]:
    d = np.asarray(a) - np.asarray(b)
    return {"difference": float(np.median(d)), "low": float(np.percentile(d, 2.5)), "high": float(np.percentile(d, 97.5))}
