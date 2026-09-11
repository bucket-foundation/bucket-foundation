"""Property/behavior tests for `hte.api._validate_production_record`'s own
malformed-shape branches. `tests/test_api.py` already exercises most of
this function's *enum*-value checks (a bad `review.status`, `stance`,
evidence `kind`, or citation `type`); `tests/COVERAGE.md` still named this
function's *shape*-validation branches uncovered, one `errors.append(...)`
per malformed field the enum checks never reach: a non-dict production
record, a bad `author_role`, a malformed `review` block or history entry,
a non-list `claims`/`evidence`, a non-dict claim/evidence entry, a claim
missing `text`/`stance`, a non-dict `slots`, a malformed `interval`, an
evidence entry missing a required key, a bad `tier` value, and a malformed
citation entry. Every case here is expected to raise cleanly, exactly the
documented contract (`hte/api.py`'s own module docstring: "raises on a
malformed request... rather than returning an `ok: false` envelope");
none of these is a defect, only a coverage gap.
"""
from __future__ import annotations

import copy
import os

import pytest

from hte import api
from hte.api import RequestValidationError, hypothesize
from hte.corpus import production


def _fixture_records() -> list[dict]:
    return [p.to_dict() for p in production.load_raw()]


def _one_record() -> dict:
    return copy.deepcopy(_fixture_records()[0])


# --------------------------------------------------------------------------
# the record itself
# --------------------------------------------------------------------------


def test_non_dict_production_record_in_a_list_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match=r"productions\[0\]: expected an object"):
        hypothesize({"productions": ["not-a-dict"]})


def test_bad_author_role_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["author_role"] = "not-a-real-role"
    with pytest.raises(RequestValidationError, match="not-a-real-role"):
        hypothesize({"productions": record})


# --------------------------------------------------------------------------
# review block
# --------------------------------------------------------------------------


def test_non_dict_review_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["review"] = "not-an-object"
    with pytest.raises(RequestValidationError, match=r"review: must be an object with a 'status' field"):
        hypothesize({"productions": record})


def test_review_missing_status_key_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    del record["review"]["status"]
    with pytest.raises(RequestValidationError, match=r"review: must be an object with a 'status' field"):
        hypothesize({"productions": record})


def test_malformed_review_history_entry_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["review"]["history"] = [{"status": "draft"}]  # missing 'date'
    with pytest.raises(RequestValidationError, match=r"review\.history\[0\]: must be an object with 'status' and 'date'"):
        hypothesize({"productions": record})


# --------------------------------------------------------------------------
# claims
# --------------------------------------------------------------------------


def test_non_list_claims_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["claims"] = "not-a-list"
    with pytest.raises(RequestValidationError, match=r"claims: expected a list, got str"):
        hypothesize({"productions": record})


def test_non_dict_claim_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["claims"] = ["not-a-dict"]
    with pytest.raises(RequestValidationError, match=r"claims\[0\]: expected an object, got str"):
        hypothesize({"productions": record})


def test_claim_missing_text_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    del record["claims"][0]["text"]
    with pytest.raises(RequestValidationError, match=r"claims\[0\]: missing required field 'text'"):
        hypothesize({"productions": record})


def test_claim_missing_stance_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    del record["claims"][0]["stance"]
    with pytest.raises(RequestValidationError, match=r"claims\[0\]: missing required field 'stance'"):
        hypothesize({"productions": record})


def test_non_dict_slots_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["claims"][0]["slots"] = "not-a-dict"
    with pytest.raises(RequestValidationError, match=r"slots: expected an object, got str"):
        hypothesize({"productions": record})


def test_malformed_interval_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["claims"][0]["interval"] = {"start": 1900}  # missing 'end'
    with pytest.raises(RequestValidationError, match=r"interval: must be an object with 'start' and 'end'"):
        hypothesize({"productions": record})


# --------------------------------------------------------------------------
# evidence
# --------------------------------------------------------------------------


def test_non_list_evidence_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["claims"][0]["evidence"] = "not-a-list"
    with pytest.raises(RequestValidationError, match=r"evidence: expected a list, got str"):
        hypothesize({"productions": record})


def test_non_dict_evidence_entry_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["claims"][0]["evidence"] = ["not-a-dict"]
    with pytest.raises(RequestValidationError, match=r"evidence\[0\]: expected an object, got str"):
        hypothesize({"productions": record})


def test_evidence_entry_missing_a_required_field_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    del record["claims"][0]["evidence"][0]["quote"]
    with pytest.raises(RequestValidationError, match=r"evidence\[0\]: missing required field 'quote'"):
        hypothesize({"productions": record})


def test_bad_evidence_tier_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["claims"][0]["evidence"][0]["tier"] = "not-a-real-tier"
    with pytest.raises(RequestValidationError, match="not-a-real-tier"):
        hypothesize({"productions": record})


def test_malformed_citation_entry_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = _one_record()
    record["claims"][0]["evidence"][0]["citations"] = [{"type": "doi"}]  # missing 'value'
    with pytest.raises(RequestValidationError, match=r"citations\[0\]: must be an object with 'type' and 'value'"):
        hypothesize({"productions": record})


# --------------------------------------------------------------------------
# `_llm_mode_override` and `_calibration_summary`: small pure helpers with
# no test of their own restore-vs-pop and falsy-input branches.
# --------------------------------------------------------------------------


def test_llm_mode_override_restores_a_pre_existing_value_on_exit(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "claude")
    with api._llm_mode_override("fake"):
        assert os.environ["HTE_LLM_MODE"] == "fake"
    assert os.environ["HTE_LLM_MODE"] == "claude"


def test_llm_mode_override_pops_a_previously_unset_value_on_exit(monkeypatch):
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)
    with api._llm_mode_override("fake"):
        assert os.environ["HTE_LLM_MODE"] == "fake"
    assert "HTE_LLM_MODE" not in os.environ


def test_llm_mode_override_is_a_no_op_for_none(monkeypatch):
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)
    with api._llm_mode_override(None):
        assert "HTE_LLM_MODE" not in os.environ


def test_calibration_summary_is_none_for_falsy_input():
    assert api._calibration_summary(None) is None
    assert api._calibration_summary({}) is None


def test_calibration_summary_extracts_the_three_reported_fields():
    summary = api._calibration_summary(
        {"mode": "kfold", "brier_score": 0.1, "coverage_of_truth": 0.5, "extra": "dropped"}
    )
    assert summary == {"mode": "kfold", "brier_score": 0.1, "coverage_of_truth": 0.5}
