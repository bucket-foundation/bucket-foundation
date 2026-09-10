"""`hte.api.hypothesize`, in fake mode against the 14 shipped production
fixtures (`hte/data/production-fixtures/`: 12 `PRODUCTION-SCHEMA.md`-shaped
fixtures plus `research-os-sky-blue.json`'s two `graph.productions`-shaped
rows, `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`). `production.load_raw()`
normalizes the Research OS rows onto `PRODUCTION-SCHEMA.md`'s own shape
before `to_dict()`, so `_fixture_records()` below already hands
`hypothesize` fourteen ordinary-shaped records; `tests/test_api_research_
os.py` exercises the Research-OS-shaped request path directly. No network:
`HTE_LLM_MODE=fake` (monkeypatched per test) dispatches every role through
`hte.fakellm` instead of `claude -p`.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from hte import api, mcp_tool
from hte.api import CampaignError, RequestValidationError, hypothesize
from hte.corpus import production

# --------------------------------------------------------------------------
# a compact recursive JSON-Schema-subset validator (`type`, `properties`,
# `required`, `items`, `oneOf` only): this package ships no dependencies
# (`pyproject.toml`), so no `jsonschema` import, and `mcp_tool.
# TOOL_DEFINITION["outputSchema"]` never uses more than this subset.
# --------------------------------------------------------------------------

_TYPE_MAP = {
    "object": dict, "array": list, "string": str, "integer": int,
    "number": (int, float), "boolean": bool, "null": type(None),
}


def _check_type(value, type_spec) -> bool:
    names = type_spec if isinstance(type_spec, list) else [type_spec]
    return isinstance(value, tuple(_TYPE_MAP[n] for n in names))


def _schema_errors(instance, schema, path: str = "$") -> list[str]:
    if "oneOf" in schema:
        for sub in schema["oneOf"]:
            if not _schema_errors(instance, sub, path):
                return []
        return [f"{path}: matched none of oneOf"]
    if "type" in schema and not _check_type(instance, schema["type"]):
        return [f"{path}: expected type {schema['type']}, got {type(instance).__name__}"]
    problems: list[str] = []
    if isinstance(instance, dict):
        for key in schema.get("required", []):
            if key not in instance:
                problems.append(f"{path}.{key}: required field missing")
        for key, sub_schema in schema.get("properties", {}).items():
            if key in instance:
                problems.extend(_schema_errors(instance[key], sub_schema, f"{path}.{key}"))
    if isinstance(instance, list):
        for i, item in enumerate(instance):
            problems.extend(_schema_errors(item, schema.get("items", {}), f"{path}[{i}]"))
    return problems


def _fixture_records() -> list[dict]:
    return [p.to_dict() for p in production.load_raw()]


# Small enough to run fast in fake mode over the 14-fixture corpus
# (~26 sources, ~16 evidence items), well under `hte.runner.
# DEFAULT_CONFIG`'s own batch-campaign-sized defaults.
_FAST_CONFIG = {
    "seeds": 1, "generate_n": 2, "combinatorial_max_items": 10, "max_hypotheses": 30,
    "tournament_rounds": 1, "max_time_bins": 5,
}


def _call(request: dict, monkeypatch, **config_overrides) -> dict:
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    config = {**_FAST_CONFIG, **config_overrides}
    return hypothesize(request, config=config)


# --------------------------------------------------------------------------
# happy path
# --------------------------------------------------------------------------


def test_all_fourteen_production_fixtures_run_end_to_end_and_validate(monkeypatch):
    response = _call({"productions": _fixture_records(), "status_min": "draft"}, monkeypatch)
    assert response["ok"] is True
    assert response["corpus"]["n_productions"] == 14
    errors = _schema_errors(response, mcp_tool.TOOL_DEFINITION["outputSchema"])
    assert errors == []


def test_single_production_record_is_accepted_without_a_wrapping_list(monkeypatch):
    record = _fixture_records()[0]
    response = _call({"productions": record}, monkeypatch)
    assert response["ok"] is True
    assert response["corpus"]["n_productions"] == 1


def test_singular_production_key_is_also_accepted(monkeypatch):
    record = _fixture_records()[0]
    response = _call({"production": record}, monkeypatch)
    assert response["ok"] is True
    assert response["corpus"]["n_productions"] == 1


def test_response_carries_no_absolute_path_or_env_style_value(monkeypatch):
    response = _call({"productions": _fixture_records()}, monkeypatch)
    dumped = json.dumps(response)
    assert "/home/" not in dumped
    assert "/tmp/" not in dumped
    assert "hte-hypothesize-" not in dumped


def test_response_carries_opinion_elo_slot_labels_and_linked_evidence(monkeypatch):
    response = _call({"productions": _fixture_records()}, monkeypatch)
    entries = [e for b in response["timeline"]["bins"] for e in b["ranked_hypotheses"]]
    assert entries, "at least one ranked hypothesis expected over the full fixture set"
    entry = entries[0]
    assert entry["opinion"] is None or set(entry["opinion"]) == {"b", "d", "u", "a", "P"}
    assert "elo" in entry
    assert set(entry["slot_labels"]) == set(entry["slots"])
    assert set(entry["linked_evidence"]) == {"supports", "refutes"}


def test_gap_nodes_are_ranked_by_descending_value_of_information(monkeypatch):
    response = _call({"productions": _fixture_records()}, monkeypatch)
    vois = [g["value_of_information"] for g in response["gap_nodes"]]
    assert vois == sorted(vois, reverse=True)


def test_self_report_carries_assumptions_and_refusal_counts(monkeypatch):
    response = _call({"productions": _fixture_records()}, monkeypatch)
    assert isinstance(response["self_report"]["assumptions"], list)
    assert isinstance(response["self_report"]["refusal_counts"], dict)


def test_response_carries_which_model_backed_each_role_alongside_run_id(monkeypatch):
    # `run_id` alone identifies a run; a caller storing this run's
    # provenance against a learner's production needs which model
    # produced it too (`manifest["models"]`, `model-policy.json`'s own
    # shape).
    response = _call({"productions": _fixture_records()}, monkeypatch)
    assert response["run_id"]
    assert response["models"]["roles"]["generator"]
    assert response["models"]["escalation"]


def test_prior_profile_shifts_the_reported_profile_without_erroring(monkeypatch):
    for profile in ("consensus", "skeptic", "fringe", "uniform"):
        response = _call({"productions": _fixture_records(), "prior_profile": profile}, monkeypatch)
        assert response["corpus"]["prior_profile"] == profile
        assert response["prior_profile_robustness"]["requested_profile"] == profile


def test_same_seed_and_fixed_config_is_deterministic(monkeypatch):
    records = _fixture_records()
    r1 = _call({"productions": records, "seeds": 1}, monkeypatch)
    r2 = _call({"productions": records, "seeds": 1}, monkeypatch)
    assert r1["corpus"] == r2["corpus"]
    assert r1["coverage"] == r2["coverage"]


# --------------------------------------------------------------------------
# validation errors
# --------------------------------------------------------------------------


def test_missing_productions_field_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="productions"):
        hypothesize({})


def test_empty_productions_list_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError):
        hypothesize({"productions": []})


def test_non_object_request_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError):
        hypothesize([])  # type: ignore[arg-type]


def test_missing_required_field_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = copy.deepcopy(_fixture_records()[0])
    del record["id"]
    with pytest.raises(RequestValidationError, match="'id'"):
        hypothesize({"productions": record})


def test_bad_review_status_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = copy.deepcopy(_fixture_records()[0])
    record["review"]["status"] = "not-a-real-status"
    with pytest.raises(RequestValidationError, match="not-a-real-status"):
        hypothesize({"productions": record})


def test_unknown_slot_id_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = copy.deepcopy(_fixture_records()[0])
    record["claims"][0]["slots"]["actor"] = "not-a-real-concept-id"
    with pytest.raises(RequestValidationError, match="not-a-real-concept-id"):
        hypothesize({"productions": record})


def test_bad_stance_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = copy.deepcopy(_fixture_records()[0])
    record["claims"][0]["stance"] = "not-a-real-stance"
    with pytest.raises(RequestValidationError, match="not-a-real-stance"):
        hypothesize({"productions": record})


def test_bad_evidence_kind_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = copy.deepcopy(_fixture_records()[0])
    record["claims"][0]["evidence"][0]["kind"] = "not-a-real-kind"
    with pytest.raises(RequestValidationError, match="not-a-real-kind"):
        hypothesize({"productions": record})


def test_bad_status_min_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError):
        hypothesize({"productions": _fixture_records()[0], "status_min": "retracted"})


def test_bad_prior_profile_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="prior_profile"):
        hypothesize({"productions": _fixture_records()[0], "prior_profile": "not-a-real-profile"})


def test_multiple_problems_are_all_reported_together(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    record = copy.deepcopy(_fixture_records()[0])
    del record["id"]
    record["claims"][0]["stance"] = "bogus"
    try:
        hypothesize({"productions": record})
        pytest.fail("expected RequestValidationError")
    except RequestValidationError as exc:
        message = str(exc)
        assert "'id'" in message
        assert "bogus" in message


def test_bad_llm_mode_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="llm_mode"):
        hypothesize({"productions": _fixture_records()[0], "llm_mode": "not-a-real-mode"})


def test_non_positive_seeds_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="seeds"):
        hypothesize({"productions": _fixture_records()[0], "seeds": 0})


def test_non_integer_seeds_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="seeds"):
        hypothesize({"productions": _fixture_records()[0], "seeds": "one"})


def test_boolean_seeds_is_rejected_despite_being_an_int_subclass(monkeypatch):
    # `isinstance(True, int)` is `True` in Python; `hypothesize()`'s own
    # validation explicitly excludes `bool`, so `seeds=True` still gets
    # rejected as not a real seed count.
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="seeds"):
        hypothesize({"productions": _fixture_records()[0], "seeds": True})


def test_non_positive_max_hypotheses_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="max_hypotheses"):
        hypothesize({"productions": _fixture_records()[0], "max_hypotheses": 0})


def test_non_integer_max_hypotheses_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="max_hypotheses"):
        hypothesize({"productions": _fixture_records()[0], "max_hypotheses": "lots"})


def test_non_boolean_replay_only_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="replay_only"):
        hypothesize({"productions": _fixture_records()[0], "replay_only": "yes"})


def test_string_productions_field_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="productions"):
        hypothesize({"productions": "not-an-object-or-list"})


def test_integer_productions_field_raises_request_validation_error(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    with pytest.raises(RequestValidationError, match="productions"):
        hypothesize({"productions": 1})


# --------------------------------------------------------------------------
# campaign failure: CampaignError, temp-dir cleanup, path sanitization
# --------------------------------------------------------------------------


def test_sanitize_redacts_every_allowlisted_path_root():
    # Silent-failures review finding 8: the original regex covered only
    # `/home`, `/tmp`, `/Users`, `/var`; a message naming `/srv`, `/opt`,
    # `/root`, `/app`, `/mnt`, `/data`, or `/etc` passed through
    # unredacted into a `CampaignError`, which does reach the HTTP
    # client. Each root below must now redact.
    run_dir = Path("/some/unrelated/run/dir")
    for root in ("/home/x", "/tmp/x", "/Users/x", "/var/x", "/srv/x", "/opt/x", "/root/x", "/app/x", "/mnt/x", "/data/x", "/etc/x"):
        redacted = api._sanitize(f"error at {root}/file.txt", run_dir)
        assert root not in redacted, f"{root!r} was not redacted"
        assert "<path>" in redacted


def test_campaign_failure_raises_campaign_error_and_cleans_up_temp_dir(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    captured_dirs: list[Path] = []

    def _boom(config):
        captured_dirs.append(Path(config["out_dir"]))
        raise RuntimeError("a campaign bug, not a refusal")

    monkeypatch.setattr("hte.api.runner.run_campaign", _boom)
    with pytest.raises(CampaignError, match="RuntimeError") as excinfo:
        hypothesize({"productions": _fixture_records()}, config=_FAST_CONFIG)

    assert len(captured_dirs) == 1
    # the temp run directory `hypothesize()` created is gone once the
    # call has raised, the same cleanup a normal return gets
    assert not captured_dirs[0].exists()
    # `_sanitize()`'s own "never an absolute path in the response"
    # contract holds for a raised `CampaignError` too, the same as for
    # a successful response body
    assert str(captured_dirs[0]) not in str(excinfo.value)


def test_response_assembly_failure_raises_campaign_error_and_cleans_up_temp_dir(monkeypatch):
    # A bug in `_build_response` (outside `run_campaign` itself) must
    # still surface as the documented `CampaignError` contract, with the
    # temp run directory still cleaned up, rather than escaping as a
    # bare `TypeError` (the bug this test pins: `_build_response` used
    # to run outside the try/except that reclassifies exceptions).
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    real_run_campaign = api.runner.run_campaign
    captured_dirs: list[Path] = []

    def _wrapped(config):
        captured_dirs.append(Path(config["out_dir"]))
        return real_run_campaign(config)

    def _boom(*args, **kwargs):
        raise TypeError("a bug in response assembly, not a campaign failure")

    monkeypatch.setattr("hte.api.runner.run_campaign", _wrapped)
    monkeypatch.setattr("hte.api._build_response", _boom)
    with pytest.raises(CampaignError, match="TypeError"):
        hypothesize({"productions": _fixture_records()}, config=_FAST_CONFIG)

    assert len(captured_dirs) == 1
    assert not captured_dirs[0].exists()
