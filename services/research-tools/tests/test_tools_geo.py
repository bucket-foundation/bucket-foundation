"""No-network unit tests for GeoSummary (tools_geo).

Verifies the ACTUAL trend/seasonality/spatial math on a synthetic series with
KNOWN ground truth:
  * a series with a planted linear slope of +0.10/step → the Theil-Sen slope
    recovers 0.10 and Mann-Kendall reports a SIGNIFICANT increasing trend
    (the load-bearing assertion);
  * planted missing values are counted;
  * a strong seasonal cycle explains a substantial variance share;
  * spatial extent (bbox/centroid/haversine) is computed from lat/lon;
  * a pure noise/flat series shows no significant trend;
  * malformed input returns a structured error, never raises.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_geo.py -q
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_geo as g  # noqa: E402


# =========================================================================
# The load-bearing assertion: recover a known +0.10/step trend.
# =========================================================================
def test_demo_recovers_trend_and_seasonality():
    out = g.run_geo_summary({"demo": True})
    assert out["demo"] is True
    t = out["trend"]
    # Theil-Sen resists the seasonal oscillation   → recovers 0.10 exactly
    assert abs(t["theil_sen_slope_per_step"] - 0.10) < 0.01
    mk = t["mann_kendall"]
    assert mk["trend"] == "increasing"
    assert mk["significant_at_0.05"] is True
    # the seasonal cycle explains a real share of the variance
    assert out["seasonality"]["variance_explained_by_season"] > 0.3
    # planted missing values are accounted for
    assert out["descriptives"]["n_missing"] == out["ground_truth"]["n_missing_planted"]


def test_spatial_extent_present():
    out = g.run_geo_summary({"demo": True})
    sp = out["spatial_extent"]
    assert sp is not None
    assert sp["n_points"] == 120
    assert sp["bbox_diagonal_km"] > 0
    assert "centroid" in sp


# =========================================================================
# trend direction sanity
# =========================================================================
def test_pure_increasing_series():
    out = g.run_geo_summary({"values": list(range(50))})
    assert out["trend"]["mann_kendall"]["trend"] == "increasing"
    assert out["trend"]["mann_kendall"]["significant_at_0.05"] is True
    assert abs(out["trend"]["theil_sen_slope_per_step"] - 1.0) < 1e-6


def test_flat_series_no_trend():
    out = g.run_geo_summary({"values": [5.0] * 30})
    mk = out["trend"]["mann_kendall"]
    # a constant series has S=0 → no trend
    assert mk.get("trend") in ("no trend", None) or mk.get("applicable") is False or mk["significant_at_0.05"] is False


def test_missing_data_accounting():
    out = g.run_geo_summary({"values": [1.0, None, 3.0, None, 5.0]})
    assert out["descriptives"]["n"] == 5
    assert out["descriptives"]["n_finite"] == 3
    assert out["descriptives"]["n_missing"] == 2


def test_seasonality_only_with_period():
    out = g.run_geo_summary({"values": list(range(40))})
    assert out["seasonality"] is None
    out2 = g.run_geo_summary({"values": [float(i % 4) for i in range(40)], "period": 4})
    assert out2["seasonality"] is not None
    assert out2["seasonality"]["period"] == 4


# =========================================================================
# descriptives correctness
# =========================================================================
def test_descriptives_values():
    out = g.run_geo_summary({"values": [1.0, 2.0, 3.0, 4.0, 5.0]})
    d = out["descriptives"]
    assert d["mean"] == 3.0
    assert d["median"] == 3.0
    assert d["min"] == 1.0 and d["max"] == 5.0


def test_haversine_known_distance():
    # ~one degree of latitude is ~111 km
    km = g._haversine(0.0, 0.0, 1.0, 0.0)
    assert abs(km - 111.19) < 1.0


# =========================================================================
# edge cases
# =========================================================================
def test_empty_errors():
    assert g.run_geo_summary({"values": []}).get("error")
    assert g.run_geo_summary({"values": "notalist"}).get("error")


def test_all_missing_errors():
    assert g.run_geo_summary({"values": [None, None, None]}).get("error")


def test_no_crash_on_short_series():
    out = g.run_geo_summary({"values": [1.0, 2.0]})
    # too short for a trend, but must not raise
    assert "descriptives" in out


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
