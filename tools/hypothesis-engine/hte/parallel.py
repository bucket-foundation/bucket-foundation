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

    def __init__(self, message: str, *, reset_hint: str | None = None) -> None:
        super().__init__(message)
        self.reset_hint = reset_hint

class RateLimitAborted(RuntimeError):

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
    if workers is None:
        raw = os.environ.get(_WORKERS_ENV)
        workers = int(raw) if raw else DEFAULT_WORKERS
    return max(1, min(MAX_WORKERS, int(workers)))

class _RateLimitGate:

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
        with self._lock:
            self._pauses = 0

    @property
    def pauses(self) -> int:
        with self._lock:
            return self._pauses

class _Skip:
    pass

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
    default_exceptions: tuple[type[BaseException], ...] | None,
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
        except Exception as exc:
            attempt += 1
            if attempt <= retries:
                time.sleep(_delay_for(backoff, attempt))
                continue
            if on_error == "raise":
                raise
            if on_error == "skip":
                return _SKIP
            if default_exceptions is not None and not isinstance(exc, default_exceptions):
                raise
            return default
        else:
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
    default_exceptions: tuple[type[BaseException], ...] | None = None,
    max_rate_limit_pauses: int = 3,
) -> list[R]:
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
                on_error=on_error, default=default, default_exceptions=default_exceptions,
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
