import math

import numpy as np
import pandas as pd
from scipy.stats import norm

EULER_GAMMA = 0.5772156649015329


def cagr(r, periods_per_year):
    r = pd.Series(r).dropna()
    if len(r) == 0:
        return float("nan")
    growth = float(np.prod(1 + r))
    if growth <= 0:
        return -1.0
    return growth ** (periods_per_year / len(r)) - 1


def ann_vol(r, periods_per_year):
    return float(pd.Series(r).dropna().std(ddof=1) * math.sqrt(periods_per_year))


def sharpe(r, periods_per_year, rf=None):
    r = pd.Series(r).dropna()
    if rf is not None:
        r = (r - pd.Series(rf).reindex(r.index).fillna(0.0))
    sd = r.std(ddof=1)
    if sd == 0 or np.isnan(sd):
        return float("nan")
    return float(r.mean() / sd * math.sqrt(periods_per_year))


def max_drawdown(r):
    wealth = (1 + pd.Series(r).dropna()).cumprod()
    peak = wealth.cummax().clip(lower=1.0)
    return float((wealth / peak - 1).min())


def turnover(trades, periods_per_year):
    t = pd.Series(trades).dropna()
    return float(t.mean() * periods_per_year / 2) if len(t) else 0.0


def expected_max_sharpe(n_trials, sr_variance):
    if n_trials <= 1:
        return 0.0
    a = norm.ppf(1 - 1.0 / n_trials)
    b = norm.ppf(1 - 1.0 / (n_trials * math.e))
    return math.sqrt(sr_variance) * ((1 - EULER_GAMMA) * a + EULER_GAMMA * b)


def probabilistic_sharpe(r, sr_benchmark=0.0):
    r = pd.Series(r).dropna()
    n = len(r)
    sr = r.mean() / r.std(ddof=1)
    skew = float(r.skew())
    kurt = float(r.kurt()) + 3.0
    denom = math.sqrt(max(1e-12, 1 - skew * sr + (kurt - 1) / 4.0 * sr ** 2))
    return float(norm.cdf((sr - sr_benchmark) * math.sqrt(n - 1) / denom))


def deflated_sharpe(r, n_trials, trial_sharpes=None):
    r = pd.Series(r).dropna()
    if trial_sharpes is not None and len(trial_sharpes) > 1:
        var = float(np.var(trial_sharpes, ddof=1))
    else:
        var = 1.0 / (len(r) - 1)
    sr0 = expected_max_sharpe(n_trials, var)
    return probabilistic_sharpe(r, sr0)


def summarize(r, periods_per_year, trades=None, n_trials=1, trial_sharpes=None, rf=None):
    r = pd.Series(r).dropna()
    excess = r - pd.Series(rf).reindex(r.index).fillna(0.0) if rf is not None else r
    return {
        "start": str(r.index[0])[:10],
        "end": str(r.index[-1])[:10],
        "cagr": cagr(r, periods_per_year),
        "vol": ann_vol(r, periods_per_year),
        "sharpe": sharpe(excess, periods_per_year),
        "max_dd": max_drawdown(r),
        "turnover": turnover(pd.Series(trades).reindex(r.index), periods_per_year) if trades is not None else float("nan"),
        "dsr": deflated_sharpe(excess, n_trials, trial_sharpes),
    }
