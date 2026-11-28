#!/usr/bin/env python3
import argparse
import json
import math
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

from lab import dashboard, feeds, ledger, signals, sleeves, strategies

ROOT = Path(__file__).resolve().parent
PAPER = ROOT / "paper"
LEDGER = PAPER / "ledger.jsonl"
STATE = PAPER / "state.json"
TG = Path.home() / "agfarms" / "tools" / "telegram" / "tg.py"
NY = ZoneInfo("America/New_York")
BTC = "BTC-USD"
CRYPTO_FEE_BPS = 25.0
FLB_STAKE = 20.0
FLB_MAX_NEW = 5
FLB_BAND = (0.80, 0.95)
FLB_MIN_VOLUME_24H = 1000.0
FLB_HORIZON_H = 36
FX_SYMBOLS = {"XM": ("EURUSD=X", False), "GB": ("GBPUSD=X", False), "JP": ("JPY=X", True), "CA": ("CAD=X", True), "CH": ("CHF=X", True),
              "BR": ("BRL=X", True), "CN": ("CNY=X", True), "IN": ("INR=X", True), "KR": ("KRW=X", True), "MX": ("MXN=X", True)}
EARNINGS_LAG_MONTHS = 6
SNAPSHOT = [("S&P 500", "^GSPC", "^spx", 2), ("VIX", "^VIX", None, 2), ("US 10y %", "^TNX", None, 3),
            ("US 3m %", "^IRX", None, 3), ("Gold fut", "GC=F", None, 1), ("Dollar idx", "DX-Y.NYB", None, 2)]


def safe(fn, notes, label):
    try:
        return fn()
    except Exception as e:
        notes.append(f"{label}: {type(e).__name__} {str(e)[:120]}")
        return None


def pct(x, digits=1):
    return "n/a" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:+.{digits}%}"


def fnum(x):
    return f"{x:,.2f}" if x is not None else "n/a"


def snapshot(notes):
    rows, series = [], {}
    for label, ysym, ssym, kind in SNAPSHOT:
        got = safe(lambda: feeds.price_series(ysym, ssym), notes, label)
        if got is None:
            continue
        s, src = got
        series[ysym] = s
        last, prev = float(s.iloc[-1]), float(s.iloc[-2])
        change = f"{last - prev:+.2f} pts" if kind == 3 else pct(last / prev - 1)
        rows.append((label, fnum(last), change, str(s.index[-1])[:10], src))
    for product in [BTC, "ETH-USD"]:
        s = safe(lambda: feeds.coinbase_daily(product), notes, product)
        if s is None:
            continue
        series[product] = s
        rows.append((product, fnum(float(s.iloc[-1])), pct(float(s.iloc[-1] / s.iloc[-2] - 1)), str(s.index[-1])[:10], "Coinbase"))
    return rows, series


def cape_signal(spx, notes):
    d = strategies.shiller_returns()
    real = (1 + d["stock"]) / (d["CPI"] / d["CPI"].shift(1))
    fwd = np.log(real).rolling(120).sum().shift(-120) / 10
    a, b = signals.fit_cape(np.log(d["CAPE"]), fwd, split=None)
    raw = strategies.data.shiller()
    last = raw.dropna(subset=["CAPE", "P"]).iloc[-1]
    last_date = raw.dropna(subset=["CAPE", "P"]).index[-1]
    if spx is None:
        notes.append("CAPE: no live S&P price, using last Shiller value")
        cape = float(last["CAPE"])
    else:
        cape = signals.cape_now(float(last["CAPE"]), float(last["P"]), float(spx.iloc[-1]))
    return {"cape": cape, "fwd_real_10y": signals.cape_forecast(cape, a, b), "shiller_asof": str(last_date)[:7],
            "slope": b, "intercept": a}


def fed_odds(notes):
    events = safe(lambda: feeds.kalshi_event_markets("KXFEDDECISION"), notes, "Kalshi Fed")
    if not events:
        return None
    ev = sorted(events, key=lambda e: min(m["close_time"] for m in e["markets"]))[0]
    odds = []
    for m in ev["markets"]:
        bid, ask = float(m.get("yes_bid_dollars") or 0), float(m.get("yes_ask_dollars") or 0)
        mid = (bid + ask) / 2 if ask > 0 else float(m.get("last_price_dollars") or 0)
        odds.append((m.get("yes_sub_title"), mid))
    return {"title": ev.get("title"), "odds": sorted(odds, key=lambda x: -x[1])}


def flb_scan(now, notes):
    max_ts = int((now + timedelta(hours=FLB_HORIZON_H)).timestamp())
    mkts = safe(lambda: feeds.kalshi_markets(max_ts), notes, "Kalshi markets") or []
    fav, lng, picks = 0, 0, []
    for m in mkts:
        if m.get("market_type") != "binary" or str(m.get("ticker", "")).startswith("KXMVE"):
            continue
        yes_ask = float(m.get("yes_ask_dollars") or 0)
        no_ask = float(m.get("no_ask_dollars") or 0)
        vol = float(m.get("volume_24h_fp") or 0)
        if yes_ask <= 0 or vol < FLB_MIN_VOLUME_24H:
            continue
        bucket = signals.flb_bucket(yes_ask)
        fav += bucket == "favorite"
        lng += bucket == "longshot"
        for side, ask in (("yes", yes_ask), ("no", no_ask)):
            if FLB_BAND[0] <= ask <= FLB_BAND[1]:
                picks.append({"ticker": m["ticker"], "side": side, "ask": ask, "vol": vol, "title": m.get("title", "")[:70]})
    picks.sort(key=lambda p: -p["vol"])
    return {"liquid_markets": fav + lng, "favorites": fav, "longshots": lng, "picks": picks}


def gate_for(allev):
    ms = [e for e in allev if e["type"] == "mark"]
    excess, ppy = signals.sleeve_excess(ms)
    span = (pd.Timestamp(ms[-1]["date"]) - pd.Timestamp(ms[0]["date"])).days if ms else 0
    g = signals.promotion_gate(excess, ppy, signals.BTC_OOS_SHARPE, span)
    g["path"] = signals.BTC_PROMOTABLE
    if not g["path"]:
        g["pass"], g["max_live_usd"] = False, 0.0
    return g


def book(allev, new, trend, target, kills, rerun):
    ms = [e for e in allev if e["type"] == "mark"]
    cash, pos = ledger.state(allev)
    return {"equity": ms[-1]["equity"] if ms else None, "prev": ms[-2]["equity"] if len(ms) > 1 else None,
            "start": ledger.START_CASH, "positions": pos, "cash": cash, "kills": kills or [], "gate": gate_for(allev),
            "trend": trend, "target": target, "rerun": rerun,
            "trades": [e for e in new if e["type"] in ("trade", "settle")]}


def paper_run(events, series, flb, rf_annual, today, notes):
    btc = series.get(BTC)
    trend = safe(lambda: signals.sma_trend(btc), notes, "BTC trend") if btc is not None else None
    today_marks = [e for e in events if e["type"] == "mark" and e["date"] == today]
    if today_marks:
        m = today_marks[-1]
        return [], book(events, [e for e in events if e.get("date") == today], trend, m.get("btc_weight", 0.0),
                        signals.active_kill(events), True)
    new = []
    if not events:
        new.append({"type": "deposit", "date": today, "amount": ledger.START_CASH, "reason": "paper start"})
    allev = events + new
    marks = [e for e in allev if e["type"] == "mark"]
    cash, pos = ledger.state(allev)
    if marks and rf_annual is not None:
        days = (pd.Timestamp(today) - pd.Timestamp(marks[-1]["date"])).days
        if days > 0 and cash > 0:
            new.append({"type": "interest", "date": today, "amount": cash * rf_annual * days / 365, "reason": f"T-bill {days}d"})
    prices = {}
    for inst in [k for k in pos if k.startswith("KALSHI:")]:
        _, ticker, side = inst.split(":")
        m = safe(lambda: feeds.kalshi_market(ticker), notes, f"Kalshi {ticker}")
        if m and m.get("result") in ("yes", "no"):
            new.append({"type": "settle", "date": today, "instrument": inst, "payout": 1.0 if m["result"] == side else 0.0,
                        "result": m["result"]})
        elif m:
            prices[inst] = float(m.get(f"{side}_bid_dollars") or 0)
    if btc is not None and len(btc):
        prices[BTC] = float(btc.iloc[-1])
    allev = events + new
    fresh = []
    if trend is None:
        fresh.append("BTC trend unavailable")
    try:
        eq_now = ledger.equity(allev, prices)
    except KeyError as e:
        eq_now = None
        fresh.append(f"unpriced position {e}")
    eq_hist = [v for _, v in ledger.marks(allev)]
    if eq_now is not None:
        fresh += signals.kill_switch(eq_hist + [eq_now], trend.asof if trend else "1970-01-01", today)
    persisted = signals.active_kill(events)
    if fresh and not persisted:
        new.append({"type": "kill", "date": today, "reasons": fresh})
    kills = (persisted or []) + [r for r in fresh if r not in (persisted or [])]
    target = signals.target_weight(trend.on if trend else False, bool(kills))
    if BTC in prices and eq_now is not None:
        t = ledger.rebalance(events + new, BTC, target, prices, CRYPTO_FEE_BPS, today,
                             f"BTC SMA{signals.BTC_SMA_DAYS} {'on' if trend and trend.on else 'off'}{', killed' if kills else ''}")
        if t:
            new.append(t)
    if not kills:
        allev = events + new
        held = {k for k in ledger.state(allev)[1] if k.startswith("KALSHI:")}
        opened = sum(1 for e in allev if e["type"] == "trade" and e.get("date") == today and e["instrument"].startswith("KALSHI:"))
        for p in flb["picks"]:
            inst = f"KALSHI:{p['ticker']}:{p['side']}"
            if inst in held or opened >= FLB_MAX_NEW:
                continue
            qty = math.floor(FLB_STAKE / p["ask"])
            new.append({"type": "trade", "date": today, "instrument": inst, "side": "buy", "qty": qty, "price": p["ask"],
                        "fee": signals.kalshi_fee(p["ask"], qty), "reason": "FLB favorite measurement"})
            prices[inst] = p["ask"]
            held.add(inst)
            opened += 1
    allev = events + new
    eq_end = safe(lambda: ledger.equity(allev, prices), notes, "paper equity")
    if eq_end is not None:
        new.append({"type": "mark", "date": today, "equity": eq_end, "btc_weight": target, "btc_on": bool(trend and trend.on),
                    "btc_price": prices.get(BTC), "rf": rf_annual})
    return new, book(events + new, new, trend, target, kills, False)


def events_block(today, notes):
    out = []
    fomc = safe(feeds.fomc_meetings, notes, "Fed calendar") or []
    nxt = [m for m in fomc if m["date"] >= today.date()]
    if nxt:
        m = nxt[0]
        out.append(f"FOMC decision {m['date']:%a %d %b}{' with projections' if m['sep'] else ''}, in {(m['date'] - today.date()).days} days. Source: federalreserve.gov")
    got = safe(feeds.cpi_dates, notes, "CPI calendar")
    if got:
        dates, src = got
        up = [d for d in dates if d >= today.date()]
        if up:
            out.append(f"CPI release {up[0]:%a %d %b} 08:30 ET, in {(up[0] - today.date()).days} days. Source: {src}")
    return out, (nxt[0]["date"] if nxt else None)


def attempt(fn):
    try:
        return fn()
    except Exception as e:
        return {"missing": f"{type(e).__name__} {str(e)[:80]}"}


def asof(series):
    return str(series.index[-1])[:10]


def btc_target(series):
    btc = series[BTC]
    return {"weights": {"BTC": sleeves.trend_weight(btc, signals.BTC_SMA_DAYS)}, "prices": {"BTC": float(btc.iloc[-1])}, "asof": asof(btc)}


def spx_target(series, rule):
    spx = series["^GSPC"]
    return {"weights": {"SPX": rule(spx)}, "prices": {"SPX": float(spx.iloc[-1])}, "asof": asof(spx)}


def yield_gap_target(series, today):
    spx, tnx = series["^GSPC"], series["^TNX"]
    ief, _ = feeds.price_series("IEF", "ief.us")
    e = strategies.data.shiller()["E"].dropna()
    e = e[e.index <= pd.Timestamp(today) - pd.DateOffset(months=EARNINGS_LAG_MONTHS)]
    if e.empty:
        raise ValueError("no Shiller earnings old enough")
    weights = sleeves.yield_gap_weights(float(e.iloc[-1]), float(spx.iloc[-1]), float(tnx.iloc[-1]))
    return {"weights": weights, "prices": {"SPX": float(spx.iloc[-1]), "IEF": float(ief.iloc[-1])}, "asof": min(asof(spx), asof(ief)),
            "detail": f"Shiller earnings {str(e.index[-1])[:7]}"}


def fx_carry_target():
    rates = strategies.data.policy_rates().ffill(limit=3).iloc[-1]
    prices, dates = {}, []
    for area, (symbol, invert) in FX_SYMBOLS.items():
        got = attempt(lambda: feeds.price_series(symbol))
        if isinstance(got, dict):
            continue
        px = got[0]
        prices[area] = 1.0 / float(px.iloc[-1]) if invert else float(px.iloc[-1])
        dates.append(asof(px))
    diff = {a: float(rates[a] - rates["US"]) for a in prices if a in rates and pd.notna(rates[a]) and pd.notna(rates["US"])}
    weights = sleeves.carry_weights(diff)
    return {"weights": weights, "prices": prices, "carry": diff, "asof": min(dates)}


def sleeve_targets(series, today):
    return {"btc_sma50": attempt(lambda: btc_target(series)),
            "sp_above_200d": attempt(lambda: spx_target(series, lambda s: sleeves.trend_weight(s, 200))),
            "sp_cross_50_200": attempt(lambda: spx_target(series, sleeves.cross_weight)),
            "yield_gap": attempt(lambda: yield_gap_target(series, today)),
            "fx_carry": attempt(fx_carry_target)}


def sleeves_run(events, targets, rf_annual, today):
    new, status = [], {}
    for sid in sleeves.SLEEVES:
        got, status[sid] = sleeves.step(events + new, sid, targets.get(sid), today, rf_annual)
        new += got
    stats = {sid: sleeves.stats(events + new, sid) for sid in sleeves.SLEEVES}
    return new, stats, status


def actions(paper, sleeve_stats):
    out = []
    if paper["kills"]:
        out.append("Kill switch tripped on the Kalshi book: " + "; ".join(paper["kills"]) + ". Review, then run brief.py --clear-kill.")
    for s in sleeve_stats.values():
        if s["kills"]:
            out.append(f"Kill switch tripped on sleeve {s['label']}: " + "; ".join(s["kills"]) + ". The sleeve sits in cash. Review, then run brief.py --clear-kill.")
        elif s["promotable"]:
            cap = "with no gate cap" if math.isinf(s["max_live_usd"]) else f"at most ${s['max_live_usd']:,.0f}"
            out.append(f"Sleeve {s['label']} passed the pooled bar on live paper data and the 90-day gate. Small live, {cap}, is open for your approval.")
    return out or ["Nothing to do today. No sleeve is promotable, no kill switch is tripped and no live order is open."]


def context(trend, prev, cape, flb, fomc_next, today, alerts):
    out = []
    if trend:
        changed = signals.flip(prev.get("btc_on"), trend.on)
        state = f"flipped {changed}" if changed else f"stays {'ON' if trend.on else 'OFF'}"
        out.append(f"BTC trend {state}, {abs(trend.gap):.1%} {'above' if trend.on else 'below'} its 50-day average. "
                   f"Backtest evidence: {signals.evidence_line(signals.BTC_EVIDENCE)}.")
    if cape:
        out.append(f"CAPE near {cape['cape']:.0f} fits about {cape['fwd_real_10y']:.1%} a year real for US stocks over 10 years on the full-sample line. The lab found no out-of-sample forecast power.")
    if flb:
        out.append(f"Kalshi longshots priced 30 cents or less: last-trade data showed -73% ROI, an upper bound since those prints can be stale. {flb['longshots']} liquid longshots close in the next {FLB_HORIZON_H}h. Favorites stay a $20 paper measurement at live asks.")
    if fomc_next and (fomc_next - today.date()).days <= 14:
        out.append("FOMC inside two weeks: expect wider BTC and rate moves. No change to rules.")
    out += [f"Macro alert: {a}" for a in alerts]
    return out


def render(today, snap, regime, sigs, paper, evts, acts, notes, sleeve_stats=None, sleeve_status=None, macro=None, ctx=None):
    L = [f"Finance brief {today:%a %d %b %Y %H:%M} ET", "", "MARKETS"]
    L += [f"{r[0]}: {r[1]} ({r[2]}) {r[3]} {r[4]}" for r in snap]
    L += ["", "REGIME"] + regime + ["", "SIGNALS"] + sigs + ["", "PAPER SLEEVES", f"${sleeves.NOTIONAL:,.0f} of paper money each, marked daily. "
          f"Promotion needs a live deflated Sharpe of {signals.DSR_BAR:.2f} over {sleeves.POOLED_TRIALS} trials plus the 90-day gate."]
    for sid, st in (sleeve_stats or {}).items():
        today_status = (sleeve_status or {}).get(sid, "")
        L.append(sleeves.line(st) + (f". Today: {today_status}" if today_status.startswith("missing") else ""))
    L += ["", "KALSHI MEASUREMENT BOOK"]
    eq = paper["equity"]
    if eq is not None:
        day = eq / paper["prev"] - 1 if paper["prev"] else 0.0
        L.append(f"Equity ${eq:,.2f}, day {pct(day, 2)}, since start {pct(eq / paper['start'] - 1, 2)}, cash ${paper['cash']:,.2f}")
    for k, q in paper["positions"].items():
        L.append(f"  {k}: {q:,.4f}")
    for t in paper["trades"]:
        if t["type"] == "trade":
            L.append(f"  {t['side']} {t['qty']:,.4f} {t['instrument']} @ {t['price']:,.4f}: {t['reason']}")
        else:
            L.append(f"  settled {t['instrument']} result {t['result']} payout {t['payout']}")
    if paper["rerun"]:
        L.append("Already marked today: no new paper trades this run.")
    L.append("Kill switch: " + ("; ".join(paper["kills"]) if paper["kills"] else "clear"))
    if macro is not None:
        head, _ = dashboard.summary(macro)
        L += ["", "MACRO DASHBOARD", head] + dashboard.render(macro)
    L += ["", "EVENTS"] + (evts or ["none in feed"]) + ["", "ACTION FOR GIAN"] + [f"{i}. {a}" for i, a in enumerate(acts, 1)]
    if ctx:
        L += ["", "CONTEXT, NO ACTION"] + [f"- {c}" for c in ctx]
    if notes:
        L += ["", "DATA NOTES"] + notes
    return "\n".join(L)


def parse_args(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--out")
    ap.add_argument("--clear-kill", action="store_true")
    return ap.parse_args(argv)


def deliver(text, send, dry_run=False):
    if not send or dry_run:
        print(text)
        print("\n[Telegram not sent: pass --send to deliver]")
        return 0
    return subprocess.run([sys.executable, str(TG), "send", "-"], input=text, text=True).returncode


def main(argv=None):
    args = parse_args(argv)
    if args.clear_kill:
        events = ledger.load(LEDGER)
        if not signals.active_kill(events) and not any(sleeves.killed(events, sid) for sid in sleeves.SLEEVES):
            print("no active kill switch")
            return 0
        ledger.append(LEDGER, {"type": "kill_clear", "date": datetime.now(NY).date().isoformat()})
        print("kill switch cleared")
        return 0
    now = datetime.now(timezone.utc)
    today = datetime.now(NY)
    tstr = today.date().isoformat()
    notes = []
    prev = json.loads(STATE.read_text()) if STATE.exists() else {}
    snap, series = snapshot(notes)
    spx, tnx, irx, vix = (series.get(k) for k in ("^GSPC", "^TNX", "^IRX", "^VIX"))
    cape = safe(lambda: cape_signal(spx, notes), notes, "CAPE")
    fed = fed_odds(notes)
    flb = flb_scan(now, notes)
    hy = safe(lambda: feeds.fred_series("BAMLH0A0HYM2"), notes, "HY spread")
    regime = []
    if tnx is not None and irx is not None:
        spread = float(tnx.iloc[-1] - irx.iloc[-1])
        regime.append(f"10y minus 3m: {spread:+.2f} pts ({'inverted' if spread < 0 else 'upward sloping'})")
    if vix is not None:
        v = float(vix.iloc[-1])
        regime.append(f"VIX {v:.1f}: {'calm' if v < 15 else 'normal' if v < 25 else 'stressed'}")
    if spx is not None and len(spx) >= 200:
        s200 = float(spx.iloc[-200:].mean())
        regime.append(f"S&P vs 200-day average: {float(spx.iloc[-1]) / s200 - 1:+.1%}")
    if hy:
        s, src = hy
        regime.append(f"High-yield spread {float(s.iloc[-1]):.2f}% on {str(s.index[-1])[:10]} ({src})")
    if fed:
        regime.append(f"{fed['title']} Kalshi: " + ", ".join(f"{n} {p:.0%}" for n, p in fed["odds"][:3]))
    rf = float(irx.iloc[-1]) / 100 if irx is not None else None
    events = ledger.load(LEDGER)
    new, paper = paper_run(events, series, flb, rf, tstr, notes)
    targets = sleeve_targets(series, tstr)
    sleeve_new, sleeve_stats, sleeve_status = sleeves_run(events + new, targets, rf, tstr)
    new += sleeve_new
    macro = safe(lambda: dashboard.build(tstr), notes, "Macro dashboard")
    trend = paper["trend"]
    sigs = []
    if trend:
        ch = signals.flip(prev.get("btc_on"), trend.on)
        sigs.append(f"BTC SMA50 trend: {'ON' if trend.on else 'OFF'}, close {trend.last:,.0f} vs avg {trend.sma:,.0f} ({trend.gap:+.1%}), "
                    f"{'flipped ' + ch if ch else 'unchanged' if 'btc_on' in prev else 'first reading'}. "
                    + "Runs in its own paper sleeve")
    if cape:
        d = cape["fwd_real_10y"] - prev["cape_fwd"] if "cape_fwd" in prev else None
        sigs.append(f"CAPE context, failed lab out-of-sample test: CAPE about {cape['cape']:.1f} (Shiller {cape['shiller_asof']} scaled by S&P price, an upper bound since earnings grew), 10y real return {cape['fwd_real_10y']:.1%}/yr"
                    + (f", {d * 100:+.2f} pts since last run" if d is not None else ", first reading"))
    sigs.append(f"Favorite-longshot: {flb['liquid_markets']} liquid Kalshi markets close within {FLB_HORIZON_H}h, {flb['favorites']} favorites, "
                f"{flb['longshots']} longshots" + (f", longshots {flb['longshots'] - prev['flb_longshots']:+d} vs last run" if "flb_longshots" in prev else ""))
    evts, fomc_next = events_block(today, notes)
    acts = actions(paper, sleeve_stats)
    ctx = context(trend, prev, cape, flb, fomc_next, today, dashboard.summary(macro)[1] if macro else [])
    if targets["yield_gap"].get("detail"):
        ctx.append(f"Yield gap sleeve reads {targets['yield_gap']['detail']}, the latest in the lab file at least {EARNINGS_LAG_MONTHS} months old.")
    text = render(today, snap, regime, sigs, paper, evts, acts, notes, sleeve_stats, sleeve_status, macro, ctx)
    if args.out:
        Path(args.out).write_text(text + "\n")
    if args.dry_run:
        print(text)
        print(f"\n[dry run: {len(new)} ledger events not written, Telegram not sent]")
        return 0
    for e in new:
        ledger.append(LEDGER, e)
    STATE.write_text(json.dumps({"date": tstr, "btc_on": trend.on if trend else None,
                                 "cape_fwd": cape["fwd_real_10y"] if cape else None, "flb_longshots": flb["longshots"]}, indent=2))
    return deliver(text, args.send)


if __name__ == "__main__":
    sys.exit(main())
