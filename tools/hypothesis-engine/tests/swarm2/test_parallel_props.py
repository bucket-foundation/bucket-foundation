"""Property tests for `hte.parallel.pmap`: order preservation under random
per-item delays, `on_error="skip"` dropping exactly the failing items, and
a `RateLimit` raised by every item aborting after the configured pauses
without hanging.
"""
from __future__ import annotations

import time

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hte import parallel

_FAST_BACKOFF = (0.001, 0.002)


# --------------------------------------------------------------------------
# pmap preserves order under random per-item delays
# --------------------------------------------------------------------------


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
    """The same items map to the same ordered output regardless of how
    many workers `pmap` is given (1 vs a pool), since `ordered=True`
    (the default) reindexes results by the input's own position,
    regardless of completion order."""
    def fn(pair: tuple[int, float]) -> int:
        idx, delay = pair
        time.sleep(delay)
        return idx * 2

    items = list(enumerate(delays))
    serial = parallel.pmap(fn, items, workers=1, backoff=_FAST_BACKOFF)
    parallel_result = parallel.pmap(fn, items, workers=4, backoff=_FAST_BACKOFF)
    assert serial == parallel_result == [i * 2 for i in range(len(delays))]


# --------------------------------------------------------------------------
# on_error="skip" drops exactly the failing items
# --------------------------------------------------------------------------


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
    """`on_error="default"` never drops an item (unlike `"skip"`): the
    output list is always exactly as long as the input, with a sentinel
    default in every failing item's own slot."""
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


# --------------------------------------------------------------------------
# A RateLimit raised by every item aborts after the configured pauses,
# without hanging (tiny backoffs, bounded wall time).
# --------------------------------------------------------------------------


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
    # Tiny backoff (<=0.002s per pause, doubling, capped at backoff[1]) times
    # a bounded pause count: this must never approach a real hang.
    assert elapsed < 5.0
    assert exc_info.value.pauses >= 1 or max_pauses == 0
    assert exc_info.value.reset_hint == "retry after 1s"


@given(n_items=st.integers(min_value=1, max_value=3))
@settings(max_examples=300, deadline=None)
def test_pmap_rate_limit_recovering_items_within_budget_complete(n_items):
    """When the number of items that ever raise `RateLimit` (each exactly
    once, then succeeding) sits AT OR UNDER `max_rate_limit_pauses`, the
    whole call still completes: this is the companion case to
    FINDING-2026-09-10-101 (`tests/swarm2/test_parallel_props.py::
    test_finding_2026_09_10_101_*` below), confirming the budget is not
    exhausted purely by being non-empty, only by being exceeded."""
    calls = {i: 0 for i in range(n_items)}

    def fn(x: int) -> int:
        calls[x] += 1
        if calls[x] == 1:
            raise parallel.RateLimit("rate limited once")
        return x

    result = parallel.pmap(fn, list(range(n_items)), workers=1, backoff=_FAST_BACKOFF, max_rate_limit_pauses=3)
    assert result == list(range(n_items))


# --------------------------------------------------------------------------
# configure(): worker count is always clamped to [1, MAX_WORKERS]
# --------------------------------------------------------------------------


@given(workers=st.integers(min_value=-10, max_value=1000))
@settings(max_examples=300)
def test_configure_always_clamps_into_bounds(workers):
    n = parallel.configure(workers)
    assert parallel.DEFAULT_WORKERS >= 1
    assert 1 <= n <= parallel.MAX_WORKERS


# --------------------------------------------------------------------------
# FINDING-2026-09-10-101 (see tests/swarm/FINDINGS-2026-09-10.md):
# RESOLVED. `_RateLimitGate`'s pause counter now counts CONSECUTIVE
# pauses with no item's own success in between: `_RateLimitGate.
# record_success`, called once per successful `fn(item)` return
# (whether or not that item itself was ever paused), resets the counter
# to 0, replacing the previous lifetime, cumulative count of every
# `RateLimit` occurrence across the whole `pmap` call. A batch where a
# handful of DIFFERENT items each hit `RateLimit` exactly once (and
# succeed immediately on their own retry) now completes, serially
# (workers=1) and with no concurrency involved, since each item's own
# success resets the counter before the next item's own pause can add
# to it.
# --------------------------------------------------------------------------


def test_finding_2026_09_10_101_transient_per_item_rate_limits_no_longer_abort_the_whole_call():
    """4 items, each raising `RateLimit` exactly once and succeeding on
    its own next attempt, `workers=1` (no concurrency involved),
    `max_rate_limit_pauses=3` (the default, fewer than the 4 total
    occurrences this input produces). Every item completes: each one's
    own success (`_RateLimitGate.record_success`) resets the shared
    consecutive-pause counter to 0 before the next item's own pause is
    registered, so the 4 occurrences never accumulate past 1 at any one
    time. `on_error`/`retries` are irrelevant here: `RateLimit` is caught
    ahead of both, per `_run_one`'s own branch order.
    """
    calls = {i: 0 for i in range(4)}

    def fn(x: int) -> int:
        calls[x] += 1
        if calls[x] == 1:
            raise parallel.RateLimit("rate limited once")
        return x

    result = parallel.pmap(fn, list(range(4)), workers=1, backoff=_FAST_BACKOFF, max_rate_limit_pauses=3)
    assert result == [0, 1, 2, 3]
