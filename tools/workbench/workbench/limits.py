from __future__ import annotations

import threading
import time

from .registry import Tool

RATES = {"read": 60, "write": 10, "remote": 2}


def rate_class(tool: Tool) -> str:
    if tool.scope in ("gdrive", "repo"):
        return "remote"
    if tool.scope == "read":
        return "read"
    return "write"


class RateLimited(RuntimeError):
    def __init__(self, retry_after: float):
        super().__init__(f"rate limited, retry after {retry_after:.1f}s")
        self.retry_after = retry_after


class RateLimiter:
    def __init__(self, rates: dict | None = None, clock=time.monotonic):
        self.rates = dict(RATES, **(rates or {}))
        self.clock = clock
        self._buckets: dict[tuple[str, str], tuple[float, float]] = {}
        self._lock = threading.Lock()

    def take(self, user: str, tool: Tool) -> None:
        cls = rate_class(tool)
        cap = float(self.rates[cls])
        per_s = cap / 60.0
        now = self.clock()
        with self._lock:
            tokens, last = self._buckets.get((user, cls), (cap, now))
            tokens = min(cap, tokens + (now - last) * per_s)
            if tokens < 1:
                raise RateLimited((1 - tokens) / per_s)
            self._buckets[(user, cls)] = (tokens - 1, now)
