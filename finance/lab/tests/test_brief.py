import pandas as pd
import pytest

import brief
from lab import feeds, ledger, signals


def btc_series(last, end, n=60, base=100.0):
    idx = pd.date_range(end=pd.Timestamp(end) - pd.Timedelta(days=1), periods=n, freq="D")
    return pd.Series([base] * (n - 1) + [last], index=idx)


PICK = {"ticker": "KXT-1", "side": "yes", "ask": 0.9, "vol": 5000, "title": "t"}


def flb(picks=None):
    return {"liquid_markets": 1, "favorites": 1, "longshots": 0, "picks": picks if picks is not None else [PICK]}


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("network call")
    monkeypatch.setattr(feeds, "_get", boom)


def run(events, last, picks=None, today="2026-11-27", rf=0.04):
    notes = []
    new, paper = brief.paper_run(events, {brief.BTC: btc_series(last, today)}, flb(picks), rf, today, notes)
    return new, paper, notes


@pytest.fixture
def promotable(monkeypatch):
    monkeypatch.setattr(signals, "BTC_PROMOTABLE", True)


def test_tracked_signal_gets_no_capital_in_the_kalshi_book():
    assert not signals.BTC_PROMOTABLE
    new, paper, _ = run([], 120.0)
    assert paper["trend"].on and paper["target"] == 0.0
    assert not [e for e in new if e["type"] == "trade" and e["instrument"] == brief.BTC]
    assert [e for e in new if e["type"] == "trade" and e["instrument"].startswith("KALSHI:")]
    g = paper["gate"]
    assert not g["path"] and not g["pass"] and g["max_live_usd"] == 0.0


def idle(label="x"):
    return {"label": label, "kills": [], "promotable": False}


def test_action_section_says_plainly_when_there_is_nothing_to_do():
    acts = brief.actions({"kills": []}, {"a": idle(), "b": idle()})
    assert acts == ["Nothing to do today. No sleeve is promotable, no kill switch is tripped and no live order is open."]


def test_action_section_lists_kills_and_promotable_sleeves_only():
    stats = {"a": dict(idle("A"), kills=["drawdown -30.0% at or past -25%"]), "b": dict(idle("B"), promotable=True, max_live_usd=1000.0), "c": idle("C")}
    acts = brief.actions({"kills": ["daily loss"]}, stats)
    assert len(acts) == 3 and "Kalshi book: daily loss" in acts[0]
    assert "sleeve A" in acts[1] and "--clear-kill" in acts[1]
    assert "Sleeve B passed the pooled bar" in acts[2] and "at most $1,000" in acts[2] and "your approval" in acts[2]
    assert not any("Nothing to do" in a for a in acts)


def test_context_quotes_the_evidence_constants_on_a_flip(monkeypatch):
    monkeypatch.setitem(signals.BTC_EVIDENCE, "dsr_pooled", 0.97)
    trend = signals.sma_trend(btc_series(120.0, "2026-11-27"))
    ctx = brief.context(trend, {"btc_on": False}, None, None, None, pd.Timestamp("2026-11-27"), ["VIX 30 on 2026-11-26: above 28.5 [Lab]"])
    assert "flipped ON" in ctx[0] and "0.97 pooled over 317 trials" in ctx[0] and "DSR lab" not in ctx[0]
    assert ctx[-1] == "Macro alert: VIX 30 on 2026-11-26: above 28.5 [Lab]"


def test_render_shows_sleeves_dashboard_and_plain_action():
    _, paper, _ = run([], 120.0)
    from lab import dashboard, sleeves
    stats = {sid: sleeves.stats([], sid) for sid in sleeves.SLEEVES}
    status = {sid: "missing: price for IEF" if sid == "yield_gap" else "marked" for sid in sleeves.SLEEVES}
    def get(series):
        raise dashboard.Missing(f"{series} not in lab files")
    macro = dashboard.build("2026-11-27", get)
    acts = brief.actions(paper, stats)
    text = brief.render(pd.Timestamp("2026-11-27 09:00"), [], [], [], paper, [], acts, [], stats, status, macro, ["c"])
    assert "PAPER SLEEVES" in text and "$1,000 of paper money each" in text and text.count("no mark yet") == 5
    assert "Today: missing: price for IEF" in text
    assert "MACRO DASHBOARD" in text and "39 gauges: 0 ok, 0 in alert, 0 stale, 39 missing" in text
    assert "ACTION FOR GIAN\n1. Nothing to do today." in text and "CONTEXT, NO ACTION\n- c" in text


def test_tracked_signal_sells_an_existing_sleeve():
    ev = [{"type": "deposit", "date": "2026-11-26", "amount": 10000.0},
          {"type": "trade", "date": "2026-11-26", "instrument": brief.BTC, "side": "buy", "qty": 20.0, "price": 100.0, "fee": 0.0},
          {"type": "mark", "date": "2026-11-26", "equity": 10000.0, "btc_on": True, "btc_price": 100.0, "rf": 0.04}]
    new, paper, _ = run(ev, 101.0, picks=[])
    assert any(e["type"] == "trade" and e["instrument"] == brief.BTC and e["side"] == "sell" for e in new)
    assert brief.BTC not in paper["positions"] and not paper["kills"]


def test_first_run_deposits_buys_and_marks(promotable):
    new, paper, _ = run([], 120.0)
    types = [e["type"] for e in new]
    assert types[0] == "deposit" and types[-1] == "mark"
    btc = [e for e in new if e["type"] == "trade" and e["instrument"] == brief.BTC]
    assert btc and btc[0]["side"] == "buy"
    assert paper["target"] == signals.BTC_SLEEVE_CAP
    kal = [e for e in new if e["type"] == "trade" and e["instrument"].startswith("KALSHI:")]
    assert len(kal) == 1 and kal[0]["qty"] == 22


def test_same_day_rerun_adds_nothing():
    new, _, _ = run([], 120.0)
    again, paper, _ = run(new, 120.0)
    assert again == []
    assert paper["rerun"]
    assert len([e for e in new if e["type"] == "mark"]) == 1


def test_kalshi_cap_per_day():
    picks = [dict(PICK, ticker=f"KXT-{i}") for i in range(9)]
    new, _, _ = run([], 120.0, picks)
    assert sum(1 for e in new if e["type"] == "trade" and e["instrument"].startswith("KALSHI:")) == brief.FLB_MAX_NEW


def test_settlement_pays_winner(monkeypatch):
    new, _, _ = run([], 90.0)
    monkeypatch.setattr(feeds, "kalshi_market", lambda t: {"result": "yes"})
    nxt, paper, _ = run(new, 90.0, picks=[], today="2026-11-30")
    s = [e for e in nxt if e["type"] == "settle"]
    assert s and s[0]["payout"] == 1.0
    assert not any(k.startswith("KALSHI:") for k in paper["positions"])


def test_drawdown_kill_flattens_persists_and_blocks_kalshi(monkeypatch, promotable):
    monkeypatch.setattr(feeds, "kalshi_market", lambda t: {"result": "no"})
    ev = [{"type": "deposit", "date": "2026-11-26", "amount": 10000.0},
          {"type": "trade", "date": "2026-11-26", "instrument": brief.BTC, "side": "buy", "qty": 20.0, "price": 100.0, "fee": 0.0},
          {"type": "mark", "date": "2026-11-26", "equity": 10000.0, "btc_on": True, "btc_price": 100.0, "rf": 0.04}]
    new, paper, _ = run(ev, 60.0, today="2026-11-27")
    assert paper["kills"]
    assert any(e["type"] == "kill" for e in new)
    assert paper["target"] == 0.0
    assert any(e["type"] == "trade" and e["instrument"] == brief.BTC and e["side"] == "sell" for e in new)
    assert not any(e["type"] == "trade" and e["instrument"].startswith("KALSHI:") for e in new)
    later, paper2, _ = run(ev + new, 130.0, today="2026-11-30")
    assert paper2["kills"] and paper2["target"] == 0.0
    cleared = ev + new + later + [{"type": "kill_clear", "date": "2026-11-30"}]
    final, paper3, _ = run(cleared, 130.0, today="2026-12-01")
    assert not paper3["kills"] and paper3["target"] == signals.BTC_SLEEVE_CAP


def test_missing_btc_data_is_kill_reason():
    ev = [{"type": "deposit", "date": "2026-11-26", "amount": 1000.0},
          {"type": "trade", "date": "2026-11-26", "instrument": brief.BTC, "side": "buy", "qty": 1.0, "price": 100.0, "fee": 0.0}]
    new, paper = brief.paper_run(ev, {}, flb([]), 0.04, "2026-11-27", [])
    assert any("BTC trend unavailable" in k for k in paper["kills"])
    assert any("unpriced" in k for k in paper["kills"])
    assert not any(e["type"] == "mark" for e in new)


def test_unsettled_kalshi_marked_at_bid(monkeypatch):
    new, _, _ = run([], 90.0)
    monkeypatch.setattr(feeds, "kalshi_market", lambda t: {"result": "", "yes_bid_dollars": "0.95"})
    nxt, paper, _ = run(new, 90.0, picks=[], today="2026-11-30")
    assert nxt[-1]["type"] == "mark"
    assert not paper["kills"]


def test_telegram_send_is_opt_in(monkeypatch, capsys):
    calls = []
    def fake_run(cmd, **kw):
        calls.append(cmd)
        class R:
            returncode = 0
        return R()
    monkeypatch.setattr(brief.subprocess, "run", fake_run)
    assert not brief.parse_args([]).send and brief.parse_args(["--send"]).send
    assert brief.deliver("hello", send=False) == 0 and calls == []
    out = capsys.readouterr().out
    assert "hello" in out and "Telegram not sent" in out
    assert brief.deliver("hello", send=True, dry_run=True) == 0 and calls == []
    assert brief.deliver("hello", send=True) == 0 and len(calls) == 1 and calls[0][-2:] == ["send", "-"]


def test_systemd_service_passes_send():
    from pathlib import Path
    unit = Path(brief.ROOT).parents[1] / "scripts" / "systemd" / "finance-brief.service"
    line = [l for l in unit.read_text().splitlines() if l.startswith("ExecStart=")][0]
    assert line.endswith("brief.py --send")


JARGON = [r"DSR", r"IORB", r"SOFR", r"TGA", r"sleeve", r"\bbp\b", r"\bbps\b", r"Sharpe", r"\bgate\b", r"\[House\]", r"\[Sourced\]", r"\[Lab\]",
          r"deflated", r"OAS", r"VIX\b", r"T-bill"]


def plain_brief(alerting=True, events=None, status=None):
    import re
    from lab import dashboard, sleeves
    idx = pd.bdate_range(end="2026-11-27", periods=3)
    series = {"^GSPC": pd.Series([7100.0, 7183.0, 7297.49], index=idx), "^TNX": pd.Series([4.80, 4.85, 4.94], index=idx),
              brief.BTC: pd.Series([60000.0, 60374.0, 60495.57], index=idx), "GC=F": pd.Series([3500.0, 3534.0, 3668.5], index=idx),
              "MORTGAGE30US": pd.Series([6.80, 6.90, 6.90], index=idx)}
    def get(name):
        raise dashboard.Missing(name)
    macro = dashboard.build("2026-11-27", get)
    if alerting:
        for it in macro:
            if it["label"] in dashboard.PLAIN:
                it.update(status="ALERT", value="+5", asof="2026-11-25")
    events = events or []
    stats = {sid: sleeves.stats(events, sid) for sid in sleeves.SLEEVES}
    paper = {"kills": []}
    return brief.render_plain(pd.Timestamp("2026-11-27 09:00"), series, paper, stats, status or {}, macro), re


def test_default_view_has_no_jargon_even_with_every_warning_fired():
    text, re = plain_brief()
    for term in JARGON:
        assert not re.search(term, text, re.I if term == "sleeve" else 0), term
    assert "Banks are paying more to borrow overnight than the Fed pays them, a sign cash is tight." in text
    assert text.count("\n") > 30


def test_default_view_layout_and_length():
    text, _ = plain_brief(alerting=False)
    lines = text.splitlines()
    assert lines[0] == "Nothing to do today."
    assert "The S&P 500 is at 7,297, up 1.6% since yesterday." in lines
    assert "The 10-year Treasury rate is 4.94%, up 0.09 points since yesterday." in lines
    assert "Bitcoin is at $60,496, up 0.2% since yesterday." in lines
    assert "Gold is at $3,668 an ounce, up 3.8% since yesterday." in lines
    assert "The 30-year mortgage rate is 6.90%, unchanged since last week." in lines
    assert lines[lines.index("Warnings") + 1] == "None fired today."
    assert "Bitcoin trend: no record yet." in lines
    assert lines[-1] == "Full numbers: python brief.py --detail"
    assert len([l for l in lines if l]) <= 17


def test_default_view_paper_bet_lines_in_words():
    from lab import sleeves
    ev = []
    for d, eq in [("2026-11-18", 1000.0), ("2026-11-20", 1004.0), ("2026-11-27", 1016.0)]:
        ev.append({"type": "sleeve_mark", "sleeve": "btc_sma50", "date": d, "equity": eq, "weights": {"BTC": 1.0}, "prices": {"BTC": 1.0}, "rf": 0.04})
    ev.append({"type": "sleeve_mark", "sleeve": "fx_carry", "date": "2026-11-27", "equity": 998.0,
               "weights": {"XM": -1 / 3, "JP": -1 / 3, "CH": -1 / 3, "BR": 1 / 3, "IN": 1 / 3, "MX": 1 / 3}, "prices": {}, "rf": 0.04})
    text, _ = plain_brief(alerting=False, events=ev, status={"yield_gap": "missing: price for IEF"})
    assert "Bitcoin trend: up $12 this week, holding Bitcoin, paper only, 9 days of record." in text
    assert "High-rate against low-rate currencies: started today with $1,000, holding 6 currencies, paper only, 0 days of record." in text
    assert "Stocks or bonds by earnings yield: no price today, so no record yet." in text
    killed = ev + [{"type": "sleeve_kill", "sleeve": "btc_sma50", "date": "2026-11-27", "reasons": ["drawdown"]}]
    text, re = plain_brief(alerting=False, events=killed)
    assert text.splitlines()[0].startswith('Look at the paper bet "Bitcoin trend": it hit its loss limit')
    assert "stopped after hitting its loss limit, now in cash" in text and not re.search("sleeve", text, re.I)
    assert sleeves.plain_line(dict(sleeves.stats(ev, "btc_sma50"), change=-3.0, change_days=1)).startswith("Bitcoin trend: down $3 in 1 day,")


def test_default_view_missing_market_data_says_so():
    from lab import sleeves
    stats = {sid: sleeves.stats([], sid) for sid in sleeves.SLEEVES}
    text = brief.render_plain(pd.Timestamp("2026-11-27"), {}, {"kills": []}, stats, {}, None)
    assert "The S&P 500: no data today." in text and "The 30-year mortgage rate: no data today." in text and "No warning data today." in text


def test_every_scored_gauge_has_a_plain_sentence_and_detail_keeps_tags():
    from lab import dashboard
    scored = {r.label for r in dashboard.ROWS if r.read.__qualname__.split(".")[0] != "absent"}
    assert scored == set(dashboard.PLAIN)
    assert brief.parse_args(["--detail"]).detail and not brief.parse_args([]).detail
    item = {"section": "s", "label": "VIX", "basis": "Lab", "rule": "above 28.5", "value": "30.00", "asof": "2026-11-26", "status": "ALERT", "why": ""}
    assert "[Lab]" in dashboard.render([item])[1]
    assert dashboard.plain([item]) == ["The stock market's fear gauge is 30.00, a level reached on 1 day in 10, so expect bigger daily swings."]
