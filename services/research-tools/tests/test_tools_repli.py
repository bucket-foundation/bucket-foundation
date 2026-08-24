"""No-network unit tests for RepliCheck (tools_repli).

Verifies the ACTUAL statistics-reproducibility math on inputs with KNOWN,
hand-checkable ground truth:
 * a known statcheck DECISION ERROR is caught (χ²(1)=3.84 reported p=.049, but
 recomputes to p≈.0500, flips significance at α=.05);
 * a known statcheck INCONSISTENCY is caught (t(24)=2.13 reported p=.002 but
 recomputes to p≈.044);
 * a CONSISTENT statistic is NOT falsely flagged (F(2,36)=5.40, p=.009);
 * a GRIM-IMPOSSIBLE mean is flagged (M=2.19 on an integer scale, n=10 →
 21.9 is not an integer) and a GRIM-OK mean is not;
 * reporting flags fire (missing correction / CIs / effect sizes);
 * malformed input returns a structured error, never raises.

Run: cd services/research-tools && python3 -m pytest tests/test_tools_repli.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_repli as r  # noqa: E402


# =========================================================================
# recompute_p, exact two-tailed scipy.stats math
# =========================================================================
def test_recompute_t():
    p = r.recompute_p("t", 2.13, 24)
    assert p is not None and abs(p - 0.0436) < 0.002


def test_recompute_F():
    p = r.recompute_p("F", 5.40, 2, 36)
    assert p is not None and abs(p - 0.0089) < 0.001


def test_recompute_chi():
    p = r.recompute_p("chi", 3.84, 1)
    # χ²(1)=3.84 sits right at the .05 boundary (p ≈ .0500)
    assert p is not None and abs(p - 0.0500) < 0.0005
    assert p > 0.05  # just over, the source of the decision error


def test_recompute_r():
    p = r.recompute_p("r", 0.34, 48)
    assert p is not None and abs(p - 0.0157) < 0.002


# =========================================================================
# statcheck, parse + consistency verdicts
# =========================================================================
def test_parse_all_test_types():
    rows = r.parse_statistics(
        "t(24) = 2.13, p = .002; F(2, 36) = 5.40, p = .009; "
        "χ2(1) = 3.84, p = .049; r(48) = .34, p = .016"
    )
    tests = sorted(row["test"] for row in rows)
    assert tests == ["F", "chi", "r", "t"]


def test_decision_error_caught():
    # χ²(1)=3.84 reported as significant (p=.049) but p≈.0500 → DECISION ERROR
    rows = r.check_statistics("The effect, χ2(1) = 3.84, p = .049, was reliable.")
    assert len(rows) == 1
    assert rows[0]["verdict"] == "DECISION ERROR"
    assert rows[0]["gross_error"] is True
    assert rows[0]["consistent"] is False


def test_inconsistency_caught_but_not_gross():
    # t(24)=2.13 reported p=.002 but recomputes ≈.044 → inconsistent, both <.05
    rows = r.check_statistics("RTs differed, t(24) = 2.13, p = .002.")
    assert rows[0]["verdict"] == "inconsistent"
    assert rows[0]["gross_error"] is False
    assert rows[0]["consistent"] is False


def test_consistent_not_flagged():
    rows = r.check_statistics("Main effect, F(2, 36) = 5.40, p = .009.")
    assert rows[0]["verdict"] == "consistent"
    assert rows[0]["consistent"] is True


# =========================================================================
# GRIM test, exact integer arithmetic
# =========================================================================
def test_grim_impossible_flagged():
    # 2.19 * 10 = 21.9 → not an integer numerator → impossible
    assert r.grim_consistent(2.19, 10, items=1, decimals=2) is False


def test_grim_consistent_ok():
    # 2.20 * 10 = 22 (integer) → achievable
    assert r.grim_consistent(2.20, 10, items=1, decimals=2) is True
    # 3.0 has no decimal granularity → not testable → returns True
    assert r.grim_consistent(3.0, 12, items=1, decimals=0) is True


def test_check_grim_on_text():
    rows = r.check_grim("Group A: M = 2.19, SD = 0.8, n = 10. Control: M = 2.20, SD = 1.1, n = 10.")
    by_mean = {row["mean"]: row for row in rows}
    assert by_mean[2.19]["verdict"] == "GRIM-IMPOSSIBLE"
    assert by_mean[2.20]["verdict"] == "consistent"


# =========================================================================
# full run + demo ground truth
# =========================================================================
def test_run_demo_ground_truth():
    out = r.run_repli_check({"text": "demo"})
    assert out["demo"] is True
    gt = out["ground_truth"]
    assert out["summary"]["decision_errors"] == gt["expected_decision_errors"]
    assert out["summary"]["grim_impossible"] == gt["expected_grim_impossible"]
    assert out["reproducibility_level"] == "fail"
    # the χ² row is the decision error
    chi = [s for s in out["statcheck"] if s["test"] == "chi"][0]
    assert chi["verdict"] == "DECISION ERROR"
    # the 2.19 mean is GRIM-impossible
    bad = [g for g in out["grim"] if abs(g["mean"] - 2.19) < 1e-9][0]
    assert bad["verdict"] == "GRIM-IMPOSSIBLE"


def test_reporting_flags_fire():
    out = r.run_repli_check({"text": "demo"})
    names = {fl["flag"] for fl in out["reporting_flags"]}
    assert "missing_multiple_comparison_correction" in names
    assert "missing_confidence_intervals" in names
    assert "missing_effect_sizes" in names


def test_correction_mention_suppresses_flag():
    text = (
        "t(20) = 2.1, p = .048; t(20) = 2.2, p = .039; t(20) = 2.3, p = .032 "
        "(Bonferroni-corrected for multiple comparisons), 95% CI reported, Cohen's d = 0.5."
    )
    out = r.run_repli_check({"text": text})
    names = {fl["flag"] for fl in out["reporting_flags"]}
    assert "missing_multiple_comparison_correction" not in names
    assert "missing_confidence_intervals" not in names
    assert "missing_effect_sizes" not in names


def test_clean_pass():
    out = r.run_repli_check({
        "text": "The effect was reliable, F(2, 36) = 5.40, p = .009, 95% CI [0.2, 0.8], η2 = .23 (Holm-corrected).",
    })
    assert out["reproducibility_level"] == "pass"


# =========================================================================
# reliability, never crash on malformed input
# =========================================================================
def test_validation_structured_errors():
    assert r.run_repli_check({"text": "x"}).get("error")
    assert r.run_repli_check({"text": 123}).get("error")


def test_no_stats_does_not_crash():
    out = r.run_repli_check({"text": "We discussed the results qualitatively at length here."})
    assert out["reproducibility_level"] == "none"
    assert out["summary"]["statistics_checked"] == 0


def test_garbage_stats_do_not_crash():
    # malformed df / stat should be skipped silently
    out = r.run_repli_check({"text": "t() = , p = ; F(a,b) = c, p = d; r(48) = .34, p = .016"})
    # the one well-formed r(48) statistic should still parse
    tests = {s["test"] for s in out["statcheck"]}
    assert "r" in tests


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
