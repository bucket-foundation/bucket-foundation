import math
from dataclasses import dataclass

import numpy as np
import pandas as pd

BTC_SMA_DAYS = 50
BTC_OOS_SHARPE = 0.80
BTC_VOL = 0.48
BTC_SLEEVE_CAP = 0.20
KELLY_FRACTION = 0.25
FAVORITE_MIN = 0.70
LONGSHOT_MAX = 0.30
CAPE_SPLIT = "1998-01-01"
DSR_BAR = 0.95
BTC_EVIDENCE = {"dsr_44_trials": 0.98, "dsr_pooled": 0.75, "trials_pooled": 317, "dsr_family": 0.18, "trials_family": 16}


def passes_bar(evidence, bar=DSR_BAR):
    return evidence["dsr_pooled"] >= bar


def evidence_line(evidence, bar=DSR_BAR):
    return (f"deflated Sharpe {evidence['dsr_pooled']:.2f} pooled over {evidence['trials_pooled']} trials and {evidence['dsr_family']:.2f} "
            f"inside the {evidence['trials_family']}-trial crypto family, bar {bar:.2f}; it was {evidence['dsr_44_trials']:.2f} over 44 trials")


BTC_PROMOTABLE = passes_bar(BTC_EVIDENCE)


@dataclass
class TrendState:
    last: float
    sma: float
    on: bool
    gap: float
    asof: str


def sma_trend(prices, window=BTC_SMA_DAYS):
    s = pd.Series(prices).dropna()
    if len(s) < window:
        raise ValueError(f"need {window} closes, got {len(s)}")
    sma = float(s.iloc[-window:].mean())
    last = float(s.iloc[-1])
    return TrendState(last=last, sma=sma, on=last > sma, gap=last / sma - 1, asof=str(s.index[-1])[:10])


def flip(prev_on, now_on):
    if prev_on is None or prev_on == now_on:
        return None
    return "ON" if now_on else "OFF"


def kelly_continuous(sharpe, vol, fraction=KELLY_FRACTION, cap=1.0):
    if vol <= 0 or sharpe <= 0:
        return 0.0
    return float(min(cap, fraction * sharpe / vol))


def kelly_binary(p_win, price, fraction=KELLY_FRACTION, cap=1.0):
    if not 0 < price < 1:
        return 0.0
    full = (p_win - price) / (1 - price)
    return float(min(cap, max(0.0, fraction * full)))


def kalshi_fee(price, contracts=1):
    return math.ceil(0.07 * contracts * price * (1 - price) * 100 - 1e-9) / 100


def flb_bucket(price):
    if price >= FAVORITE_MIN:
        return "favorite"
    if price <= LONGSHOT_MAX:
        return "longshot"
    return "middle"


def fit_cape(log_cape, fwd_real, split=CAPE_SPLIT, horizon_months=120):
    df = pd.DataFrame({"x": log_cape, "y": fwd_real}).dropna()
    fit = df[df.index < pd.Timestamp(split) - pd.DateOffset(months=horizon_months)] if split else df
    slope, intercept = np.polyfit(fit["x"], fit["y"], 1)
    return float(intercept), float(slope)


def cape_forecast(cape, intercept, slope):
    return float(math.exp(intercept + slope * math.log(cape)) - 1)


def cape_now(last_cape, last_price, price_now):
    return float(last_cape * price_now / last_price)


def drawdown(equity):
    e = pd.Series(equity, dtype=float).dropna()
    if e.empty:
        return 0.0
    return float((e / e.cummax() - 1).iloc[-1])


@dataclass
class Limits:
    max_drawdown: float = -0.25
    daily_loss: float = -0.05
    max_stale_days: int = 2
    max_sleeve: float = BTC_SLEEVE_CAP


def kill_switch(equity, last_data_date, today, limits=Limits()):
    reasons = []
    e = pd.Series(equity, dtype=float).dropna()
    if len(e) >= 2 and e.iloc[-1] / e.iloc[-2] - 1 <= limits.daily_loss:
        reasons.append(f"daily loss {e.iloc[-1] / e.iloc[-2] - 1:.1%} at or past {limits.daily_loss:.0%}")
    dd = drawdown(e)
    if dd <= limits.max_drawdown:
        reasons.append(f"drawdown {dd:.1%} at or past {limits.max_drawdown:.0%}")
    stale = (pd.Timestamp(today) - pd.Timestamp(last_data_date)).days
    if stale > limits.max_stale_days:
        reasons.append(f"data {stale} days old")
    return reasons


@dataclass
class Gate:
    min_calendar_days: int = 90
    scale_up_days: int = 180
    small_live_usd: float = 1000.0
    se_band: float = 1.0
    max_drawdown: float = -0.25


def sleeve_excess(marks, cap=BTC_SLEEVE_CAP, fee_bps=25.0):
    rows = [m for m in marks if m.get("btc_price")]
    out, gaps = {}, []
    held = 0.0
    for prev, cur in zip(rows, rows[1:]):
        gap = (pd.Timestamp(cur["date"]) - pd.Timestamp(prev["date"])).days
        if gap <= 0:
            continue
        gaps.append(gap)
        rf = (prev.get("rf") or 0.0) * gap / 365
        w = cap if prev.get("btc_on") else 0.0
        fee = abs(w - held) * fee_bps / 10_000
        held = w
        out[cur["date"]] = w * (cur["btc_price"] / prev["btc_price"] - 1 - rf) - fee
    ppy = 365 / float(np.mean(gaps)) if gaps else 365.0
    return pd.Series(out, dtype=float), ppy


def sharpe_se(sharpe_ann, n, ppy):
    if n < 2:
        return float("inf")
    sr = sharpe_ann / math.sqrt(ppy)
    return math.sqrt((1 + 0.5 * sr ** 2) / n) * math.sqrt(ppy)


def promotion_gate(excess, ppy, backtest_sharpe, span_days, gate=Gate()):
    r = pd.Series(excess, dtype=float).dropna()
    n = len(r)
    sd = r.std(ddof=1) if n > 1 else float("nan")
    live_sr = float(r.mean() / sd * math.sqrt(ppy)) if n > 1 and sd > 0 else float("nan")
    se = sharpe_se(live_sr if not math.isnan(live_sr) else backtest_sharpe, n, ppy)
    dd = drawdown((1 + r).cumprod()) if n else 0.0
    checks = {
        "days": span_days >= gate.min_calendar_days,
        "sharpe_positive": not math.isnan(live_sr) and live_sr > 0,
        "sharpe_in_band": not math.isnan(live_sr) and abs(live_sr - backtest_sharpe) <= gate.se_band * se,
        "drawdown": dd > gate.max_drawdown,
    }
    passed = all(checks.values())
    max_live = 0.0 if not passed else gate.small_live_usd if span_days < gate.scale_up_days else float("inf")
    return {"pass": passed, "checks": checks, "obs": n, "span_days": span_days, "max_live_usd": max_live,
            "live_sharpe": live_sr, "band": gate.se_band * se, "max_dd": dd}


def active_kill(events):
    state = None
    for e in events:
        if e["type"] == "kill":
            state = e["reasons"]
        elif e["type"] == "kill_clear":
            state = None
    return state


def target_weight(trend_on, killed, sharpe=BTC_OOS_SHARPE, vol=BTC_VOL, cap=BTC_SLEEVE_CAP, promotable=None):
    promotable = BTC_PROMOTABLE if promotable is None else promotable
    if killed or not trend_on or not promotable:
        return 0.0
    return kelly_continuous(sharpe, vol, cap=cap)
