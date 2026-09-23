import json
import subprocess
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

def test_replay_only_cache_hit_never_spawns_a_subprocess(tmp_path):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    key = llm._cache_key("sonnet", "hello")
    (cache_dir / f"{key}.json").write_text(json.dumps({
        "model": "sonnet", "role": "critic", "prompt_sha256": "x", "response": {"greeting": "cached"},
    }))
    result = llm.complete(
        "hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=cache_dir, replay_only=True,
    )
    assert result == {"greeting": "cached"}

def test_complete_calls_cli_and_writes_cache(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(structured_output={"greeting": "hi"}))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    result = llm.complete("hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert result == {"greeting": "hi"}
    assert len(fake.calls) == 1

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

def test_refusal_on_nonzero_exit_raises_model_refusal(tmp_path, monkeypatch):
    fake = _fake_run([(1, _refusal_envelope())])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelRefusal):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
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

def test_refusal_is_cached_and_replay_reproduces_it(tmp_path, monkeypatch):
    fake = _fake_run([(1, _refusal_envelope(cost=0.02))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelRefusal) as live:
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, provenance=_PROVENANCE)
    assert _index_lines(tmp_path)[-1]["outcome"] == "refusal"

    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=_fake_run([])))
    with pytest.raises(llm.ModelRefusal) as replayed:
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, replay_only=True)
    assert replayed.value.cost_usd == live.value.cost_usd == pytest.approx(0.02)

    default = {"greeting": "defaulted"}
    results = llm.complete_many(
        ["hi"], role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, replay_only=True, default=default,
    )
    assert results == [default]

def test_timeout_raises_llm_timeout_error_and_records_stats(tmp_path, monkeypatch, caplog):
    llm.reset_stats()

    def run(argv, capture_output, text, timeout):  # noqa: ARG001 - matches subprocess.run's call shape
        raise subprocess.TimeoutExpired(cmd=argv, timeout=timeout)

    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=run, TimeoutExpired=subprocess.TimeoutExpired))
    caplog.set_level("ERROR", logger="hte.llm")
    with pytest.raises(llm.LLMTimeoutError):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, timeout=5)
    assert llm.stats()["critic"]["timeouts"] == 1
    assert list(Path(tmp_path).glob("*.json")) == []
    assert any("timed out after 5s" in r.getMessage() and "prompt length" in r.getMessage() for r in caplog.records)

def test_extractor_gets_a_longer_timeout_from_the_policy(tmp_path, monkeypatch):
    assert llm.resolve_timeout("extractor") > llm.resolve_timeout("critic") == llm.DEFAULT_TIMEOUT_S

    seen_timeouts = []

    def run(argv, capture_output, text, timeout):
        seen_timeouts.append(timeout)
        return SimpleNamespace(returncode=0, stdout=_envelope(structured_output={"greeting": "hi"}), stderr="")

    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=run))
    llm.complete("hi", role="extractor", schema=SCHEMA, model="haiku", cache_dir=tmp_path)
    assert seen_timeouts == [llm.resolve_timeout("extractor")]

def _selective_refusal_run(refuse_marker: str):
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
    llm.reset_stats()
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)
    fake = _selective_refusal_run("REFUSE")
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    prompts = ["ok-0", "REFUSE-1", "ok-2", "ok-3"]
    default = {"greeting": "defaulted"}
    results = llm.complete_many(
        prompts, role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, default=default,
    )
    assert results == [{"greeting": "ok-0"}, default, {"greeting": "ok-2"}, {"greeting": "ok-3"}]
    assert llm.stats()["critic"]["refusals"] >= 1
    for cache_file in Path(tmp_path).glob("*.json"):
        assert "REFUSE" not in cache_file.read_text()

def test_complete_many_without_default_still_raises(tmp_path, monkeypatch):
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)
    fake = _selective_refusal_run("REFUSE")
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.ModelRefusal):
        llm.complete_many(
            ["ok-0", "REFUSE-1"], role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path,
        )

def _invocation_failure_run(fail_marker: str):
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
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)
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

_SECRET_PROMPT = "Rayleigh scattering bends the light of the sky more steeply, PROMPT-SECRET-MARKER-9f3c"

_PROVENANCE = {"source_ids": ["src-a"], "production_ids": ["prod-a"], "learner_ids": ["learner-a"]}

def _index_lines(cache_dir) -> list[dict]:
    path = Path(cache_dir) / "index.jsonl"
    if not path.is_file():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def test_complete_with_provenance_appends_one_index_line_on_a_fresh_call(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(structured_output={"greeting": "hi"}))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    llm.complete(_SECRET_PROMPT, role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, provenance=_PROVENANCE)

    lines = _index_lines(tmp_path)
    assert len(lines) == 1
    assert lines[0]["role"] == "critic"
    assert lines[0]["source_ids"] == ["src-a"]
    assert lines[0]["production_ids"] == ["prod-a"]
    assert lines[0]["learner_ids"] == ["learner-a"]
    assert lines[0]["cache_key"] == llm._cache_key("sonnet", _SECRET_PROMPT)

def test_complete_with_provenance_appends_again_on_a_cache_hit(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(structured_output={"greeting": "hi"}))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    llm.complete(_SECRET_PROMPT, role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, provenance=_PROVENANCE)

    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=_fake_run([])))
    llm.complete(_SECRET_PROMPT, role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, provenance=_PROVENANCE)

    lines = _index_lines(tmp_path)
    assert len(lines) == 2, "a repeat use of a cached answer is still one more attributable use"
    assert {ln["cache_key"] for ln in lines} == {llm._cache_key("sonnet", _SECRET_PROMPT)}

def test_complete_without_provenance_writes_no_index_at_all(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(structured_output={"greeting": "hi"}))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    llm.complete("hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)
    assert not (Path(tmp_path) / "index.jsonl").is_file()

def test_fake_mode_with_provenance_never_creates_cache_dir(tmp_path):
    never_created = tmp_path / "never-created"
    result = llm.complete(
        "hello", role="critic", schema=SCHEMA, cache_dir=never_created, mode="fake", provenance=_PROVENANCE,
    )
    assert result
    assert not never_created.exists()

def test_replay_only_cache_hit_with_provenance_never_writes_the_index(tmp_path):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    key = llm._cache_key("sonnet", "hello")
    (cache_dir / f"{key}.json").write_text(json.dumps({
        "model": "sonnet", "role": "critic", "prompt_sha256": "x", "response": {"greeting": "cached"},
    }))
    result = llm.complete(
        "hello", role="critic", schema=SCHEMA, model="sonnet", cache_dir=cache_dir,
        replay_only=True, provenance=_PROVENANCE,
    )
    assert result == {"greeting": "cached"}
    assert not (cache_dir / "index.jsonl").exists()

def test_index_never_contains_the_prompt_text(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(structured_output={"greeting": "hi"}))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    llm.complete(_SECRET_PROMPT, role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path, provenance=_PROVENANCE)

    raw = (Path(tmp_path) / "index.jsonl").read_text()
    assert "PROMPT-SECRET-MARKER-9f3c" not in raw
    assert "Rayleigh" not in raw
    lines = _index_lines(tmp_path)
    assert set(lines[0]) == {"cache_key", "role", "recorded_at", "source_ids", "production_ids", "learner_ids"}

def test_complete_many_with_provenance_writes_one_index_line_per_prompt(tmp_path, monkeypatch):
    monkeypatch.setattr(parallel_module.time, "sleep", lambda s: None)
    fake = _fake_run([
        (0, _envelope(structured_output={"greeting": "a"})),
        (0, _envelope(structured_output={"greeting": "b"})),
    ])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    llm.complete_many(
        ["prompt-one", "prompt-two"], role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path,
        provenance=_PROVENANCE,
    )
    lines = _index_lines(tmp_path)
    assert len(lines) == 2
    assert {ln["cache_key"] for ln in lines} == {
        llm._cache_key("sonnet", "prompt-one"), llm._cache_key("sonnet", "prompt-two"),
    }
