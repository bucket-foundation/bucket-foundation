import json
from types import SimpleNamespace

import pytest

from hte import llm


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


def test_complete_is_error_envelope_raises_invocation_error(tmp_path, monkeypatch):
    fake = _fake_run([(0, _envelope(result="refused", is_error=True))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    with pytest.raises(llm.LLMInvocationError):
        llm.complete("hi", role="critic", schema=SCHEMA, model="sonnet", cache_dir=tmp_path)


def test_cache_stats_counts_files(tmp_path):
    assert llm.cache_stats(tmp_path / "missing").files == 0
    (tmp_path / "a.json").write_text("{}")
    (tmp_path / "b.json").write_text("{}")
    stats = llm.cache_stats(tmp_path)
    assert stats.files == 2
    assert stats.total_bytes == 4
