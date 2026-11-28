import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

from lab import data, prediction, strategies as st
from lab.backtest import run
from lab.metrics import deflated_sharpe, expected_max_sharpe, probabilistic_sharpe, summarize

OUT = Path(__file__).resolve().parent / "data" / "results"
ETF_SPLIT = "2014-12-31"


def per_period_sr(r, rf):
    x = (r - rf.reindex(r.index).fillna(0.0)).dropna()
    return float(x.mean() / x.std(ddof=1))


def buy_hold_etf(t):
    px = data.etf_prices([t])
    r = data.monthly_returns(px).dropna()
    w = pd.DataFrame({t: 1.0}, index=r.index)
    return run(w, r, 0.0)


FAMILIES = {
    "sixty_forty": {"ppy": 12, "split": ETF_SPLIT, "rf": "m",
                     "variants": {f"rebal_{k}m": (lambda k=k: st.sixty_forty(k)) for k in [1, 3, 12]}},
    "risk_parity": {"ppy": 12, "split": ETF_SPLIT, "rf": "m",
                     "variants": {f"lb{lb}_{'tv10' if tv else 'unlev'}": (lambda lb=lb, tv=tv: st.risk_parity(lb, tv))
                                  for lb in [63, 126, 252] for tv in [None, 0.10]}},
    "faber_gtaa": {"ppy": 12, "split": ETF_SPLIT, "rf": "m",
                    "variants": {f"sma{k}": (lambda k=k: st.faber_gtaa(k)) for k in [6, 8, 10, 12]}},
    "tsmom": {"ppy": 12, "split": ETF_SPLIT, "rf": "m",
               "variants": {f"lb{k}m": (lambda k=k: st.tsmom(k)) for k in [1, 3, 6, 9, 12]}},
    "dual_momentum": {"ppy": 12, "split": ETF_SPLIT, "rf": "m",
                       "variants": {f"lb{k}m": (lambda k=k: st.dual_momentum(k)) for k in [6, 9, 12]}},
    "industry_momentum": {"ppy": 12, "split": "1999-12-31", "rf": "ff",
                           "variants": {f"lb{k}m": (lambda k=k: st.industry_momentum(k)) for k in [6, 12]}},
    "crypto_trend": {"ppy": 365, "split": "2020-12-31", "rf": "d",
                      "variants": {f"{c}_sma{k}": (lambda c=c, k=k: st.crypto_trend(c, k)) for c in ["BTC", "ETH"] for k in [10, 20, 50, 100, 200]}},
    "cape_timing": {"ppy": 12, "split": "1997-12-31", "rf": "zero",
                     "variants": {f"q{int(q*100)}": (lambda q=q: st.cape_timing(q)) for q in [0.5, 0.6, 0.7, 0.8, 0.9]}},
}

BENCH = {
    "sixty_forty": ("SPY", lambda: buy_hold_etf("SPY")),
    "risk_parity": ("SPY", lambda: buy_hold_etf("SPY")),
    "faber_gtaa": ("SPY", lambda: buy_hold_etf("SPY")),
    "tsmom": ("SPY", lambda: buy_hold_etf("SPY")),
    "dual_momentum": ("SPY", lambda: buy_hold_etf("SPY")),
    "cape_timing": ("stocks", st.cape_buy_hold),
    "crypto_trend": ("BTC hold", lambda: btc_hold()),
}


def btc_hold():
    px = data.crypto_daily("BTC")
    r = px.pct_change(fill_method=None).to_frame("BTC").dropna()
    return run(pd.DataFrame({"BTC": 1.0}, index=r.index), r, 0.0)

FACTOR_PUB = {"SMB": "1993-12-31", "HML": "1993-12-31", "Mom": "1997-12-31", "RMW": "2015-12-31", "CMA": "2015-12-31", "EW5": "2015-12-31"}


def rf_for(kind, index):
    if kind == "m":
        return data.tbill_monthly().reindex(index).fillna(0.0)
    if kind == "d":
        s = data.tbill_daily(index)
        s.index = index
        return s
    if kind == "ff":
        return data.french("ff3")["RF"].reindex(index).fillna(0.0)
    return pd.Series(0.0, index=index)


def fmt(d):
    return {k: (round(v, 4) if isinstance(v, float) and not math.isnan(v) else v) for k, v in d.items()}


def run_families():
    trials = []
    fam_out = {}
    for fam, cfg in FAMILIES.items():
        res = {}
        for name, fn in cfg["variants"].items():
            r, t = fn()
            rf = rf_for(cfg["rf"], r.index)
            res[name] = (r, t, rf)
            trials.append({"family": fam, "variant": name, "ppy": cfg["ppy"],
                           "sr_ann": per_period_sr(r, rf) * math.sqrt(cfg["ppy"]), "n": len(r)})
        fam_out[fam] = res
    for name in FACTOR_PUB:
        r = st.factor(name)[0]
        trials.append({"family": "factors", "variant": name, "ppy": 12,
                       "sr_ann": float(r.mean() / r.std(ddof=1)) * math.sqrt(12), "n": len(r)})
    return fam_out, trials


def evaluate(fam_out, trials):
    n_lab = len(trials)
    sr_ann_var = float(np.var([t["sr_ann"] for t in trials], ddof=1))
    report = {}
    for fam, res in fam_out.items():
        cfg = FAMILIES[fam]
        ppy, split = cfg["ppy"], pd.Timestamp(cfg["split"])
        fam_srs = [per_period_sr(r, rf) for r, _, rf in res.values()]
        is_sr = {name: per_period_sr(r[r.index <= split], rf) for name, (r, _, rf) in res.items()}
        chosen = max(is_sr, key=is_sr.get)
        rows = {}
        for name, (r, t, rf) in res.items():
            full = summarize(r, ppy, t, n_trials=len(res), trial_sharpes=fam_srs, rf=rf)
            ex = (r - rf).dropna()
            full["dsr_lab"] = probabilistic_sharpe(ex, expected_max_sharpe(n_lab, sr_ann_var / ppy))
            ins = summarize(r[r.index <= split], ppy, t, rf=rf)
            oos = summarize(r[r.index > split], ppy, t, rf=rf)
            rows[name] = {"full": fmt(full), "is": fmt(ins), "oos": fmt(oos)}
        bench = None
        if fam in BENCH:
            label, fn = BENCH[fam]
            br, bt = fn()
            first = min(r.index[0] for r, _, _ in res.values())
            br = br[br.index >= first]
            brf = rf_for(cfg["rf"], br.index)
            bex = (br - brf).dropna()
            bench = {"label": label, "full": fmt(summarize(br, ppy, bt, rf=brf)),
                     "dsr_lab": probabilistic_sharpe(bex, expected_max_sharpe(n_lab, sr_ann_var / ppy)),
                     "is": fmt(summarize(br[br.index <= split], ppy, bt, rf=brf)),
                     "oos": fmt(summarize(br[br.index > split], ppy, bt, rf=brf))}
        report[fam] = {"split": cfg["split"], "chosen_in_sample": chosen, "n_variants": len(res), "variants": rows, "benchmark": bench}
    return report


def factors_report():
    out = {}
    names = ["SMB", "HML", "Mom", "RMW", "CMA", "EW5"]
    series = {n: st.factor(n)[0] for n in names}
    gross = st.factor_returns()
    gross["EW5"] = gross[["SMB", "HML", "RMW", "CMA", "Mom"]].mean(axis=1)
    srs = [float(r.mean() / r.std(ddof=1)) for r in series.values()]
    for name in names:
        r = series[name]
        g = gross[name].reindex(r.index)
        pub = pd.Timestamp(FACTOR_PUB[name])
        zero = pd.Series(0.0, index=r.index)
        out[name] = {"pub_split": FACTOR_PUB[name],
                     "full": fmt(summarize(r, 12, None, n_trials=len(names), trial_sharpes=srs, rf=zero)),
                     "pre": fmt(summarize(r[r.index <= pub], 12, None, rf=zero)),
                     "post": fmt(summarize(r[r.index > pub], 12, None, rf=zero)),
                     "gross_mean_pre": float(g[g.index <= pub].mean()),
                     "gross_mean_post": float(g[g.index > pub].mean()),
                     "net_mean_pre": float(r[r.index <= pub].mean()),
                     "net_mean_post": float(r[r.index > pub].mean())}
    return out


def prediction_report():
    out = {}
    fb = prediction.football_bets("PSC")
    fa = prediction.football_bets("AvgC")
    k = prediction.kalshi_bets()
    p = prediction.polymarket_bets()
    for label, df in [("football_pinnacle_close", fb), ("football_avg_close", fa), ("kalshi", k), ("polymarket_t-7d", p)]:
        cal = prediction.calibration(df["p"], df["won"], df["ret"])
        cal.index = cal.index.astype(str)
        out[label] = {"n": int(len(df)), "flb": prediction.flb_spread(df["p"], df["won"], df["ret"]),
                      "calibration": json.loads(cal.round(4).to_json(orient="index"))}
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    fam_out, trials = run_families()
    report = {"n_trials_lab": len(trials), "families": evaluate(fam_out, trials), "factors": factors_report(),
              "cape_regression": st.cape_regression(),
              "jst_sixty_forty": st.jst_sixty_forty().groupby("asset")["sharpe"].describe().round(3).to_dict(orient="index"), "prediction": prediction_report()}
    (OUT / "results.json").write_text(json.dumps(report, indent=1, default=str))
    print(json.dumps(report, indent=1, default=str))


if __name__ == "__main__":
    main()
