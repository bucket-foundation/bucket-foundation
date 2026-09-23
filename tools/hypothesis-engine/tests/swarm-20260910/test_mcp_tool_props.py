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
    node = schema
    for key in path:
        node = node["items"] if key == "items" else node["properties"][key]
    return node["enum"]

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

def test_status_min_default_matches_the_apis_own_default():
    assert _INPUT_SCHEMA["properties"]["status_min"]["default"] == api.DEFAULT_STATUS_MIN

@pytest.mark.parametrize(
    ("field", "expected"),
    [("seeds", 1), ("max_hypotheses", 100), ("prior_profile", "consensus"), ("replay_only", False)],
)
def test_input_schema_default_matches_the_apis_own_hardcoded_default(field, expected):
    assert _INPUT_SCHEMA["properties"][field]["default"] == expected

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
