"""Property tests over `hte.llm`: `replay_only` never shells out on a
cache miss, and the cache key is a stable, pure function of `(model,
prompt)` regardless of how a caller's own dict-shaped prompt content was
built."""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from unittest import mock

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte import llm

SCHEMA = {"type": "object", "properties": {"greeting": {"type": "string"}}, "required": ["greeting"]}

model_names = st.text(alphabet="abcdefghijklmnop-", min_size=1, max_size=12)
prompt_texts = st.text(min_size=0, max_size=200)


# --------------------------------------------------------------------------
# replay_only=True never spawns a subprocess on a cache miss
# --------------------------------------------------------------------------


@given(model_names, prompt_texts)
def test_replay_only_never_spawns_a_subprocess_on_cache_miss(model, prompt):
    tmp = tempfile.mkdtemp()

    def fail_run(*a, **k):
        raise AssertionError("replay_only=True must never call subprocess.run")

    try:
        with mock.patch.object(subprocess, "run", fail_run):
            with pytest.raises(llm.LLMCacheMissError):
                llm.complete(prompt, role="critic", schema=SCHEMA, model=model, cache_dir=tmp, replay_only=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_replay_only_true_cache_hit_still_short_circuits_before_any_subprocess_check():
    tmp = tempfile.mkdtemp()
    try:
        key = llm._cache_key("sonnet", "hello")
        Path(tmp, f"{key}.json").write_text(json.dumps({
            "model": "sonnet", "role": "critic", "prompt_sha256": "x", "response": {"greeting": "cached"},
        }))

        def fail_run(*a, **k):
            raise AssertionError("a cache hit must never touch subprocess.run")

        with mock.patch.object(subprocess, "run", fail_run):
            result = llm.complete("hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp, replay_only=True)
        assert result == {"greeting": "cached"}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# --------------------------------------------------------------------------
# The cache key is a pure, stable function of (model, prompt)
# --------------------------------------------------------------------------


@given(model_names, prompt_texts)
def test_cache_key_is_deterministic_across_repeated_calls(model, prompt):
    assert llm._cache_key(model, prompt) == llm._cache_key(model, prompt)


@given(model_names, prompt_texts, prompt_texts)
def test_cache_key_changes_when_prompt_changes(model, prompt_a, prompt_b):
    if prompt_a == prompt_b:
        return
    assert llm._cache_key(model, prompt_a) != llm._cache_key(model, prompt_b)


@given(model_names, model_names, prompt_texts)
def test_cache_key_changes_when_model_changes(model_a, model_b, prompt):
    if model_a == model_b:
        return
    assert llm._cache_key(model_a, prompt) != llm._cache_key(model_b, prompt)


@given(st.dictionaries(st.text(alphabet="abcde", min_size=1, max_size=4), st.integers(min_value=0, max_value=9), min_size=1, max_size=6))
def test_cache_key_is_stable_across_dict_key_insertion_order(d):
    """A prompt built by embedding a schema-like dict via
    `json.dumps(..., sort_keys=True)` hashes identically regardless of the
    order its own keys were inserted in: `_cache_key` is a hash of the
    resulting prompt STRING, so once that string is order-independent
    (`sort_keys=True` normalizes it), the cache key built from it is too."""
    reordered = dict(reversed(list(d.items())))
    prompt_a = f"do the thing with schema {json.dumps(d, sort_keys=True)}"
    prompt_b = f"do the thing with schema {json.dumps(reordered, sort_keys=True)}"
    assert prompt_a == prompt_b  # sort_keys=True already normalizes the text itself
    assert llm._cache_key("sonnet", prompt_a) == llm._cache_key("sonnet", prompt_b)


def test_cache_key_excludes_role_and_schema():
    """Two calls differing only in `role` (and thus, in practice, in
    `schema`) hash identically: `_cache_key` reads only `model` and
    `prompt`, by design (README's own "deliberately excludes role and
    schema" note)."""
    k1 = llm._cache_key("sonnet", "same prompt")
    k2 = llm._cache_key("sonnet", "same prompt")
    assert k1 == k2


# --------------------------------------------------------------------------
# resolve_model / escalation_model
# --------------------------------------------------------------------------


def test_resolve_model_escalation_pseudo_role_matches_escalation_model():
    assert llm.resolve_model("escalation") == llm.escalation_model()


@given(st.text(alphabet="xyz", min_size=1, max_size=5))
def test_resolve_model_unknown_role_always_raises(role):
    from hte.llm import _model_policy

    if role in _model_policy()["roles"] or role == "escalation":
        return
    with pytest.raises(KeyError):
        llm.resolve_model(role)
