import numpy as np
import pandas as pd

from .. import data
from ..backtest import run
from ..trials import strategy
from .common import INDEX_COST, PORTFOLIO_COST, monthly_sum, par_bond_returns, rank_weights, tbill_trading_daily, tercile_weights
from .fx_commodity import fx_excess
from .legacy import ETF_COST, TSMOM_UNIVERSE

ETF = dict(family="ETFs and Macro", asset="ETFs", cost="5 bps per unit traded")


@strategy("etf-paired-switching", pub=2011, rf="ff_m", benchmark="spy_m", **ETF)
def paired_switching():
    pm = data.etf_prices(["SPY", "TLT"]).resample("ME").last().dropna()
    past = pm.pct_change(3, fill_method=None).dropna()
    quarter_end = past[past.index.month % 3 == 0]
    w = rank_weights(quarter_end, 1, 0)
    return run(w, pm.pct_change(fill_method=None).loc[w.index[0]:], ETF_COST)


@strategy("etf-asset-class-momentum-rotation", pub=2010, rf="ff_m", benchmark="spy_m", **ETF)
def asset_class_rotation():
    pm = data.etf_prices(TSMOM_UNIVERSE).resample("ME").last()
    score = sum(pm.pct_change(k, fill_method=None) for k in (1, 3, 6, 12)) / 4.0
    w = rank_weights(score, 3, 0, min_assets=8)
    return run(w, pm.pct_change(fill_method=None).loc[w.index[0]:], ETF_COST, data.rf_monthly())


@strategy("etf-sector-momentum", pub=2010, rf="ff_m", benchmark="mkt_m", family="ETFs and Macro", asset="US sectors", cost="10 bps per unit traded",
          note="Ten French industries stand in for sector ETFs")
def sector_momentum():
    ind = data.french_lib("10_Industry_Portfolios")
    past = (1 + ind).rolling(12).apply(np.prod, raw=True) - 1
    w = rank_weights(past, 3, 0)
    return run(w, ind.loc[w.index[0]:], PORTFOLIO_COST)


def trend_assets():
    out = {"equity": data.ff_monthly()["Mkt-RF"]}
    rf = data.rf_monthly()
    y10 = (data.fred("DGS10") / 100.0).resample("ME").last()
    bond = par_bond_returns(y10, 10)
    out["bond"] = bond - rf.reindex(bond.index)
    fx = fx_excess()
    for c in ["JP", "GB", "CH", "CA", "XM"]:
        out[f"fx_{c}"] = fx[c]
    return pd.DataFrame(out)


@strategy("etf-century-of-trend", pub=2017, family="Futures and CTA", asset="multi-asset", cost="5 bps per unit traded",
          note="US equity from 1926, 10-year Treasury from 1962, five currencies from the 1970s; the paper uses 67 markets")
def century_of_trend():
    x = trend_assets()
    level = (1 + x.fillna(0.0)).cumprod().where(x.notna())
    signal = sum(np.sign(level.pct_change(k, fill_method=None)) for k in (1, 3, 12)) / 3.0
    vol = x.rolling(12).std() * np.sqrt(12)
    raw = signal * (0.10 / vol)
    w = raw.div(raw.notna().sum(axis=1).replace(0, np.nan), axis=0).dropna(how="all").fillna(0.0)
    return run(w, x.loc[w.index[0]:], INDEX_COST)


def jst_usd_returns():
    fx = data.jst_panel("xrusd")
    move = fx.shift(1) / fx
    usd = (1 + data.jst_panel("eq_tr")) * move.where((move > 0.2) & (move < 5)) - 1
    return usd.where(usd < 3).dropna(how="all")


def jst_excess():
    usd = jst_usd_returns()
    return usd.sub(data.jst_panel("bill_rate")["USA"].reindex(usd.index), axis=0).dropna(how="all")


JST = dict(family="ETFs and Macro", asset="Country equity indexes", ppy=1, cost="20 bps per unit traded",
           note="JST annual equity returns in USD over the US bill, 18 countries, top minus bottom third; years with a fivefold currency move or redenomination dropped, and one 700% post-war reopening year")


@strategy("etf-country-momentum", pub=1997, **JST)
def country_momentum():
    x = jst_excess()
    w = tercile_weights(jst_usd_returns().reindex(x.index).where(x.notna()))
    return run(w, x.loc[w.index[0]:], 20.0)


@strategy("etf-country-cape", pub=2012, **{**JST, "note": JST["note"] + "; dividend yield stands in for CAPE"})
def country_value():
    x = jst_excess()
    w = tercile_weights(data.jst_panel("eq_dp").reindex(x.index).where(x.notna()))
    return run(w, x.loc[w.index[0]:], 20.0)


@strategy("fu-equity-index-mean-reversion", pub=1997, **JST)
def country_reversal():
    x = jst_excess()
    past = (1 + jst_usd_returns().reindex(x.index)).rolling(3).apply(np.prod, raw=True) - 1
    w = tercile_weights(-past.where(x.notna()))
    return run(w, x.loc[w.index[0]:], 20.0)


def _daily_etf_run(weights, tickers):
    px = data.etf_prices(tickers)
    r = px.pct_change(fill_method=None)
    w = weights.dropna(how="all").fillna(0.0)
    return run(w, r.loc[w.index[0]:], ETF_COST, tbill_trading_daily(r.index))


@strategy("fu-donchian-breakout", pub=2007, ppy=252, rf="tb_252", family="Futures and CTA", asset="ETFs", cost="5 bps per unit traded",
          note="Long and short, 55-day entry and 20-day exit channels on 12 ETFs")
def donchian_breakout():
    px = data.etf_prices(TSMOM_UNIVERSE)
    pos = {}
    for t in px.columns:
        p = px[t].dropna()
        hi_in, lo_in = p.rolling(55).max().shift(1), p.rolling(55).min().shift(1)
        hi_out, lo_out = p.rolling(20).max().shift(1), p.rolling(20).min().shift(1)
        state, out = 0.0, []
        for price, a, b, c, d in zip(p.values, hi_in.values, lo_in.values, hi_out.values, lo_out.values):
            if np.isnan(a):
                out.append(np.nan)
                continue
            if state > 0 and price < d:
                state = 0.0
            elif state < 0 and price > c:
                state = 0.0
            if state == 0 and price > a:
                state = 1.0
            elif state == 0 and price < b:
                state = -1.0
            out.append(state)
        pos[t] = pd.Series(out, index=p.index)
    w = pd.DataFrame(pos) / len(TSMOM_UNIVERSE)
    return _daily_etf_run(w, TSMOM_UNIVERSE)


@strategy("etf-ibs-mean-reversion", pub=2013, ppy=252, rf="tb_252", benchmark="spy_d", family="ETFs and Macro", asset="ETFs", cost="5 bps per unit traded",
          note="SPY and QQQ, long the next session when internal bar strength is under 0.2")
def ibs_reversion():
    w = {}
    for t in ["SPY", "QQQ"]:
        o = data.etf_ohlc(t)
        ibs = (o["Close"] - o["Low"]) / (o["High"] - o["Low"]).replace(0, np.nan)
        w[t] = (ibs < 0.2).astype(float).where(ibs.notna()) * 0.5
    return _daily_etf_run(pd.DataFrame(w), ["SPY", "QQQ"])


@strategy("ta-oscillator-reversion", pub=2008, ppy=252, rf="tb_252", benchmark="spy_d", family="Technical Analysis", asset="ETFs", cost="5 bps per unit traded",
          note="SPY: buy when 2-day RSI is under 10 above the 200-day mean, exit above the 5-day mean")
def rsi2_reversion():
    p = data.etf_prices(["SPY"])["SPY"].dropna()
    delta = p.diff()
    up = delta.clip(lower=0).ewm(alpha=0.5, adjust=False).mean()
    down = (-delta.clip(upper=0)).ewm(alpha=0.5, adjust=False).mean()
    rsi = 100 - 100 / (1 + up / down.replace(0, np.nan))
    ma200, ma5 = p.rolling(200).mean(), p.rolling(5).mean()
    state, out = 0.0, []
    for price, r, slow, fast in zip(p.values, rsi.values, ma200.values, ma5.values):
        if np.isnan(slow):
            out.append(np.nan)
            continue
        if state == 0 and r < 10 and price > slow:
            state = 1.0
        elif state == 1 and price > fast:
            state = 0.0
        out.append(state)
    return _daily_etf_run(pd.Series(out, index=p.index).to_frame("SPY"), ["SPY"])


@strategy("op-short-index-vol", pub=2009, family="Options and Volatility", asset="S&P 500 variance", cost="Sold half a vol point under VIX",
          turnover_est=12.0, note="Synthetic one-month variance swap: VIX squared against SPY realized variance, three units of variance notional")
def short_index_variance():
    vix = (data.fred("VIXCLS") / 100.0).resample("ME").last()
    spy = np.log(data.etf_prices(["SPY"])["SPY"].dropna()).diff()
    rv = monthly_sum((spy ** 2).dropna())
    sold = ((vix - 0.005) ** 2 / 12.0).shift(1)
    return (3.0 * (sold - rv)).dropna(), None
