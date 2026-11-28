import json
import math

import numpy as np
import pandas as pd
import pytest

import fetch
import report100
import run100
from fetchers import openap
from lab import data, leakage, trials
from lab.backtest import run
from lab.strategies import common, crypto, equity_cz, macro, prediction_markets, sports


def months(n, start="2000-01-31"):
    return pd.date_range(start, periods=n, freq="ME")


def test_haircut_subtracts_the_tier_cost_each_month():
    gross = pd.Series([0.01, 0.02, np.nan], index=months(3))
    net, trades = common.haircut(gross, "momentum")
    assert trades is None and list(net.round(6)) == [0.0035, 0.0135]
    assert common.tier_label("annual") == "8 bps a month haircut, annual tier"


def test_rank_weights_long_top_short_bottom_and_skip_thin_rows():
    score = pd.DataFrame({"a": [1.0, np.nan], "b": [2.0, np.nan], "c": [3.0, 1.0], "d": [4.0, 2.0]}, index=months(2))
    w = common.rank_weights(score, 1, 1, min_assets=3)
    assert list(w.index) == [months(2)[0]]
    assert w.iloc[0].to_dict() == {"a": -1.0, "b": 0.0, "c": 0.0, "d": 1.0}
    long_only = common.rank_weights(score, 2, 0, min_assets=2)
    assert long_only.iloc[1].to_dict() == {"a": 0.0, "b": 0.0, "c": 0.5, "d": 0.5}


def test_tercile_weights_are_dollar_neutral():
    score = pd.DataFrame([[1, 2, 3, 4, 5, 6, 7]], columns=list("abcdefg"), index=months(1)).astype(float)
    w = common.tercile_weights(score).iloc[0]
    assert w.sum() == pytest.approx(0.0) and w["a"] == -0.5 and w["g"] == 0.5 and w["d"] == 0.0


def test_bets_to_periods_caps_stake_and_counts_bets():
    dates = pd.to_datetime(["2024-01-01"] * 40 + ["2024-01-08", "2024-01-22"])
    roi = [0.1] * 40 + [1.0, -1.0]
    r, staked = common.bets_to_periods(dates, roi, "W-SUN", 0.20, per_bet=0.01)
    assert r.iloc[0] == pytest.approx(40 * 0.1 * 0.005)
    assert r.iloc[1] == pytest.approx(0.01) and r.iloc[2] == 0.0 and r.iloc[3] == pytest.approx(-0.01)
    assert staked.iloc[0] == pytest.approx(0.40) and staked.iloc[2] == 0.0
    assert r.attrs["n_bets"] == 42 and r.attrs["roi_per_bet"] == pytest.approx(4.0 / 42)


def test_par_bond_return_is_carry_when_yield_is_flat_and_falls_when_yield_rises():
    flat = common.par_bond_returns(pd.Series([0.06, 0.06], index=months(2)), 10)
    assert flat.iloc[0] == pytest.approx(0.005, abs=1e-4)
    up = common.par_bond_returns(pd.Series([0.06, 0.07], index=months(2)), 10)
    dur = common.duration(pd.Series([0.06]), 10).iloc[0]
    assert dur == pytest.approx(7.44, abs=0.05)
    assert up.iloc[0] == pytest.approx(0.005 - dur * 0.01, abs=0.004)


def test_monthly_sum_labels_month_end():
    d = pd.Series(1.0, index=pd.date_range("2024-01-01", "2024-02-29", freq="D"))
    out = common.monthly_sum(d)
    assert list(out.index) == [pd.Timestamp("2024-01-31"), pd.Timestamp("2024-02-29")] and list(out) == [31.0, 29.0]


def test_timed_signal_earns_the_next_period_and_cash_when_off():
    idx = months(4)
    asset = pd.Series([0.10, 0.20, -0.30, 0.40], index=idx)
    on = pd.Series([True, False, True, True], index=idx)
    net, _ = common.timed(asset, on, pd.Series(0.01, index=idx), cost_bps=0.0)
    assert list(net.round(6)) == [0.20, 0.01, 0.40]


def test_split_uses_publication_year_when_both_sides_hold_three_years():
    idx = months(120, "2000-01-31")
    assert run100.split_date(idx, 2004, 12) == (pd.Timestamp("2004-12-31"), "publication")
    split, rule = run100.split_date(idx, 2008, 12)
    assert rule == "midpoint" and split == idx[59]
    assert run100.split_date(idx, 1990, 12)[1] == "midpoint"


def test_sharpe_t_is_mean_over_standard_error():
    x = pd.Series([0.01, 0.03, 0.02, 0.02])
    assert run100.sharpe_t(x, 12) == pytest.approx(x.mean() / x.std(ddof=1) * 2)
    assert math.isnan(run100.sharpe_t(pd.Series([0.01, 0.01, 0.01]), 12))


def test_block_reports_estimated_turnover_when_no_trades():
    r = pd.Series([0.01, -0.02, 0.03, 0.01], index=months(4))
    rf = pd.Series(0.001, index=r.index)
    est = run100.block(r, rf, None, 12, 3.6)
    assert est["turnover"] == 3.6 and est["turnover_estimated"] and est["n"] == 4
    assert est["mean_excess_ann"] == pytest.approx((r.mean() - 0.001) * 12)
    real = run100.block(r, rf, pd.Series(0.5, index=r.index), 12, None)
    assert real["turnover"] == pytest.approx(3.0) and not real["turnover_estimated"]
    assert run100.block(r.iloc[:2], rf, None, 12, None) is None


def test_benchmark_block_covers_the_strategy_dates(monkeypatch):
    idx = months(6)
    monkeypatch.setitem(run100.BENCHMARKS, "fake", lambda: pd.Series(0.02, index=months(12)))
    b = run100.benchmark_block("fake", idx, pd.Series(0.0, index=idx), 12)
    assert b["n"] == 6 and b["cagr"] == pytest.approx(1.02 ** 12 - 1)
    assert run100.benchmark_block("", idx, pd.Series(0.0, index=idx), 12) is None


def fake_row(tmp_path, name, mean, executable=True, bench=None, seed=0, asset_class="A", precomputed=False, paid=False):
    rng = np.random.default_rng(seed)
    r = pd.Series(rng.normal(mean, 0.02, 240), index=months(240))
    pd.DataFrame({"r": r, "rf": 0.0}).to_parquet(tmp_path / f"{name}.parquet")
    oos = r.iloc[120:]
    return {"ppy": 12, "sr_period": float(r.mean() / r.std(ddof=1)), "price_valid": executable, "precomputed": precomputed, "needs_paid_data": paid,
            "executable": run100.tradable(executable, precomputed, paid), "reported": True, "origin": "new",
            "asset_class": asset_class,
            "oos": {"sharpe": float(oos.mean() / oos.std(ddof=1) * math.sqrt(12)), "t": run100.sharpe_t(oos, 12)},
            "bench_oos": bench}


def test_deflate_counts_every_trial_and_gates_survival(tmp_path, monkeypatch):
    monkeypatch.setattr(run100, "RETURNS", tmp_path)
    rows = {"strong": fake_row(tmp_path, "strong", 0.02, seed=1), "flat": fake_row(tmp_path, "flat", 0.0, seed=2),
            "artifact": fake_row(tmp_path, "artifact", 0.2, executable=False, seed=3),
            "lags_bench": fake_row(tmp_path, "lags_bench", 0.02, bench={"sharpe": 99.0}, seed=4)}
    for i in range(20):
        rows[f"noise{i}"] = fake_row(tmp_path, f"noise{i}", 0.001, seed=10 + i)
    summary = run100.deflate(rows)
    assert summary["n_trials"] == 24
    assert summary["sr_ann_var_all"] > 10 * summary["sr_ann_var_executable"]
    assert rows["strong"]["survived"] and rows["strong"]["dsr_lab"] > 0.95
    assert not rows["flat"]["survived"] and rows["flat"]["dsr_lab"] < 0.5
    assert not rows["artifact"]["survived"] and not rows["artifact"]["held_oos"]
    assert rows["artifact"]["dsr_lab"] is None and rows["artifact"]["dsr_family"] is None
    assert report100.num(rows["artifact"]["dsr_lab"]) == "n/a"
    assert not rows["lags_bench"]["held_oos"] and not rows["lags_bench"]["survived"]
    assert rows["strong"]["psr"] >= rows["strong"]["dsr_lab"]


def test_card_text_reads_title_paper_and_claim():
    title, paper, claim = run100.card_text("cm-basis-momentum")
    assert title == "Basis-Momentum" and "Boons" in paper and "http" not in paper and claim.startswith("Basis-momentum")
    assert run100.card_text("") == ("", "", "")


def test_cost_tier_follows_rebalance_period_and_category():
    tier = equity_cz.tier_for
    assert tier({"Portfolio Period": 12.0, "Cat.Economic": "valuation"}) == "annual"
    assert tier({"Portfolio Period": 3.0, "Cat.Economic": "momentum"}) == "quarterly"
    assert tier({"Portfolio Period": 1.0, "Cat.Economic": "momentum"}) == "momentum"
    assert tier({"Portfolio Period": 1.0, "Cat.Economic": "short-term reversal"}) == "reversal"
    assert tier({"Portfolio Period": 1.0, "Cat.Economic": "risk"}) == "monthly"


def test_kalshi_side_bets_price_both_sides_with_fee_and_spread(monkeypatch):
    k = pd.DataFrame({"close": pd.to_datetime(["2026-08-01", "2026-08-01", "2026-08-02"]), "p_prev": [0.80, 0.10, 0.50],
                      "won": [1.0, 0.0, 1.0]})
    monkeypatch.setattr(data, "kalshi_history", lambda: k)
    b = prediction_markets.kalshi_side_bets(0.70, 0.97).reset_index(drop=True)
    assert len(b) == 2 and list(b["p"]) == [0.80, 0.90] and list(b["won"]) == [1.0, 1.0]
    assert b["roi"].iloc[0] == pytest.approx(1 / (0.81 + 0.02) - 1)
    assert b["roi"].iloc[1] == pytest.approx(1 / (0.91 + 0.01) - 1)


def test_polymarket_picks_use_prices_before_the_end():
    idx = pd.date_range("2025-01-01", periods=12, freq="D")
    path = pd.Series([0.4, 0.5, 0.55, 0.62, 0.7, 0.8, 0.85, 0.9, 0.92, 0.95, 0.99, 1.0], index=idx)
    assert prediction_markets.threshold_pick(path) == (True, 0.62)
    assert prediction_markets.threshold_pick(path.iloc[:3]) is None
    side, price = prediction_markets.late_momentum_pick(path)
    assert side is True and price == pytest.approx(0.92)
    falling = 1 - path
    side, price = prediction_markets.late_momentum_pick(falling)
    assert side is False and price == pytest.approx(0.92)


def test_poisson_fit_finds_home_edge_and_probabilities_sum_to_one():
    rng = np.random.default_rng(3)
    teams = [f"t{i}" for i in range(10)]
    rows = [{"HomeTeam": h, "AwayTeam": a, "FTHG": rng.poisson(1.8), "FTAG": rng.poisson(1.0)} for _ in range(6) for h in teams for a in teams if h != a]
    idx, attack, defence, home, base = sports.fit_poisson(pd.DataFrame(rows))
    assert attack.mean() == pytest.approx(1.0) and defence.mean() == pytest.approx(1.0)
    assert base == pytest.approx(1.0, rel=0.1) and base * home == pytest.approx(1.8, rel=0.1)
    h, d, a = sports.outcome_probs(np.array([1.8, 1.0]), np.array([1.0, 1.0]))
    assert np.allclose(h + d + a, 1.0) and h[0] > a[0] and h[1] == pytest.approx(a[1], abs=1e-6)


def test_seasoned_hides_the_first_days_of_a_listing():
    px = pd.DataFrame({"a": [np.nan, 1.0, 2.0, 3.0, 4.0]})
    assert crypto.seasoned(px, days=2)["a"].isna().tolist() == [True, True, True, False, False]


def test_short_variance_uses_last_months_vix(monkeypatch):
    days = pd.bdate_range("2024-01-01", "2024-04-30")
    spy = pd.DataFrame({"SPY": 100 * np.exp(np.cumsum(np.full(len(days), 0.001)))}, index=days)
    vix = pd.Series(20.0, index=days)
    monkeypatch.setattr(data, "etf_prices", lambda t: spy)
    monkeypatch.setattr(data, "fred", lambda s: vix)
    base, _ = macro.short_index_variance()
    shocked = vix.copy()
    shocked[shocked.index.month == 3] = 40.0
    monkeypatch.setattr(data, "fred", lambda s: shocked)
    after, _ = macro.short_index_variance()
    assert after.loc["2024-03-31"] == pytest.approx(base.loc["2024-03-31"])
    assert after.loc["2024-04-30"] > base.loc["2024-04-30"]
    assert base.loc["2024-03-31"] == pytest.approx(3 * (0.195 ** 2 / 12 - 21 * 0.001 ** 2), rel=0.05)


def test_recorded_weights_restore_state_and_capture_runs():
    idx = months(5)
    def fn():
        return run(pd.DataFrame({"a": 1.0}, index=idx), pd.DataFrame({"a": 0.01}, index=idx), 0.0)
    r, weights = leakage.recorded(fn, "2000-03-31")
    assert len(weights) == 1 and data.ASOF is None
    assert leakage.frame_gap(weights[0], weights[0]) == 0.0
    assert leakage.frame_gap(weights[0], weights[0].iloc[:-1]) == float("inf")


raw = pytest.mark.skipif(not (data.RAW / "openap" / "PredictorLSretWide.parquet").exists(), reason="raw data not fetched")


@raw
def test_registry_holds_every_trial_once():
    all_trials = trials.load_all()
    origins = pd.Series([t.origin for t in all_trials.values()]).value_counts().to_dict()
    assert origins == {"chen-zimmermann": 212, "new": 61, "legacy": 44}
    assert not all_trials["surebets_unfiltered"].reported
    reported = trials.reported()
    assert len(reported) == 100 and sum(t.origin == "chen-zimmermann" for t in reported) == 40
    cards = [t.card for t in reported]
    assert len(set(cards)) == 100 and set(cards) <= equity_cz.card_ids()
    with pytest.raises(ValueError):
        trials.register(reported[0])


@raw
def test_chen_zimmermann_picks_are_the_top_in_sample_t_stats():
    all_trials = trials.load_all()
    cz = [t for t in all_trials.values() if t.origin == "chen-zimmermann" and t.card]
    picked = [t.meta["insample_t"] for t in cz if t.reported]
    rest = [t.meta["insample_t"] for t in cz if not t.reported and not math.isnan(t.meta["insample_t"])]
    assert min(picked) >= max(rest)


@raw
def test_french_library_parser_reads_monthly_and_daily_tables():
    m = data.french_lib("Portfolios_Formed_on_BE-ME")
    assert m.index[0] == pd.Timestamp("1926-07-31") and "Hi 10" in m and m.abs().max().max() < 2
    d = data.ff_daily()
    assert d.index[0] == pd.Timestamp("1926-07-01") and list(d.columns) == ["Mkt-RF", "SMB", "HML", "RF"]
    ew = data.french_lib("Portfolios_Formed_on_BE-ME", table=1)
    assert not ew["Hi 10"].equals(m["Hi 10"])


def test_family_deflation_uses_the_class_count_and_variance(tmp_path, monkeypatch):
    monkeypatch.setattr(run100, "RETURNS", tmp_path)
    rows = {"solo": fake_row(tmp_path, "solo", 0.004, seed=1, asset_class="Solo")}
    for i in range(30):
        rows[f"wide{i}"] = fake_row(tmp_path, f"wide{i}", 0.004 * (i % 5 - 2), seed=20 + i, asset_class="Wide")
    summary = run100.deflate(rows)
    fams = summary["families"]
    assert fams["Solo"]["n_trials"] == 1 and fams["Solo"]["sr_ann_var"] == 0.0 and fams["Solo"]["expected_max_sharpe_ann"] == 0.0
    assert fams["Wide"]["n_trials"] == 30 and fams["Wide"]["sr_ann_var"] > 0
    assert rows["solo"]["dsr_family"] == pytest.approx(rows["solo"]["psr"])
    assert rows["solo"]["dsr_lab"] < rows["solo"]["dsr_family"]
    assert rows["solo"]["family_trials"] == 1 and rows["wide0"]["family_trials"] == 30
    assert rows["solo"]["passes_family"] == (rows["solo"]["held_oos"] and rows["solo"]["dsr_family"] >= 0.95)


def test_cash_rate_must_cover_the_strategy_dates():
    source = pd.Series(0.01, index=months(24))
    inside, stale = run100.covered(source, months(12, "2000-06-30"), "cash")
    assert stale == 0 and inside.notna().all()
    carried, stale = run100.covered(source, months(26), "cash")
    assert stale == 2 and carried.iloc[-1] == 0.01
    with pytest.raises(run100.CoverageError, match="ends"):
        run100.covered(source, months(30), "cash")
    with pytest.raises(run100.CoverageError, match="starts"):
        run100.covered(source, months(12, "1999-01-31"), "cash")
    daily = pd.date_range("2000-02-05", periods=3, freq="D")
    filled, _ = run100.covered(pd.Series([0.02, 0.03], index=pd.to_datetime(["2000-02-04", "2000-02-07"])), daily, "cash")
    assert list(filled) == [0.02, 0.02, 0.03]
    zero, stale = run100.rf_series("zero", months(3))
    assert (zero == 0).all() and stale == 0
    with pytest.raises(ValueError):
        run100.rf_series("nope", months(3))


def test_benchmark_must_cover_the_strategy_dates(monkeypatch):
    monkeypatch.setitem(run100.BENCHMARKS, "short", lambda: pd.Series(0.02, index=months(6)))
    with pytest.raises(run100.CoverageError, match="covers"):
        run100.benchmark_block("short", months(12), pd.Series(0.0, index=months(12)), 12)
    ok = run100.benchmark_block("short", months(6), pd.Series(0.0, index=months(6)), 12)
    assert ok["coverage"] == 1.0


def test_surebet_filters_drop_stale_quotes_thin_edges_and_half_the_edge():
    f = pd.DataFrame({"date": pd.to_datetime(["2020-01-04", "2020-01-05", "2020-01-06", "2020-01-07"]),
                      "max_H": [2.2, 3.5, 2.08, 1.9], "max_D": [3.6, 3.6, 3.6, 3.4], "max_A": [4.2, 4.2, 4.2, 3.9],
                      "avg_H": [2.1, 2.1, 2.0, 1.85], "avg_D": [3.4, 3.4, 3.5, 3.3], "avg_A": [4.0, 4.0, 4.1, 3.8]})
    dates, edge = sports.surebet_edges(f)
    assert len(dates) == 3
    dates, edge = sports.surebet_edges(f, sports.STALE_RATIO, sports.MIN_EDGE, sports.EDGE_KEPT)
    assert list(dates) == [pd.Timestamp("2020-01-04")]
    full = 1 / (1 / 2.2 + 1 / 3.6 + 1 / 4.2) - 1
    assert edge.iloc[0] == pytest.approx(full * 0.5) and full > 0.01
    assert sports.STALE_RATIO == 1.10 and sports.MIN_EDGE == 0.01 and sports.EDGE_KEPT == 0.5


def test_indicative_rows_show_no_deflated_sharpe_and_cannot_survive():
    assert {"surebets", "surebets_unfiltered", "kalshi_favorites", "kalshi_near_certain", "commodity_momentum"} == run100.INDICATIVE
    v = {"price_valid": False, "executable": False, "survived": False, "passes_family": False, "held_oos": False, "oos": {"sharpe": 9.0, "t": 30.0}}
    assert report100.verdict(v) == "Indicative"


def test_manifest_row_carries_the_license(tmp_path, monkeypatch):
    monkeypatch.setattr(fetch, "RAW", tmp_path)
    monkeypatch.setattr(fetch, "MANIFEST", tmp_path / "M.jsonl")
    monkeypatch.setattr(fetch, "_sizes", {})
    fetch.save(tmp_path / "openap" / "x.csv", "u", b"a,b\n", license=openap.LICENSE)
    fetch.save(tmp_path / "openap" / "y.csv", "u", b"a,b\n")
    rows = [json.loads(l) for l in (tmp_path / "M.jsonl").read_text().splitlines()]
    assert "GPL-2.0" in rows[0]["license"] and "Chen and Zimmermann" in rows[0]["license"] and "license" not in rows[1]


def test_published_series_and_paid_data_cannot_survive(tmp_path, monkeypatch):
    monkeypatch.setattr(run100, "RETURNS", tmp_path)
    rows = {"built": fake_row(tmp_path, "built", 0.02, seed=1), "published": fake_row(tmp_path, "published", 0.02, seed=1, precomputed=True),
            "paid": fake_row(tmp_path, "paid", 0.02, seed=1, precomputed=True, paid=True)}
    for i in range(20):
        rows[f"noise{i}"] = fake_row(tmp_path, f"noise{i}", 0.001, seed=10 + i)
    summary = run100.deflate(rows)
    assert rows["built"]["survived"] and rows["built"]["stat_pooled"]
    for k in ("published", "paid"):
        assert rows[k]["stat_pooled"] and rows[k]["held_stat"] and rows[k]["dsr_lab"] == pytest.approx(rows["built"]["dsr_lab"])
        assert not rows[k]["survived"] and not rows[k]["held_oos"] and not rows[k]["passes_family"]
    assert report100.verdict(rows["published"]) == "Published series, stats pass"
    assert report100.verdict(rows["paid"]) == "Paid data, stats pass"
    assert report100.verdict(rows["built"]) == "Survived"
    assert summary["sr_ann_var_executable"] > 0
    assert not run100.tradable(True, True, False) and not run100.tradable(True, False, True) and not run100.tradable(False, False, False)
    assert run100.tradable(True, False, False)


@raw
def test_smile_slope_is_flagged_as_paid_published_series():
    all_trials = trials.load_all()
    smile = all_trials["cz_smileslope"]
    assert smile.precomputed and smile.needs_paid_data
    assert all(t.precomputed for t in all_trials.values() if t.origin == "chen-zimmermann")
    assert all_trials["value_book_to_market"].precomputed and not all_trials["fx_carry"].precomputed
    assert all_trials["legacy_factors_HML"].precomputed and not all_trials["legacy_crypto_trend_BTC_sma50"].precomputed
