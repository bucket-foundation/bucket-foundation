"""Contract tests for `hte/mcp_tool.py`, `tests/COVERAGE.md`'s own next
least-covered file not already carrying a property or behavior test in
any `tests/swarm*/` round (`hte/mcp_tool.py` is imported by `tests/
test_serve.py`, one output-schema assertion over one live response, but
its `TOOL_DEFINITION`'s own enum values and defaults, transcribed by hand
from four other modules' real sources of truth, carry no test of their
own that they stay in sync).

`TOOL_DEFINITION` defines no server and runs no validation itself
(`hte/mcp_tool.py`'s own module docstring: the seam a future `bucket-mcp`
tool handler validates against). `hte.api.hypothesize` never consults it
at runtime. This file tests that gap: every enum and default this schema
states by hand against the real enum or constant it is describing, and
every shipped production fixture and a real `hypothesize()` response
against the schema itself, using the `jsonschema` library
(`tests/swarm2/test_fakellm_props.py` and `tests/swarm3/test_roles_props.py`
already depend on it for the identical purpose; `hte`'s own runtime
carries no dependency on it, `pyproject.toml` `dependencies = []`, so this
stays a test-only import).
"""
from __future__ import annotations

import jsonschema
import pytest

from hte import api, mcp_tool
from hte.corpus import production
from hte.evidence import EvidenceKind, Tier

_PRODUCTION_SCHEMA = mcp_tool._PRODUCTION_RECORD_SCHEMA
_INPUT_SCHEMA = mcp_tool.TOOL_DEFINITION["inputSchema"]
_OUTPUT_SCHEMA = mcp_tool.TOOL_DEFINITION["outputSchema"]


def _enum_at(schema: dict, *path: str) -> list:
    """Walk a JSON-Schema-shaped dict by property name, taking a literal
    `"items"` step as "descend into this array schema's own item schema"
    (`node["items"]`) rather than as a property named `items` on the
    current object schema (`node["properties"]["items"]`), the reading
    that lets one path string address a nested `array of object` schema
    like `TOOL_DEFINITION`'s own `claims[].evidence[].citations[].type`."""
    node = schema
    for key in path:
        node = node["items"] if key == "items" else node["properties"][key]
    return node["enum"]


# ---------------------------------------------------------------------------
# Every enum `TOOL_DEFINITION` states by hand matches its real source of
# truth. None of these fired before this file existed; `FINDING-2026-09-10-
# 401` below is the one place a matching runtime check was missing too.
# ---------------------------------------------------------------------------


def test_evidence_kind_enum_matches_the_real_evidence_kind_values():
    schema_kinds = set(_enum_at(_PRODUCTION_SCHEMA, "claims", "items", "evidence", "items", "kind"))
    assert schema_kinds == {k.value for k in EvidenceKind}


def test_tier_enum_matches_the_real_tier_values():
    schema_tiers = set(_enum_at(_PRODUCTION_SCHEMA, "claims", "items", "evidence", "items", "tier"))
    assert schema_tiers == {t.value for t in Tier}


def test_review_status_enum_matches_production_all_statuses():
    schema_statuses = set(_enum_at(_PRODUCTION_SCHEMA, "review", "status"))
    assert schema_statuses == set(production._ALL_STATUSES)


def test_status_min_enum_matches_production_status_order_excluding_retracted():
    schema_status_min = set(_INPUT_SCHEMA["properties"]["status_min"]["enum"])
    assert schema_status_min == set(production._STATUS_ORDER)
    assert "retracted" not in schema_status_min


def test_claim_stance_enum_matches_production_stance_map_keys():
    schema_stances = set(_enum_at(_PRODUCTION_SCHEMA, "claims", "items", "stance"))
    assert schema_stances == set(production._STANCE_MAP)


def test_author_role_enum_matches_the_apis_own_allowed_author_roles():
    schema_roles = set(_PRODUCTION_SCHEMA["properties"]["author_role"]["enum"])
    assert schema_roles == set(api._ALLOWED_AUTHOR_ROLES)


def test_prior_profile_enum_matches_the_apis_own_prior_profiles():
    schema_profiles = set(_INPUT_SCHEMA["properties"]["prior_profile"]["enum"])
    assert schema_profiles == set(api._PRIOR_PROFILES)


def test_llm_mode_enum_matches_the_apis_own_llm_modes():
    schema_modes = set(_INPUT_SCHEMA["properties"]["llm_mode"]["enum"])
    assert schema_modes == set(api._LLM_MODES)


def test_citation_type_enum_matches_the_apis_own_allowed_citation_types():
    schema_types = set(
        _enum_at(_PRODUCTION_SCHEMA, "claims", "items", "evidence", "items", "citations", "items", "type")
    )
    assert schema_types == set(api._ALLOWED_CITATION_TYPES)


# ---------------------------------------------------------------------------
# Every default `TOOL_DEFINITION` states by hand matches `hte.api`'s own.
# ---------------------------------------------------------------------------


def test_status_min_default_matches_the_apis_own_default():
    assert _INPUT_SCHEMA["properties"]["status_min"]["default"] == api.DEFAULT_STATUS_MIN


@pytest.mark.parametrize(
    ("field", "expected"),
    [("seeds", 1), ("max_hypotheses", 100), ("prior_profile", "consensus"), ("replay_only", False)],
)
def test_input_schema_default_matches_the_apis_own_hardcoded_default(field, expected):
    # `hte.api.hypothesize`'s own `request.get(field, expected)` calls are
    # the real defaults (`hte/api.py`); this pins the schema's copy of each
    # against the literal this test also names, so an edit to one without
    # the other fails here instead of silently drifting apart.
    assert _INPUT_SCHEMA["properties"][field]["default"] == expected


# ---------------------------------------------------------------------------
# `TOOL_DEFINITION`'s own schemas are themselves valid JSON Schema, and
# real data (every shipped fixture, a real `hypothesize()` response)
# validates against them via the real `jsonschema` library rather than the
# hand-rolled, enum-blind subset checker `tests/test_api.py` and `tests/
# test_serve.py` each already carry.
# ---------------------------------------------------------------------------


def test_input_schema_is_itself_a_valid_json_schema():
    jsonschema.Draft7Validator.check_schema(_INPUT_SCHEMA)


def test_output_schema_is_itself_a_valid_json_schema():
    jsonschema.Draft7Validator.check_schema(_OUTPUT_SCHEMA)


def test_every_shipped_production_fixture_validates_against_the_production_record_schema():
    for rec in production.load_raw():
        jsonschema.validate(instance=rec.to_dict(), schema=_PRODUCTION_SCHEMA)


def test_a_real_hypothesize_response_validates_against_the_full_input_and_output_schema(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    records = [p.to_dict() for p in production.load_raw()]
    request = {"productions": records, "status_min": "draft", "seeds": 1, "max_hypotheses": 20}
    jsonschema.validate(instance=request, schema=_INPUT_SCHEMA)
    response = api.hypothesize(request)
    jsonschema.validate(instance=response, schema=_OUTPUT_SCHEMA)
