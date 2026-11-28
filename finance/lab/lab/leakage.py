import numpy as np
import pandas as pd

from . import backtest, data

CALENDAR_ONLY = {"turn_of_month", "pre_holiday", "opex_week"}


def recorded(fn, asof=None):
    previous = data.ASOF, backtest.RECORD
    data.ASOF, backtest.RECORD = asof, []
    try:
        r = pd.Series(fn()[0]).dropna()
        return r, backtest.RECORD
    finally:
        data.ASOF, backtest.RECORD = previous


def frame_gap(a, b):
    if not a.index.isin(b.index).all():
        return float("inf")
    b = b.reindex(index=a.index, columns=a.columns)
    if b.isna().to_numpy().any():
        return float("inf")
    return float(np.abs(a.to_numpy(dtype=float) - b.to_numpy(dtype=float)).max()) if a.size else 0.0


def gap_at(fn, ppy, fraction, calendar_only=False):
    full, weights = recorded(fn)
    grid = weights[0].index if weights else full.index
    cut = grid[int(len(grid) * fraction)]
    if not weights:
        cut = cut + pd.offsets.MonthEnd(0)
    truncated, cut_weights = recorded(fn, cut)
    buffer = pd.Timedelta(days=400 if ppy == 1 else 45)
    if len(truncated) and truncated.index.max() > cut + pd.Timedelta(days=31):
        return float("inf"), 0
    a = full[full.index <= cut - buffer]
    gap = frame_gap(a.to_frame("r"), truncated.to_frame("r")) if len(a) else float("nan")
    n = len(a)
    if len(weights) != len(cut_weights):
        return float("inf"), n
    for w_full, w_cut in zip(weights, cut_weights):
        known = w_full[w_full.index < cut - pd.Timedelta(days=7)] if calendar_only else w_full[w_full.index <= cut]
        gap = max(gap, frame_gap(known, w_cut))
        n += len(known)
    return gap, n


def max_gap(fn, ppy, fractions=(0.5, 0.6, 0.7), calendar_only=False):
    results = [gap_at(fn, ppy, f, calendar_only) for f in fractions]
    return max(g for g, _ in results), min(n for _, n in results)
