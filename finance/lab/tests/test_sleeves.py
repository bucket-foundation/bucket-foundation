import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

import brief
from lab import ledger, signals, sleeves


def target(weights, prices, asof="2026-11-27", carry=None):
    return {"weights": weights, "prices": prices, "asof": asof, "carry": carry or {}}


def days(n, start="2026-11-27"):
    return [str(d)[:10] for d in pd.date_range(start, periods=n, freq="D")]


def test_first_mark_starts_at_the_fixed_notional_less_entry_cost():
    new, status = sleeves.step([], "btc_sma50", target({"BTC": 1.0}, {"BTC": 100.0}), "2026-11-27", 0.04)
    assert status == "marked" and [e["type"] for e in new] == ["sleeve_mark"]
    assert new[0]["equity"] == pytest.approx(1000.0 * (1 - 0.0025)) and new[0]["weights"] == {"BTC": 1.0}
    flat, _ = sleeves.step([], "btc_sma50", target({"BTC": 0.0}, {"BTC": 100.0}), "2026-11-27", 0.04)
    assert flat[0]["equity"] == 1000.0


def test_same_day_rerun_adds_no_sleeve_events(tmp_path):
    path = tmp_path / "ledger.jsonl"
    targets = {sid: target({"A": 1.0}, {"A": 10.0}) for sid in sleeves.SLEEVES}
    first, stats, status = brief.sleeves_run([], targets, 0.04, "2026-11-27")
    for e in first:
        ledger.append(path, e)
    assert len(first) == 5 and set(status.values()) == {"marked"}
    again, stats2, status2 = brief.sleeves_run(ledger.load(path), targets, 0.04, "2026-11-27")
    assert again == [] and set(status2.values()) == {"already marked today"}
    assert {k: v["equity"] for k, v in stats.items()} == {k: v["equity"] for k, v in stats2.items()}
    third, _, _ = brief.sleeves_run(ledger.load(path) + again, targets, 0.04, "2026-11-27")
    assert third == []
    nxt, _, _ = brief.sleeves_run(ledger.load(path), targets, 0.04, "2026-11-28")
    assert [e["type"] for e in nxt] == ["sleeve_mark"] * 5 and {e["sleeve"] for e in nxt} == set(sleeves.SLEEVES)


def test_mark_earns_the_prior_weights_and_cash_earns_the_bill():
    ev, _ = sleeves.step([], "sp_above_200d", target({"SPX": 1.0}, {"SPX": 100.0}), "2026-11-27", 0.0365)
    up, _ = sleeves.step(ev, "sp_above_200d", target({"SPX": 1.0}, {"SPX": 110.0}, "2026-11-28"), "2026-11-28", 0.0365)
    assert up[0]["equity"] == pytest.approx(ev[0]["equity"] * 1.10)
    cash, _ = sleeves.step([], "sp_above_200d", target({"SPX": 0.0}, {"SPX": 100.0}), "2026-11-27", 0.0365)
    later, _ = sleeves.step(cash, "sp_above_200d", target({"SPX": 0.0}, {"SPX": 50.0}, "2026-12-07"), "2026-12-07", 0.0365)
    assert later[0]["equity"] == pytest.approx(1000.0 * (1 + 0.0365 * 10 / 365))


def test_carry_sleeve_accrues_rate_differentials_on_both_legs():
    w = {"A": 0.5, "B": -0.5}
    ev, _ = sleeves.step([], "fx_carry", target(w, {"A": 1.0, "B": 1.0}, carry={"A": 0.0365, "B": -0.0365}), "2026-11-27", 0.0)
    nxt, _ = sleeves.step(ev, "fx_carry", target(w, {"A": 1.0, "B": 1.0}, "2026-12-07", {"A": 0.0365, "B": -0.0365}), "2026-12-07", 0.0)
    assert nxt[0]["equity"] == pytest.approx(ev[0]["equity"] * (1 + 0.001))


def test_missing_data_writes_no_mark_and_is_never_filled():
    ev, _ = sleeves.step([], "yield_gap", target({"SPX": 1.0, "IEF": 0.0}, {"SPX": 100.0, "IEF": 90.0}), "2026-11-27", 0.04)
    for bad, word in [({"missing": "ConnectionError"}, "ConnectionError"), (None, "no signal"),
                      (target({"SPX": 1.0, "IEF": 0.0}, {"IEF": 90.0}), "price for SPX"),
                      (target({"SPX": 0.0, "IEF": 1.0}, {"SPX": 100.0, "IEF": float("nan")}), "price for IEF")]:
        new, status = sleeves.step(ev, "yield_gap", bad, "2026-11-28", 0.04)
        assert new == [] and status.startswith("missing") and word in status
    new, status = sleeves.step(ev, "yield_gap", target({"SPX": 1.0, "IEF": 0.0}, {"SPX": 100.0, "IEF": 90.0}), "2026-11-28", None)
    assert new == [] and status == "missing: T-bill rate"
    back, _ = sleeves.step(ev, "yield_gap", target({"SPX": 1.0, "IEF": 0.0}, {"SPX": 105.0, "IEF": 90.0}, "2026-11-30"), "2026-11-30", 0.04)
    assert back[0]["equity"] == pytest.approx(ev[0]["equity"] * 1.05)
    assert [m["date"] for m in sleeves.marks(ev + back, "yield_gap")] == ["2026-11-27", "2026-11-30"]
    assert sleeves.stats(ev + back, "yield_gap")["obs"] == 1


def test_kill_switch_trips_one_sleeve_and_leaves_the_others():
    a, _ = sleeves.step([], "btc_sma50", target({"BTC": 1.0}, {"BTC": 100.0}), "2026-11-27", 0.04)
    b, _ = sleeves.step(a, "sp_above_200d", target({"SPX": 1.0}, {"SPX": 100.0}), "2026-11-27", 0.04)
    ev = a + b
    crash, status = sleeves.step(ev, "btc_sma50", target({"BTC": 1.0}, {"BTC": 70.0}, "2026-11-28"), "2026-11-28", 0.04)
    assert status == "killed" and [e["type"] for e in crash] == ["sleeve_kill", "sleeve_mark"]
    assert crash[0]["sleeve"] == "btc_sma50" and any("drawdown" in r or "daily loss" in r for r in crash[0]["reasons"])
    assert crash[1]["weights"] == {"BTC": 0.0}
    fine, status = sleeves.step(ev + crash, "sp_above_200d", target({"SPX": 1.0}, {"SPX": 101.0}, "2026-11-28"), "2026-11-28", 0.04)
    assert status == "marked" and fine[0]["weights"] == {"SPX": 1.0}
    ev = ev + crash + fine
    assert sleeves.killed(ev, "btc_sma50") and sleeves.killed(ev, "sp_above_200d") is None
    held, status = sleeves.step(ev, "btc_sma50", target({"BTC": 1.0}, {"BTC": 200.0}, "2026-11-29"), "2026-11-29", 0.04)
    assert status == "killed" and [e["type"] for e in held] == ["sleeve_mark"] and held[0]["weights"] == {"BTC": 0.0}
    assert held[0]["equity"] == pytest.approx(crash[1]["equity"] * (1 + 0.04 / 365))
    ev = ev + held + [{"type": "kill_clear", "date": "2026-11-29"}]
    assert sleeves.killed(ev, "btc_sma50") is None
    acts = brief.actions({"kills": []}, {sid: sleeves.stats(ev[:-1], sid) for sid in sleeves.SLEEVES})
    assert len(acts) == 1 and "BTC SMA50 trend" in acts[0]


def test_stale_signal_data_trips_the_sleeve():
    ev, _ = sleeves.step([], "sp_cross_50_200", target({"SPX": 1.0}, {"SPX": 100.0}), "2026-11-27", 0.04)
    new, status = sleeves.step(ev, "sp_cross_50_200", target({"SPX": 1.0}, {"SPX": 100.0}, asof="2026-11-20"), "2026-11-28", 0.04)
    assert status == "killed" and "days old" in new[0]["reasons"][0]


def history(sleeve, rets, rf=0.0):
    eq, out = 1000.0, []
    for d, r in zip(days(len(rets) + 1), [0.0] + list(rets)):
        eq *= 1 + r
        out.append({"type": "sleeve_mark", "sleeve": sleeve, "date": d, "equity": eq, "weights": {"A": 1.0}, "prices": {"A": 1.0}, "rf": rf})
    return out


def test_stats_report_days_sharpe_and_drawdown():
    ev = history("fx_carry", [0.01, -0.02, 0.01, 0.03])
    s = sleeves.stats(ev, "fx_carry")
    x = pd.Series([0.01, -0.02, 0.01, 0.03])
    assert s["obs"] == 4 and s["days"] == 4
    assert s["live_sharpe"] == pytest.approx(x.mean() / x.std(ddof=1) * math.sqrt(365))
    assert s["max_dd"] == pytest.approx(-0.02) and math.isnan(s["live_dsr"]) and not s["promotable"]
    empty = sleeves.stats([], "fx_carry")
    assert empty["equity"] is None and sleeves.line(empty) == "Currency carry, 10 currencies: no mark yet"
    text = sleeves.line(s)
    assert "4 days of evidence" in text and "live DSR n/a vs 0.95" in text and "evidence only" in text and "drawdown -2.0%" in text


def test_promotion_needs_the_pooled_bar_and_the_gate_on_live_marks():
    rng = np.random.default_rng(1)
    sr = sleeves.SLEEVES["fx_carry"].backtest_sharpe
    def series(n, daily_sharpe):
        z = rng.normal(0, 0.005, n)
        return (z - z.mean()) / z.std(ddof=1) * 0.005 + daily_sharpe * 0.005
    short = sleeves.stats(history("fx_carry", series(60, 0.3)), "fx_carry")
    assert not short["gate"] and not short["promotable"]
    in_band = sleeves.stats(history("fx_carry", series(200, sr / math.sqrt(365))), "fx_carry")
    assert in_band["gate"] and in_band["live_dsr"] < signals.DSR_BAR and not in_band["promotable"]
    early = sleeves.stats(history("fx_carry", series(60, 6.0 / math.sqrt(365))), "fx_carry")
    assert early["live_dsr"] >= signals.DSR_BAR and not early["gate"] and not early["promotable"]
    weak = sleeves.stats(history("fx_carry", series(2500, 0.1 / math.sqrt(365))), "fx_carry")
    assert not weak["gate"] and not weak["promotable"]
    both = sleeves.stats(history("fx_carry", series(2500, 2.2 / math.sqrt(365))), "fx_carry")
    assert both["gate"] and both["live_dsr"] >= signals.DSR_BAR and both["promotable"] and both["max_live_usd"] == float("inf")
    assert early["max_live_usd"] == 0.0 and weak["max_live_usd"] == 0.0 and in_band["max_live_usd"] == 0.0
    assert both["live_sharpe"] > sr + 1.0
    assert sleeves.line(both).endswith("promotable")
    acts = brief.actions({"kills": []}, {"fx_carry": both})
    assert "passed the pooled bar on live paper data" in acts[0] and "with no gate cap" in acts[0]
    capped = brief.actions({"kills": []}, {"fx_carry": dict(both, max_live_usd=1000.0)})
    assert "at most $1,000" in capped[0]


def test_live_cap_enforces_the_gate_the_bar_and_the_180_day_step():
    assert sleeves.live_cap(True, 0.99, 89) == 0.0
    assert sleeves.live_cap(True, 0.99, 90) == 1000.0 and sleeves.live_cap(True, 0.99, 179) == 1000.0
    assert sleeves.live_cap(True, 0.99, 180) == float("inf")
    assert sleeves.live_cap(False, 0.99, 400) == 0.0 and sleeves.live_cap(True, 0.94, 400) == 0.0
    assert sleeves.live_cap(True, float("nan"), 400) == 0.0
    rng = np.random.default_rng(2)
    z = rng.normal(0, 0.005, 120)
    r = (z - z.mean()) / z.std(ddof=1) * 0.005 + 9.0 / math.sqrt(365) * 0.005
    s = sleeves.stats(history("fx_carry", r), "fx_carry")
    assert s["days"] == 120 and s["promotable"] and s["max_live_usd"] == 1000.0
    assert sleeves.stats(history("fx_carry", r[:60]), "fx_carry")["max_live_usd"] == 0.0


def test_required_live_sharpe_arithmetic():
    assert sleeves.required_live_sharpe(5) == pytest.approx(1.187 + 1.645 * 0.447, abs=0.01)
    assert sleeves.required_live_sharpe(5) == pytest.approx(1.92, abs=0.01)
    assert sleeves.required_live_sharpe(5, z=2.0) == pytest.approx(2.08, abs=0.01)
    assert sleeves.required_live_sharpe(1) > sleeves.required_live_sharpe(5) > sleeves.required_live_sharpe(20) > 1.187


def test_signal_rules():
    up = pd.Series(np.linspace(1, 2, 250))
    assert sleeves.trend_weight(up, 200) == 1.0 and sleeves.trend_weight(up[::-1].reset_index(drop=True), 200) == 0.0
    assert sleeves.cross_weight(up) == 1.0 and sleeves.cross_weight(up[::-1].reset_index(drop=True)) == 0.0
    with pytest.raises(ValueError):
        sleeves.trend_weight(up.iloc[:50], 200)
    with pytest.raises(ValueError):
        sleeves.cross_weight(up.iloc[:150])
    assert sleeves.yield_gap_weights(400.0, 7000.0, 4.9) == {"SPX": 1.0, "IEF": 0.0}
    assert sleeves.yield_gap_weights(300.0, 7000.0, 4.9) == {"SPX": 0.0, "IEF": 1.0}
    with pytest.raises(ValueError):
        sleeves.yield_gap_weights(float("nan"), 7000.0, 4.9)
    w = sleeves.carry_weights({"a": 0.05, "b": 0.04, "c": 0.03, "d": 0.0, "e": -0.01, "f": -0.02, "g": float("nan")})
    assert w["a"] == w["b"] == w["c"] == pytest.approx(1 / 3) and w["d"] == w["e"] == w["f"] == pytest.approx(-1 / 3) and "g" not in w
    with pytest.raises(ValueError):
        sleeves.carry_weights({"a": 0.05, "b": 0.01})


def test_unreachable_feeds_become_missing_targets(monkeypatch):
    def down(*a, **k):
        raise ConnectionError("feed down")
    monkeypatch.setattr(brief.feeds, "price_series", down)
    targets = brief.sleeve_targets({}, "2026-11-27")
    assert set(targets) == set(sleeves.SLEEVES) and all("missing" in t for t in targets.values())
    new, stats, status = brief.sleeves_run([], targets, 0.04, "2026-11-27")
    assert new == [] and all(s.startswith("missing") for s in status.values()) and all(v["equity"] is None for v in stats.values())


def test_sleeves_cover_the_lab_rows_that_held_and_the_pooled_constants_match():
    assert set(sleeves.SLEEVES) == {"btc_sma50", "sp_above_200d", "sp_cross_50_200", "yield_gap", "fx_carry"} and sleeves.NOTIONAL == 1000.0
    path = Path(__file__).resolve().parent.parent / "results" / "summary.json"
    if not path.exists():
        pytest.skip("results not built")
    summary = json.loads(path.read_text())
    assert summary["n_trials"] == sleeves.POOLED_TRIALS and round(summary["sr_ann_var_executable"], 3) == sleeves.POOLED_SR_VAR
    assert {s.lab_row for k, s in sleeves.SLEEVES.items() if k != "btc_sma50"} == set(summary["held_oos"])
