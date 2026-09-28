from __future__ import annotations

import datetime as dt
import hashlib
import importlib
import json
import os
import signal
import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from .auth import Principal
from .paths import REPO, allowed_roots, inside, user_root
from .registry import Registry, Tool

DEFAULT_LIMITS = {"total": 4, "per_user": 2, "queue": 20, "group_caps": {"visual": 1, "prime_directions": 1}}

class ArgError(ValueError):
    pass

class Busy(RuntimeError):
    pass

class Cancelled(RuntimeError):
    pass

def validate_args(tool: Tool, args: dict, p: Principal) -> dict:
    schema = tool.input_schema
    props = schema.get("properties", {})
    if not isinstance(args, dict):
        raise ArgError("arguments must be an object")
    extra = set(args) - set(props)
    if extra:
        raise ArgError(f"unknown arguments {sorted(extra)}")
    for req in schema.get("required", []):
        if req not in args:
            raise ArgError(f"missing argument {req}")
    out = {}
    for name, value in args.items():
        spec = props[name]
        kind = spec["type"]
        if kind == "boolean" and not isinstance(value, bool):
            raise ArgError(f"{name} must be a boolean")
        if kind == "integer" and (isinstance(value, bool) or not isinstance(value, int)):
            raise ArgError(f"{name} must be an integer")
        if kind == "number" and (isinstance(value, bool) or not isinstance(value, (int, float))):
            raise ArgError(f"{name} must be a number")
        if kind in ("string", "path") and not isinstance(value, str):
            raise ArgError(f"{name} must be a string")
        if kind in ("integer", "number"):
            if "minimum" in spec and value < spec["minimum"]:
                raise ArgError(f"{name} below {spec['minimum']}")
            if "maximum" in spec and value > spec["maximum"]:
                raise ArgError(f"{name} above {spec['maximum']}")
        if "enum" in spec and value not in spec["enum"]:
            raise ArgError(f"{name} must be one of {spec['enum']}")
        if kind == "string" and value.startswith("-"):
            raise ArgError(f"{name} may not start with a dash")
        if kind == "path":
            path = Path(os.path.expanduser(value))
            if not path.is_absolute():
                path = REPO / path
            if not inside(path, allowed_roots(p.user)):
                raise ArgError(f"{name} is outside the repo and your data root")
            value = str(path.resolve())
        out[name] = value
    return out

def _needs(part: list) -> list[str]:
    names = []
    for x in part:
        if x.startswith("?"):
            names.append(x[1:])
        elif x.startswith("{") and x.endswith("}") and x != "{out}":
            names.append(x[1:-1])
    return names

def render(parts, args: dict, out_dir: Path) -> list[str]:
    argv: list[str] = []
    for part in parts:
        if isinstance(part, list):
            if all(args.get(n) not in (None, False) for n in _needs(part)):
                argv.extend(render([x for x in part if not x.startswith("?")], args, out_dir))
            continue
        if part.startswith("{") and part.endswith("}"):
            name = part[1:-1]
            argv.append(str(out_dir) if name == "out" else str(args[name]))
            continue
        argv.append(sys.executable if part == "python3" else part)
    return argv

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def git_sha() -> str:
    r = subprocess.run(["git", "-C", str(REPO), "rev-parse", "HEAD"], capture_output=True, text=True, check=False)
    return r.stdout.strip() if r.returncode == 0 else "unknown"

def run_dir_for(tool: Tool, p: Principal, run_id: str) -> Path:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    return user_root(p.user) / tool.group / f"{stamp}-{tool.id}-{run_id[:8]}"

def execute(tool: Tool, args: dict, p: Principal, run_id: str, cancel: threading.Event | None = None) -> dict:
    out_dir = run_dir_for(tool, p, run_id)
    out_dir.mkdir(parents=True, exist_ok=False)
    call = {"run_id": run_id, "tool": tool.id, "user": p.user, "role": p.role, "args": args, "git_sha": git_sha()}
    (out_dir / "call.json").write_text(json.dumps(call, indent=1, sort_keys=True))
    started = time.monotonic()
    result: dict = {"run_id": run_id, "tool": tool.id, "run_dir": str(out_dir)}
    if tool.kind == "python":
        mod, fn = tool.function.split(":")
        try:
            value = getattr(importlib.import_module(mod), fn)(args, out_dir)
            result.update(ok=True, exit_code=0, meaning="ok", value=value)
        except Exception as exc:  # noqa: BLE001
            result.update(ok=False, exit_code=1, meaning=f"{type(exc).__name__}: {exc}")
            (out_dir / "stderr.txt").write_text(result["meaning"])
    else:
        argv = render(tool.command, args, out_dir)
        env = dict(
            os.environ, PYTHONPATH=os.pathsep.join(filter(None, [str(REPO / tool.cwd), os.environ.get("PYTHONPATH")]))
        )
        with open(out_dir / "stdout.txt", "wb") as so, open(out_dir / "stderr.txt", "wb") as se:
            proc = subprocess.Popen(argv, cwd=REPO / tool.cwd, stdout=so, stderr=se, env=env, start_new_session=True)
            code, meaning = None, ""
            deadline = started + tool.timeout_s
            while code is None:
                try:
                    code = proc.wait(timeout=0.2)
                except subprocess.TimeoutExpired:
                    if time.monotonic() > deadline or (cancel is not None and cancel.is_set()):
                        os.killpg(proc.pid, signal.SIGKILL)
                        proc.wait()
                        code = -9
                        meaning = "timeout" if time.monotonic() > deadline else "cancelled"
        if not meaning:
            meaning = tool.exit_codes.get(str(code), "ok" if code == 0 else f"exit {code}")
        result.update(ok=code == 0, exit_code=code, meaning=meaning, argv=argv)
        result["stderr_tail"] = (out_dir / "stderr.txt").read_text(errors="replace")[-2000:]
        result["stdout_tail"] = (out_dir / "stdout.txt").read_text(errors="replace")[-4000:]
    result["duration_s"] = round(time.monotonic() - started, 3)
    result["outputs"] = {
        str(f.relative_to(out_dir)): sha256(f)
        for f in sorted(out_dir.rglob("*"))
        if f.is_file() and f.name not in ("result.json",)
    }
    (out_dir / "result.json").write_text(json.dumps(result, indent=1, sort_keys=True, default=str))
    return result

@dataclass
class Job:
    tool: Tool
    args: dict
    principal: Principal
    run_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    state: str = "queued"
    result: dict | None = None
    cancel: threading.Event = field(default_factory=threading.Event)
    done: threading.Event = field(default_factory=threading.Event)

    def view(self) -> dict:
        return {
            "run_id": self.run_id,
            "tool": self.tool.id,
            "user": self.principal.user,
            "state": self.state,
            "result": self.result,
        }

class Scheduler:
    def __init__(self, registry: Registry, limits: dict | None = None, executor=execute):
        merged = dict(DEFAULT_LIMITS)
        merged.update(registry.limits or {})
        merged.update(limits or {})
        self.limits = merged
        self.executor = executor
        self._queue: list[Job] = []
        self._running: list[Job] = []
        self._jobs: dict[str, Job] = {}
        self._cv = threading.Condition()

    def _eligible(self, job: Job) -> bool:
        if len(self._running) >= self.limits["total"]:
            return False
        if sum(1 for j in self._running if j.principal.user == job.principal.user) >= self.limits["per_user"]:
            return False
        cap = self.limits.get("group_caps", {}).get(job.tool.group)
        return cap is None or sum(1 for j in self._running if j.tool.group == job.tool.group) < cap

    def _pump(self) -> None:
        for job in list(self._queue):
            if self._eligible(job):
                self._queue.remove(job)
                self._running.append(job)
                job.state = "running"
                threading.Thread(target=self._work, args=(job,), daemon=True).start()

    def _work(self, job: Job) -> None:
        try:
            job.result = self.executor(job.tool, job.args, job.principal, job.run_id, job.cancel)
            job.state = "done" if job.result.get("ok") else "failed"
        except Exception as exc:  # noqa: BLE001
            job.result = {"ok": False, "meaning": f"{type(exc).__name__}: {exc}"}
            job.state = "failed"
        finally:
            with self._cv:
                self._running.remove(job)
                job.done.set()
                self._pump()
                self._cv.notify_all()

    def submit(self, tool: Tool, args: dict, p: Principal) -> Job:
        job = Job(tool, args, p)
        with self._cv:
            if not self._eligible(job) and len(self._queue) >= self.limits["queue"]:
                raise Busy(f"queue full ({self.limits['queue']})")
            self._jobs[job.run_id] = job
            self._queue.append(job)
            self._pump()
        return job

    def position(self, run_id: str) -> int | None:
        with self._cv:
            for i, j in enumerate(self._queue):
                if j.run_id == run_id:
                    return i + 1
        return None

    def cancel(self, run_id: str, p: Principal) -> bool:
        with self._cv:
            job = self._jobs.get(run_id)
            if not job or (job.principal.user != p.user and not p.founder):
                return False
            if job in self._queue:
                self._queue.remove(job)
                job.state = "cancelled"
                job.done.set()
                return True
            job.cancel.set()
            return job.state == "running"

    def get(self, run_id: str) -> Job | None:
        return self._jobs.get(run_id)

    def jobs_for(self, p: Principal) -> list[Job]:
        return [j for j in self._jobs.values() if p.founder or j.principal.user == p.user]

    def run(self, tool: Tool, args: dict, p: Principal, timeout: float | None = None) -> Job:
        job = self.submit(tool, args, p)
        job.done.wait(timeout)
        return job
