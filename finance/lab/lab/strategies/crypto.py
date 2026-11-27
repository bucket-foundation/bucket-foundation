import numpy as np
import pandas as pd

from .. import data
from ..backtest import run
from ..trials import strategy
from .common import BINANCE_COST, rank_weights

CY = dict(family="Crypto", asset="Binance spot, 30 coins", cost="10 bps per unit traded")
NAIVE_CARD = "cy-ax-optimal-vs-naive-diversification-in-the-cryptocurr"
PAIRS_CARD = "cy-ax-evaluation-of-dynamic-cointegration-based-pairs-tr"


def seasoned(px, days=60):
    return px.where(px.notna().cumsum() > days)


@strategy("cy-cross-section-factors", pub=2022, ppy=52, **CY,
          note="Three-week momentum, top five minus bottom five, weekly; no size leg without market caps; shorts need perpetuals")
def crypto_xs_momentum():
    wk = seasoned(data.crypto_panel()).resample("W-SUN").last()
    w = rank_weights(wk.pct_change(3, fill_method=None), 5, 5, min_assets=15)
    return run(w, wk.pct_change(fill_method=None).loc[w.index[0]:], BINANCE_COST)


@strategy("cy-intraday-seasonality", pub=2019, ppy=365, family="Crypto", asset="BTC", cost="10 bps per side, two trades a day",
          turnover_est=365.0, note="Long BTC from 21:00 to 23:00 UTC each day")
def btc_evening_hours():
    h = data.crypto_panel(freq="1h")["BTC"].dropna()
    entry = h[h.index.hour == 20]
    exit_ = h[h.index.hour == 22]
    entry.index, exit_.index = entry.index.normalize(), exit_.index.normalize()
    r = (exit_ / entry - 1).dropna()
    return r - 2 * BINANCE_COST / 1e4, pd.Series(2.0, index=r.index)


@strategy("cy-rebalancing", pub=2021, **CY, note="Monthly equal-weight rebalance minus the same basket left to drift within each calendar year")
def crypto_rebalancing_premium():
    pm = seasoned(data.crypto_panel()).resample("ME").last()
    r = pm.pct_change(fill_method=None)
    out, trades = {}, {}
    for year, block in r.groupby(r.index.year):
        start = pm[pm.index.year == year - 1].tail(1)
        names = [c for c in r.columns if len(start) and pd.notna(start[c].iloc[0])]
        if len(names) < 5:
            continue
        drift = np.ones(len(names)) / len(names)
        for dt, row in block[names].fillna(0.0).iterrows():
            rebalanced = row.mean()
            held = float(drift @ row.values)
            trade = np.abs(drift - 1.0 / len(names)).sum()
            out[dt] = rebalanced - held - trade * BINANCE_COST / 1e4
            trades[dt] = trade
            drift = drift * (1 + row.values) / (1 + held)
    return pd.Series(out), pd.Series(trades)


@strategy("cy-stablecoin-flows", pub=2020, ppy=365, rf="tb_365", benchmark="btc_d", family="Crypto", asset="BTC", cost="25 bps per unit traded",
          note="Long BTC when total stablecoin supply grew over the prior 30 days, supply lagged one day")
def stablecoin_flow_btc():
    px = data.crypto_daily("BTC")
    supply = data.stablecoin_supply().shift(1)
    on = (supply.pct_change(30, fill_method=None) > 0).where(supply.shift(30).notna()).dropna()
    on = on.reindex(px.index).dropna().astype(float).to_frame("BTC")
    r = px.pct_change(fill_method=None).to_frame("BTC").loc[on.index[0]:]
    rf = data.tbill_daily(r.index)
    rf.index = r.index
    return run(on, r, 25.0, rf)


@strategy(NAIVE_CARD, pub=2018, rf="ff_m", benchmark="btc_m", **CY, note="Equal weight across listed coins, monthly rebalance, long only")
def crypto_equal_weight():
    pm = seasoned(data.crypto_panel()).resample("ME").last()
    live = pm.notna().astype(float)
    w = live.div(live.sum(axis=1).replace(0, np.nan), axis=0).dropna(how="all")
    w = w[live.sum(axis=1).reindex(w.index) >= 5]
    return run(w, pm.pct_change(fill_method=None).loc[w.index[0]:], BINANCE_COST)


@strategy(PAIRS_CARD, pub=2021, ppy=365, family="Crypto", asset="BTC and ETH", cost="10 bps per unit traded",
          note="60-day z-score of the log ETH/BTC ratio: enter at 2, exit at 0; fixed 60-day window in place of the rolling cointegration test")
def btc_eth_pairs():
    px = data.crypto_panel()[["BTC", "ETH"]].dropna()
    ratio = np.log(px["ETH"] / px["BTC"])
    z = (ratio - ratio.rolling(60).mean()) / ratio.rolling(60).std()
    state, out = 0.0, []
    for v in z.values:
        if np.isnan(v):
            out.append(np.nan)
            continue
        if state == 0 and v > 2:
            state = -1.0
        elif state == 0 and v < -2:
            state = 1.0
        elif state * v > 0:
            state = 0.0
        out.append(state)
    pos = pd.Series(out, index=z.index).dropna()
    w = pd.DataFrame({"ETH": 0.5 * pos, "BTC": -0.5 * pos})
    return run(w, px.pct_change(fill_method=None).loc[w.index[0]:], BINANCE_COST)
