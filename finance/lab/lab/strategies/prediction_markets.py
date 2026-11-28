import numpy as np
import pandas as pd

from .. import data
from ..prediction import kalshi_fee
from ..trials import strategy
from .common import bets_to_periods

SPREAD = 0.01
PM = dict(family="Prediction Markets", pub=2010)
KALSHI = dict(asset="Kalshi, all settled binaries with volume of 100 or more", ppy=365, **PM,
              cost="Kalshi fee ceil(0.07 p (1-p)) plus 1 cent of spread per contract")


def kalshi_side_bets(lo, hi):
    k = data.kalshi_history()
    k = k[(k["p_prev"] >= 0.02) & (k["p_prev"] <= 0.98)]
    yes = k[(k["p_prev"] >= lo) & (k["p_prev"] <= hi)]
    no = k[(1 - k["p_prev"] >= lo) & (1 - k["p_prev"] <= hi)]
    bets = pd.concat([pd.DataFrame({"close": yes["close"], "p": yes["p_prev"], "won": yes["won"]}),
                      pd.DataFrame({"close": no["close"], "p": 1 - no["p_prev"], "won": 1 - no["won"]})])
    paid = bets["p"] + SPREAD + kalshi_fee(bets["p"] + SPREAD)
    bets["roi"] = bets["won"] / paid - 1
    return bets


@strategy("pm-favorite-longshot", **KALSHI,
          note="Buy the side priced 0.70 to 0.97 a day before close; equal stakes summing to 10% of bankroll a day; price is the last trade 24 hours earlier")
def kalshi_favorites():
    b = kalshi_side_bets(0.70, 0.97)
    return bets_to_periods(b["close"].dt.normalize(), b["roi"], "D", 0.10)


@strategy("pm-near-certain-harvest", **KALSHI, note="Buy the side priced 0.95 to 0.97 a day before close; equal stakes summing to 10% of bankroll a day")
def kalshi_near_certain():
    b = kalshi_side_bets(0.95, 0.97)
    return bets_to_periods(b["close"].dt.normalize(), b["roi"], "D", 0.10)


POLY = dict(asset="Polymarket, 377 high-volume binaries with daily history", ppy=52, **PM, cost="1 cent of spread per contract, no fee")


def _poly_bets(pick):
    rows = []
    for m in data.polymarket_paths().itertuples():
        bet = pick(m.path)
        if bet is None:
            continue
        side_yes, price = bet
        if not 0.02 <= price <= 0.97:
            continue
        won = m.won if side_yes else 1 - m.won
        rows.append({"end": m.end.normalize(), "roi": won / (price + SPREAD) - 1})
    return pd.DataFrame(rows, columns=["end", "roi"])


def threshold_pick(path, level=0.6):
    body = path[path.index <= path.index[-1] - pd.Timedelta(days=2)]
    crossed = body[(body > level) & (body.shift(1) <= level)]
    if crossed.empty:
        return None
    return True, float(crossed.iloc[0])


def late_momentum_pick(path, lookback=7, before=3):
    end = path.index[-1]
    now = path[path.index <= end - pd.Timedelta(days=before)]
    then = path[path.index <= end - pd.Timedelta(days=before + lookback)]
    if now.empty or then.empty or now.iloc[-1] == then.iloc[-1]:
        return None
    up = now.iloc[-1] > then.iloc[-1]
    return bool(up), float(now.iloc[-1] if up else 1 - now.iloc[-1])


@strategy("pm-threshold-cross", **POLY, note="Buy YES the first day the price closes above 0.60, at least two days before the end; 1% of bankroll a bet, 20% a week at most")
def polymarket_threshold_cross():
    b = _poly_bets(threshold_pick)
    return bets_to_periods(b["end"], b["roi"], "W-SUN", 0.20)


@strategy("pm-late-momentum", **POLY, note="Three days before the end, buy the side that gained over the prior week; 1% of bankroll a bet, 20% a week at most")
def polymarket_late_momentum():
    b = _poly_bets(late_momentum_pick)
    return bets_to_periods(b["end"], b["roi"], "W-SUN", 0.20)
