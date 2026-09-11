"""`hte.api.hypothesize` against `graph.productions`-shaped requests
(Research OS's own row shape, `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`),
exercised directly rather than through `production.load_raw()`'s own
normalize-at-parse-time path (`tests/test_api.py` covers that one, since
`load_raw()` already hands `hypothesize` thirty-six ordinary-shaped records).
This file's own job is the request path itself: `hypothesize()` accepts a
raw `graph.productions` row (or a batch mixing that shape with the older
`PRODUCTION-SCHEMA.md` shape) with no caller-side conversion, and a
malformed Research OS row fails the same one-`RequestValidationError`
contract every other bad request does. No network: `HTE_LLM_MODE=fake`.
"""
from __future__ import annotations

import json

import pytest

from hte.api import RequestValidationError, hypothesize
from hte.corpus import production

_FAST_CONFIG = {
    "seeds": 1, "generate_n": 2, "combinatorial_max_items": 10, "max_hypotheses": 30,
    "tournament_rounds": 1, "max_time_bins": 5,
}


def _call(request: dict, monkeypatch, **overrides) -> dict:
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    return hypothesize(request, config={**_FAST_CONFIG, **overrides})


def _research_os_row(**overrides):
    row = {
        "id": "ros-api-test-1",
        "learner_id": "44444444-4444-4444-8444-444444444444",
        "target_node_id": "why-the-sky-is-blue",
        "claim": "Blue scatters more than red because of the lambda^-4 law.",
        "evidence": [{"node_id": "rayleigh-scattering-law", "quote": "steeply on the wavelength", "locator": "graph.nodes.summary"}],
        "sources": [{"label": "Rayleigh 1871", "doi": "10.1080/14786447108640507"}],
        "transfer_proof": {},
        "status": "accepted",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-02T00:00:00Z",
        "_target_node": {"slug": "why-the-sky-is-blue", "title": "Why the sky is blue", "tier": 10, "branch": "02-physics"},
    }
    row.update(overrides)
    return row


def test_single_research_os_row_is_accepted_without_a_wrapping_list(monkeypatch):
    response = _call({"productions": _research_os_row()}, monkeypatch)
    assert response["ok"] is True
    assert response["corpus"]["n_productions"] == 1


def test_research_os_row_runs_end_to_end_in_fake_mode(monkeypatch):
    response = _call({"productions": [_research_os_row()], "status_min": "draft"}, monkeypatch)
    assert response["ok"] is True
    # one Source for the production itself, one for the evidence entry's
    # own externally-cited source_id ("rayleigh-scattering-law")
    assert response["corpus"]["n_sources"] == 2
    assert response["corpus"]["n_evidence"] == 1


def test_a_batch_mixing_research_os_and_production_schema_shapes_runs(monkeypatch):
    schema_shaped = production.load_raw()[0].to_dict()
    response = _call({"productions": [_research_os_row(), schema_shaped], "status_min": "draft"}, monkeypatch)
    assert response["ok"] is True
    assert response["corpus"]["n_productions"] == 2


def test_learner_id_never_appears_in_the_response(monkeypatch):
    secret_learner_id = "55555555-5555-4555-8555-555555555555"
    response = _call({"productions": [_research_os_row(learner_id=secret_learner_id)], "status_min": "draft"}, monkeypatch)
    assert secret_learner_id not in json.dumps(response)


def test_research_os_row_missing_target_node_id_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    row = _research_os_row()
    del row["target_node_id"]
    # once target_node_id is gone this no longer fingerprints as a Research
    # OS row (`is_research_os_record`), so it is validated, and rejected, as
    # an incomplete PRODUCTION-SCHEMA.md record instead: missing every
    # field that shape requires and this row never carried either.
    with pytest.raises(RequestValidationError, match="author_role"):
        hypothesize({"productions": row})


def test_research_os_row_missing_id_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    row = _research_os_row()
    del row["id"]
    with pytest.raises(RequestValidationError, match="id"):
        hypothesize({"productions": row})


def test_research_os_row_with_unrecognized_status_raises_request_validation_error(monkeypatch):
    # `graph.productions.status` carries its own SQL check constraint
    # (draft/submitted/accepted/returned), so a live row is always one of
    # those four values; a hand-built row outside that constraint used to
    # silently fold into `"draft"` (`RESEARCH_OS_STATUS_MAP.get(...,
    # "draft")`), which the default `status_min="peer-reviewed"` then
    # drops from the corpus with no trace of why (silent-failures review
    # finding 5). It must now fail the request loudly instead.
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="not-a-real-status"):
        hypothesize({"productions": [_research_os_row(status="not-a-real-status")], "status_min": "draft"})


def test_research_os_row_missing_both_timestamps_raises_request_validation_error(monkeypatch):
    # Silent-failures review finding 6: a row with neither `updated_at`
    # nor `created_at` used to silently synthesize the Unix epoch as its
    # own review date, which `hte.calibrate.holdout_by_discovery_date`
    # would then read as maximally old. It must now fail the request
    # loudly instead.
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    row = _research_os_row()
    row.pop("updated_at", None)
    row.pop("created_at", None)
    with pytest.raises(RequestValidationError, match="updated_at.*created_at"):
        hypothesize({"productions": [row], "status_min": "draft"})
