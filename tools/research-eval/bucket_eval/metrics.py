from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, Iterator, Sequence

import numpy as np

NegStream = Callable[[], Iterable[np.ndarray]]

@dataclass(frozen=True)
class PositiveCounts:
    scores: np.ndarray
    neg_above: np.ndarray
    neg_tied: np.ndarray
    negatives: int

def count_negatives(pos_scores: Sequence[float], negatives: NegStream) -> PositiveCounts:
    pos = np.asarray(pos_scores, dtype=np.float64)
    levels, inverse = np.unique(pos, return_inverse=True)
    above = np.zeros(len(levels), dtype=np.int64)
    tied = np.zeros(len(levels), dtype=np.int64)
    total = 0
    for chunk in negatives():
        neg = np.sort(np.asarray(chunk, dtype=np.float64))
        total += len(neg)
        if len(levels) == 0 or len(neg) == 0:
            continue
        right = np.searchsorted(neg, levels, side="right")
        left = np.searchsorted(neg, levels, side="left")
        above += len(neg) - right
        tied += right - left
    return PositiveCounts(pos, above[inverse], tied[inverse], total)

def _positive_ranks(pos: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    ordered = np.sort(pos)
    right = np.searchsorted(ordered, pos, side="right")
    left = np.searchsorted(ordered, pos, side="left")
    return len(pos) - right, right - left - 1

def expected_ranks(c: PositiveCounts) -> np.ndarray:
    pos_above, pos_tied = _positive_ranks(c.scores)
    return 1 + c.neg_above + pos_above + (c.neg_tied + pos_tied) / 2

def auc(c: PositiveCounts) -> float:
    if len(c.scores) == 0 or c.negatives == 0:
        return float("nan")
    return float(1 - np.mean((c.neg_above + c.neg_tied / 2) / c.negatives))

def average_precision(c: PositiveCounts) -> float:
    if len(c.scores) == 0:
        return float("nan")
    pos_above, pos_tied = _positive_ranks(c.scores)
    hits = 1 + pos_above + pos_tied / 2
    return float(np.mean(hits / expected_ranks(c)))

def precision_at(k: int, pos_scores: Sequence[float], negatives: NegStream) -> float:
    pos = np.sort(np.asarray(pos_scores, dtype=np.float64))[::-1]
    top_neg = np.empty(0)
    for chunk in negatives():
        arr = np.asarray(chunk, dtype=np.float64)
        top_neg = np.concatenate([top_neg, arr])
        if len(top_neg) > k:
            top_neg = np.partition(top_neg, len(top_neg) - k)[len(top_neg) - k :]
    merged = np.concatenate([pos, top_neg])
    if len(merged) == 0:
        return float("nan")
    if len(merged) <= k:
        return float(len(pos) / k)
    threshold = np.partition(merged, len(merged) - k)[len(merged) - k]
    neg_above = 0
    neg_at = 0
    for chunk in negatives():
        arr = np.asarray(chunk, dtype=np.float64)
        neg_above += int(np.sum(arr > threshold))
        neg_at += int(np.sum(arr == threshold))
    pos_above = int(np.sum(pos > threshold))
    pos_at = int(np.sum(pos == threshold))
    slots = k - pos_above - neg_above
    expected = pos_above + (pos_at * slots / (pos_at + neg_at) if pos_at + neg_at else 0)
    return float(expected / k)

def naive_metrics(scores: Sequence[float], labels: Sequence[bool], ks: Sequence[int], rng: np.random.Generator, orders: int = 2000) -> dict:
    s = np.asarray(scores, dtype=np.float64)
    y = np.asarray(labels, dtype=bool)
    pos = s[y]
    neg = s[~y]
    greater = (pos[:, None] > neg[None, :]).sum()
    equal = (pos[:, None] == neg[None, :]).sum()
    out = {"auc": float((greater + equal / 2) / (len(pos) * len(neg)))}
    ap = np.zeros(orders)
    pk = {k: np.zeros(orders) for k in ks}
    for o in range(orders):
        order = np.lexsort((rng.random(len(s)), -s))
        hits = y[order]
        cum = np.cumsum(hits)
        ranks = np.nonzero(hits)[0] + 1
        ap[o] = np.mean(cum[ranks - 1] / ranks)
        for k in ks:
            pk[k][o] = cum[min(k, len(s)) - 1] / k
    out["ap_random_ties"] = float(ap.mean())
    for k in ks:
        out[f"p@{k}"] = float(pk[k].mean())
    return out

def chunked(values: np.ndarray, size: int) -> NegStream:
    def stream() -> Iterator[np.ndarray]:
        for start in range(0, len(values), size):
            yield values[start : start + size]

    return stream
