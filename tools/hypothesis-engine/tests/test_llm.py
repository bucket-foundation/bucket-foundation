import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from hte import llm
from hte import parallel as parallel_module


def _envelope(*, structured_output=None, result=None, is_error=False) -> str:
    payload = {"is_error": is_error}
    if structured_output is not None:
        payload["structured_output"] = structured_output
    if result is not None:
        payload["result"] = result
    return json.dumps(payload)


def _fake_run(responses):
    """A queue-backed stand-in for `subprocess.run`: each call pops the
    next canned `(returncode, stdout)` pair, raising `AssertionError` if
    the queue runs dry (a test asserting the CLI is called exactly N
    times)."""
    calls = []

    def run(argv, capture_output, text, timeout):  # noqa: ARG001 - matches subprocess.run's call shape
        calls.append(argv)
        if not responses:
            raise AssertionError("subprocess.run called more times than expected")
        returncode, stdout = responses.pop(0)
        return SimpleNamespace(returncode=returncode, stdout=stdout, stderr="")

    run.calls = calls
    return run


SCHEMA = {"type": "object", "properties": {"greeting": {"type": "string"}}, "required": ["greeting"]}


def _refusal_envelope(*, session_id="ff3c243b-secret", cost=0.0145, stop_reason="refusal", result=None) -> str:
    """A stand-in for the incident envelope (`campaign-production.log`,
    2026-09-10): `stop_reason` set, `is_error=True`, exit code 1, and a
    `session_id`/`uuid` this test asserts never survive into any typed
    exception or logged artifact."""
    payload = {
        "is_error": True,
        "stop_reason": stop_reason,
        "session_id": session_id,
        "uuid": "31ea5510-secret-event",
        "total_cost_usd": cost,
        "result": result if result is not None else "API Error: Sonnet 5 can't help with this.",
    }
    return json.dumps(payload)


@pytest.fixture(autouse=True)
def _real_llm_mode(monkeypatch):
    """Every test below exercises `llm.complete`'s real (non-fake)
    dispatch machinery through its own `SimpleNamespace(run=...)` stand-
    in for `llm.subprocess`; `complete()` checks `HTE_LLM_MODE` before it
    ever looks at that stand-in (`resolved_mode = mode if mode is not
    None else os.environ.get("HTE_LLM_MODE")`), so an `HTE_LLM_MODE=fake`
    left set in the ambient shell would silently reroute every one of
    them to `hte.fakellm` instead. Pinning it unset here, rather than
    trusting the shell, is what keeps this file's own tests correct
    under `env -u HTE_LLM_MODE make test` and `HTE_LLM_MODE=fake make
    test` alike."""
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)


def test_resolve_model_reads_policy():
    assert llm.resolve_model("critic") == "sonnet"
    assert llm.resolve_model("extractor") == "haiku"
    assert llm.escalation_model() == "opus"
    assert llm.resolve_model("escalation") == "opus"


def test_resolve_model_unknown_role_raises():
    with pytest.raises(KeyError):
        llm.resolve_model("not-a-role")


def test_cache_hit_never_calls_subprocess(tmp_path, monkeypatch):
    cache_dir = tmp_path / "cache"
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=_fake_run([])))
    key = llm._cache_key("sonnet", "hello")
    (cache_dir).mkdir()
    (cache_dir / f"{key}.json").write_text(json.dumps({
        "model": "sonnet", "role": "critic", "prompt_sha256": "x",
        "response": {"greeting": "cached"},
    }))
    result = llm.complete("hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=cache_dir)
    assert result == {"greeting": "cached"}


def test_replay_only_cache_miss_raises(tmp_path):
    with pytest.raises(llm.LLMCacheMissError):
        llm.complete("hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, replay_only=True)


def test_complete_calls_cli_and_writes_cache(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(structured_output={"greeting": "hi"}))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    result = llm.complete("hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert result == {"greeting": "hi"}
    assert len(fake.calls) == 1

    # A second call with the identical (model, prompt) must not shell out again.
    fake2 = _fake_run([])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake2))
    result2 = llm.complete("hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert result2 == {"greeting": "hi"}


def test_complete_parses_result_field_when_no_structured_output(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(result=json.dumps({"greeting": "from-result"})))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    result = llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert result == {"greeting": "from-result"}


def test_complete_retries_once_on_invalid_json_then_succeeds(tmp_path, monkeypatch):
    fake = _fake_run([
        (0, _envelope(result="not json at all")),
        (0, _envelope(structured_output={"greeting": "recovered"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    result = llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert result == {"greeting": "recovered"}
    assert len(fake.calls) == 2


def test_complete_raises_after_one_failed_retry(tmp_path, monkeypatch):
    fake = _fake_run([
        (0, _envelope(result="not json")),
        (0, _envelope(result="still not json")),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.LLMInvalidResponseError):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert len(fake.calls) == 2


def test_complete_missing_required_key_is_invalid(tmp_path, monkeypatch):
    fake = _fake_run([
        (0, _envelope(structured_output={"not_greeting": "x"})),
        (0, _envelope(structured_output={"not_greeting": "y"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.LLMInvalidResponseError):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)


def test_complete_nonzero_exit_raises_invocation_error(tmp_path, monkeypatch):
    fake = _fake_run([(1, "boom")])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.LLMInvocationError):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)


def test_strip_id_like_tokens_redacts_uuid_key_value_and_bare_hex():
    text = (
        'uuid=11111111-2222-3333-4444-555555555555 and session_id: "deadbeefcafefeed" '
        "plus a bare " + "a" * 40
    )
    redacted = llm._strip_id_like_tokens(text)
    assert "11111111-2222-3333-4444-555555555555" not in redacted
    assert "deadbeefcafefeed" not in redacted
    assert "a" * 40 not in redacted
    assert "<redacted-id>" in redacted


def test_complete_nonzero_exit_stderr_excerpt_redacts_ids_and_logs_server_side(tmp_path, monkeypatch, caplog):
    # `_invoke_cli`'s "no refusal/truncation match" branch (a nonzero
    # exit with no parseable JSON envelope on either stream) still
    # interpolates a bounded excerpt of whatever plain-text `claude -p`
    # printed; that excerpt must have any id-shaped token redacted
    # (`_strip_id_like_tokens`) before it reaches `LLMInvocationError`'s
    # own message, and the raw failure must be logged server-side (`hte.
    # llm`'s own logger), the one place in the call chain that ever saw
    # it (`hte.roles`'s `_with_refusal_default` passes a non-refusal
    # exception through unchanged, so nothing downstream logs it either).
    session_id = "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f6a7b8"
    stderr_text = f"fatal: auth failed for session_id={session_id}"

    def run(argv, capture_output, text, timeout):  # noqa: ARG001 - matches subprocess.run's call shape
        return SimpleNamespace(returncode=1, stdout="", stderr=stderr_text)

    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=run))
    caplog.set_level("ERROR", logger="hte.llm")
    with pytest.raises(llm.LLMInvocationError) as excinfo:
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)

    message = str(excinfo.value)
    assert session_id not in message
    assert "<redacted-id>" in message
    assert all(session_id not in record.getMessage() for record in caplog.records)
    assert any("claude -p exited" in record.getMessage() for record in caplog.records)


def test_complete_is_error_envelope_raises_invocation_error(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(result="refused", is_error=True))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.LLMInvocationError):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)


# --------------------------------------------------------------------------
# refusal/truncation classification (`bkt-hte-refusal-handling`, 2026-09-10)
# --------------------------------------------------------------------------
#
# Reproduces the production incident: `claude -p` exits 1 for a refusal,
# with its own JSON envelope (`stop_reason="refusal"`, `session_id`,
# `total_cost_usd`, ...) still on stdout. Before this fix, `_invoke_cli`
# only parsed stdout on a zero exit code, so the refusal fell through to
# `LLMInvocationError(f"claude -p exited {code}: {stderr or stdout}")`,
# folding the entire raw envelope, `session_id` included, into the
# exception's own message, which then reached `run.log` verbatim in the
# uncaught traceback that aborted the campaign.


def test_refusal_on_nonzero_exit_raises_model_refusal(tmp_path, monkeypatch):
    fake = _fake_run([(1, _refusal_envelope())])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelRefusal):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    # No corrective retry for a refusal: retrying with the identical
    # content only refuses again.
    assert len(fake.calls) == 1


def test_model_refusal_envelope_has_no_session_identifiers(tmp_path, monkeypatch):
    fake = _fake_run([(1, _refusal_envelope())])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelRefusal) as excinfo:
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    exc = excinfo.value
    assert exc.role == "critic"
    assert exc.cost_usd == pytest.approx(0.0145)
    assert "session_id" not in exc.envelope
    assert "uuid" not in exc.envelope
    assert exc.envelope["stop_reason"] == "refusal"
    # Nothing about the exception's own printed form carries the session
    # id or account-identifying text either.
    assert "secret" not in str(exc)
    assert "session_id" not in str(exc)


def test_model_refusal_records_stats(tmp_path, monkeypatch):
    llm.reset_stats()
    fake = _fake_run([(1, _refusal_envelope())])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelRefusal):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    stats = llm.stats()
    assert stats["critic"]["refusals"] == 1
    assert stats["critic"]["truncations"] == 0


def test_model_refusal_does_not_write_cache(tmp_path, monkeypatch):
    fake = _fake_run([(1, _refusal_envelope())])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelRefusal):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert list(Path(tmp_path).glob("*.json")) == []


def test_max_tokens_stop_reason_raises_model_truncation(tmp_path, monkeypatch):
    fake = _fake_run([(0, _refusal_envelope(stop_reason="max_tokens", result="partial output"))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelTruncation) as excinfo:
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert excinfo.value.reason == "max_tokens"


def test_empty_result_raises_model_truncation(tmp_path, monkeypatch):
    payload = json.dumps({"is_error": False, "result": ""})
    fake = _fake_run([(0, payload)])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelTruncation) as excinfo:
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert excinfo.value.reason == "empty_result"


def _selective_refusal_run(refuse_marker: str):
    """A `subprocess.run` stand-in that refuses every call whose prompt
    (`argv[2]`, `claude -p <prompt>`) contains `refuse_marker`, and
    otherwise echoes the prompt back as a normal successful completion.
    Not queue-backed (unlike `_fake_run`): `hte.parallel.pmap`'s own
    retries call this an unpredictable number of times per item, and a
    refusing prompt should keep refusing across every one of them."""
    calls = []

    def run(argv, capture_output, text, timeout):  # noqa: ARG001
        calls.append(argv)
        prompt = argv[2]
        if refuse_marker in prompt:
            return SimpleNamespace(returncode=1, stdout=_refusal_envelope(), stderr="")
        return SimpleNamespace(
            returncode=0, stdout=_envelope(structured_output={"greeting": prompt}), stderr="",
        )

    run.calls = calls
    return run


def test_complete_many_default_absorbs_one_refusal(tmp_path, monkeypatch):
    """`bkt-hte-refusal-handling`: one of N prompts refuses on every
    attempt; `complete_many(..., default=...)` still returns N results,
    N-1 real and one substituted default, rather than raising out of the
    whole call."""
    llm.reset_stats()
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)  # skip pmap's own retry backoff
    fake = _selective_refusal_run("REFUSE")
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    prompts = ["ok-0", "REFUSE-1", "ok-2", "ok-3"]
    default = {"greeting": "defaulted"}
    results = llm.complete_many(
        prompts, role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, default=default,
    )
    assert results == [{"greeting": "ok-0"}, default, {"greeting": "ok-2"}, {"greeting": "ok-3"}]
    assert llm.stats()["critic"]["refusals"] >= 1
    # No cache entry, and no leaked envelope content, from the refused prompt.
    for cache_file in Path(tmp_path).glob("*.json"):
        assert "REFUSE" not in cache_file.read_text()


def test_complete_many_without_default_still_raises(tmp_path, monkeypatch):
    """The prior, opt-in-only behavior: `complete_many` with no `default`
    still propagates a refusal out of the whole call, exactly as any
    other unhandled exception did before this fix."""
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)  # skip pmap's own retry backoff
    fake = _selective_refusal_run("REFUSE")
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelRefusal):
        llm.complete_many(
            ["ok-0", "REFUSE-1"], role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path,
        )


def _invocation_failure_run(fail_marker: str):
    """A `subprocess.run` stand-in that fails every attempt at one
    prompt with a plain nonzero exit and no JSON envelope at all (an
    `LLMInvocationError`, a plain invocation bug, no refusal or
    truncation stop reason anywhere in it), and otherwise echoes the
    prompt back as a normal successful completion."""
    calls = []

    def run(argv, capture_output, text, timeout):  # noqa: ARG001
        calls.append(argv)
        prompt = argv[2]
        if fail_marker in prompt:
            return SimpleNamespace(returncode=1, stdout="", stderr="boom: not a refusal, a real failure")
        return SimpleNamespace(
            returncode=0, stdout=_envelope(structured_output={"greeting": prompt}), stderr="",
        )

    run.calls = calls
    return run


def test_complete_many_default_does_not_absorb_a_non_refusal_failure(tmp_path, monkeypatch):
    # Silent-failures review finding 1 (`hte/parallel.py` `pmap`'s old
    # broad `except Exception:` under `on_error="default"`): a prompt
    # failing for a reason other than `ModelRefusal`/`ModelTruncation`
    # (here, a plain nonzero exit with no refusal envelope, the shape a
    # missing `claude` CLI or a malformed-JSON-on-both-attempts failure
    # would also take) must propagate out of `complete_many(...,
    # default=...)` as itself, an unabsorbed failure distinct from an
    # ordinary, expected refusal.
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)  # skip pmap's own retry backoff
    fake = _invocation_failure_run("BOOM")
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.LLMInvocationError, match="not a refusal"):
        llm.complete_many(
            ["ok-0", "BOOM-1"], role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path,
            default={"greeting": "defaulted"},
        )


def test_cache_stats_counts_files(tmp_path):
    assert llm.cache_stats(tmp_path / "missing").files == 0
    (tmp_path / "a.json").write_text("{}")
    (tmp_path / "b.json").write_text("{}")
    stats = llm.cache_stats(tmp_path)
    assert stats.files == 2
    assert stats.total_bytes == 4
