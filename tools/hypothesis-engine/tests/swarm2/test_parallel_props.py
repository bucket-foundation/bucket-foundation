from __future__ import annotations

import time

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hte import parallel

_FAST_BACKOFF = (0.001, 0.002)

@given(
    delays=st.lists(st.floats(min_value=0.0, max_value=0.02, allow_nan=False), min_size=0, max_size=12),
)
@settings(max_examples=300)
def test_pmap_preserves_order_under_random_per_item_delays(delays):
    def fn(pair: tuple[int, float]) -> int:
        idx, delay = pair
        time.sleep(delay)
        return idx

    items = list(enumerate(delays))
    result = parallel.pmap(fn, items, workers=4, backoff=_FAST_BACKOFF)
    assert result == list(range(len(delays)))

@given(delays=st.lists(st.floats(min_value=0.0, max_value=0.01, allow_nan=False), min_size=1, max_size=8))
@settings(max_examples=300)
def test_pmap_ordered_output_independent_of_worker_count(delays):
    def fn(pair: tuple[int, float]) -> int:
        idx, delay = pair
        time.sleep(delay)
        return idx * 2

    items = list(enumerate(delays))
    serial = parallel.pmap(fn, items, workers=1, backoff=_FAST_BACKOFF)
    parallel_result = parallel.pmap(fn, items, workers=4, backoff=_FAST_BACKOFF)
    assert serial == parallel_result == [i * 2 for i in range(len(delays))]

@given(
    fail_flags=st.lists(st.booleans(), min_size=1, max_size=15),
)
@settings(max_examples=300)
def test_pmap_on_error_skip_drops_exactly_the_failing_items(fail_flags):
    def fn(pair: tuple[int, bool]) -> int:
        idx, should_fail = pair
        if should_fail:
            raise ValueError(f"item {idx} fails by design")
        return idx

    items = list(enumerate(fail_flags))
    result = parallel.pmap(fn, items, workers=4, retries=0, on_error="skip", backoff=_FAST_BACKOFF)
    expected = [idx for idx, should_fail in items if not should_fail]
    assert result == expected

@given(fail_flags=st.lists(st.booleans(), min_size=1, max_size=15))
@settings(max_examples=300)
def test_pmap_on_error_default_keeps_item_count_and_marks_failures(fail_flags):
    SENTINEL = object()

    def fn(pair: tuple[int, bool]) -> int:
        idx, should_fail = pair
        if should_fail:
            raise ValueError("fails by design")
        return idx

    items = list(enumerate(fail_flags))
    result = parallel.pmap(fn, items, workers=4, retries=0, on_error="default", default=SENTINEL, backoff=_FAST_BACKOFF)
    assert len(result) == len(items)
    for (idx, should_fail), got in zip(items, result):
        if should_fail:
            assert got is SENTINEL
        else:
            assert got == idx

@given(max_pauses=st.integers(min_value=0, max_value=4), n_items=st.integers(min_value=1, max_value=6))
@settings(max_examples=300, deadline=None)
def test_pmap_rate_limit_every_item_aborts_after_configured_pauses(max_pauses, n_items):
    def fn(x: int) -> int:
        raise parallel.RateLimit("rate limited", reset_hint="retry after 1s")

    start = time.monotonic()
    with pytest.raises(parallel.RateLimitAborted) as exc_info:
        parallel.pmap(
            fn, list(range(n_items)), workers=min(4, n_items),
            backoff=_FAST_BACKOFF, max_rate_limit_pauses=max_pauses,
        )
    elapsed = time.monotonic() - start
    assert elapsed < 5.0
    assert exc_info.value.pauses >= 1 or max_pauses == 0
    assert exc_info.value.reset_hint == "retry after 1s"

@given(n_items=st.integers(min_value=1, max_value=3))
@settings(max_examples=300, deadline=None)
def test_pmap_rate_limit_recovering_items_within_budget_complete(n_items):
    calls = {i: 0 for i in range(n_items)}

    def fn(x: int) -> int:
        calls[x] += 1
        if calls[x] == 1:
            raise parallel.RateLimit("rate limited once")
        return x

    result = parallel.pmap(fn, list(range(n_items)), workers=1, backoff=_FAST_BACKOFF, max_rate_limit_pauses=3)
    assert result == list(range(n_items))

@given(workers=st.integers(min_value=-10, max_value=1000))
@settings(max_examples=300)
def test_configure_always_clamps_into_bounds(workers):
    n = parallel.configure(workers)
    assert parallel.DEFAULT_WORKERS >= 1
    assert 1 <= n <= parallel.MAX_WORKERS

def test_finding_2026_09_10_101_transient_per_item_rate_limits_no_longer_abort_the_whole_call():
    calls = {i: 0 for i in range(4)}

    def fn(x: int) -> int:
        calls[x] += 1
        if calls[x] == 1:
            raise parallel.RateLimit("rate limited once")
        return x

    result = parallel.pmap(fn, list(range(4)), workers=1, backoff=_FAST_BACKOFF, max_rate_limit_pauses=3)
    assert result == [0, 1, 2, 3]
