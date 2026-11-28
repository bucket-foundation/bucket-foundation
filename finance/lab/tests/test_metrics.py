import math

import numpy as np
import pandas as pd
import pytest

from lab.backtest import run
from lab.metrics import (ann_vol, cagr, deflated_sharpe, expected_max_sharpe, max_drawdown,
                         probabilistic_sharpe, sharpe, turnover)
from lab.prediction import calibration, flb_spread, kalshi_fee


def idx(n):
    return pd.date_range("2000-01-31", periods=n, freq="ME")


def test_cagr_constant_monthly():
    r = pd.Series([0.01] * 24, index=idx(24))
    assert cagr(r, 12) == pytest.approx(1.01 ** 12 - 1)


def test_cagr_total_loss():
    assert cagr(pd.Series([0.1, -1.0]), 12) == -1.0


def test_ann_vol_scales_with_sqrt_time():
    r = pd.Series([0.01, -0.01] * 50)
    assert ann_vol(r, 252) == pytest.approx(r.std(ddof=1) * math.sqrt(252))


def test_sharpe_subtracts_rf():
    r = pd.Series([0.02, 0.0, 0.02, 0.0], index=idx(4))
    rf = pd.Series(0.01, index=r.index)
    assert sharpe(r, 12, rf) == pytest.approx(0.0, abs=1e-12)
    assert sharpe(r, 12) == pytest.approx(0.01 / r.std(ddof=1) * math.sqrt(12))


def test_sharpe_zero_vol_is_nan():
    assert math.isnan(sharpe(pd.Series([0.01] * 5), 12))


def test_max_drawdown_known_path():
    r = pd.Series([0.10, -0.50, 0.20])
    assert max_drawdown(r) == pytest.approx(-0.5)


def test_max_drawdown_counts_initial_loss():
    assert max_drawdown(pd.Series([-0.2, 0.1])) == pytest.approx(-0.2)


def test_turnover_annualized_one_way():
    trades = pd.Series([2.0, 0.0, 2.0, 0.0])
    assert turnover(trades, 12) == pytest.approx(1.0 * 12 / 2)


def test_expected_max_sharpe_grows_with_trials():
    assert expected_max_sharpe(1, 1.0) == 0.0
    assert expected_max_sharpe(10, 1.0) < expected_max_sharpe(100, 1.0)
    assert expected_max_sharpe(100, 1.0) == pytest.approx(2.53, abs=0.02)


def test_psr_half_at_benchmark():
    rng = np.random.default_rng(0)
    r = pd.Series(rng.normal(0.001, 0.01, 5000))
    sr = r.mean() / r.std(ddof=1)
    assert probabilistic_sharpe(r, sr) == pytest.approx(0.5, abs=1e-9)


def test_dsr_falls_with_more_trials():
    rng = np.random.default_rng(1)
    r = pd.Series(rng.normal(0.005, 0.04, 240))
    assert deflated_sharpe(r, 1) > deflated_sharpe(r, 10) > deflated_sharpe(r, 1000)


def test_dsr_noise_strategy_not_significant():
    rng = np.random.default_rng(2)
    r = pd.Series(rng.normal(0.0, 0.04, 240))
    assert deflated_sharpe(r, 50) < 0.5


def test_backtest_lags_weights_and_charges_costs():
    ix = idx(4)
    rets = pd.DataFrame({"A": [0.0, 0.10, 0.10, 0.10]}, index=ix)
    w = pd.DataFrame({"A": [1.0, 1.0, 0.0, 0.0]}, index=ix)
    net, trades = run(w, rets, cost_bps=100)
    assert net.iloc[0] == pytest.approx(0.10 - 0.01)
    assert net.iloc[1] == pytest.approx(0.10 - 0.01)
    assert net.iloc[2] == pytest.approx(0.0)


def test_backtest_cash_and_leverage_financing():
    ix = idx(3)
    rets = pd.DataFrame({"A": [0.0, 0.05, 0.05]}, index=ix)
    cash = pd.Series(0.01, index=ix)
    w = pd.DataFrame({"A": [2.0, 2.0, 2.0]}, index=ix)
    net, _ = run(w, rets, 0.0, cash)
    assert net.iloc[0] == pytest.approx(2 * 0.05 - 0.01)


def test_backtest_static_weights_rebalance_drift():
    ix = idx(3)
    rets = pd.DataFrame({"A": [0.0, 0.10, 0.0], "B": [0.0, 0.0, 0.0]}, index=ix)
    w = pd.DataFrame({"A": [0.5] * 3, "B": [0.5] * 3}, index=ix)
    _, trades = run(w, rets)
    drift_a = 0.55 / 1.05
    assert trades.iloc[0] == pytest.approx(2 * (drift_a - 0.5))


def test_calibration_and_flb():
    p = pd.Series([0.1] * 10 + [0.9] * 10)
    won = pd.Series([1] + [0] * 9 + [1] * 9 + [0])
    cal = calibration(p, won)
    assert cal["win_rate"].tolist() == pytest.approx([0.1, 0.9])
    res = flb_spread(p, won)
    assert res["roi_long"] == pytest.approx(0.0)
    assert res["roi_fav"] == pytest.approx(0.0)


def test_kalshi_fee_rounds_up_to_cent():
    assert kalshi_fee(pd.Series([0.5])).iloc[0] == pytest.approx(0.02)
    assert kalshi_fee(pd.Series([0.97])).iloc[0] == pytest.approx(0.01)
