"""No-network unit tests for TimeSeriesForecast (tools_forecast).

Verifies the ACTUAL Holt-Winters smoothing + decomposition + backtest on series
with KNOWN structure:
 * a pure linear trend (y = 2t) is forecast almost exactly by Holt's linear
 trend (the load-bearing assertion: next value ≈ continuation of the line);
 * on a trend+seasonal demo series, seasonal Holt-Winters beats the naive
 last-value baseline on the holdout (real skill, measured);
 * the additive decomposition recovers a planted seasonal pattern;
 * malformed input returns a structured error, never raises.

Run: cd services/research-tools && python3 -m pytest tests/test_tools_forecast.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
import pytest  # noqa: E402

import tools_forecast as fc  # noqa: E402


# =========================================================================
# Load-bearing: a perfect linear trend is forecast on the line.
# =========================================================================
def test_linear_trend_forecast():
    # y_t = 2*t for t=0..19 → next values are 40, 42, 44...
    values = [2.0 * t for t in range(20)]
    out = fc.run_forecast({"values": values, "period": 0, "horizon": 3, "test": 4})
    f = out["forecast"]
    # Holt's linear trend on a perfect line continues it almost exactly.
    assert abs(f[0] - 40.0) < 0.5
    assert abs(f[1] - 42.0) < 0.5
    assert abs(f[2] - 44.0) < 0.5
    assert out["seasonal_period"] == 0


def test_constant_series_forecasts_constant():
    out = fc.run_forecast({"values": [5.0] * 12, "period": 0, "horizon": 3, "test": 3})
    for v in out["forecast"]:
        assert abs(v - 5.0) < 1e-3
    # zero-ish error on a constant series
    assert out["backtest"]["MAE"] < 1e-3


# =========================================================================
# seasonal demo beats naive baseline (real, skill)
# =========================================================================
def test_demo_seasonal_beats_naive():
    out = fc.run_forecast({"demo": True})
    assert out["seasonal_period"] == 12
    bt = out["backtest"]
    assert bt is not None
    # seasonal HW MAE strictly less than the naive last-value baseline MAE
    assert bt["MAE"] < bt["naive_baseline"]["MAE"]
    assert out["ground_truth"]["hw_beats_naive_on_holdout"] is True


def test_decomposition_recovers_seasonality():
    # planted additive seasonal pattern of period 4: [+3,-1,-1,-1] repeated on a
    # flat level, 6 cycles.
    pattern = [3.0, -1.0, -1.0, -1.0]
    values = [10.0 + pattern[t % 4] for t in range(24)]
    out = fc.run_forecast({"values": values, "period": 4, "horizon": 4, "test": 4})
    decomp = out["decomposition"]
    assert decomp is not None
    si = decomp["seasonal_indices"]
    # the centered seasonal index for phase 0 should be the largest (the +3 spike)
    assert si[0] == max(si)
    assert si[0] > 0 > min(si)


# =========================================================================
# resilience
# =========================================================================
def test_too_short_error():
    assert fc.run_forecast({"values": [1, 2]}).get("error")


def test_garbage_error():
    assert fc.run_forecast({"values": "not a list"}).get("error")
    assert fc.run_forecast({"values": [1, 2, "x", 4]}).get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
