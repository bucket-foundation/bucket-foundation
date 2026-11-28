import math
from dataclasses import dataclass

import numpy as np
import pandas as pd

from . import signals
from .metrics import expected_max_sharpe, probabilistic_sharpe

NOTIONAL = 1000.0
POOLED_TRIALS = 317
POOLED_SR_VAR = 0.166
MIN_OBS_FOR_DSR = 20
LIMITS = signals.Limits(max_drawdown=-0.25, daily_loss=-0.10, max_stale_days=5)


@dataclass(frozen=True)
class Sleeve:
    label: str
    cost_bps: float
    backtest_sharpe: float
    lab_row: str
    evidence: str


SLEEVES = {
    "btc_sma50": Sleeve("BTC SMA50 trend", 25.0, 0.80, "legacy_crypto_trend_BTC_sma50", "fails pooled 0.75 and family 0.18"),
    "sp_above_200d": Sleeve("S&P above 200-day average", 5.0, 0.56, "price_above_ma200", "family deflation only"),
    "sp_cross_50_200": Sleeve("S&P 50/200-day cross", 5.0, 0.63, "ma_cross_50_200", "family deflation only"),
    "yield_gap": Sleeve("S&P yield gap vs 10-year", 10.0, 0.79, "fed_model", "family deflation only"),
    "fx_carry": Sleeve("Currency carry, 10 currencies", 10.0, 0.73, "fx_carry", "held, neither deflation passed"),
}


def trend_weight(prices, window):
    s = pd.Series(prices).dropna()
    if len(s) < window:
        raise ValueError(f"need {window} closes, got {len(s)}")
    return 1.0 if float(s.iloc[-1]) > float(s.iloc[-window:].mean()) else 0.0


def cross_weight(prices, fast=50, slow=200):
    s = pd.Series(prices).dropna()
    if len(s) < slow:
        raise ValueError(f"need {slow} closes, got {len(s)}")
    return 1.0 if float(s.iloc[-fast:].mean()) > float(s.iloc[-slow:].mean()) else 0.0


def yield_gap_weights(earnings, price, yield_10y_pct):
    for name, v in (("earnings", earnings), ("price", price), ("10-year yield", yield_10y_pct)):
        if v is None or not math.isfinite(v):
            raise ValueError(f"{name} missing")
    in_stock = earnings / price > yield_10y_pct / 100.0
    return {"SPX": 1.0, "IEF": 0.0} if in_stock else {"SPX": 0.0, "IEF": 1.0}


def carry_weights(rate_diff, n=3, min_assets=6):
    row = pd.Series(rate_diff, dtype=float).dropna()
    if len(row) < min_assets:
        raise ValueError(f"need {min_assets} rate differentials, got {len(row)}")
    ranked = row.sort_values(kind="mergesort")
    w = {k: 0.0 for k in row.index}
    for k in ranked.index[-n:]:
        w[k] += 1.0 / n
    for k in ranked.index[:n]:
        w[k] -= 1.0 / n
    return w


def marks(events, sleeve):
    return [e for e in events if e["type"] == "sleeve_mark" and e["sleeve"] == sleeve]


def killed(events, sleeve):
    state = None
    for e in events:
        if e["type"] == "sleeve_kill" and e["sleeve"] == sleeve:
            state = e["reasons"]
        elif e["type"] == "kill_clear" or (e["type"] == "sleeve_kill_clear" and e["sleeve"] == sleeve):
            state = None
    return state


def step(events, sleeve, target, today, rf_annual, limits=LIMITS):
    spec = SLEEVES[sleeve]
    history = marks(events, sleeve)
    prev = history[-1] if history else None
    if prev and prev["date"] >= today:
        return [], "already marked today"
    if not target or target.get("missing"):
        return [], f"missing: {(target or {}).get('missing', 'no signal')}"
    if rf_annual is None or not math.isfinite(rf_annual):
        return [], "missing: T-bill rate"
    prices = target["prices"]
    held = {k: w for k, w in (prev["weights"].items() if prev else []) if w != 0}
    gone = [k for k in held if k not in prices or not math.isfinite(prices[k])]
    absent = [k for k, w in target["weights"].items() if w != 0 and (k not in prices or not math.isfinite(prices[k]))]
    if gone or absent:
        return [], f"missing: price for {', '.join(sorted(set(gone + absent)))}"
    if prev:
        days = (pd.Timestamp(today) - pd.Timestamp(prev["date"])).days
        carry = prev.get("carry") or {}
        ret = sum(w * (prices[k] / prev["prices"][k] - 1 + carry.get(k, 0.0) * days / 365) for k, w in held.items())
        ret += (1 - sum(held.values())) * prev["rf"] * days / 365
        equity = prev["equity"] * (1 + ret)
        old = prev["weights"]
    else:
        equity, old = NOTIONAL, {}
    new = []
    reasons = killed(events, sleeve)
    if not reasons:
        fresh = signals.kill_switch([m["equity"] for m in history] + [equity], target["asof"], today, limits)
        if fresh:
            reasons = fresh
            new.append({"type": "sleeve_kill", "sleeve": sleeve, "date": today, "reasons": fresh})
    weights = {k: 0.0 for k in target["weights"]} if reasons else dict(target["weights"])
    traded = sum(abs(weights.get(k, 0.0) - old.get(k, 0.0)) for k in set(weights) | set(old))
    equity -= equity * traded * spec.cost_bps / 1e4
    new.append({"type": "sleeve_mark", "sleeve": sleeve, "date": today, "equity": equity, "weights": weights,
                "prices": {k: prices[k] for k in weights if k in prices}, "carry": target.get("carry") or {}, "rf": rf_annual,
                "signal_asof": target["asof"]})
    return new, "killed" if reasons else "marked"


def stats(events, sleeve):
    spec = SLEEVES[sleeve]
    history = marks(events, sleeve)
    out = {"sleeve": sleeve, "label": spec.label, "equity": history[-1]["equity"] if history else None, "obs": 0, "days": 0,
           "live_sharpe": float("nan"), "max_dd": 0.0, "live_dsr": float("nan"), "gate": False, "promotable": False, "max_live_usd": 0.0,
           "weights": history[-1]["weights"] if history else {}, "kills": killed(events, sleeve) or []}
    if len(history) < 2:
        return out
    excess, gaps = [], []
    for a, b in zip(history, history[1:]):
        gap = (pd.Timestamp(b["date"]) - pd.Timestamp(a["date"])).days
        gaps.append(gap)
        excess.append(b["equity"] / a["equity"] - 1 - a["rf"] * gap / 365)
    x = pd.Series(excess, dtype=float)
    ppy = 365 / float(np.mean(gaps))
    span = (pd.Timestamp(history[-1]["date"]) - pd.Timestamp(history[0]["date"])).days
    gate = signals.promotion_gate(x, ppy, spec.backtest_sharpe, span)
    checks = gate["checks"]
    floor_ok = not math.isnan(gate["live_sharpe"]) and gate["live_sharpe"] >= spec.backtest_sharpe - gate["band"]
    out.update(obs=len(x), days=span, live_sharpe=gate["live_sharpe"],
               gate=bool(checks["days"] and checks["sharpe_positive"] and checks["drawdown"] and floor_ok),
               max_dd=float((pd.Series([m["equity"] for m in history]) / pd.Series([m["equity"] for m in history]).cummax() - 1).min()))
    if len(x) >= MIN_OBS_FOR_DSR and x.std(ddof=1) > 0:
        out["live_dsr"] = probabilistic_sharpe(x, expected_max_sharpe(POOLED_TRIALS, POOLED_SR_VAR / ppy))
    out["max_live_usd"] = live_cap(out["gate"], out["live_dsr"], span)
    out["promotable"] = out["max_live_usd"] > 0
    return out


def live_cap(gate_passed, live_dsr, span_days, gate=signals.Gate()):
    if not gate_passed or math.isnan(live_dsr) or live_dsr < signals.DSR_BAR or span_days < gate.min_calendar_days:
        return 0.0
    return gate.small_live_usd if span_days < gate.scale_up_days else float("inf")


def required_live_sharpe(years, ppy=365.0, z=1.645):
    hurdle = expected_max_sharpe(POOLED_TRIALS, POOLED_SR_VAR)
    return hurdle + z * math.sqrt(ppy / (years * ppy - 1))


def line(s):
    if s["equity"] is None:
        return f"{s['label']}: no mark yet"
    sr = "n/a" if math.isnan(s["live_sharpe"]) else f"{s['live_sharpe']:.2f}"
    dsr = "n/a" if math.isnan(s["live_dsr"]) else f"{s['live_dsr']:.2f}"
    held = ", ".join(f"{k} {w:+.0%}" for k, w in s["weights"].items() if w) or "cash"
    state = "KILLED: " + "; ".join(s["kills"]) if s["kills"] else "promotable" if s["promotable"] else "evidence only"
    return (f"{s['label']}: ${s['equity']:,.2f}, holds {held}, {s['days']} days of evidence, {s['obs']} obs, live Sharpe {sr}, "
            f"drawdown {s['max_dd']:.1%}, live DSR {dsr} vs {signals.DSR_BAR:.2f}, {state}")
