from __future__ import annotations

import threading

import pytest

from workbench.limits import RateLimited, RateLimiter
from workbench.runner import Scheduler
from workbench.service import ToolError, Workbench

from .conftest import NullCadence, make_registry, sleeper, staff, tool_doc

class Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t

def test_rate_classes():
    reg = make_registry(
        tool_doc(id="r", scope="read", writes="none"),
        tool_doc(id="w"),
        tool_doc(id="g", scope="gdrive", writes="gdrive"),
    )
    clock = Clock()
    lim = RateLimiter(clock=clock)
    for _ in range(60):
        lim.take("u", reg.get("r"))
    with pytest.raises(RateLimited):
        lim.take("u", reg.get("r"))
    for _ in range(10):
        lim.take("u", reg.get("w"))
    with pytest.raises(RateLimited):
        lim.take("u", reg.get("w"))
    lim.take("u", reg.get("g"))
    lim.take("u", reg.get("g"))
    with pytest.raises(RateLimited) as exc:
        lim.take("u", reg.get("g"))
    assert 0 < exc.value.retry_after <= 30
    lim.take("other", reg.get("g"))
    clock.t += 30
    lim.take("u", reg.get("g"))

def test_rate_limit_through_service(tmp_path):
    reg = make_registry(tool_doc())
    bench = Workbench(reg, Scheduler(reg), RateLimiter({"write": 1}), NullCadence(), tmp_path / "a.jsonl")
    bench.call(staff(), "echo", {"word": "x"})
    with pytest.raises(ToolError) as exc:
        bench.call(staff(), "echo", {"word": "x"})
    assert exc.value.code == "rate_limited" and "retry_after" in exc.value.data

def test_busy_through_service(tmp_path):
    reg = make_registry(sleeper("a"))
    gate = threading.Event()

    def blocked(tool, args, p, run_id, cancel):
        gate.wait(10)
        return {"ok": True}

    sched = Scheduler(reg, {"total": 1, "per_user": 1, "queue": 1, "group_caps": {}}, executor=blocked)
    bench = Workbench(reg, sched, RateLimiter({"write": 100}), NullCadence(), tmp_path / "a.jsonl")
    first = bench.call(staff(), "a", {}, wait=False)
    second = bench.call(staff(), "a", {}, wait=False)
    assert first["state"] == "running" and second["position"] == 1
    with pytest.raises(ToolError) as exc:
        bench.call(staff(), "a", {}, wait=False)
    assert exc.value.code == "busy"
    assert bench.cancel(staff(), second["run_id"])
    gate.set()
