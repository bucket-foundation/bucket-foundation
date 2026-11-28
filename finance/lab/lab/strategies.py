import numpy as np
import pandas as pd

from . import data
from .backtest import run

ETF_COST = 5.0
CRYPTO_COST = 25.0


def _monthly(tickers):
    px = data.etf_prices(tickers)
    return px, data.monthly_returns(px)


def sixty_forty(rebalance_months=1):
    px, r = _monthly(["SPY", "IEF"])
    r = r.dropna()
    rows = {dt: {"SPY": 0.6, "IEF": 0.4} for i, dt in enumerate(r.index) if i % rebalance_months == 0}
    w = pd.DataFrame(rows).T
    if rebalance_months > 1:
        return _drift_run(w, r)
    return run(w, r, ETF_COST)


def _drift_run(targets, r):
    weights, cur = {}, None
    for dt, row in r.iterrows():
        if cur is not None:
            grown = cur * (1 + row)
            cur = grown / grown.sum()
        if dt in targets.index:
            cur = targets.loc[dt].copy()
        weights[dt] = cur.copy()
    return run(pd.DataFrame(weights).T, r, ETF_COST)


def risk_parity(lookback_days=126, target_vol=None):
    tickers = ["SPY", "TLT", "GLD", "DBC"]
    px = data.etf_prices(tickers)
    dr = px.pct_change(fill_method=None)
    vol = dr.rolling(lookback_days).std() * np.sqrt(252)
    month_ends = dr.resample("ME").last().index
    vol_m = vol.resample("ME").last()
    inv = 1.0 / vol_m
    w = inv.div(inv.sum(axis=1), axis=0)
    if target_vol is not None:
        cov_vol = []
        for dt in w.index:
            window = dr.loc[:dt].tail(lookback_days).dropna()
            ww = w.loc[dt]
            if len(window) < lookback_days // 2 or ww.isna().any():
                cov_vol.append(np.nan)
                continue
            cov_vol.append(float(np.sqrt(ww.values @ window.cov().values @ ww.values * 252)))
        scale = (target_vol / pd.Series(cov_vol, index=w.index)).clip(upper=2.0)
        w = w.mul(scale, axis=0)
    r = data.monthly_returns(px)
    w = w.dropna()
    r = r.loc[w.index[0]:]
    return run(w, r, ETF_COST, data.tbill_monthly())


def faber_gtaa(sma_months=10):
    tickers = ["SPY", "EFA", "IEF", "VNQ", "DBC"]
    px = data.etf_prices(tickers).resample("ME").last()
    sma = px.rolling(sma_months).mean()
    signal = (px > sma).astype(float).where(sma.notna())
    w = (signal * 0.2).dropna()
    r = px.pct_change(fill_method=None).loc[w.index[0]:]
    return run(w, r, ETF_COST, data.tbill_monthly())


TSMOM_UNIVERSE = ["SPY", "EFA", "EEM", "IWM", "QQQ", "TLT", "IEF", "LQD", "TIP", "GLD", "DBC", "VNQ"]


def tsmom(lookback_months=12, vol_target=0.40, cap=4.0, min_assets=8):
    px = data.etf_prices(TSMOM_UNIVERSE)
    dr = px.pct_change(fill_method=None)
    ewvol = dr.ewm(com=60, min_periods=60).std() * np.sqrt(261)
    pm = px.resample("ME").last()
    rf = data.tbill_monthly()
    past = pm.pct_change(lookback_months, fill_method=None)
    rf_cum = (1 + rf).rolling(lookback_months).apply(np.prod, raw=True) - 1
    excess = past.sub(rf_cum.reindex(past.index), axis=0)
    sign = np.sign(excess)
    lev = (vol_target / ewvol.resample("ME").last()).clip(upper=cap)
    raw = sign * lev
    n = raw.notna().sum(axis=1).replace(0, np.nan)
    w = raw.div(n, axis=0).dropna(how="all").fillna(0.0)
    w = w[raw.notna().sum(axis=1).reindex(w.index) >= min_assets]
    r = pm.pct_change(fill_method=None).loc[w.index[0]:]
    excess_r = r.sub(rf.reindex(r.index).fillna(0.0), axis=0)
    net, wd = run(w, excess_r, ETF_COST)
    return net + rf.reindex(net.index).fillna(0.0), wd


def dual_momentum(lookback_months=12):
    pm = data.etf_prices(["SPY", "EFA", "AGG"]).resample("ME").last()
    rf = data.tbill_monthly()
    mom = pm.pct_change(lookback_months, fill_method=None)
    rf_cum = (1 + rf).rolling(lookback_months).apply(np.prod, raw=True) - 1
    rows = {}
    for dt, row in mom.dropna().iterrows():
        best = "SPY" if row["SPY"] >= row["EFA"] else "EFA"
        if row["SPY"] > rf_cum.get(dt, 0.0):
            rows[dt] = {best: 1.0}
        else:
            rows[dt] = {"AGG": 1.0}
    w = pd.DataFrame(rows).T.reindex(columns=["SPY", "EFA", "AGG"]).fillna(0.0)
    r = pm.pct_change(fill_method=None).loc[w.index[0]:]
    return run(w, r, ETF_COST)


FACTOR_COST_MONTHLY = {"SMB": 0.0003, "HML": 0.0005, "RMW": 0.0005, "CMA": 0.0005, "Mom": 0.0065}


def factor_returns():
    ff5 = data.french("ff5")
    mom = data.french("mom")
    f = ff5.join(mom, how="left")
    return f


def factor(name):
    f = factor_returns()
    if name == "EW5":
        cols = ["SMB", "HML", "RMW", "CMA", "Mom"]
        gross = f[cols].mean(axis=1)
        cost = np.mean([FACTOR_COST_MONTHLY[c] for c in cols])
    else:
        gross = f[name]
        cost = FACTOR_COST_MONTHLY[name]
    return (gross - cost).dropna(), f["RF"]


def industry_momentum(lookback_months=12, n_long=3):
    ind = data.french("ind10", table=0)
    past = (1 + ind).rolling(lookback_months).apply(np.prod, raw=True) - 1
    rows = {}
    for dt, row in past.dropna().iterrows():
        ranked = row.sort_values()
        w = pd.Series(0.0, index=ind.columns)
        w[ranked.index[-n_long:]] = 1.0 / n_long
        w[ranked.index[:n_long]] = -1.0 / n_long
        rows[dt] = w
    w = pd.DataFrame(rows).T
    return run(w, ind.loc[w.index[0]:], 10.0)


def crypto_trend(symbol="BTC", sma_days=50):
    px = data.crypto_daily(symbol)
    sma = px.rolling(sma_days).mean()
    w = (px > sma).astype(float).where(sma.notna()).dropna().to_frame(symbol)
    r = px.pct_change(fill_method=None).to_frame(symbol).loc[w.index[0]:]
    rf = data.tbill_daily(r.index)
    rf.index = r.index
    net, wd = run(w, r, CRYPTO_COST, rf)
    return net, wd


def crypto_hold(symbol="BTC"):
    px = data.crypto_daily(symbol)
    return px.pct_change(fill_method=None).dropna()


def shiller_returns():
    s = data.shiller().dropna(subset=["P", "D", "GS10"])
    stock = (s["P"] + s["D"] / 12.0) / s["P"].shift(1) - 1
    y = s["GS10"] / 100.0
    y0 = y.shift(1)
    coupon = y0 / 12.0
    n = 120
    price = coupon / (y / 12) * (1 - (1 + y / 12) ** -(n - 1)) + (1 + y / 12) ** -(n - 1)
    bond = price + coupon - 1
    return pd.DataFrame({"stock": stock, "bond": bond, "CAPE": s["CAPE"], "CPI": s["CPI"]}).dropna(subset=["stock", "bond"])


def cape_timing(quantile=0.7, min_history=240):
    d = shiller_returns()
    cape = d["CAPE"]
    thresh = cape.expanding(min_periods=min_history).quantile(quantile)
    in_stock = (cape <= thresh).astype(float).where(thresh.notna()).dropna()
    w = pd.DataFrame({"stock": in_stock, "bond": 1 - in_stock})
    return run(w, d[["stock", "bond"]].loc[w.index[0]:], 10.0)


def cape_buy_hold(min_history=240):
    d = shiller_returns()
    start = d["CAPE"].dropna().index[min_history]
    w = pd.DataFrame({"stock": 1.0, "bond": 0.0}, index=d.loc[start:].index)
    return run(w, d[["stock", "bond"]].loc[start:], 0.0)


def cape_regression(split="1998-01-01", horizon=120):
    d = shiller_returns()
    real = (1 + d["stock"]) / (d["CPI"] / d["CPI"].shift(1))
    fwd = np.log(real).rolling(horizon).sum().shift(-horizon) / (horizon / 12)
    df = pd.DataFrame({"y": fwd, "x": np.log(d["CAPE"])}).dropna()
    out = {}
    train_end = pd.Timestamp(split) - pd.DateOffset(months=horizon)
    for label, part in [("pre", df[df.index < train_end]), ("post", df[df.index >= split]), ("full", df)]:
        if len(part) < 24:
            continue
        b, a = np.polyfit(part["x"], part["y"], 1)
        pred = a + b * part["x"]
        r2 = 1 - ((part["y"] - pred) ** 2).sum() / ((part["y"] - part["y"].mean()) ** 2).sum()
        out[label] = {"slope": float(b), "r2": float(r2), "n": int(len(part)), "start": str(part.index[0])[:7], "end": str(part.index[-1])[:7]}
    pre = df[df.index < pd.Timestamp(split) - pd.DateOffset(months=horizon)]
    b, a = np.polyfit(pre["x"], pre["y"], 1)
    post = df[df.index >= split]
    if len(post):
        pred = a + b * post["x"]
        hist_mean = pre["y"].mean()
        oos_r2 = 1 - ((post["y"] - pred) ** 2).sum() / ((post["y"] - hist_mean) ** 2).sum()
        out["oos_r2_campbell_thompson"] = float(oos_r2)
    return out


def jst_sixty_forty(start_year=1900):
    j = data.jst()
    j = j[j["year"] >= start_year].dropna(subset=["eq_tr", "bond_tr", "bill_rate"])
    rows = []
    for iso, g in j.groupby("iso"):
        g = g.set_index("year").sort_index()
        p6040 = 0.6 * g["eq_tr"] + 0.4 * g["bond_tr"]
        for label, s in [("equity", g["eq_tr"]), ("bond", g["bond_tr"]), ("60/40", p6040)]:
            ex = s - g["bill_rate"]
            rows.append({"iso": iso, "asset": label, "sharpe": float(ex.mean() / ex.std(ddof=1)), "n": int(len(s))})
    return pd.DataFrame(rows)
