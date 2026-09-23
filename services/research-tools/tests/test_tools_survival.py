from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_survival as sv  # noqa: E402

def test_km_no_censoring_median():
    out = sv.run_survival({"durations": [1, 2, 3, 4], "events": [1, 1, 1, 1]})
    steps = out["overall"]["steps"]
    surv = [round(s["survival"], 6) for s in steps]
    assert surv == [0.75, 0.5, 0.25, 0.0]
    assert out["overall"]["median_survival"] == 2.0
    assert out["overall"]["n_events"] == 4
    assert out["overall"]["n_censored"] == 0

def test_km_monotone_and_greenwood():
    out = sv.run_survival({"durations": [2, 4, 6, 8, 10], "events": [1, 1, 1, 1, 1]})
    steps = out["overall"]["steps"]
    sv_vals = [s["survival"] for s in steps]
    assert all(sv_vals[i] >= sv_vals[i + 1] for i in range(len(sv_vals) - 1))
    assert all(s["std_err"] >= 0 for s in steps)

def test_censoring_keeps_at_risk():
    out = sv.run_survival({"durations": [1, 2, 3], "events": [1, 0, 1]})
    steps = out["overall"]["steps"]
    times = [s["time"] for s in steps]
    assert times == [1.0, 3.0]
    assert abs(steps[0]["survival"] - (2.0 / 3.0)) < 1e-6
    assert steps[1]["n_risk"] == 1
    assert out["overall"]["n_censored"] == 1

def test_logrank_separated_groups_significant():
    out = sv.run_survival({"demo": True})
    lr = out["logrank"]
    assert lr["p_value"] < 0.05
    assert lr["significant_at_0.05"] is True
    assert out["ground_truth"]["logrank_significant"] is True
    assert out["per_group"]["A"]["median_survival"] == 13.0
    assert out["per_group"]["B"]["median_survival"] == 2.0

def test_logrank_identical_groups_not_significant():
    dur = [1, 2, 3, 4, 5]
    out = sv.run_survival({
        "durations": dur + dur,
        "events": [1] * 10,
        "groups": ["A"] * 5 + ["B"] * 5,
    })
    lr = out["logrank"]
    assert lr["chi_square"] < 0.5
    assert lr["p_value"] > 0.1

def test_too_short_error():
    assert sv.run_survival({"durations": [5]}).get("error")

def test_bad_events_length_error():
    assert sv.run_survival({"durations": [1, 2, 3], "events": [1, 0]}).get("error")

def test_negative_duration_error():
    assert sv.run_survival({"durations": [-1, 2, 3]}).get("error")

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
