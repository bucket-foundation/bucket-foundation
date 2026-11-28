import numpy as np
import pandas as pd

from .. import data
from ..backtest import run
from ..trials import strategy
from .common import PORTFOLIO_COST, TIER_COST, TIER_TURNOVER, haircut, rank_weights, tier_label

EQ = dict(family="Equities", asset="US equities")


def _spread(name, long, short, tier, table=0):
    p = data.french_lib(name, table)
    return haircut(p[long] - p[short], tier)


@strategy("eq-value-book-to-market", precomputed=True, pub=1992, cost=tier_label("annual"), turnover_est=TIER_TURNOVER["annual"], **EQ)
def value_book_to_market():
    return _spread("Portfolios_Formed_on_BE-ME", "Hi 10", "Lo 10", "annual")


@strategy("eq-size-small-cap", precomputed=True, pub=1981, cost=tier_label("annual"), turnover_est=TIER_TURNOVER["annual"], **EQ)
def size_small_cap():
    return _spread("Portfolios_Formed_on_ME", "Lo 10", "Hi 10", "annual")


@strategy("eq-momentum-12-1", precomputed=True, pub=1993, cost=tier_label("momentum"), turnover_est=TIER_TURNOVER["momentum"], **EQ)
def momentum_12_1():
    return _spread("10_Portfolios_Prior_12_2", "Hi PRIOR", "Lo PRIOR", "momentum")


@strategy("eq-gross-profitability", precomputed=True, pub=2013, cost=tier_label("annual"), turnover_est=TIER_TURNOVER["annual"],
          note="French operating profitability sort stands in for gross profits to assets", **EQ)
def profitability():
    return _spread("Portfolios_Formed_on_OP", "Hi 10", "Lo 10", "annual")


@strategy("eq-asset-growth", precomputed=True, pub=2008, cost=tier_label("annual"), turnover_est=TIER_TURNOVER["annual"], **EQ)
def asset_growth():
    return _spread("Portfolios_Formed_on_INV", "Lo 10", "Hi 10", "annual")


@strategy("eq-accruals", precomputed=True, pub=1996, paper="Sloan 1996, The Accounting Review", cost=tier_label("annual"), turnover_est=TIER_TURNOVER["annual"], **EQ)
def accruals():
    return _spread("Portfolios_Formed_on_AC", "Lo 10", "Hi 10", "annual")


@strategy("eq-share-issuance", precomputed=True, pub=2008, cost=tier_label("annual"), turnover_est=TIER_TURNOVER["annual"], **EQ)
def share_issuance():
    return _spread("Portfolios_Formed_on_NI", "Lo 10", "Hi 10", "annual")


@strategy("eq-betting-against-beta", precomputed=True, pub=2014, cost=tier_label("monthly"), turnover_est=TIER_TURNOVER["monthly"],
          note="Dollar-neutral low minus high beta decile; the paper levers the low-beta leg to beta-neutral", **EQ)
def betting_against_beta():
    return _spread("Portfolios_Formed_on_BETA", "Lo 10", "Hi 10", "monthly")


@strategy("eq-low-idio-vol", precomputed=True, pub=2006, cost=tier_label("monthly"), turnover_est=TIER_TURNOVER["monthly"], **EQ)
def low_idio_vol():
    return _spread("Portfolios_Formed_on_RESVAR", "Lo 20", "Hi 20", "monthly")


@strategy("eq-quality-minus-junk", precomputed=True, pub=2013, cost=tier_label("annual"), turnover_est=TIER_TURNOVER["annual"],
          note="High profitability, low investment corner minus the opposite corner of the French 5x5 sort", **EQ)
def quality_minus_junk():
    return _spread("25_Portfolios_OP_INV_5x5", "HiOP LoINV", "LoOP HiINV", "annual")


def factor_panel():
    ff5 = data.french_lib("F-F_Research_Data_5_Factors_2x3")[["SMB", "HML", "RMW", "CMA"]]
    extra = [data.french_lib("F-F_Momentum_Factor"), data.french_lib("F-F_ST_Reversal_Factor"), data.french_lib("F-F_LT_Reversal_Factor")]
    intl = data.french_lib("Developed_ex_US_5_Factors")[["SMB", "HML", "RMW", "CMA"]].add_prefix("xUS_")
    return pd.concat([ff5] + extra + [intl, data.french_lib("Developed_ex_US_Mom_Factor").add_prefix("xUS_")], axis=1, sort=True)


@strategy("eq-factor-momentum", pub=2019, cost=tier_label("monthly"), turnover_est=TIER_TURNOVER["monthly"],
          note="12 French factors, US and developed ex US; sign of the prior 12-month return", **EQ)
def factor_momentum():
    f = factor_panel()
    past = (1 + f).rolling(12).apply(np.prod, raw=True) - 1
    sign = np.sign(past)
    w = sign.div(sign.notna().sum(axis=1).replace(0, np.nan), axis=0).dropna(how="all").fillna(0.0)
    net, trades = run(w, f.loc[w.index[0]:], 0.0)
    return net - TIER_COST["monthly"], None


@strategy("eq-january-effect", precomputed=True, pub=1983, cost="100 bps charged each January for the round trip on both legs", turnover_est=2.0, **EQ)
def january_effect():
    p = data.french_lib("Portfolios_Formed_on_ME")
    spread = (p["Lo 10"] - p["Hi 10"]).dropna()
    jan = spread.index.month == 1
    return (spread.where(jan, 0.0) - np.where(jan, 0.01, 0.0)), None


@strategy("eq-return-seasonality", pub=2008, cost="10 bps per unit traded", **EQ,
          note="49 French industries; same-calendar-month mean over the prior 20 years")
def return_seasonality():
    ind = data.french_lib("49_Industry_Portfolios")
    lags = [ind.shift(12 * k - 1) for k in range(1, 21)]
    score = sum(l.fillna(0.0) for l in lags) / sum(l.notna().astype(float) for l in lags).replace(0, np.nan)
    score = score.where(sum(l.notna().astype(float) for l in lags) >= 10)
    w = rank_weights(score, 5, 5, min_assets=20)
    return run(w, ind.loc[w.index[0]:], PORTFOLIO_COST)


REGIONS = {"Europe": "Europe_Mom_Factor", "Japan": "Japan_Mom_Factor", "Asia_Pacific_ex_Japan": "Asia_Pacific_ex_Japan_MOM_Factor",
           "North_America": "North_America_Mom_Factor"}


@strategy("etf-value-momentum-everywhere", precomputed=True, pub=2013, family="Equities", asset="Developed equities",
          cost="36.5 bps a month haircut, half annual and half momentum tier", turnover_est=4.6,
          note="French regional HML and WML for four regions; the paper adds bonds, FX and commodities")
def value_momentum_everywhere():
    legs = []
    for region, mom_file in REGIONS.items():
        hml = data.french_lib(f"{region}_3_Factors")["HML"]
        wml = data.french_lib(mom_file).iloc[:, 0]
        legs.append(0.5 * hml + 0.5 * wml)
    gross = pd.concat(legs, axis=1).dropna().mean(axis=1)
    return gross - 0.5 * (TIER_COST["annual"] + TIER_COST["momentum"]), None


@strategy("etf-style-momentum", pub=2004, cost="10 bps per unit traded", **EQ, note="Six French size and book-to-market portfolios")
def style_momentum():
    p = data.french_lib("6_Portfolios_2x3")
    past = (1 + p).rolling(12).apply(np.prod, raw=True) - 1
    w = rank_weights(past, 1, 1)
    return run(w, p.loc[w.index[0]:], PORTFOLIO_COST)
