import math
from datetime import date

import numpy as np
import pandas as pd
import pytest

from lab import feeds, ledger, signals


def days(n):
    return pd.date_range("2026-01-01", periods=n, freq="D")


def test_sma_trend_on_when_last_above_average():
    s = pd.Series(np.arange(1, 61, dtype=float), index=days(60))
    t = signals.sma_trend(s, 50)
    assert t.on
    assert t.sma == pytest.approx(np.arange(11, 61).mean())
    assert t.asof == "2026-03-01"


def test_sma_trend_off_after_crash():
    s = pd.Series([100.0] * 59 + [50.0], index=days(60))
    assert not signals.sma_trend(s, 50).on


def test_sma_trend_needs_history():
    with pytest.raises(ValueError):
        signals.sma_trend(pd.Series([1.0] * 10, index=days(10)), 50)


def test_flip():
    assert signals.flip(None, True) is None
    assert signals.flip(True, True) is None
    assert signals.flip(False, True) == "ON"
    assert signals.flip(True, False) == "OFF"


def test_kelly_continuous_quarter_and_cap():
    assert signals.kelly_continuous(0.5, 0.5, fraction=0.25) == pytest.approx(0.25)
    assert signals.kelly_continuous(0.78, 0.48, cap=0.20) == 0.20
    assert signals.kelly_continuous(-0.1, 0.5) == 0.0


def test_kelly_binary():
    assert signals.kelly_binary(0.6, 0.5, fraction=1.0) == pytest.approx(0.2)
    assert signals.kelly_binary(0.4, 0.5) == 0.0
    assert signals.kelly_binary(0.9, 0.0) == 0.0


def test_kalshi_fee_rounds_up_to_cent():
    assert signals.kalshi_fee(0.5, 1) == 0.02
    assert signals.kalshi_fee(0.9, 21) == pytest.approx(0.14)


def test_flb_bucket():
    assert signals.flb_bucket(0.7) == "favorite"
    assert signals.flb_bucket(0.3) == "longshot"
    assert signals.flb_bucket(0.5) == "middle"


def test_cape_fit_recovers_line_and_forecast():
    idx = pd.date_range("1950-01-31", periods=600, freq="ME")
    x = pd.Series(np.log(np.linspace(8, 40, 600)), index=idx)
    y = 0.3 - 0.08 * x
    a, b = signals.fit_cape(x, y, split=None)
    assert (a, b) == (pytest.approx(0.3), pytest.approx(-0.08))
    assert signals.cape_forecast(20.0, a, b) == pytest.approx(math.exp(0.3 - 0.08 * math.log(20)) - 1)


def test_cape_now_scales_with_price():
    assert signals.cape_now(30.0, 5000.0, 6000.0) == pytest.approx(36.0)


def test_kill_switch_triggers():
    assert signals.kill_switch([100, 101], "2026-11-26", "2026-11-27") == []
    assert any("daily loss" in r for r in signals.kill_switch([100, 94], "2026-11-26", "2026-11-27"))
    assert any("drawdown" in r for r in signals.kill_switch([100, 90, 80, 74], "2026-11-26", "2026-11-27"))
    assert any("days old" in r for r in signals.kill_switch([100], "2026-11-20", "2026-11-27"))


def test_promotion_gate_needs_days_and_positive_sharpe():
    rng = np.random.default_rng(0)
    short = signals.promotion_gate(pd.Series(rng.normal(0.001, 0.02, 30)), 261, 0.78, 40)
    assert not short["pass"] and not short["checks"]["days"]
    mu = 0.78 / math.sqrt(261) * 0.02
    r = pd.Series(rng.normal(0, 0.02, 130))
    r = (r - r.mean()) / r.std(ddof=1) * 0.02 + mu
    g = signals.promotion_gate(r, 261, 0.78, 182)
    assert g["live_sharpe"] == pytest.approx(0.78)
    assert g["band"] == pytest.approx(signals.sharpe_se(0.78, 130, 261))
    assert g["pass"]
    neg = signals.promotion_gate(-r, 261, 0.78, 182)
    assert not neg["checks"]["sharpe_positive"]
    crash = signals.promotion_gate(pd.Series([0.001] * 100 + [-0.3]), 261, 0.0, 150)
    assert not crash["checks"]["drawdown"]


def test_sharpe_se_shrinks_with_obs():
    assert signals.sharpe_se(0.78, 64, 261) == pytest.approx(math.sqrt((1 + 0.5 * (0.78 / math.sqrt(261)) ** 2) / 64) * math.sqrt(261))
    assert signals.sharpe_se(0.78, 520, 261) < signals.sharpe_se(0.78, 64, 261)
    assert signals.sharpe_se(0.78, 1, 261) == float("inf")


def test_sleeve_excess_uses_prior_signal_and_gap():
    ms = [{"date": "2026-11-27", "btc_price": 100.0, "btc_on": True, "rf": 0.0365},
          {"date": "2026-11-30", "btc_price": 110.0, "btc_on": False, "rf": 0.0365},
          {"date": "2026-11-30", "btc_price": 111.0, "btc_on": False, "rf": 0.0365},
          {"date": "2026-12-01", "btc_price": 99.0, "btc_on": False, "rf": 0.0365},
          {"date": "2026-12-02", "equity": 1.0}]
    r, ppy = signals.sleeve_excess(ms)
    assert r["2026-11-30"] == pytest.approx(0.2 * (0.10 - 0.0365 * 3 / 365) - 0.2 * 0.0025)
    assert r["2026-12-01"] == pytest.approx(-0.2 * 0.0025)
    assert len(r) == 2
    assert ppy == pytest.approx(365 / 2)


def test_active_kill_persists_until_clear():
    ev = [{"type": "kill", "reasons": ["x"]}, {"type": "mark"}]
    assert signals.active_kill(ev) == ["x"]
    assert signals.active_kill(ev + [{"type": "kill_clear"}]) is None
    assert signals.active_kill([]) is None


def test_target_weight():
    assert signals.target_weight(True, False, promotable=True) == signals.BTC_SLEEVE_CAP
    assert signals.target_weight(True, True, promotable=True) == 0.0
    assert signals.target_weight(False, False, promotable=True) == 0.0
    assert signals.target_weight(True, False, promotable=False) == 0.0
    assert signals.target_weight(True, False) == 0.0


def test_evidence_bar_reads_the_pooled_deflated_sharpe():
    assert not signals.passes_bar(signals.BTC_EVIDENCE) and not signals.BTC_PROMOTABLE
    assert signals.passes_bar({"dsr_pooled": 0.96, "dsr_family": 0.1})
    assert not signals.passes_bar({"dsr_pooled": 0.94, "dsr_family": 0.99})
    line = signals.evidence_line(signals.BTC_EVIDENCE)
    assert "0.75 pooled over 317 trials" in line and "0.18 inside the 16-trial crypto family" in line and "0.98 over 44 trials" in line


def test_evidence_constants_match_the_lab_results():
    import json
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent / "results"
    trial = root / "trials" / "legacy_crypto_trend_BTC_sma50.json"
    if not trial.exists():
        pytest.skip("results not built")
    row = json.loads(trial.read_text())
    summary = json.loads((root / "summary.json").read_text())
    e = signals.BTC_EVIDENCE
    assert round(row["dsr_lab"], 2) == e["dsr_pooled"] and round(row["dsr_family"], 2) == e["dsr_family"]
    assert summary["n_trials"] == e["trials_pooled"] and row["family_trials"] == e["trials_family"]
    assert summary["dsr_bar"] == signals.DSR_BAR


def test_ledger_roundtrip_and_state(tmp_path):
    p = tmp_path / "l.jsonl"
    ledger.append(p, {"type": "deposit", "date": "d", "amount": 1000.0})
    ledger.append(p, {"type": "trade", "date": "d", "instrument": "X", "side": "buy", "qty": 2, "price": 100.0, "fee": 1.0})
    ev = ledger.load(p)
    cash, pos = ledger.state(ev)
    assert cash == pytest.approx(799.0)
    assert pos == {"X": 2}
    assert ledger.equity(ev, {"X": 110.0}) == pytest.approx(1019.0)
    with pytest.raises(KeyError):
        ledger.equity(ev, {})


def test_ledger_settle_and_interest():
    ev = [{"type": "deposit", "amount": 100.0},
          {"type": "trade", "instrument": "K", "side": "buy", "qty": 10, "price": 0.9, "fee": 0.07},
          {"type": "settle", "instrument": "K", "payout": 1.0},
          {"type": "interest", "amount": 0.5}]
    cash, pos = ledger.state(ev)
    assert pos == {}
    assert cash == pytest.approx(100 - 9 - 0.07 + 10 + 0.5)


def test_ledger_sell_closes_position():
    ev = [{"type": "deposit", "amount": 100.0},
          {"type": "trade", "instrument": "X", "side": "buy", "qty": 1, "price": 50.0},
          {"type": "trade", "instrument": "X", "side": "sell", "qty": 1, "price": 60.0}]
    assert ledger.state(ev) == (pytest.approx(110.0), {})


def test_rebalance_to_target_and_flat():
    ev = [{"type": "deposit", "amount": 10_000.0}]
    t = ledger.rebalance(ev, "BTC", 0.2, {"BTC": 50_000.0}, 25.0, "d", "on")
    assert t["side"] == "buy" and t["qty"] == pytest.approx(0.04)
    assert t["fee"] == pytest.approx(5.0)
    ev.append(t)
    assert ledger.rebalance(ev, "BTC", 0.2, {"BTC": 50_000.0}, 25.0, "d", "on") is None
    out = ledger.rebalance(ev, "BTC", 0.0, {"BTC": 50_000.0}, 25.0, "d", "off")
    assert out["side"] == "sell" and out["qty"] == pytest.approx(0.04)


def test_marks():
    ev = [{"type": "mark", "date": "a", "equity": 1.0}, {"type": "deposit", "amount": 1}, {"type": "mark", "date": "b", "equity": 2.0}]
    assert ledger.marks(ev) == [("a", 1.0), ("b", 2.0)]


def test_parse_fomc():
    html = ('<h4><a id="1">2026 FOMC Meetings</a></h4>'
            '<div class="fomc-meeting__month x"><strong>October</strong></div><div class="fomc-meeting__date y">27-28</div>'
            '<div class="fomc-meeting__month x"><strong>December</strong></div><div class="fomc-meeting__date y">8-9*</div>')
    got = feeds.parse_fomc(html)
    assert got == [{"date": date(2026, 10, 28), "sep": False}, {"date": date(2026, 12, 9), "sep": True}]


def test_parse_bls_ics():
    ics = ("BEGIN:VEVENT\nDTSTART;VALUE=DATE:20261210\nSUMMARY:Consumer Price Index for November 2026\nEND:VEVENT\n"
           "BEGIN:VEVENT\nDTSTART;VALUE=DATE:20261204\nSUMMARY:Employment Situation\nEND:VEVENT\n")
    assert feeds.parse_bls_ics(ics) == [date(2026, 12, 10)]


def test_sleeve_excess_no_fee_while_holding():
    ms = [{"date": f"2026-12-0{i}", "btc_price": 100.0 + i, "btc_on": True, "rf": 0.0} for i in range(1, 4)]
    r, _ = signals.sleeve_excess(ms)
    assert r.iloc[0] == pytest.approx(0.2 * (102 / 101 - 1) - 0.2 * 0.0025)
    assert r.iloc[1] == pytest.approx(0.2 * (103 / 102 - 1))


def test_gate_caps_live_size_before_180_days():
    rng = np.random.default_rng(1)
    r = pd.Series(rng.normal(0, 0.02, 130))
    r = (r - r.mean()) / r.std(ddof=1) * 0.02 + 0.8 / math.sqrt(261) * 0.02
    assert signals.promotion_gate(r, 261, 0.8, 120)["max_live_usd"] == 1000.0
    assert signals.promotion_gate(r, 261, 0.8, 180)["max_live_usd"] == float("inf")
    assert signals.promotion_gate(-r, 261, 0.8, 200)["max_live_usd"] == 0.0
