import json
from types import SimpleNamespace

import pytest

from hte import batching, llm, roles
from hte.belief import Opinion
from hte.corpus import fixtures
from hte.generate import combinatorial_sample


def _hypotheses(n: int, seed: int = 0):
    corpus = fixtures.build()
    hyps = combinatorial_sample(corpus.vocab, list(range(4)), max_items=n, seed=seed)
    assert len(hyps) >= n, f"fixtures corpus only produced {len(hyps)} hypotheses, need {n}"
    return corpus, hyps[:n]


def _envelope(structured: dict) -> str:
    return json.dumps({"is_error": False, "structured_output": structured})


def _fake_run(responses: list[tuple[int, str]]):
    """A queue-backed stand-in for `subprocess.run`, the same shape
    `tests/test_llm.py`'s own helper uses."""
    calls: list[list[str]] = []

    def run(argv, capture_output, text, timeout):  # noqa: ARG001
        calls.append(argv)
        if not responses:
            raise AssertionError("subprocess.run called more times than expected")
        returncode, stdout = responses.pop(0)
        return SimpleNamespace(returncode=returncode, stdout=stdout, stderr="")

    run.calls = calls
    return run


@pytest.fixture(autouse=True)
def _real_llm_mode(monkeypatch):
    """Most tests below exercise `hte.batching`'s real (non-fake) path
    through their own `SimpleNamespace(run=...)` stand-in for `llm.
    subprocess`; `llm.complete` checks `HTE_LLM_MODE` before ever
    consulting that stand-in, so an ambient `HTE_LLM_MODE=fake` would
    silently reroute all of them to `hte.fakellm` instead. Pinning it
    unset here, rather than trusting the shell, keeps this file correct
    under `env -u HTE_LLM_MODE make test` and `HTE_LLM_MODE=fake make
    test` alike; the handful of tests below that want fake mode still
    call their own `monkeypatch.setenv("HTE_LLM_MODE", "fake")` on this
    same, shared `monkeypatch` fixture instance, layering their own
    setup on top of this one exactly as `tests/swarm3/conftest.py`'s own
    `fake_llm_mode`/override pair already does the other way around."""
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)


# --------------------------------------------------------------------------
# Fake mode: hte.fakellm has no batch-shaped stand-in, so every batch call
# falls back to single-item calls; the final results must still match a
# fully serial run item for item.
# --------------------------------------------------------------------------


def test_batch_critique_in_fake_mode_matches_serial(tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    corpus, hyps = _hypotheses(8)

    serial = [roles.critique(h, corpus.evidence, cache_dir=tmp_path, replay_only=False) for h in hyps]
    batched = batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert len(batched) == 8
    assert batched == serial


def test_batch_judge_in_fake_mode_matches_serial(tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    corpus, hyps = _hypotheses(8)
    opinions = {h.address: Opinion(b=0.2, d=0.1, u=0.7, a=0.5) for h in hyps}
    context = {"opinions": opinions}
    pairs = [(hyps[i], hyps[i + 1], context) for i in range(0, 8, 2)]

    serial = [roles.judge(a, b, context, cache_dir=tmp_path, replay_only=False) for a, b, _ in pairs]
    batched = batching.batch_judge(pairs, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert len(batched) == 4
    assert batched == serial


# --------------------------------------------------------------------------
# Multiple chunks run through hte.parallel.pmap (`bkt-hte-throughput`):
# batching cuts the call count, `workers` runs the resulting chunks
# concurrently, and the two compound rather than batching alone leaving
# the reduced chunk count to run one at a time. Order must still match a
# fully serial run regardless of which chunk's worker finishes first.
# --------------------------------------------------------------------------


def test_batch_critique_multiple_chunks_preserve_order_under_pmap(tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    corpus, hyps = _hypotheses(24)

    serial = [roles.critique(h, corpus.evidence, cache_dir=tmp_path, replay_only=False) for h in hyps]
    batched = batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False, workers=4)

    assert len(batched) == 24
    assert batched == serial


def test_batch_judge_multiple_chunks_preserve_order_under_pmap(tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    corpus, hyps = _hypotheses(24)
    opinions = {h.address: Opinion(b=0.2, d=0.1, u=0.7, a=0.5) for h in hyps}
    context = {"opinions": opinions}
    pairs = [(hyps[i], hyps[i + 1], context) for i in range(0, 24, 2)]

    serial = [roles.judge(a, b, context, cache_dir=tmp_path, replay_only=False) for a, b, _ in pairs]
    batched = batching.batch_judge(pairs, batch_size=8, cache_dir=tmp_path, replay_only=False, workers=4)

    assert len(batched) == 12
    assert batched == serial


def test_batch_critique_empty_input_returns_empty_list_no_pmap_call(tmp_path):
    assert batching.batch_critique([], [], batch_size=8, cache_dir=tmp_path) == []


def test_batch_judge_empty_input_returns_empty_list_no_pmap_call(tmp_path):
    assert batching.batch_judge([], batch_size=8, cache_dir=tmp_path) == []


# --------------------------------------------------------------------------
# Missing-id fallback: a batch response that leaves an id out entirely
# --------------------------------------------------------------------------


def test_batch_critique_missing_id_falls_back_to_single_call(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    fake = _fake_run([
        (0, _envelope({"results": [
            {"id": hyps[0].short_id, "keep": True, "issues": [], "rationale": "batch-ok"},
        ]})),
        (0, _envelope({"keep": False, "issues": ["fallback"], "rationale": "single-fallback"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out[0] == {"keep": True, "issues": [], "rationale": "batch-ok"}
    assert out[1] == {"keep": False, "issues": ["fallback"], "rationale": "single-fallback"}
    assert len(fake.calls) == 2


def test_batch_judge_missing_id_falls_back_to_single_call(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    context = {"opinions": {}}
    pairs = [(hyps[0], hyps[1], context)]
    fake = _fake_run([
        (0, _envelope({"results": []})),
        (0, _envelope({"p_a_wins": 0.75, "rationale": "single-fallback"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_judge(pairs, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out == [0.75]
    assert len(fake.calls) == 2


# --------------------------------------------------------------------------
# Refusal fallback (`bkt-hte-refusal-handling`, 2026-09-10): the whole
# batched call itself refuses (`claude -p` exits 1, `stop_reason="refusal"`
# in its own envelope). `_run_batch` catches `hte.llm.ModelRefusal` the
# same way it already catches any other batch-call failure (it is a
# subclass of `hte.llm.LLMError`), falling back to one single-item call
# per hypothesis/pair; a single-item call that also refuses takes `hte.
# roles`'s own per-role default rather than raising out of the batch.
# --------------------------------------------------------------------------


def _refusal_envelope() -> str:
    return json.dumps({
        "is_error": True, "stop_reason": "refusal", "session_id": "should-never-leak",
        "total_cost_usd": 0.01, "result": "API Error: can't help with this.",
    })


def test_batch_critique_refused_falls_back_to_single_calls(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    fake = _fake_run([
        (1, _refusal_envelope()),  # the batch call itself refuses
        (0, _envelope({"keep": True, "issues": [], "rationale": "single-ok-0"})),
        (0, _envelope({"keep": False, "issues": ["contradiction"], "rationale": "single-ok-1"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out[0] == {"keep": True, "issues": [], "rationale": "single-ok-0"}
    assert out[1] == {"keep": False, "issues": ["contradiction"], "rationale": "single-ok-1"}
    assert len(fake.calls) == 3
    assert "should-never-leak" not in json.dumps(out)


def test_batch_judge_refused_falls_back_to_single_calls(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    pairs = [(hyps[0], hyps[1], {"opinions": {}})]
    fake = _fake_run([
        (1, _refusal_envelope()),  # the batch call itself refuses
        (0, _envelope({"p_a_wins": 0.6, "rationale": "single-fallback"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_judge(pairs, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out == [0.6]
    assert len(fake.calls) == 2
    assert "should-never-leak" not in json.dumps(out)


def test_batch_critique_every_single_call_also_refused_defaults(tmp_path, monkeypatch):
    """The batch call and every single-item fallback call all refuse:
    `hte.roles.critique`'s own default (`keep=False`) absorbs each one,
    so `batch_critique` still returns `len(hyps)` results rather than
    raising."""
    corpus, hyps = _hypotheses(2)
    fake = _fake_run([
        (1, _refusal_envelope()),  # batch call refuses
        (1, _refusal_envelope()),  # single fallback for hyps[0] also refuses
        (1, _refusal_envelope()),  # single fallback for hyps[1] also refuses
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out[0]["keep"] is False
    assert out[1]["keep"] is False
    assert len(fake.calls) == 3
    assert "should-never-leak" not in json.dumps(out)


def test_batch_judge_every_single_call_also_refused_defaults(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    pairs = [(hyps[0], hyps[1], {"opinions": {}})]
    fake = _fake_run([
        (1, _refusal_envelope()),  # batch call refuses
        (1, _refusal_envelope()),  # single fallback also refuses
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_judge(pairs, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out == [0.5]  # hte.roles.judge's own refused default
    assert len(fake.calls) == 2
    assert "should-never-leak" not in json.dumps(out)


def test_batch_judge_truncated_falls_back_to_single_calls(tmp_path, monkeypatch):
    """The same fallback contract for `ModelTruncation` (`stop_reason=
    "max_tokens"`) rather than `ModelRefusal`."""
    corpus, hyps = _hypotheses(2)
    pairs = [(hyps[0], hyps[1], {"opinions": {}})]
    truncation_envelope = json.dumps({
        "is_error": True, "stop_reason": "max_tokens", "session_id": "should-never-leak",
        "total_cost_usd": 0.02, "result": "",
    })
    fake = _fake_run([
        (1, truncation_envelope),
        (0, _envelope({"p_a_wins": 0.4, "rationale": "single-fallback"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_judge(pairs, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out == [0.4]
    assert len(fake.calls) == 2


# --------------------------------------------------------------------------
# Malformed-entry fallback: an id present but missing a required key, or a
# duplicated id, or a non-list "results"
# --------------------------------------------------------------------------


def test_batch_critique_entry_missing_required_key_falls_back(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    fake = _fake_run([
        (0, _envelope({"results": [
            {"id": hyps[0].short_id, "keep": True, "issues": [], "rationale": "batch-ok"},
            {"id": hyps[1].short_id, "keep": False, "issues": ["bad"]},  # no "rationale"
        ]})),
        (0, _envelope({"keep": False, "issues": ["fallback"], "rationale": "single-fallback"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out[0] == {"keep": True, "issues": [], "rationale": "batch-ok"}
    assert out[1] == {"keep": False, "issues": ["fallback"], "rationale": "single-fallback"}
    assert len(fake.calls) == 2


def test_batch_critique_duplicate_id_falls_back(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    fake = _fake_run([
        (0, _envelope({"results": [
            {"id": hyps[0].short_id, "keep": True, "issues": [], "rationale": "first"},
            {"id": hyps[0].short_id, "keep": False, "issues": [], "rationale": "duplicate"},
        ]})),
        (0, _envelope({"keep": True, "issues": [], "rationale": "single-fallback-0"})),
        (0, _envelope({"keep": True, "issues": [], "rationale": "single-fallback-1"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False)

    # Neither hypothesis trusts the duplicated id; both fall back.
    assert out[0]["rationale"] == "single-fallback-0"
    assert out[1]["rationale"] == "single-fallback-1"
    assert len(fake.calls) == 3


def test_batch_critique_non_list_results_falls_back_whole_chunk(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    fake = _fake_run([
        (0, _envelope({"results": "not-an-array"})),
        (0, _envelope({"keep": True, "issues": [], "rationale": "single-fallback-0"})),
        (0, _envelope({"keep": False, "issues": [], "rationale": "single-fallback-1"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    out = batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False)

    assert out[0]["rationale"] == "single-fallback-0"
    assert out[1]["rationale"] == "single-fallback-1"
    assert len(fake.calls) == 3


# --------------------------------------------------------------------------
# Cache key: a batch call's cache key differs from a single-item call's
# --------------------------------------------------------------------------


def test_batch_critique_cache_key_distinct_from_single_call(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    fake = _fake_run([
        (0, _envelope({"keep": True, "issues": [], "rationale": "single"})),
        (0, _envelope({"results": [
            {"id": hyps[0].short_id, "keep": True, "issues": [], "rationale": "batch"},
            {"id": hyps[1].short_id, "keep": True, "issues": [], "rationale": "batch"},
        ]})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    roles.critique(hyps[0], corpus.evidence, cache_dir=tmp_path, replay_only=False)
    assert llm.cache_stats(tmp_path).files == 1

    batching.batch_critique(hyps, corpus.evidence, batch_size=8, cache_dir=tmp_path, replay_only=False)
    assert llm.cache_stats(tmp_path).files == 2  # a new cache file, distinct from the single call's


def test_batch_judge_cache_key_distinct_from_single_call(tmp_path, monkeypatch):
    corpus, hyps = _hypotheses(2)
    context = {"opinions": {}}
    fake = _fake_run([
        (0, _envelope({"p_a_wins": 0.6, "rationale": "single"})),
        (0, _envelope({"results": [
            {"id": "0", "p_a_wins": 0.6, "rationale": "batch"},
        ]})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))

    roles.judge(hyps[0], hyps[1], context, cache_dir=tmp_path, replay_only=False)
    assert llm.cache_stats(tmp_path).files == 1

    batching.batch_judge([(hyps[0], hyps[1], context)], batch_size=8, cache_dir=tmp_path, replay_only=False)
    assert llm.cache_stats(tmp_path).files == 2
