import csv
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from lab import data, trials
from lab.strategies.legacy import shiller_returns
from lab.metrics import cagr, expected_max_sharpe, max_drawdown, probabilistic_sharpe, sharpe, ann_vol, turnover

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "results"
RETURNS = ROOT / "data" / "cache" / "returns"
CARDS = ROOT.parent / "09-strategies" / "cards"
MIN_YEARS = 3.0
DSR_BAR = 0.95
OOS_T_BAR = 2.0
INDICATIVE = {"kalshi_favorites", "kalshi_near_certain", "commodity_momentum", "surebets", "surebets_unfiltered"}
ASSET_CLASS = {"sixty_forty": "ETFs and Macro", "risk_parity": "ETFs and Macro", "faber_gtaa": "ETFs and Macro", "dual_momentum": "ETFs and Macro",
               "cape_timing": "ETFs and Macro", "tsmom": "Futures and CTA", "industry_momentum": "Equities", "factors": "Equities",
               "crypto_trend": "Crypto"}


RF_MAX_STALE = 3


class CoverageError(RuntimeError):
    pass


def covered(source, index, label, max_stale=RF_MAX_STALE):
    source = source.dropna()
    index = pd.DatetimeIndex(index)
    if len(index) and index[0] < source.index[0]:
        raise CoverageError(f"{label} starts {source.index[0].date()}, after the first return {index[0].date()}")
    stale = int((index > source.index[-1]).sum())
    if stale > max_stale:
        raise CoverageError(f"{label} ends {source.index[-1].date()}, {stale} periods before the last return")
    out = source.reindex(source.index.union(index)).ffill().reindex(index)
    return out, stale


def rf_series(kind, index):
    if kind == "zero":
        return pd.Series(0.0, index=index), 0
    if kind == "ff_m":
        return covered(data.rf_monthly(), index, "French monthly RF")
    if kind == "ff_d":
        return covered(data.rf_daily(), index, "French daily RF")
    if kind in ("tb_365", "tb_252"):
        days = 365.0 if kind == "tb_365" else 252.0
        tb, stale = covered(data.fred("DTB3"), index, "FRED DTB3", max_stale=10)
        return tb / 100.0 / days, stale
    raise ValueError(f"unknown rf kind {kind}")


BENCH_MIN_COVER = 0.98


def split_date(index, pub, ppy, min_years=MIN_YEARS):
    index = pd.DatetimeIndex(index)
    want = pd.Timestamp(f"{pub}-12-31")
    before = int((index <= want).sum())
    if min(before, len(index) - before) >= min_years * ppy:
        return want, "publication"
    return index[len(index) // 2 - 1], "midpoint"


BENCHMARKS = {
    "mkt_m": lambda: data.market_monthly(),
    "mkt_d": lambda: data.market_daily(),
    "spy_m": lambda: data.monthly_returns(data.etf_prices(["SPY"]))["SPY"],
    "spy_d": lambda: data.etf_prices(["SPY"])["SPY"].pct_change(fill_method=None),
    "btc_d": lambda: data.crypto_daily("BTC").pct_change(fill_method=None),
    "btc_m": lambda: data.crypto_panel()["BTC"].resample("ME").last().pct_change(fill_method=None),
    "shiller_stock": lambda: shiller_returns()["stock"],
}


def benchmark_block(name, index, rf, ppy):
    if not name or len(index) < 3:
        return None
    b = BENCHMARKS[name]().reindex(index)
    cover = float(b.notna().mean())
    if cover < BENCH_MIN_COVER:
        raise CoverageError(f"benchmark {name} covers {cover:.1%} of {len(index)} strategy dates")
    b = b.dropna()
    out = block(b, rf, pd.Series(0.0, index=b.index), ppy, None)
    out["coverage"] = cover
    return out


def sharpe_t(excess, ppy):
    x = pd.Series(excess).dropna()
    if len(x) < 3 or x.std(ddof=1) == 0:
        return float("nan")
    return float(x.mean() / x.std(ddof=1) * math.sqrt(len(x)))


def block(r, rf, trades, ppy, turnover_est):
    r = r.dropna()
    if len(r) < 3:
        return None
    ex = r - rf.reindex(r.index).fillna(0.0)
    if trades is not None:
        to = turnover(pd.Series(trades).reindex(r.index), ppy)
    else:
        to = turnover_est if turnover_est is not None else float("nan")
    return {"start": str(r.index[0])[:10], "end": str(r.index[-1])[:10], "n": int(len(r)), "cagr": cagr(r, ppy), "vol": ann_vol(r, ppy),
            "sharpe": sharpe(ex, ppy), "t": sharpe_t(ex, ppy), "max_dd": max_drawdown(r), "turnover": to,
            "turnover_estimated": trades is None, "mean_excess_ann": float(ex.mean() * ppy)}


def card_text(card):
    p = CARDS / f"{card}.md"
    if not card or not p.exists():
        return "", "", ""
    text = p.read_text()
    title = text.splitlines()[0].lstrip("# ").strip()
    src = re.search(r"## Source\s+1\. (.+)", text)
    paper = re.sub(r"\s*https?://\S+.*$", "", src.group(1)).strip() if src else ""
    claim = re.search(r"## Claimed Edge\s+(.+)", text)
    return title, paper, claim.group(1).strip() if claim else ""


def tradable(price_valid, precomputed, needs_paid_data):
    return bool(price_valid and not precomputed and not needs_paid_data)


def run_trial(t):
    r, trades = t.fn()
    attrs = dict(getattr(r, "attrs", {}))
    r = pd.Series(r).dropna().astype(float)
    r = r[np.isfinite(r)]
    r.attrs = attrs
    r.index.name = "date"
    rf, rf_stale = rf_series(t.rf, r.index)
    if rf_stale:
        print(f"note {t.id}: cash rate carried forward over the last {rf_stale} periods", flush=True)
    split, rule = split_date(r.index, t.pub, t.ppy)
    ins, oos = r[r.index <= split], r[r.index > split]
    title, paper, claim = card_text(t.card)
    ex = r - rf
    out = {"id": t.id, "card": t.card, "title": title or t.id, "family": t.family, "asset": t.asset, "origin": t.origin, "reported": t.reported,
           "paper": t.paper or paper, "claim": t.claim or claim, "pub": t.pub, "split": str(split)[:10], "split_rule": rule, "ppy": t.ppy,
           "rf": t.rf, "rf_periods_carried_forward": rf_stale, "asset_class": ASSET_CLASS.get(t.family, t.family), "cost": t.cost, "note": t.note, "price_valid": t.id not in INDICATIVE, "precomputed": t.precomputed, "needs_paid_data": t.needs_paid_data,
           "executable": tradable(t.id not in INDICATIVE, t.precomputed, t.needs_paid_data), "meta": {**t.meta, **{k: v for k, v in r.attrs.items() if k in ("n_bets", "roi_per_bet")}},
           "benchmark": t.benchmark, "bench_full": benchmark_block(t.benchmark, r.index, rf, t.ppy),
           "bench_oos": benchmark_block(t.benchmark, oos.index, rf, t.ppy),
           "sr_period": float(ex.mean() / ex.std(ddof=1)),
           "full": block(r, rf, trades, t.ppy, t.turnover_est), "is": block(ins, rf, trades, t.ppy, t.turnover_est),
           "oos": block(oos, rf, trades, t.ppy, t.turnover_est)}
    RETURNS.mkdir(parents=True, exist_ok=True)
    tmp = RETURNS / f"{t.id}.parquet.part"
    pd.DataFrame({"r": r, "rf": rf}).to_parquet(tmp)
    tmp.replace(RETURNS / f"{t.id}.parquet")
    return out


def write_json(path, obj):
    tmp = path.with_name(path.name + ".part")
    tmp.write_text(json.dumps(obj, indent=1, default=str))
    tmp.replace(path)


def stage_one(resume):
    (OUT / "trials").mkdir(parents=True, exist_ok=True)
    rows = {}
    for t in trials.load_all().values():
        path = OUT / "trials" / f"{t.id}.json"
        if resume and path.exists() and (RETURNS / f"{t.id}.parquet").exists():
            rows[t.id] = json.loads(path.read_text())
            continue
        rows[t.id] = run_trial(t)
        write_json(path, rows[t.id])
        print("ran", t.id, rows[t.id]["full"]["sharpe"] if rows[t.id]["full"] else None, flush=True)
    return rows


def sharpe_variance(values):
    return float(np.var(values, ddof=1)) if len(values) > 1 else 0.0


def deflate(rows):
    n = len(rows)
    sr_ann = {k: v["sr_period"] * math.sqrt(v["ppy"]) for k, v in rows.items()}
    var_exec = sharpe_variance([sr_ann[k] for k, v in rows.items() if v["price_valid"]])
    var_all = sharpe_variance(list(sr_ann.values()))
    classes = {}
    for k, v in rows.items():
        c = classes.setdefault(v["asset_class"], {"ids": [], "tradable": []})
        c["ids"].append(k)
        if v["price_valid"]:
            c["tradable"].append(sr_ann[k])
    families = {name: {"n_trials": len(c["ids"]), "n_tradable": len(c["tradable"]), "sr_ann_var": sharpe_variance(c["tradable"]),
                       "expected_max_sharpe_ann": expected_max_sharpe(len(c["ids"]), sharpe_variance(c["tradable"]))}
                for name, c in classes.items()}
    for k, v in rows.items():
        df = pd.read_parquet(RETURNS / f"{k}.parquet")
        ex = (df["r"] - df["rf"]).dropna()
        fam = families[v["asset_class"]]
        v["psr"] = probabilistic_sharpe(ex, 0.0)
        v["dsr_lab"] = probabilistic_sharpe(ex, expected_max_sharpe(n, var_exec / v["ppy"])) if v["price_valid"] else None
        v["dsr_family"] = probabilistic_sharpe(ex, expected_max_sharpe(fam["n_trials"], fam["sr_ann_var"] / v["ppy"])) if v["price_valid"] else None
        v["family_trials"] = fam["n_trials"]
        o = v["oos"]
        beats = v.get("bench_oos") is None or (o is not None and o["sharpe"] > v["bench_oos"]["sharpe"])
        v["held_stat"] = bool(v["price_valid"] and o is not None and o["sharpe"] > 0 and o["t"] >= OOS_T_BAR and beats)
        v["stat_pooled"] = bool(v["held_stat"] and v["dsr_lab"] >= DSR_BAR)
        v["held_oos"] = bool(v["held_stat"] and v["executable"])
        v["survived"] = bool(v["held_oos"] and v["dsr_lab"] >= DSR_BAR)
        v["passes_family"] = bool(v["held_oos"] and v["dsr_family"] >= DSR_BAR)
    return {"n_trials": n, "n_reported": sum(v["reported"] for v in rows.values()), "sr_ann_var_executable": var_exec, "sr_ann_var_all": var_all,
            "expected_max_sharpe_ann": expected_max_sharpe(n, var_exec), "dsr_bar": DSR_BAR, "oos_t_bar": OOS_T_BAR, "families": families,
            "by_origin": {o: sum(v["origin"] == o for v in rows.values()) for o in ("new", "chen-zimmermann", "legacy")}}


def main(argv=None):
    args = sys.argv[1:] if argv is None else argv
    rows = stage_one("--resume" in args)
    summary = deflate(rows)
    for k, v in rows.items():
        write_json(OUT / "trials" / f"{k}.json", v)
    reported = {k: v for k, v in rows.items() if v["reported"]}
    by_family = {}
    for v in reported.values():
        by_family.setdefault(v["family"], []).append(v)
    for fam, items in by_family.items():
        write_json(OUT / f"{fam.lower().replace(' ', '_')}.json", items)
    write_json(OUT / "registry.json", [{"id": k, "family": v["family"], "origin": v["origin"], "reported": v["reported"], "ppy": v["ppy"],
                                         "sharpe_ann": v["sr_period"] * math.sqrt(v["ppy"]), "n": v["full"]["n"], "executable": v["executable"],
                                         "price_valid": v["price_valid"], "precomputed": v["precomputed"], "needs_paid_data": v["needs_paid_data"]}
                                        for k, v in rows.items()])
    summary["survived"] = sorted(k for k, v in reported.items() if v["survived"])
    summary["held_oos"] = sorted(k for k, v in reported.items() if v["held_oos"])
    summary["published_series_passing_pooled"] = sorted(k for k, v in reported.items() if v["stat_pooled"] and not v["executable"])
    summary["passes_family"] = sorted(k for k, v in reported.items() if v["passes_family"])
    write_json(OUT / "summary.json", summary)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
