import threading
import time

import pytest

from hte import llm, parallel

_FAST_BACKOFF = (0.001, 0.002)


# --------------------------------------------------------------------------
# pmap: ordering
# --------------------------------------------------------------------------


def test_pmap_preserves_input_order_regardless_of_completion_order():
    def fn(x: int) -> int:
        # Item 0 sleeps longest, so completion order is roughly 4,3,2,1,0.
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
    # Item 0 sleeps far longer than 1 or 2, so it finishes last.
    assert result[-1] == 0


def test_pmap_empty_items_returns_empty_list():
    assert parallel.pmap(lambda x: x, [], workers=4) == []


# --------------------------------------------------------------------------
# pmap: per-item retry with exponential backoff
# --------------------------------------------------------------------------


def test_pmap_retries_per_item_then_succeeds():
    calls = {"n": 0}

    def fn(x: int) -> str:
        calls["n"] += 1
        if calls["n"] < 3:
            raise ValueError("transient")
        return "ok"

    result = parallel.pmap(fn, [1], workers=1, retries=2, backoff=_FAST_BACKOFF)
    assert result == ["ok"]
    assert calls["n"] == 3  # one initial attempt + two retries


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


# --------------------------------------------------------------------------
# pmap: RateLimit is a global pause across every worker
# --------------------------------------------------------------------------


def test_pmap_rate_limit_pauses_then_continues_the_same_item():
    calls = {"n": 0}

    def fn(x: int) -> int:
        calls["n"] += 1
        if calls["n"] == 1:
            raise parallel.RateLimit("limited", reset_hint="retry after 1s")
        return x

    result = parallel.pmap(fn, [1], workers=1, backoff=_FAST_BACKOFF)
    assert result == [1]
    assert calls["n"] == 2  # the pause did not count against retries


def test_pmap_aborts_after_max_rate_limit_pauses_naming_the_reset_hint():
    def fn(x: int) -> int:
        raise parallel.RateLimit("still limited", reset_hint="reset in 30 minutes")

    with pytest.raises(parallel.RateLimitAborted) as exc_info:
        parallel.pmap(fn, [1, 2, 3], workers=2, backoff=_FAST_BACKOFF, max_rate_limit_pauses=2)
    assert "reset in 30 minutes" in str(exc_info.value)


def test_pmap_cached_llm_rate_limit_marker_is_pmaps_rate_limit():
    """`hte.llm.RateLimit` is `hte.parallel.RateLimit` re-exported, so a
    caller catching one catches the other."""
    assert llm.RateLimit is parallel.RateLimit


# --------------------------------------------------------------------------
# pmap: worker count
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# Integration: hte.llm.complete_many over hte.parallel.pmap
# --------------------------------------------------------------------------


def test_complete_many_matches_serial_and_stays_fast(tmp_path, monkeypatch):
    """64 fake critiques through `complete_many` with 4 workers: same
    results as calling `complete()` once per prompt in sequence, and
    fast, since fake mode makes no subprocess call at all."""
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    schema = {
        "type": "object",
        "properties": {"keep": {"type": "boolean"}, "issues": {"type": "array"}, "rationale": {"type": "string"}},
        "required": ["keep", "issues", "rationale"],
    }

    def _prompt(i: int) -> str:
        # A shape `hte.fakellm._critic` parses: present support for even
        # i, empty support for odd i, so results vary by item.
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
