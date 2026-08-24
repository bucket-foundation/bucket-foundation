"""No-network unit tests for CausalDesigner (tools_causal).

Verifies the ACTUAL causal-inference logic on a graph with KNOWN ground truth:
 * on a classic confounding DAG (gene→smoking, gene→cancer, smoking→tar→cancer,
 smoking→hospitalized←injury) the valid minimal adjustment set is EXACTLY
 {gene}, the confounder is adjusted for, and the mediator (tar), the collider
 (hospitalized), and the injury are NOT adjusted for (the
 load-bearing assertion);
 * the backdoor path smoking<-gene->cancer is found;
 * an unobservable single-confounder case where the confounder is the only
 backdoor is identifiable, but a design with a cycle errors out;
 * the estimator recommendation tracks the described design;
 * malformed input returns a structured error, never raises.

Run: cd services/research-tools && python3 -m pytest tests/test_tools_causal.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_causal as c  # noqa: E402


# =========================================================================
# The load-bearing assertion: correct adjustment set on a known DAG.
# =========================================================================
def test_demo_adjustment_set_is_exactly_gene():
    out = c.run_causal_designer({"demo": True})
    assert out["demo"] is True
    assert out["adjustment_set"] == ["gene"]
    assert out["identifiable_by_adjustment"] is True
    gt = out["ground_truth"]
    assert sorted(out["adjustment_set"]) == sorted(gt["expected_adjustment_set"])
    # the mediator + collider must NEVER be in the adjustment set
    for bad in gt["must_not_adjust"]:
        assert bad not in (out["adjustment_set"] or [])
    # and they are flagged as do-not-adjust where applicable
    assert "tar" in out["do_not_adjust_for"]


def test_demo_finds_the_backdoor_path():
    out = c.run_causal_designer({"demo": True})
    assert out["n_backdoor_paths"] == 1
    reprs = [b["repr"] for b in out["backdoor_paths"]]
    # smoking <- gene -> cancer is the single backdoor
    assert any("gene" in r and "<-" in r for r in reprs)


def test_node_roles_classified():
    out = c.run_causal_designer({"demo": True})
    roles = out["graph"]["node_roles"]
    assert roles["gene"] == "confounder"
    assert roles["tar"] == "mediator"
    assert "collider" in roles["hospitalized"]


# =========================================================================
# A clean confounding triangle (no explicit edges → auto triangle)
# =========================================================================
def test_auto_confounding_triangle():
    out = c.run_causal_designer({
        "treatment": "X", "outcome": "Y", "confounders": ["Z1", "Z2"],
    })
    assert out["identifiable_by_adjustment"] is True
    # both confounders are needed to block both backdoor paths
    assert set(out["adjustment_set"]) == {"Z1", "Z2"}


def test_no_confounder_empty_adjustment_set():
    out = c.run_causal_designer({
        "treatment": "X", "outcome": "Y", "edges": [["X", "Y"]],
    })
    assert out["identifiable_by_adjustment"] is True
    assert out["adjustment_set"] == []
    assert out["n_backdoor_paths"] == 0


# =========================================================================
# estimator recommendation from the described design
# =========================================================================
def test_estimator_did():
    out = c.run_causal_designer({
        "treatment": "policy", "outcome": "y", "confounders": ["state"],
        "design": "difference-in-differences with panel data and parallel trends",
    })
    assert out["recommended_estimator"]["key"] == "DiD"


def test_estimator_iv_from_named_instrument():
    out = c.run_causal_designer({
        "treatment": "schooling", "outcome": "wage", "confounders": ["ability"],
        "instrument": "quarter_of_birth", "design": "observational",
    })
    assert out["recommended_estimator"]["key"] == "IV"


def test_estimator_rdd():
    out = c.run_causal_designer({
        "treatment": "scholarship", "outcome": "gpa", "confounders": ["family"],
        "design": "regression discontinuity at a test-score cutoff",
    })
    assert out["recommended_estimator"]["key"] == "RDD"


# =========================================================================
# reliability, cycles + malformed input
# =========================================================================
def test_cycle_is_rejected():
    out = c.run_causal_designer({
        "treatment": "A", "outcome": "B",
        "edges": [["A", "B"], ["B", "C"], ["C", "A"]],
    })
    assert out.get("error")
    assert "cycle" in out["error"].lower()


def test_missing_fields_error():
    assert c.run_causal_designer({"treatment": "X"}).get("error")
    assert c.run_causal_designer({"outcome": "Y"}).get("error")
    assert c.run_causal_designer({"treatment": "X", "outcome": "X"}).get("error")


def test_edge_string_parsing():
    out = c.run_causal_designer({
        "treatment": "T", "outcome": "Y",
        "edges": "Z -> T, Z -> Y, T -> Y",
    })
    assert ["Z", "T"] in out["graph"]["edges"]
    assert out["adjustment_set"] == ["Z"]


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
