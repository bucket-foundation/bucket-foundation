import numpy as np
import pandas as pd

from .. import data
from ..trials import Trial, register, strategy
from .common import bets_to_periods

SB = dict(family="Sports Betting", asset="European football, 22 leagues", ppy=52)
SIDES = [("H", "H"), ("D", "D"), ("A", "A")]


def _weekly(dates, roi, exposure=0.20):
    return bets_to_periods(pd.DatetimeIndex(dates).normalize(), roi, "W-SUN", exposure)


@strategy("sb-soft-book-value", pub=2017, cost="Bookmaker margin inside the odds", **SB,
          note="Bet the best listed odds when they beat the average-odds probability less 0.05; 1% of bankroll a bet, 20% a week at most; accounts get limited in practice")
def soft_book_value():
    f = data.football_all()
    dates, roi = [], []
    for side, res in SIDES:
        mx, av = f[f"max_{side}"], f[f"avg_{side}"]
        pick = (mx > 1) & (av > 1) & (mx * (1 / av - 0.05) > 1)
        dates.append(f.loc[pick, "date"])
        roi.append((f.loc[pick, "FTR"] == res).astype(float) * mx[pick] - 1)
    return _weekly(pd.concat(dates), pd.concat(roi))


STALE_RATIO = 1.10
MIN_EDGE = 0.01
EDGE_KEPT = 0.5


def surebet_edges(f, stale_ratio=None, min_edge=0.0, edge_kept=1.0):
    f = f.dropna(subset=["max_H", "max_D", "max_A"])
    total = 1 / f["max_H"] + 1 / f["max_D"] + 1 / f["max_A"]
    edge = 1 / total - 1
    keep = edge > min_edge
    if stale_ratio is not None:
        for side in "HDA":
            keep &= f[f"max_{side}"] <= stale_ratio * f[f"avg_{side}"]
    return f.loc[keep, "date"], edge[keep] * edge_kept


@strategy("sb-surebets", pub=2013, cost="Bookmaker margin inside the odds; half the quoted edge kept", **SB,
          note="Stake all three results at the best listed odds when the edge tops 1%; a match is dropped as stale when any best price sits more "
               "than 10% above the panel average; half the edge is given up to moved prices, voids and stake caps; 1% of bankroll an arbitrage")
def surebets():
    dates, edge = surebet_edges(data.football_all(), STALE_RATIO, MIN_EDGE, EDGE_KEPT)
    return _weekly(dates, edge)


def surebets_unfiltered():
    dates, edge = surebet_edges(data.football_all())
    return _weekly(dates, edge)


register(Trial(id="surebets_unfiltered", card="", family="Sports Betting", asset=SB["asset"], fn=surebets_unfiltered, pub=2013, ppy=52,
               reported=False, note="First specification: every quoted arbitrage at full edge"))


def fit_poisson(train, iters=25):
    teams = sorted(set(train["HomeTeam"]) | set(train["AwayTeam"]))
    idx = {t: i for i, t in enumerate(teams)}
    h = train["HomeTeam"].map(idx).to_numpy()
    a = train["AwayTeam"].map(idx).to_numpy()
    hg = train["FTHG"].to_numpy(dtype=float)
    ag = train["FTAG"].to_numpy(dtype=float)
    n = len(teams)
    attack, defence, home = np.ones(n), np.ones(n), 1.3
    base = ag.mean()
    for _ in range(iters):
        num = np.bincount(h, hg, n) + np.bincount(a, ag, n)
        den = np.bincount(h, base * home * defence[a], n) + np.bincount(a, base * defence[h], n)
        attack = num / np.maximum(den, 1e-9)
        attack /= attack.mean()
        num = np.bincount(a, hg, n) + np.bincount(h, ag, n)
        den = np.bincount(a, base * home * attack[h], n) + np.bincount(h, base * attack[a], n)
        defence = num / np.maximum(den, 1e-9)
        defence /= defence.mean()
        home = hg.sum() / np.maximum((base * attack[h] * defence[a]).sum(), 1e-9)
    return idx, attack, defence, home, base


def outcome_probs(lam_home, lam_away, max_goals=10):
    from scipy.stats import poisson
    g = np.arange(max_goals + 1)
    ph = poisson.pmf(g[None, :], np.asarray(lam_home)[:, None])
    pa = poisson.pmf(g[None, :], np.asarray(lam_away)[:, None])
    joint = ph[:, :, None] * pa[:, None, :]
    home = np.tril(joint, -1).sum(axis=(1, 2))
    draw = np.trace(joint, axis1=1, axis2=2)
    return home, draw, 1 - home - draw


@strategy("sb-dixon-coles", pub=1997, cost="Bet365 margin inside the odds", **SB,
          note="Plain independent Poisson fitted on the two prior seasons of each league; bet Bet365 odds at a modelled edge above 10%, 1% of bankroll a bet")
def poisson_value_bets():
    f = data.football_all().dropna(subset=["HomeTeam", "AwayTeam", "B365H", "B365D", "B365A"])
    dates, roi = [], []
    for league, g in f.groupby("league"):
        seasons = sorted(g["season"].unique(), key=lambda s: g.loc[g["season"] == s, "date"].min())
        for i in range(2, len(seasons)):
            train = g[g["season"].isin(seasons[i - 2:i])]
            test = g[g["season"] == seasons[i]]
            if len(train) < 200 or test.empty or train["date"].max() >= test["date"].min():
                continue
            idx, attack, defence, home, base = fit_poisson(train)
            test = test[test["HomeTeam"].isin(idx) & test["AwayTeam"].isin(idx)]
            if test.empty:
                continue
            hi, ai = test["HomeTeam"].map(idx).to_numpy(), test["AwayTeam"].map(idx).to_numpy()
            probs = outcome_probs(base * home * attack[hi] * defence[ai], base * attack[ai] * defence[hi])
            for (side, res), p in zip(SIDES, probs):
                odds = test[f"B365{side}"].to_numpy()
                pick = (odds > 1) & (p * odds > 1.10)
                dates.append(pd.Series(test["date"].to_numpy()[pick]))
                roi.append(pd.Series((test["FTR"].to_numpy()[pick] == res).astype(float) * odds[pick] - 1))
    return _weekly(pd.concat(dates), pd.concat(roi))
