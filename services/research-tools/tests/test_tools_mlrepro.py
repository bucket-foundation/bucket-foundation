"""No-network unit tests for MLReproCard (tools_mlrepro).

Verifies the ACTUAL reproducibility rubric on experiments with KNOWN ground
truth:
  * the demo experiment (ResNet-50/ImageNet: strong code+eval, MISSING seed,
    dataset version, environment, hardware) flags EXACTLY those gaps and scores
    below a fully-specified version (the load-bearing assertion);
  * a fully-specified experiment reaches a high score + the R3 level, and adding
    repro elements is monotonic (more detail never lowers the score);
  * code-released detection requires a URL-like value;
  * a normalized model card is emitted;
  * malformed input returns a structured error, never raises.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_mlrepro.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_mlrepro as m  # noqa: E402


def _full_record() -> dict:
    rec = dict(m._demo_record())
    rec.update({
        "seed": 42,
        "dataset_version": "ILSVRC2012 (ImageNet-1k)",
        "environment": "Dockerfile + pinned requirements.txt",
        "hardware": "8x NVIDIA A100",
        "compute_budget": "90 GPU-hours",
        "weights": "https://huggingface.co/example/resnet50-repro",
        "n_runs": 5,
        "variance": "top-1 76.1 ± 0.3%",
        "preprocessing": "RandomResizedCrop + normalize",
    })
    return rec


# =========================================================================
# The load-bearing assertion: demo flags the planted gaps + scores lower.
# =========================================================================
def test_demo_flags_known_gaps_and_scores_lower():
    demo = m.run_mlrepro_card({"demo": True})
    full = m.run_mlrepro_card({"record": _full_record()})

    assert demo["demo"] is True
    missing = {g["check"] for g in demo["prioritized_gaps"]}
    for must in demo["ground_truth"]["missing_must_include"]:
        assert must in missing, f"{must} should be flagged missing in the demo"

    # the fully-specified experiment scores strictly higher
    assert full["reproducibility_score"] > demo["reproducibility_score"]
    # and reaches the top reproducibility level
    assert full["reproducibility_level"] == "R3"
    assert demo["reproducibility_level"] in demo["ground_truth"]["expected_level_in"]


def test_score_is_monotonic_adding_elements():
    base = m.run_mlrepro_card({"demo": True})["reproducibility_score"]
    rec = dict(m._demo_record())
    rec["seed"] = 7
    plus = m.run_mlrepro_card({"record": rec})["reproducibility_score"]
    assert plus > base


# =========================================================================
# code-released needs a URL-like value
# =========================================================================
def test_code_released_requires_url():
    no_url = m.run_mlrepro_card({"record": {"code": "available on request", "model": "x"}})
    has_url = m.run_mlrepro_card({"record": {"code": "https://github.com/a/b", "model": "x"}})
    no_url_present = [c for c in no_url["checks"] if c["check"] == "code_released"][0]["present"]
    has_url_present = [c for c in has_url["checks"] if c["check"] == "code_released"][0]["present"]
    assert no_url_present is False
    assert has_url_present is True


# =========================================================================
# dimension subscores + model card
# =========================================================================
def test_dimension_subscores_present():
    out = m.run_mlrepro_card({"demo": True})
    subs = out["dimension_subscores"]
    for dim in ("Data", "Code & Method", "Training", "Evaluation", "Compute", "Sharing & Environment"):
        assert dim in subs
    # the demo names code → Code & Method should be 100
    assert subs["Code & Method"] == 100.0
    # the demo gives no compute info → Compute is 0
    assert subs["Compute"] == 0.0


def test_model_card_emitted():
    out = m.run_mlrepro_card({"demo": True})
    card = out["model_card"]
    assert "model_details" in card and "training" in card and "evaluation" in card
    assert "ResNet-50" in card["model_details"]["model"]


def test_empty_record_scores_r0():
    out = m.run_mlrepro_card({"record": {"task": "classification"}})
    assert out["reproducibility_level"] == "R0"


# =========================================================================
# edge cases
# =========================================================================
def test_validation_structured_errors():
    assert m.run_mlrepro_card({"record": "{not json"}).get("error")
    assert m.run_mlrepro_card({"record": ""}).get("error")
    assert m.run_mlrepro_card({"record": 12345}).get("error")
    assert m.run_mlrepro_card({"record": "[1,2,3]"}).get("error")
    assert m.run_mlrepro_card({"record": {}}).get("error")
    # a JSON string of fields is accepted
    ok = m.run_mlrepro_card({"record": '{"model": "x", "seed": 1}'})
    assert "reproducibility_score" in ok


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
