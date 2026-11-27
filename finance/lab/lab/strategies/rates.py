import numpy as np
import pandas as pd

from .. import data
from ..backtest import run
from ..trials import strategy
from .common import BOND_COST, cmt_monthly, duration, expanding_forecast, par_bond_returns

RT = dict(family="Rates", asset="US Treasuries", cost="2 bps per unit traded",)
MATS = {"DGS2": 2, "DGS3": 3, "DGS5": 5, "DGS7": 7, "DGS10": 10}


def bond_excess(series_to_maturity):
    y = cmt_monthly(list(series_to_maturity))
    rf = data.rf_monthly()
    out = {}
    for s, n in series_to_maturity.items():
        r = par_bond_returns(y[s], n)
        out[s] = r - rf.reindex(r.index)
    return y, pd.DataFrame(out)


@strategy("rt-bond-carry", pub=2018, **RT, note="Yield over the 3-month bill per unit of duration; legs sized to five years of duration")
def bond_carry():
    y, xr = bond_excess(MATS)
    short = cmt_monthly(["DTB3"])["DTB3"]
    dur = pd.DataFrame({s: duration(y[s], n) for s, n in MATS.items()})
    carry = y.sub(short, axis=0).div(dur)
    rows = {}
    for dt, row in carry.dropna(thresh=4).iterrows():
        row = row.dropna()
        w = pd.Series(0.0, index=carry.columns)
        w[row.idxmax()] = 5.0 / dur.loc[dt, row.idxmax()]
        w[row.idxmin()] = -5.0 / dur.loc[dt, row.idxmin()]
        rows[dt] = w
    w = pd.DataFrame(rows).T
    return run(w, xr.loc[w.index[0]:], BOND_COST)


@strategy("rt-cochrane-piazzesi", pub=2005, **RT,
          note="Par yields treated as zero yields, 4-year point interpolated; expanding fit with 12-month targets ended before each forecast date")
def cochrane_piazzesi():
    y = cmt_monthly(["DGS1", "DGS2", "DGS3", "DGS5"])
    z = pd.DataFrame({1: y["DGS1"], 2: y["DGS2"], 3: y["DGS3"], 4: (y["DGS3"] + y["DGS5"]) / 2, 5: y["DGS5"]}).dropna()
    fwd = pd.DataFrame({f"f{n}": n * z[n] - (n - 1) * z[n - 1] for n in range(2, 6)})
    x = fwd.assign(y1=z[1])
    rx = pd.DataFrame({n: n * z[n] - (n - 1) * z[n - 1].shift(-12) - z[1] for n in range(2, 6)}).mean(axis=1, skipna=False)
    pred = expanding_forecast(x, rx, 12, min_obs=120).dropna()
    _, xr = bond_excess({"DGS5": 5})
    w = np.sign(pred).to_frame("DGS5")
    return run(w, xr.loc[w.index[0]:], BOND_COST)


@strategy("rt-bond-value", pub=2013, **RT, note="US only: long the 10-year when its real yield sits above the expanding median; the paper ranks countries")
def bond_value():
    y, xr = bond_excess({"DGS10": 10})
    cpi = data.fred("CPIAUCSL").resample("ME").last()
    infl = cpi.pct_change(12, fill_method=None).shift(1)
    real = (y["DGS10"] - infl.reindex(y.index)).dropna()
    w = (real > real.expanding(min_periods=60).median()).astype(float).where(real.expanding().count() >= 60).dropna().to_frame("DGS10")
    return run(w, xr.loc[w.index[0]:], BOND_COST)


@strategy("rt-low-risk-bonds", pub=2014, **RT, note="Long the 2-year levered to the 10-year's duration, short the 10-year")
def low_risk_bonds():
    y, xr = bond_excess({"DGS2": 2, "DGS10": 10})
    ratio = (duration(y["DGS10"], 10) / duration(y["DGS2"], 2)).dropna()
    w = pd.DataFrame({"DGS2": ratio, "DGS10": -1.0})
    return run(w, xr.loc[w.index[0]:], BOND_COST)


@strategy("cr-credit-risk-premium", pub=2017, family="Credit", asset="US investment-grade credit", cost="5 bps per unit traded",
          note="LQD minus IEF, rebalanced monthly; durations differ by about a year")
def credit_risk_premium():
    r = data.monthly_returns(data.etf_prices(["LQD", "IEF"])).dropna()
    w = pd.DataFrame({"LQD": 1.0, "IEF": -1.0}, index=r.index)
    return run(w, r, 5.0)
