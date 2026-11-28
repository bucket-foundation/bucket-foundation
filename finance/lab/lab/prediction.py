import json

import numpy as np
import pandas as pd

from . import data

BINS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]


def calibration(price, won, payout=None):
    df = pd.DataFrame({"p": price, "won": won.astype(float)})
    df["ret"] = payout if payout is not None else df["won"] / df["p"] - 1
    df["bin"] = pd.cut(df["p"], BINS, include_lowest=True)
    g = df.groupby("bin", observed=True)
    out = pd.DataFrame({"n": g.size(), "mean_price": g["p"].mean(), "win_rate": g["won"].mean(),
                        "roi": g["ret"].mean(), "roi_se": g["ret"].std(ddof=1) / np.sqrt(g.size())})
    return out


def flb_spread(price, won, payout=None, lo=0.3, hi=0.7):
    df = pd.DataFrame({"p": price, "won": won.astype(float)})
    df["ret"] = payout if payout is not None else df["won"] / df["p"] - 1
    fav, longs = df[df["p"] >= hi]["ret"], df[df["p"] <= lo]["ret"]
    diff = fav.mean() - longs.mean()
    se = np.sqrt(fav.var(ddof=1) / len(fav) + longs.var(ddof=1) / len(longs))
    return {"n_fav": int(len(fav)), "n_long": int(len(longs)), "roi_fav": float(fav.mean()), "roi_long": float(longs.mean()),
            "diff": float(diff), "t": float(diff / se)}


def football_bets(col_prefix="PSC"):
    df = data.football()
    rows = []
    for side, res in [("H", "H"), ("D", "D"), ("A", "A")]:
        col = f"{col_prefix}{side}"
        if col not in df:
            continue
        sub = df[[col, "FTR", "Date", "file"]].dropna()
        odds = pd.to_numeric(sub[col], errors="coerce")
        sub = sub[odds > 1.0]
        odds = odds[odds > 1.0]
        won = (sub["FTR"] == res).astype(float)
        rows.append(pd.DataFrame({"odds": odds, "won": won, "file": sub["file"]}))
    bets = pd.concat(rows)
    bets["p"] = 1.0 / bets["odds"]
    bets["ret"] = bets["won"] * bets["odds"] - 1
    return bets


def kalshi_bets(min_volume=10.0):
    rows = []
    for m in data.kalshi():
        if m.get("mve_collection_ticker") or m.get("result") not in ("yes", "no"):
            continue
        try:
            p = float(m.get("previous_price_dollars") or 0)
            vol = float(m.get("volume_fp") or 0)
        except ValueError:
            continue
        if not (0.02 <= p <= 0.98) or vol < min_volume:
            continue
        rows.append({"ticker": m["ticker"], "series": m["event_ticker"].split("-")[0], "close": m.get("close_time"),
                     "p": p, "won": 1.0 if m["result"] == "yes" else 0.0})
    df = pd.DataFrame(rows).drop_duplicates("ticker")
    df["fee"] = kalshi_fee(df["p"])
    df["ret"] = df["won"] / (df["p"] + df["fee"]) - 1
    return df


def kalshi_fee(p):
    return np.ceil(0.07 * p * (1 - p) * 100 - 1e-9) / 100


def polymarket_bets(days_before=7):
    markets, hist = data.polymarket()
    rows = []
    for m in markets:
        h = hist.get(m["id"]) or []
        try:
            prices = [float(x) for x in json.loads(m.get("outcomePrices") or "[]")]
        except ValueError:
            continue
        if len(prices) != 2 or max(prices) < 0.99 or len(h) < days_before + 2:
            continue
        end_t = h[-1]["t"]
        cutoff = end_t - days_before * 86400
        before = [x for x in h if x["t"] <= cutoff]
        if not before:
            continue
        p = float(before[-1]["p"])
        if not (0.02 <= p <= 0.98):
            continue
        rows.append({"id": m["id"], "p": p, "won": 1.0 if prices[0] >= 0.99 else 0.0})
    df = pd.DataFrame(rows)
    df["ret"] = df["won"] / df["p"] - 1
    return df
