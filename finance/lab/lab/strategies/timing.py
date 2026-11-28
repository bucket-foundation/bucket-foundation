import numpy as np
import pandas as pd

from .. import data
from ..backtest import run
from ..trials import strategy
from .common import INDEX_COST, expanding_forecast, monthly_sum, timed
from .legacy import shiller_returns

MKT = dict(family="ETFs and Macro", asset="US equity index", cost="5 bps per unit traded")
DAILY = dict(ppy=252, rf="ff_d", benchmark="mkt_d")
MONTHLY = dict(rf="ff_m", benchmark="mkt_m")


def _hold_days(flag):
    mkt = data.market_daily()
    w = flag.reindex(mkt.index).fillna(False).astype(float).shift(-1).dropna().to_frame("a")
    return run(w, mkt.to_frame("a"), INDEX_COST, data.rf_daily())


@strategy("eq-turn-of-month", pub=1988, **DAILY, **MKT)
def turn_of_month():
    idx = data.market_daily().index
    s = pd.Series(idx, index=idx)
    ym = idx.to_period("M")
    rank_from_start = s.groupby(ym).cumcount()
    rank_from_end = s.groupby(ym).cumcount(ascending=False)
    return _hold_days((rank_from_start < 3) | (rank_from_end == 0))


@strategy("etf-pre-holiday", pub=1990, **DAILY, **MKT,
          note="Pre-holiday days read from the trading calendar: the next session skips exactly one weekday")
def pre_holiday():
    idx = data.market_daily().index
    nxt = pd.Series(idx, index=idx).shift(-1)
    missing = [np.busday_count(a.date(), b.date()) - 1 if pd.notna(b) else 0 for a, b in zip(idx, nxt)]
    return _hold_days(pd.Series(np.array(missing) == 1, index=idx))


@strategy("op-opex-week", pub=2013, **DAILY, family="Options and Volatility", asset="US equity index", cost="5 bps per unit traded",
          note="Whole market stands in for the S&P 100")
def opex_week():
    idx = data.market_daily().index
    friday = idx + pd.to_timedelta((4 - idx.dayofweek) % 7, unit="D")
    third = (friday.day >= 15) & (friday.day <= 21) & (idx.dayofweek <= 4)
    return _hold_days(pd.Series(third, index=idx))


@strategy("ta-price-above-ma", pub=1992, **DAILY, family="Technical Analysis", asset="US equity index", cost="5 bps per unit traded",
          claim="Brock, Lakonishok and LeBaron found buy signals followed by higher returns than sell signals on the Dow, 1897 to 1986")
def price_above_ma200():
    mkt = data.market_daily()
    level = (1 + mkt).cumprod()
    on = (level > level.rolling(200).mean()).where(level.rolling(200).mean().notna())
    return timed(mkt, on.dropna(), data.rf_daily())


@strategy("ta-two-ma-crossover", pub=1992, **DAILY, family="Technical Analysis", asset="US equity index", cost="5 bps per unit traded",
          claim="Brock, Lakonishok and LeBaron found buy signals followed by higher returns than sell signals on the Dow, 1897 to 1986")
def ma_cross_50_200():
    mkt = data.market_daily()
    level = (1 + mkt).cumprod()
    slow = level.rolling(200).mean()
    on = (level.rolling(50).mean() > slow).where(slow.notna())
    return timed(mkt, on.dropna(), data.rf_daily())


@strategy("etf-sell-in-may", pub=2002, **MONTHLY, **MKT)
def sell_in_may():
    mkt = data.market_monthly()
    nxt = (mkt.index + pd.offsets.MonthEnd(1)).month
    on = pd.Series(np.isin(nxt, [11, 12, 1, 2, 3, 4]), index=mkt.index)
    return timed(mkt, on, data.rf_monthly())


@strategy("etf-january-barometer", pub=2006, **MONTHLY, **MKT)
def january_barometer():
    mkt = data.market_monthly()
    jan = mkt[mkt.index.month == 1]
    positive = pd.Series(mkt.index.year, index=mkt.index).map(dict(zip(jan.index.year, jan > 0)))
    on = positive.where(mkt.index.month != 12, True).dropna().astype(bool)
    return timed(mkt, on, data.rf_monthly())


@strategy("etf-volatility-targeting", pub=2017, **MONTHLY, **MKT, note="Weight is inverse realized variance over its own expanding mean, so the average weight is one with no look-ahead")
def volatility_managed_market():
    d = data.ff_daily()["Mkt-RF"]
    rv = monthly_sum(d ** 2)
    w = (1.0 / rv / (1.0 / rv).expanding(min_periods=12).mean()).dropna().to_frame("a")
    mkt = data.market_monthly()
    return run(w, mkt.to_frame("a").loc[w.index[0]:], INDEX_COST, data.rf_monthly())


@strategy("etf-fed-model", pub=1997, rf="zero", benchmark="shiller_stock", family="ETFs and Macro", asset="US stocks and bonds", cost="10 bps per unit traded",
          note="Shiller monthly averages; earnings lagged six months and the signal one extra month")
def fed_model():
    s = data.shiller()
    gap = (s["E"].shift(6) / s["P"] - s["GS10"] / 100.0).dropna()
    in_stock = (gap > 0).astype(float).shift(1).dropna()
    d = shiller_returns()
    w = pd.DataFrame({"stock": in_stock, "bond": 1 - in_stock})
    return run(w, d[["stock", "bond"]].loc[w.index[0]:], 10.0)


@strategy("etf-oil-predicts-equity", pub=2008, **MONTHLY, **MKT, note="Expanding regression of next-month excess return on the oil price change, from 1973")
def oil_predicts_equity():
    oil = data.pinksheet()["Crude oil, WTI"].loc["1973":].pct_change(fill_method=None)
    ex = data.ff_monthly()["Mkt-RF"]
    df = pd.DataFrame({"oil": oil, "fwd": ex.shift(-1)}).dropna(subset=["oil"])
    pred = expanding_forecast(df[["oil"]], df["fwd"], 1, min_obs=60).dropna()
    return timed(data.market_monthly(), pred > 0, data.rf_monthly())
