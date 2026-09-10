"""A thread-pool `pmap` for the engine loop's per-hypothesis `claude -p`
calls (critic, preservation critique, judge), each 20-40 seconds and, in
`hte.runner.run_campaign` today, called strictly one at a time.

`pmap` maps a function over a list of items through a
`concurrent.futures.ThreadPoolExecutor`, preserving input order by
default, retrying a failed item with exponential backoff, and treating
`RateLimit` (below) as a signal to pause every worker rather than fail
the one item that raised it. Nothing here calls `hte.llm` or knows what a
hypothesis is: `hte.runner`/`hte.roles` wire this module in by passing it
a plain callable, the same shape `map()` itself would take.
"""
from __future__ import annotations

import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable, Iterable, Sequence, TypeVar

T = TypeVar("T")
R = TypeVar("R")

DEFAULT_WORKERS = 4
MAX_WORKERS = 8
_WORKERS_ENV = "HTE_LLM_WORKERS"

_ON_ERROR_MODES = ("raise", "skip", "default")


class RateLimit(Exception):
    """Raised by `hte.llm.complete` when the `claude` CLI's stdout or
    stderr carries a 429, "rate limit", "spend limit", or "usage limit"
    marker. `pmap` catches this exception itself, rather than treating it
    as an ordinary per-item failure: every worker pauses for the same
    backoff window before the item that raised it is retried.

    `reset_hint` carries whatever human-readable reset time or window the
    CLI's own error text named ("retry after 3600 seconds", "resets in 2
    hours", ...), or `None` when it named none. `hte.llm`'s own detector
    fills this in when it can; nothing in this module tries to parse a
    hint out of a message that does not already carry one.
    """

    def __init__(self, message: str, *, reset_hint: str | None = None) -> None:
        super().__init__(message)
        self.reset_hint = reset_hint


class RateLimitAborted(RuntimeError):
    """`pmap` raises this once `max_rate_limit_pauses` CONSECUTIVE pauses
    (no item's own success in between any of them, `FINDING-2026-09-10-
    101`'s own fix) have fired inside one call and the rate limit still
    has not cleared. The message names the pause count and, when the CLI
    printed one, the reset hint carried on the `RateLimit` that triggered
    the last pause, so a caller reading this from a log line knows how
    long to wait before rerunning the campaign."""

    def __init__(self, pauses: int, reset_hint: str | None) -> None:
        hint = f" The CLI's own reset hint: {reset_hint}." if reset_hint else ""
        super().__init__(
            f"pmap aborted after {pauses} consecutive rate-limit pause(s) with "
            f"no item's own success in between, its configured maximum for "
            f"this call.{hint} Wait for the limit to clear and rerun; every "
            "item already cached by a prior attempt replays for free and is "
            "not recomputed."
        )
        self.pauses = pauses
        self.reset_hint = reset_hint


def configure(workers: int | None = None) -> int:
    """Resolve a worker count for one `pmap` call. An explicit `workers`
    argument wins; `None` falls back to the `HTE_LLM_WORKERS` environment
    variable, then to `DEFAULT_WORKERS`. Every path is clamped to
    `[1, MAX_WORKERS]`: more than `MAX_WORKERS` concurrent `claude -p`
    subprocesses is not a configuration this package supports, so a
    larger request is honored only up to the cap rather than rejected."""
    if workers is None:
        raw = os.environ.get(_WORKERS_ENV)
        workers = int(raw) if raw else DEFAULT_WORKERS
    return max(1, min(MAX_WORKERS, int(workers)))


class _RateLimitGate:
    """State one `pmap` call's workers share to coordinate a global
    pause: any worker hitting `RateLimit` extends `_paused_until` for
    every worker, not only itself, and increments the shared pause count.
    A worker past `max_pauses` is told to abort instead of pausing again.

    Fixed 2026-09-10 (`FINDING-2026-09-10-101`): `_pauses` counts
    CONSECUTIVE pauses with no progress in between, reset by any success
    rather than accumulated as a lifetime total across the whole call.
    `record_success()` resets it to `0` whenever ANY item completes,
    evidence the account is not currently rate-limited: four different
    items each hitting `RateLimit`
    exactly once and succeeding on their own immediate retry no longer
    exhausts a budget of 3 just by being four separate occurrences: each
    one's own success resets the counter before the next pause adds to
    it. A rate limit that never clears (every item keeps failing, no
    success ever resets the counter) still aborts once `max_pauses`
    consecutive pauses land with no success between them, `pmap`'s own
    documented purpose for this budget.
    """

    def __init__(self, backoff: tuple[float, float], max_pauses: int) -> None:
        self._lo, self._hi = backoff
        self._max_pauses = max_pauses
        self._lock = threading.Lock()
        self._pauses = 0
        self._paused_until = 0.0
        self.reset_hint: str | None = None

    def wait_if_paused(self) -> None:
        while True:
            with self._lock:
                remaining = self._paused_until - time.monotonic()
            if remaining <= 0:
                return
            time.sleep(min(remaining, 1.0))

    def pause(self, reset_hint: str | None) -> bool:
        """Register one `RateLimit` hit. Returns `True` (the caller sleeps
        then retries the same item) while the CONSECUTIVE pause count
        (no success anywhere since the last reset) is at or under
        `max_pauses`; returns `False` once it is exhausted, telling the
        caller to abort instead."""
        with self._lock:
            self._pauses += 1
            if reset_hint:
                self.reset_hint = reset_hint
            if self._pauses > self._max_pauses:
                return False
            delay = min(self._hi, self._lo * (2 ** (self._pauses - 1)))
            self._paused_until = max(self._paused_until, time.monotonic() + delay)
            return True

    def record_success(self) -> None:
        """Called once per item that returns without raising, whether
        or not that item itself was ever paused: any such completion
        is evidence the shared rate limit is not currently active, so
        the consecutive-pause counter resets to `0` rather than carrying
        an unrelated item's earlier pause forward against the budget."""
        with self._lock:
            self._pauses = 0

    @property
    def pauses(self) -> int:
        with self._lock:
            return self._pauses


class _Skip:
    """A sentinel one worker returns for an `on_error="skip"` item, so
    `pmap`'s own assembly step can drop it from the final list without
    confusing a legitimate `None` result for a dropped one."""


_SKIP = _Skip()


def _delay_for(backoff: tuple[float, float], attempt: int) -> float:
    lo, hi = backoff
    return min(hi, lo * (2 ** (attempt - 1)))


def _run_one(
    fn: Callable[[T], R],
    item: T,
    *,
    gate: _RateLimitGate,
    retries: int,
    backoff: tuple[float, float],
    on_error: str,
    default: R | None,
) -> Any:
    attempt = 0
    while True:
        gate.wait_if_paused()
        try:
            result = fn(item)
        except RateLimit as exc:
            if not gate.pause(exc.reset_hint):
                raise RateLimitAborted(gate.pauses, gate.reset_hint) from exc
            gate.wait_if_paused()
            continue
        except Exception:
            attempt += 1
            if attempt <= retries:
                time.sleep(_delay_for(backoff, attempt))
                continue
            if on_error == "raise":
                raise
            if on_error == "skip":
                return _SKIP
            return default
        else:
            # A real `fn(item)` success, first attempt or after a
            # rate-limit pause: evidence the shared limit has cleared,
            # `FINDING-2026-09-10-101`'s own fix (`_RateLimitGate.
            # record_success`). An `on_error="skip"`/`"default"` outcome
            # above is a failure this item gave up on and does not reach
            # this branch.
            gate.record_success()
            return result


def pmap(
    fn: Callable[[T], R],
    items: Sequence[T] | Iterable[T],
    *,
    workers: int | None = 4,
    ordered: bool = True,
    retries: int = 2,
    backoff: tuple[float, float] = (5, 30),
    on_error: str = "raise",
    default: R | None = None,
    max_rate_limit_pauses: int = 3,
) -> list[R]:
    """`fn` mapped over `items`, `workers` at a time (`configure`'s own
    clamp applies, so a `workers` above `MAX_WORKERS` is silently capped
    rather than rejected).

    `ordered=True` (the default) returns results in `items`' own order;
    `ordered=False` returns them in whichever order they finished, useful
    only when a caller reads the list as an unordered batch and wants to
    skip the bookkeeping order preservation costs nothing to skip.

    A raised exception other than `RateLimit` gets `retries` more
    attempts (`retries=2` means up to 3 tries total), waiting
    `min(backoff[1], backoff[0] * 2**(attempt-1))` seconds between them.
    An item still failing after every retry is handled by `on_error`:
    `"raise"` (the default) re-raises the item's own last exception out
    of `pmap` itself; `"skip"` drops that item from the returned list
    (which then carries fewer entries than `items`); `"default"` fills
    `default` in that item's place instead.

    `RateLimit` is not a per-item failure: every worker pauses for a
    shared backoff window (the same `backoff` bounds, scaled by how many
    CONSECUTIVE pauses this call has made since its last success) before
    the item that raised it is retried, uncounted against its own
    `retries` budget. `max_rate_limit_pauses` counts consecutive pauses
    with no item's own success in between any of them (`FINDING-2026-09-
    10-101`'s own fix, 2026-09-10): any item that completes, whether or
    not it was ever paused itself, resets that count to `0`,
    since a fresh success is evidence the shared limit is not currently
    active. Once `max_rate_limit_pauses` such CONSECUTIVE pauses have
    fired with no success between them and the exception keeps
    recurring, `pmap` raises `RateLimitAborted` naming the CLI's own
    reset hint when one was seen.
    """
    if on_error not in _ON_ERROR_MODES:
        raise ValueError(f"pmap: on_error must be one of {_ON_ERROR_MODES}, got {on_error!r}")

    item_list = list(items)
    if not item_list:
        return []

    n_workers = configure(workers)
    gate = _RateLimitGate(backoff, max_rate_limit_pauses)
    results: list[Any] = [None] * len(item_list)
    completion_order: list[int] = []

    with ThreadPoolExecutor(max_workers=n_workers) as pool:
        futures = {
            pool.submit(
                _run_one, fn, item, gate=gate, retries=retries, backoff=backoff,
                on_error=on_error, default=default,
            ): idx
            for idx, item in enumerate(item_list)
        }
        try:
            for future in as_completed(futures):
                idx = futures[future]
                results[idx] = future.result()
                completion_order.append(idx)
        except BaseException:
            pool.shutdown(wait=False, cancel_futures=True)
            raise

    ordered_results = results if ordered else [results[i] for i in completion_order]
    return [r for r in ordered_results if r is not _SKIP]


__all__ = [
    "pmap", "configure", "RateLimit", "RateLimitAborted",
    "DEFAULT_WORKERS", "MAX_WORKERS",
]
