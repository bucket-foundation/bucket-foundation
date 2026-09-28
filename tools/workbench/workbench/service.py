from __future__ import annotations

import json
import threading
import time
from pathlib import Path

from .auth import AuthError, Principal, authorize
from .cadence import PREFIX, CadenceProxy, CadenceTimeout, CadenceUnavailable
from .limits import RateLimited, RateLimiter
from .paths import state_dir
from .registry import Registry, Tool
from .registry import load as load_registry
from .runner import ArgError, Busy, Scheduler, validate_args

CADENCE_TOOL = Tool(
    id="cadence",
    group="cadence",
    kind="mcp_proxy",
    title="Cadence",
    description="Cadence audio and voiceover over cadence-mcp",
    scope="local",
    writes="local",
    timeout_s=900,
    status="live",
    input_schema={"type": "object", "properties": {}},
)

class ToolError(RuntimeError):
    def __init__(self, code: str, message: str, data: dict | None = None):
        super().__init__(message)
        self.code = code
        self.data = data or {}

class Workbench:
    def __init__(
        self,
        registry: Registry | None = None,
        scheduler: Scheduler | None = None,
        limiter: RateLimiter | None = None,
        cadence: CadenceProxy | None = None,
        audit_path: Path | None = None,
    ):
        self.registry = registry or load_registry()
        self.scheduler = scheduler or Scheduler(self.registry)
        self.limiter = limiter or RateLimiter()
        self.cadence = cadence if cadence is not None else CadenceProxy()
        self.audit_path = Path(audit_path) if audit_path else state_dir() / "audit.jsonl"
        self._audit_lock = threading.Lock()

    def audit(self, p: Principal, tool: str, scope: str, result: str, run_id: str | None = None) -> None:
        line = {
            "ts": time.time(),
            "user": p.user,
            "role": p.role,
            "tool": tool,
            "scope": scope,
            "result": result,
            "run_id": run_id,
        }
        with self._audit_lock:
            self.audit_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.audit_path, "a") as fh:
                fh.write(json.dumps(line, sort_keys=True) + "\n")

    def list_tools(self, p: Principal) -> list[dict]:
        rows = []
        for t in self.registry.tools.values():
            if t.scope not in p.scopes:
                continue
            rows.append(
                {
                    "id": t.id,
                    "group": t.group,
                    "title": t.title,
                    "description": t.description,
                    "scope": t.scope,
                    "writes": t.writes,
                    "status": t.status,
                    "bead": t.bead,
                    "blocked_by": t.blocked_by,
                    "input_schema": t.input_schema,
                }
            )
        return rows

    def mcp_tools(self, p: Principal) -> list[dict]:
        specs = [t.mcp_spec() for t in self.registry.tools.values() if t.scope in p.scopes]
        if CADENCE_TOOL.scope in p.scopes:
            try:
                specs += self.cadence.tools()
            except (CadenceUnavailable, CadenceTimeout):
                pass
        return specs

    def has(self, name: str) -> bool:
        return name in self.registry.tools or name.startswith(PREFIX)

    def _admit(self, p: Principal, tool: Tool, args: dict) -> tuple[dict, Principal]:
        try:
            authorize(p, tool, args)
        except AuthError as exc:
            self.audit(p, tool.id, tool.scope, f"refused: {exc}")
            raise ToolError(exc.code, str(exc)) from exc
        if not tool.live:
            self.audit(p, tool.id, tool.scope, "refused: pending")
            raise ToolError("pending", f"{tool.id} is pending ({tool.bead}): {tool.blocked_by}")
        try:
            self.limiter.take(p.user, tool)
        except RateLimited as exc:
            self.audit(p, tool.id, tool.scope, "refused: rate limited")
            raise ToolError("rate_limited", str(exc), {"retry_after": round(exc.retry_after, 1)}) from exc
        args = dict(args or {})
        target = str(args.pop("for_user", "") or p.user).strip().lower()
        if target != p.user and tool.scope != "personal":
            raise ToolError("bad_arguments", "for_user applies to personal tools only")
        runner_p = Principal(target, p.role, p.scopes)
        try:
            return validate_args(tool, args, runner_p), runner_p
        except ArgError as exc:
            self.audit(p, tool.id, tool.scope, f"refused: {exc}")
            raise ToolError("bad_arguments", str(exc)) from exc

    def call(self, p: Principal, name: str, args: dict, wait: bool = True) -> dict:
        if name.startswith(PREFIX):
            return self._cadence(p, name, args)
        tool = self.registry.get(name)
        if tool is None:
            raise ToolError("unknown_tool", f"unknown tool: {name}")
        clean, runner_p = self._admit(p, tool, args)
        try:
            job = self.scheduler.submit(tool, clean, runner_p)
        except Busy as exc:
            self.audit(p, tool.id, tool.scope, "refused: busy")
            raise ToolError("busy", str(exc)) from exc
        self.audit(p, tool.id, tool.scope, "queued", job.run_id)
        if not wait:
            return {"run_id": job.run_id, "state": job.state, "position": self.scheduler.position(job.run_id)}
        job.done.wait()
        self.audit(p, tool.id, tool.scope, job.state, job.run_id)
        if job.state == "cancelled":
            raise ToolError("cancelled", "run cancelled", {"run_id": job.run_id})
        return job.result

    def _cadence(self, p: Principal, name: str, args: dict) -> dict:
        try:
            authorize(p, CADENCE_TOOL, args)
            self.limiter.take(p.user, CADENCE_TOOL)
        except AuthError as exc:
            self.audit(p, name, CADENCE_TOOL.scope, f"refused: {exc}")
            raise ToolError(exc.code, str(exc)) from exc
        except RateLimited as exc:
            raise ToolError("rate_limited", str(exc), {"retry_after": round(exc.retry_after, 1)}) from exc
        try:
            result = self.cadence.call(name, args or {})
        except CadenceTimeout as exc:
            self.audit(p, name, CADENCE_TOOL.scope, "timeout")
            raise ToolError("timeout", str(exc)) from exc
        except CadenceUnavailable as exc:
            self.audit(p, name, CADENCE_TOOL.scope, "unavailable")
            raise ToolError("cadence_unavailable", str(exc)) from exc
        self.audit(p, name, CADENCE_TOOL.scope, "done")
        return result

    def runs(self, p: Principal) -> list[dict]:
        out = []
        for j in self.scheduler.jobs_for(p):
            v = j.view()
            v["position"] = self.scheduler.position(j.run_id)
            out.append(v)
        return out

    def cancel(self, p: Principal, run_id: str) -> bool:
        ok = self.scheduler.cancel(run_id, p)
        self.audit(p, "cancel", "read", "done" if ok else "refused", run_id)
        return ok
