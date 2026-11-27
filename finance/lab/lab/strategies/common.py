import numpy as np
import pandas as pd

from .. import data
from ..backtest import run

TIER_COST = {"annual": 0.0008, "quarterly": 0.0020, "monthly": 0.0030, "momentum": 0.0065, "reversal": 0.0150}
TIER_TURNOVER = {"annual": 1.0, "quarterly": 2.4, "monthly": 3.6, "momentum": 8.2, "reversal": 21.6}
INDEX_COST = 5.0
PORTFOLIO_COST = 10.0
BOND_COST = 2.0
FX_COST = 10.0
BINANCE_COST = 10.0


def haircut(gross, tier):
    return (gross - TIER_COST[tier]).dropna(), None


def tier_label(tier):
    return f"{TIER_COST[tier] * 1e4:.0f} bps a month haircut, {tier} tier"


def timed(asset, on, cash, cost_bps=INDEX_COST):
    on = on.reindex(asset.index).astype(float)
    w = on.to_frame("a").dropna()
    r = asset.to_frame("a").loc[w.index[0]:]
    return run(w, r, cost_bps, cash)


def rank_weights(score, n_long, n_short=None, min_assets=None):
    n_short = n_long if n_short is None else n_short
    need = min_assets or (n_long + n_short)
    rows = {}
    for dt, row in score.iterrows():
        row = row.dropna()
        if len(row) < need:
            continue
        ranked = row.sort_values(kind="mergesort")
        w = pd.Series(0.0, index=score.columns)
        w[ranked.index[-n_long:]] = 1.0 / n_long
        if n_short:
            w[ranked.index[:n_short]] -= 1.0 / n_short
        rows[dt] = w
    return pd.DataFrame(rows).T


def tercile_weights(score, min_assets=6):
    rows = {}
    for dt, row in score.iterrows():
        row = row.dropna()
        if len(row) < min_assets:
            continue
        k = max(1, len(row) // 3)
        ranked = row.sort_values(kind="mergesort")
        w = pd.Series(0.0, index=score.columns)
        w[ranked.index[-k:]] = 1.0 / k
        w[ranked.index[:k]] = -1.0 / k
        rows[dt] = w
    return pd.DataFrame(rows).T


def bets_to_periods(dates, roi, freq, exposure, per_bet=0.01):
    s = pd.Series(np.asarray(roi, dtype=float), index=pd.DatetimeIndex(dates))
    g = s.groupby(pd.Grouper(freq=freq))
    n = g.size()
    stake = np.minimum(per_bet, exposure / n.replace(0, np.nan)).fillna(0.0)
    r = (g.sum() * stake).fillna(0.0)
    r.attrs["n_bets"] = int(len(s))
    r.attrs["roi_per_bet"] = float(s.mean()) if len(s) else float("nan")
    return r, 2 * stake * n


def expanding_forecast(x, y_fwd, horizon, min_obs=60):
    x = pd.DataFrame(x)
    df = x.join(y_fwd.rename("y"), how="left")
    cols = list(x.columns)
    xs = np.column_stack([np.ones(len(df)), df[cols].to_numpy(dtype=float)])
    ys = df["y"].to_numpy(dtype=float)
    ok = np.isfinite(xs).all(axis=1)
    out = np.full(len(df), np.nan)
    for i in range(len(df)):
        end = i - horizon + 1
        if end < min_obs or not ok[i]:
            continue
        m = ok[:end] & np.isfinite(ys[:end])
        if m.sum() < min_obs:
            continue
        beta = np.linalg.lstsq(xs[:end][m], ys[:end][m], rcond=None)[0]
        out[i] = xs[i] @ beta
    return pd.Series(out, index=df.index)


def par_bond_returns(yields, maturity_years):
    y = yields.dropna()
    y0 = y.shift(1)
    m = 2 * (maturity_years - 1.0 / 12.0)
    disc = (1 + y / 2) ** -m
    price = (y0 / y) * (1 - disc) + disc
    price = price.where(y.abs() > 1e-9, 1 + y0 * m / 2)
    return (price - 1 + y0 / 12.0).dropna()


def duration(yields, maturity_years):
    y = yields.clip(lower=1e-4)
    return (1 - (1 + y / 2) ** (-2 * maturity_years)) / y


def cmt_monthly(series):
    return (data.fred_frame(series) / 100.0).resample("ME").last()


def monthly_sum(daily):
    out = daily.groupby(daily.index.to_period("M")).sum()
    out.index = out.index.to_timestamp() + pd.offsets.MonthEnd(0)
    return out


def tbill_trading_daily(index):
    tb = data.fred("DTB3").reindex(index).ffill()
    return (tb / 100.0 / 252.0).shift(1).fillna(0.0)
