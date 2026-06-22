"""No-network unit tests for PowerPlan (tools_power).

Verifies the ACTUAL power math recovers the textbook (G*Power / Cohen 1988)
sample sizes:
  * two-sample t-test, d=0.5, α=.05 two-tailed, power=.80 → n = 64 PER GROUP
    (the load-bearing assertion — the canonical G*Power value);
  * one-sample t-test d=0.5 → n = 34; large effect d=0.8 → n = 26;
  * one-way ANOVA f=0.25, 4 groups → n = 45 per group;
  * Pearson correlation r=0.3 → n = 85;
  * the inversion is self-consistent: solving for power at the returned n gives
    ~target, and the minimum detectable effect at n=64 recovers d≈0.5;
  * malformed input returns a structured error, never raises.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_power.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_power as p  # noqa: E402


# =========================================================================
# The load-bearing assertion: textbook two-sample t-test n.
# =========================================================================
def test_demo_recovers_textbook_n_64():
    out = p.run_power_plan({"demo": True})
    assert out["demo"] is True
    assert out["n"] == 64
    assert out["achieved_power"] >= 0.80
    assert out["ground_truth"]["expected_n_per_group"] == 64


def test_two_sample_t_d05_n64():
    out = p.plan_power({
        "test": "two_sample_t", "solve_for": "n",
        "effect_size": 0.5, "alpha": 0.05, "power": 0.80, "tails": 2,
    })
    assert out["n"] == 64
    assert out["total_N"] == 128


def test_large_effect_smaller_n():
    out = p.plan_power({
        "test": "two_sample_t", "solve_for": "n",
        "effect_size": 0.8, "alpha": 0.05, "power": 0.80,
    })
    assert out["n"] == 26  # G*Power textbook value


# =========================================================================
# other designs — textbook values
# =========================================================================
def test_one_sample_t():
    out = p.plan_power({"test": "one_sample_t", "solve_for": "n",
                        "effect_size": 0.5, "alpha": 0.05, "power": 0.80})
    assert out["n"] == 34


def test_anova_f025_four_groups():
    out = p.plan_power({"test": "anova", "solve_for": "n", "effect_size": 0.25,
                        "k_groups": 4, "alpha": 0.05, "power": 0.80})
    assert out["n"] == 45
    assert out["total_N"] == 180


def test_correlation_r03():
    out = p.plan_power({"test": "correlation", "solve_for": "n",
                        "effect_size": 0.3, "alpha": 0.05, "power": 0.80})
    assert out["n"] == 85


def test_two_proportion():
    out = p.plan_power({"test": "two_proportion", "solve_for": "n",
                        "p1": 0.5, "p2": 0.6, "alpha": 0.05, "power": 0.80})
    # the unpooled normal-approximation per-group n is ≈ 388
    assert 380 <= out["n"] <= 410


# =========================================================================
# inversion self-consistency
# =========================================================================
def test_solve_for_power_at_n64():
    out = p.plan_power({"test": "two_sample_t", "solve_for": "power",
                        "effect_size": 0.5, "n": 64, "alpha": 0.05})
    assert abs(out["power"] - 0.80) < 0.01


def test_minimum_detectable_effect():
    out = p.plan_power({"test": "two_sample_t", "solve_for": "effect_size",
                        "n": 64, "alpha": 0.05, "power": 0.80})
    assert abs(out["minimum_detectable_effect"] - 0.5) < 0.01


def test_smaller_alpha_needs_more_n():
    n05 = p.plan_power({"test": "two_sample_t", "solve_for": "n", "effect_size": 0.5,
                        "alpha": 0.05, "power": 0.80})["n"]
    n01 = p.plan_power({"test": "two_sample_t", "solve_for": "n", "effect_size": 0.5,
                        "alpha": 0.01, "power": 0.80})["n"]
    assert n01 > n05


# =========================================================================
# robustness
# =========================================================================
def test_bad_test_errors():
    assert p.plan_power({"test": "wizardry", "solve_for": "n", "effect_size": 0.5}).get("error")


def test_zero_effect_errors():
    assert p.plan_power({"test": "two_sample_t", "solve_for": "n", "effect_size": 0.0}).get("error")


def test_bad_proportions_error():
    assert p.plan_power({"test": "two_proportion", "solve_for": "n",
                        "p1": 1.5, "p2": 0.3, "power": 0.80}).get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
