"""`hte.batching.batch_critique`/`batch_judge`: exactly one result per
input, in order, for a range of batch sizes; a duplicated id in the
model's own batch reply falls back to a single-item call for that one id;
and an empty input returns an empty list.
"""
from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hte import batching, llm, roles
from hte.belief import Opinion
from hte.corpus import fixtures
from hte.generate import combinatorial_sample

_BATCH_SIZES = (1, 7, 8, 9, 64)


def _hypotheses(n: int, seed: int = 0):
    corpus = fixtures.build()
    hyps = combinatorial_sample(corpus.vocab, list(range(6)), max_items=max(n, 64), seed=seed)
    assert len(hyps) >= n, f"fixtures corpus only produced {len(hyps)} hypotheses, need {n}"
    return corpus, hyps[:n]


def _envelope(structured: dict) -> str:
    return json.dumps({"is_error": False, "structured_output": structured})


def _fake_run(responses: list[tuple[int, str]]):
    calls: list[list[str]] = []

    def run(argv, capture_output, text, timeout):  # noqa: ARG001
        calls.append(argv)
        if not responses:
            raise AssertionError("subprocess.run called more times than expected")
        returncode, stdout = responses.pop(0)
        return SimpleNamespace(returncode=returncode, stdout=stdout, stderr="")

    run.calls = calls
    return run


# --------------------------------------------------------------------------
# One entry per input, in order, across batch sizes 1, 7, 8, 9, 64
# (fake mode: hte.fakellm has no batch stand-in, so every chunk falls back
# to single-item calls, still served by fakellm's own per-role stand-ins;
# this is the documented fake-mode contract, tests/test_batching.py's own
# precedent, generalized here across every requested batch size).
# --------------------------------------------------------------------------


@given(batch_size=st.sampled_from(_BATCH_SIZES))
@settings(max_examples=300)
def test_batch_critique_one_result_per_input_in_order(tmp_path_factory, batch_size):
    n = 20
    corpus, hyps = _hypotheses(n)
    cache_dir = tmp_path_factory.mktemp("batch-critique-cache")

    with pytest.MonkeyPatch().context() as mp:
        mp.setenv("HTE_LLM_MODE", "fake")
        serial = [roles.critique(h, corpus.evidence, cache_dir=cache_dir, replay_only=False) for h in hyps]
        batched = batching.batch_critique(hyps, corpus.evidence, batch_size=batch_size, cache_dir=cache_dir, replay_only=False)

    assert len(batched) == n
    assert batched == serial


@given(batch_size=st.sampled_from(_BATCH_SIZES))
@settings(max_examples=300)
def test_batch_judge_one_result_per_input_in_order(tmp_path_factory, batch_size):
    n = 20
    corpus, hyps = _hypotheses(n)
    opinions = {h.address: Opinion(b=0.2, d=0.1, u=0.7, a=0.5) for h in hyps}
    context = {"opinions": opinions}
    pairs = [(hyps[i], hyps[(i + 1) % n], context) for i in range(n)]
    cache_dir = tmp_path_factory.mktemp("batch-judge-cache")

    with pytest.MonkeyPatch().context() as mp:
        mp.setenv("HTE_LLM_MODE", "fake")
        serial = [roles.judge(a, b, context, cache_dir=cache_dir, replay_only=False) for a, b, _ in pairs]
        batched = batching.batch_judge(pairs, batch_size=batch_size, cache_dir=cache_dir, replay_only=False)

    assert len(batched) == n
    assert batched == serial


# --------------------------------------------------------------------------
# Empty input returns an empty list
# --------------------------------------------------------------------------


def test_batch_critique_empty_input_returns_empty_list(tmp_path):
    assert batching.batch_critique([], [], batch_size=8, cache_dir=tmp_path, replay_only=False) == []


def test_batch_judge_empty_input_returns_empty_list(tmp_path):
    assert batching.batch_judge([], batch_size=8, cache_dir=tmp_path, replay_only=False) == []


# --------------------------------------------------------------------------
# A duplicated id in the model's own batch reply falls back to a
# single-item call for that one id alone; every other id in the same
# chunk still trusts its own batch answer.
# --------------------------------------------------------------------------


@given(data=st.data(), n=st.integers(min_value=2, max_value=6))
@settings(max_examples=300)
def test_batch_critique_duplicated_id_falls_back_for_only_that_id(tmp_path_factory, data, n):
    corpus, hyps = _hypotheses(n)
    dup_index = data.draw(st.integers(min_value=0, max_value=n - 1))

    batch_results = []
    for i, h in enumerate(hyps):
        entry = {"id": h.short_id, "keep": (i % 2 == 0), "issues": [], "rationale": f"batch-{i}"}
        batch_results.append(entry)
        if i == dup_index:
            # A second entry for the same id, differing content: this must
            # make BOTH occurrences untrusted (`_validated_entries`' own
            # "repeated in it" rule), not just silently pick one.
            batch_results.append({"id": h.short_id, "keep": not entry["keep"], "issues": ["dup"], "rationale": "dup-entry"})

    fallback_rationale = "single-item-fallback"
    responses = [(0, _envelope({"results": batch_results}))]
    responses.append((0, _envelope({"keep": True, "issues": [], "rationale": fallback_rationale})))
    fake = _fake_run(responses)
    cache_dir = tmp_path_factory.mktemp("dup-critique-cache")

    with pytest.MonkeyPatch().context() as mp:
        mp.setattr(llm, "subprocess", SimpleNamespace(run=fake))
        out = batching.batch_critique(hyps, corpus.evidence, batch_size=n, cache_dir=cache_dir, replay_only=False)

    assert len(out) == n
    for i, result in enumerate(out):
        if i == dup_index:
            assert result["rationale"] == fallback_rationale
        else:
            assert result["rationale"] == f"batch-{i}"
    assert len(fake.calls) == 2  # one batch call, one single-item fallback


@given(data=st.data(), n=st.integers(min_value=2, max_value=6))
@settings(max_examples=300)
def test_batch_judge_duplicated_id_falls_back_for_only_that_id(tmp_path_factory, data, n):
    corpus, hyps = _hypotheses(n)
    dup_index = data.draw(st.integers(min_value=0, max_value=n - 1))
    context = {"opinions": {}}
    pairs = [(hyps[i], hyps[(i + 1) % n], context) for i in range(n)]

    batch_results = []
    for i in range(n):
        lid = str(i)
        entry = {"id": lid, "p_a_wins": 0.1 * (i + 1), "rationale": f"batch-{i}"}
        batch_results.append(entry)
        if i == dup_index:
            batch_results.append({"id": lid, "p_a_wins": 0.99, "rationale": "dup-entry"})

    fallback_value = 0.42
    responses = [(0, _envelope({"results": batch_results}))]
    responses.append((0, _envelope({"p_a_wins": fallback_value, "rationale": "single-item-fallback"})))
    fake = _fake_run(responses)
    cache_dir = tmp_path_factory.mktemp("dup-judge-cache")

    with pytest.MonkeyPatch().context() as mp:
        mp.setattr(llm, "subprocess", SimpleNamespace(run=fake))
        out = batching.batch_judge(pairs, batch_size=n, cache_dir=cache_dir, replay_only=False)

    assert len(out) == n
    for i, value in enumerate(out):
        if i == dup_index:
            assert value == fallback_value
        else:
            assert value == 0.1 * (i + 1)
    assert len(fake.calls) == 2
