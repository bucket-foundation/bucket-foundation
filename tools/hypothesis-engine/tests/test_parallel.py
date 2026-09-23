import threading
import time

import pytest

from hte import llm, parallel

_FAST_BACKOFF = (0.001, 0.002)

def test_pmap_preserves_input_order_regardless_of_completion_order():
    def fn(x: int) -> int:
        time.sleep(0.01 * (5 - x))
        return x * 2

    result = parallel.pmap(fn, [0, 1, 2, 3, 4], workers=4, backoff=_FAST_BACKOFF)
    assert result == [0, 2, 4, 6, 8]

def test_pmap_ordered_false_returns_completion_order():
    def fn(x: int) -> int:
        time.sleep(0.05 if x == 0 else 0.001)
        return x

    result = parallel.pmap(fn, [0, 1, 2], workers=3, ordered=False, backoff=_FAST_BACKOFF)
    assert set(result) == {0, 1, 2}
    assert result[-1] == 0

def test_pmap_empty_items_returns_empty_list():
    assert parallel.pmap(lambda x: x, [], workers=4) == []

def test_pmap_retries_per_item_then_succeeds():
    calls = {"n": 0}

    def fn(x: int) -> str:
        calls["n"] += 1
        if calls["n"] < 3:
            raise ValueError("transient")
        return "ok"

    result = parallel.pmap(fn, [1], workers=1, retries=2, backoff=_FAST_BACKOFF)
    assert result == ["ok"]
    assert calls["n"] == 3

def test_pmap_on_error_raise_propagates_after_retries_exhausted():
    def fn(x: int) -> int:
        raise ValueError("always fails")

    with pytest.raises(ValueError, match="always fails"):
        parallel.pmap(fn, [1], workers=1, retries=1, backoff=_FAST_BACKOFF)

def test_pmap_on_error_skip_drops_the_failed_item():
    def fn(x: int) -> int:
        if x == 1:
            raise ValueError("bad item")
        return x

    result = parallel.pmap(fn, [0, 1, 2], workers=1, retries=0, on_error="skip", backoff=_FAST_BACKOFF)
    assert result == [0, 2]

def test_pmap_on_error_default_fills_a_placeholder():
    def fn(x: int) -> int:
        if x == 1:
            raise ValueError("bad item")
        return x

    result = parallel.pmap(
        fn, [0, 1, 2], workers=1, retries=0, on_error="default", default=-1, backoff=_FAST_BACKOFF,
    )
    assert result == [0, -1, 2]

def test_pmap_rejects_unknown_on_error():
    with pytest.raises(ValueError, match="on_error"):
        parallel.pmap(lambda x: x, [1], on_error="ignore")

class _Expected(Exception):
    pass

class _Unexpected(Exception):
    pass

def test_pmap_default_exceptions_none_defaults_every_exception_type():
    def fn(x: int) -> int:
        if x == 1:
            raise _Unexpected("an infra failure")
        return x

    result = parallel.pmap(
        fn, [0, 1, 2], workers=1, retries=0, on_error="default", default=-1, backoff=_FAST_BACKOFF,
    )
    assert result == [0, -1, 2]

def test_pmap_default_exceptions_defaults_an_allowed_type():
    def fn(x: int) -> int:
        if x == 1:
            raise _Expected("a benign, expected case")
        return x

    result = parallel.pmap(
        fn, [0, 1, 2], workers=1, retries=0, on_error="default", default=-1,
        default_exceptions=(_Expected,), backoff=_FAST_BACKOFF,
    )
    assert result == [0, -1, 2]

def test_pmap_default_exceptions_propagates_a_disallowed_type_instead_of_defaulting():
    def fn(x: int) -> int:
        if x == 1:
            raise _Unexpected("a real infra failure, not a benign case")
        return x

    with pytest.raises(_Unexpected, match="a real infra failure"):
        parallel.pmap(
            fn, [0, 1, 2], workers=1, retries=0, on_error="default", default=-1,
            default_exceptions=(_Expected,), backoff=_FAST_BACKOFF,
        )

def test_pmap_default_exceptions_still_retries_a_disallowed_type_before_propagating():
    calls = {"n": 0}

    def fn(x: int) -> int:
        calls["n"] += 1
        if calls["n"] < 3:
            raise _Unexpected("transient")
        return 99

    result = parallel.pmap(
        fn, [1], workers=1, retries=2, on_error="default", default=-1,
        default_exceptions=(_Expected,), backoff=_FAST_BACKOFF,
    )
    assert result == [99]
    assert calls["n"] == 3

def test_pmap_rate_limit_pauses_then_continues_the_same_item():
    calls = {"n": 0}

    def fn(x: int) -> int:
        calls["n"] += 1
        if calls["n"] == 1:
            raise parallel.RateLimit("limited", reset_hint="retry after 1s")
        return x

    result = parallel.pmap(fn, [1], workers=1, backoff=_FAST_BACKOFF)
    assert result == [1]
    assert calls["n"] == 2

def test_pmap_aborts_after_max_rate_limit_pauses_naming_the_reset_hint():
    def fn(x: int) -> int:
        raise parallel.RateLimit("still limited", reset_hint="reset in 30 minutes")

    with pytest.raises(parallel.RateLimitAborted) as exc_info:
        parallel.pmap(fn, [1, 2, 3], workers=2, backoff=_FAST_BACKOFF, max_rate_limit_pauses=2)
    assert "reset in 30 minutes" in str(exc_info.value)

def test_pmap_cached_llm_rate_limit_marker_is_pmaps_rate_limit():
    assert llm.RateLimit is parallel.RateLimit

def test_pmap_respects_the_requested_worker_count():
    active = {"n": 0, "max": 0}
    lock = threading.Lock()

    def fn(x: int) -> int:
        with lock:
            active["n"] += 1
            active["max"] = max(active["max"], active["n"])
        time.sleep(0.03)
        with lock:
            active["n"] -= 1
        return x

    parallel.pmap(fn, list(range(10)), workers=3, backoff=_FAST_BACKOFF)
    assert active["max"] <= 3

def test_configure_default_reads_env_and_clamps_to_hard_cap(monkeypatch):
    monkeypatch.delenv("HTE_LLM_WORKERS", raising=False)
    assert parallel.configure() == parallel.DEFAULT_WORKERS

    monkeypatch.setenv("HTE_LLM_WORKERS", "2")
    assert parallel.configure() == 2

    monkeypatch.setenv("HTE_LLM_WORKERS", "99")
    assert parallel.configure() == parallel.MAX_WORKERS

def test_configure_explicit_argument_wins_and_is_clamped():
    assert parallel.configure(1) == 1
    assert parallel.configure(20) == parallel.MAX_WORKERS
    assert parallel.configure(0) == 1

def test_complete_many_matches_serial_and_stays_fast(tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    schema = {
        "type": "object",
        "properties": {"keep": {"type": "boolean"}, "issues": {"type": "array"}, "rationale": {"type": "string"}},
        "required": ["keep", "issues", "rationale"],
    }

    def _prompt(i: int) -> str:
        support = f"- (textual, T3) 'evidence-{i}' [ev-{i}]" if i % 2 == 0 else ""
        return (
            f"Critique hypothesis {i}.\n\n"
            f"Supporting evidence:\n{support}\n\n"
            "Refuting evidence:\n"
        )

    prompts = [_prompt(i) for i in range(64)]

    serial = [llm.complete(p, role="critic", schema=schema, cache_dir=tmp_path) for p in prompts]

    start = time.monotonic()
    parallel_result = llm.complete_many(prompts, role="critic", schema=schema, cache_dir=tmp_path, workers=4)
    elapsed = time.monotonic() - start

    assert parallel_result == serial
    assert elapsed < 2.0
