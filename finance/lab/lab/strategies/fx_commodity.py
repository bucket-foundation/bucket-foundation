import numpy as np
import pandas as pd

from .. import data
from ..backtest import run
from ..trials import strategy
from .common import FX_COST, PORTFOLIO_COST, rank_weights, tercile_weights

FX = dict(family="FX", asset="10 currencies vs USD", cost="10 bps per unit traded",
          note="FRED spot plus BIS policy-rate differential; five developed and five emerging currencies")
CPI_ISO = {"BR": "BRA", "CA": "CAN", "CN": "CHN", "IN": "IND", "JP": "JPN", "KR": "KOR", "MX": "MEX", "CH": "CHE", "XM": "DEU", "GB": "GBR"}


def rate_diff():
    rates = data.policy_rates()
    return rates[list(data.FX_SERIES)].sub(rates["US"], axis=0)


def fx_excess():
    spot = data.fx_spot_monthly()
    diff = rate_diff().reindex(spot.index)
    return (spot.pct_change(fill_method=None) + diff.shift(1) / 12.0).dropna(how="all")


def carry_weights():
    return rank_weights(rate_diff().reindex(fx_excess().index).where(fx_excess().notna()), 3, 3, min_assets=6)


def momentum_weights():
    x = fx_excess()
    level = (1 + x.fillna(0.0)).cumprod().where(x.notna())
    return rank_weights(level.pct_change(12, fill_method=None), 3, 3, min_assets=6)


@strategy("fx-carry", pub=2011, **FX)
def fx_carry():
    w = carry_weights()
    return run(w, fx_excess().loc[w.index[0]:], FX_COST)


@strategy("fx-momentum", pub=2012, **FX)
def fx_momentum():
    w = momentum_weights()
    return run(w, fx_excess().loc[w.index[0]:], FX_COST)


@strategy("fx-momentum-carry-combo", pub=2015, **FX)
def fx_momentum_carry():
    c, m = carry_weights(), momentum_weights()
    w = (0.5 * c).add(0.5 * m, fill_value=0.0).loc[max(c.index[0], m.index[0]):]
    return run(w, fx_excess().loc[w.index[0]:], FX_COST)


@strategy("fx-dollar-carry", pub=2014, **FX)
def fx_dollar_carry():
    x = fx_excess()
    avg = rate_diff().reindex(x.index).where(x.notna()).mean(axis=1)
    n = x.notna().sum(axis=1).replace(0, np.nan)
    w = x.notna().astype(float).mul(np.sign(avg) / n, axis=0).dropna(how="all")
    w = w[n.reindex(w.index) >= 4]
    return run(w, x.loc[w.index[0]:], FX_COST)


@strategy("fx-value-ppp", pub=2013, **{**FX, "note": FX["note"] + "; value is the five-year fall in the real exchange rate, annual CPI lagged a year"})
def fx_value():
    x = fx_excess()
    spot = np.log(data.fx_spot_monthly())
    cpi = np.log(data.wdi("FP.CPI.TOTL"))
    rel = pd.DataFrame({c: cpi[iso] - cpi["USA"] for c, iso in CPI_ISO.items()})
    rel.index = rel.index + pd.offsets.MonthEnd(12)
    rel = rel.reindex(spot.index, method="ffill")
    real = spot + rel
    value = -(real - real.shift(60))
    w = rank_weights(value.reindex(x.index).where(x.notna()), 3, 3, min_assets=6)
    return run(w, x.loc[w.index[0]:], FX_COST)


COMMODITIES = ["Crude oil, WTI", "Natural gas, US", "Coal, Australian", "Cocoa", "Coffee, Arabica", "Soybeans", "Maize", "Wheat, US HRW",
               "Sugar, world", "Cotton, A Index", "Rubber, RSS3", "Aluminum", "Copper", "Lead", "Tin", "Nickel", "Zinc", "Gold", "Platinum",
               "Silver", "Palm oil", "Rice, Thai 5%", "Beef", "Iron ore, cfr spot"]


@strategy("cm-momentum", pub=2007, family="Commodities", asset="Spot commodities", cost="10 bps per unit traded",
          note="World Bank monthly average spot prices with one month skipped; no futures roll, so this is a spot proxy and cannot be traded as shown")
def commodity_momentum():
    px = data.pinksheet()
    px = px[[c for c in COMMODITIES if c in px.columns]]
    r = px.pct_change(fill_method=None)
    past = px.shift(1).pct_change(12, fill_method=None)
    w = tercile_weights(past, min_assets=12)
    return run(w, r.loc[w.index[0]:], PORTFOLIO_COST)
