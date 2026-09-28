from __future__ import annotations

import json
import threading
import time
from pathlib import Path

import pytest

from workbench.runner import ArgError, Busy, Scheduler, execute, render, validate_args

from .conftest import make_registry, sleeper, staff, tool_doc


def test_render_optional_groups(tmp_path):
    t = make_registry(tool_doc()).get("echo")
    assert render(t.command, {"word": "hi"}, tmp_path)[3:] == ["hi"]
    assert render(t.command, {"word": "hi", "n": 3, "loud": True}, tmp_path)[3:] == ["hi", "--n", "3", "--loud"]
    assert render(t.command, {"word": "hi", "loud": False}, tmp_path)[3:] == ["hi"]


@pytest.mark.parametrize(
    "args,message",
    [
        ({}, "missing argument word"),
        ({"word": "x", "extra": 1}, "unknown arguments"),
        ({"word": 3}, "must be a string"),
        ({"word": "x", "n": "3"}, "must be an integer"),
        ({"word": "x", "n": True}, "must be an integer"),
        ({"word": "x", "n": 10}, "above 9"),
        ({"word": "--help"}, "dash"),
    ],
)
def test_validate_errors(args, message):
    t = make_registry(tool_doc()).get("echo")
    with pytest.raises(ArgError, match=message):
        validate_args(t, args, staff())


def test_path_escape_refused(tmp_path):
    doc = tool_doc(
        command=["python3", "{word}"],
        input_schema={"type": "object", "properties": {"word": {"type": "path"}}, "required": ["word"]},
    )
    t = make_registry(doc).get("echo")
    with pytest.raises(ArgError, match="outside"):
        validate_args(t, {"word": "/etc/passwd"}, staff())
    with pytest.raises(ArgError, match="outside"):
        validate_args(t, {"word": "../../../../etc"}, staff())
    assert validate_args(t, {"word": "tools/workbench/registry.json"}, staff())["word"].endswith("registry.json")


def test_execute_writes_run_record(data_home):
    t = make_registry(tool_doc(exit_codes={"0": "fine"})).get("echo")
    r = execute(t, {"word": "hi", "n": 2}, staff(), "a" * 32)
    run_dir = Path(r["run_dir"])
    assert r["ok"] and r["meaning"] == "fine"
    assert "['hi', '--n', '2']" in r["stdout_tail"]
    assert run_dir.is_relative_to(data_home / "staff-example-org" / "workbench" / "helix")
    call = json.loads((run_dir / "call.json").read_text())
    assert call["tool"] == "echo" and call["user"] == "staff@example.org"
    saved = json.loads((run_dir / "result.json").read_text())
    assert saved["outputs"]["stdout.txt"] == r["outputs"]["stdout.txt"]


def test_exit_code_meaning():
    doc = tool_doc(
        command=["python3", "-c", "raise SystemExit(4)"],
        exit_codes={"4": "publish refused"},
        input_schema={"type": "object", "properties": {}},
    )
    r = execute(make_registry(doc).get("echo"), {}, staff(), "b" * 32)
    assert not r["ok"] and r["exit_code"] == 4 and r["meaning"] == "publish refused"


def test_timeout_kills_process_group():
    doc = sleeper(secs=30) | {"timeout_s": 1}
    start = time.monotonic()
    r = execute(make_registry(doc).get("sleep"), {}, staff(), "c" * 32)
    assert r["meaning"] == "timeout" and r["exit_code"] == -9
    assert time.monotonic() - start < 10


def test_python_tool_errors_are_results():
    doc = tool_doc(kind="python", function="json:loads", command=[], input_schema={"type": "object", "properties": {}})
    r = execute(make_registry(doc).get("echo"), {}, staff(), "d" * 32)
    assert not r["ok"] and "TypeError" in r["meaning"]


def _blocking_executor(gate: threading.Event):
    def run(tool, args, p, run_id, cancel):
        gate.wait(10)
        return {"ok": True}

    return run


def test_caps_queue_and_cancel():
    reg = make_registry(sleeper("a"), sleeper("v", group="visual"))
    gate = threading.Event()
    sched = Scheduler(
        reg, {"total": 4, "per_user": 2, "queue": 2, "group_caps": {"visual": 1}}, executor=_blocking_executor(gate)
    )
    from workbench.auth import principal

    u1, u2, u3 = principal("u1@x.org"), principal("u2@x.org"), principal("u3@x.org")
    j1 = sched.submit(reg.get("a"), {}, u1)
    j2 = sched.submit(reg.get("a"), {}, u1)
    j3 = sched.submit(reg.get("a"), {}, u1)
    assert [j1.state, j2.state, j3.state] == ["running", "running", "queued"]
    v1 = sched.submit(reg.get("v"), {}, u2)
    v2 = sched.submit(reg.get("v"), {}, u3)
    assert v1.state == "running" and v2.state == "queued"
    assert sched.position(v2.run_id) == 2
    with pytest.raises(Busy):
        sched.submit(reg.get("a"), {}, u1)
    assert not sched.cancel(j3.run_id, u2)
    assert sched.cancel(j3.run_id, u1)
    assert j3.state == "cancelled"
    gate.set()
    for j in (j1, j2, v1, v2):
        assert j.done.wait(10)
    assert v2.state == "done"


def test_total_cap():
    reg = make_registry(sleeper("a"))
    gate = threading.Event()
    sched = Scheduler(
        reg, {"total": 4, "per_user": 2, "queue": 20, "group_caps": {}}, executor=_blocking_executor(gate)
    )
    from workbench.auth import principal

    jobs = [sched.submit(reg.get("a"), {}, principal(f"u{i}@x.org")) for i in range(5)]
    assert [j.state for j in jobs].count("running") == 4
    assert jobs[4].state == "queued"
    gate.set()
    assert all(j.done.wait(10) for j in jobs)


def test_cancel_running_job_kills_it():
    reg = make_registry(sleeper("a", secs=30))
    sched = Scheduler(reg)
    job = sched.submit(reg.get("a"), {}, staff())
    time.sleep(0.5)
    assert sched.cancel(job.run_id, staff())
    assert job.done.wait(10)
    assert job.result["meaning"] == "cancelled"
