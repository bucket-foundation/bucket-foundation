"""`hte.fakellm.complete` returns schema-valid JSON for every role, even
against an adversarial prompt (empty, unicode-heavy, or 100 KB), and every
function it dispatches to is a pure, deterministic function of `(role,
prompt)` alone.
"""
from __future__ import annotations

import jsonschema
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hte import fakellm
from hte.roles import (
    CRITIQUE_SCHEMA,
    EXTRACT_SCHEMA,
    GENERATE_SCHEMA,
    JUDGE_SCHEMA,
    META_REVIEW_SCHEMA,
    PRESERVATION_CRITIQUE_SCHEMA,
    SELF_REPORT_SCHEMA,
    UNKNOWN_UNKNOWN_SCHEMA,
)

_ROLE_SCHEMA: dict[str, dict] = {
    "generator": GENERATE_SCHEMA,
    "critic": CRITIQUE_SCHEMA,
    "unknown_unknown": UNKNOWN_UNKNOWN_SCHEMA,
    "preservation_critic": PRESERVATION_CRITIQUE_SCHEMA,
    "judge": JUDGE_SCHEMA,
    "meta_review": META_REVIEW_SCHEMA,
    "self_report": SELF_REPORT_SCHEMA,
    "extractor": EXTRACT_SCHEMA,
    "escalation": EXTRACT_SCHEMA,
}

_ROLES = tuple(_ROLE_SCHEMA)

roles_st = st.sampled_from(_ROLES)


def _assert_schema_valid(role: str, response: dict) -> None:
    schema = _ROLE_SCHEMA[role]
    jsonschema.validate(instance=response, schema=schema)


# --------------------------------------------------------------------------
# Schema validity under a broad fuzz of prompt text, every role
# --------------------------------------------------------------------------


@given(role=roles_st, prompt=st.text(max_size=2000))
@settings(max_examples=300)
def test_complete_returns_schema_valid_json_for_arbitrary_text(role, prompt):
    response = fakellm.complete(prompt, role=role, schema=_ROLE_SCHEMA[role])
    _assert_schema_valid(role, response)


@given(role=roles_st, prompt=st.text(alphabet=st.characters(min_codepoint=0x0, max_codepoint=0x10FFFF, blacklist_categories=("Cs",)), max_size=500))
@settings(max_examples=300)
def test_complete_returns_schema_valid_json_for_unicode_text(role, prompt):
    """Every role's stand-in, against text drawn from the full Unicode
    range (surrogates excluded, `Cs`, since a lone surrogate is not valid
    UTF-8 and `role.encode('utf-8')`/`prompt.encode('utf-8')` inside
    `_rng_for` would raise on one before this module's own logic runs at
    all)."""
    response = fakellm.complete(prompt, role=role, schema=_ROLE_SCHEMA[role])
    _assert_schema_valid(role, response)


# --------------------------------------------------------------------------
# The three named adversarial corner cases: empty, unicode-heavy, 100 KB
# --------------------------------------------------------------------------


@pytest.mark.parametrize("role", _ROLES)
def test_complete_handles_empty_prompt(role):
    response = fakellm.complete("", role=role, schema=_ROLE_SCHEMA[role])
    _assert_schema_valid(role, response)


@pytest.mark.parametrize("role", _ROLES)
def test_complete_handles_unicode_heavy_prompt(role):
    prompt = "квант 量子 🜁🜂🜃🜄 " * 200 + "actor=אב action=中文 year=1900 [☃]"
    response = fakellm.complete(prompt, role=role, schema=_ROLE_SCHEMA[role])
    _assert_schema_valid(role, response)


@pytest.mark.parametrize("role", _ROLES)
def test_complete_handles_100kb_prompt(role):
    prompt = ("Document:\n" + "the quick brown fox jumps over the lazy dog. " * 2300)
    assert len(prompt.encode("utf-8")) >= 100_000
    response = fakellm.complete(prompt, role=role, schema=_ROLE_SCHEMA[role])
    _assert_schema_valid(role, response)


@pytest.mark.parametrize("role", _ROLES)
def test_complete_handles_100kb_unicode_prompt(role):
    prompt = "量子力学の歴史について説明してください。" * 3000
    assert len(prompt.encode("utf-8")) >= 100_000
    response = fakellm.complete(prompt, role=role, schema=_ROLE_SCHEMA[role])
    _assert_schema_valid(role, response)


# --------------------------------------------------------------------------
# Purity / determinism: identical (role, prompt) always gives an identical
# response, in this process, with no unseeded random.random() anywhere
# (the module's own docstring contract).
# --------------------------------------------------------------------------


@given(role=roles_st, prompt=st.text(max_size=500))
@settings(max_examples=300)
def test_complete_is_deterministic_for_the_same_role_and_prompt(role, prompt):
    first = fakellm.complete(prompt, role=role, schema=_ROLE_SCHEMA[role])
    second = fakellm.complete(prompt, role=role, schema=_ROLE_SCHEMA[role])
    assert first == second


@given(prompt=st.text(max_size=500))
@settings(max_examples=300)
def test_complete_unknown_role_raises_keyerror(prompt):
    with pytest.raises(KeyError):
        fakellm.complete(prompt, role="not-a-real-role", schema={})
