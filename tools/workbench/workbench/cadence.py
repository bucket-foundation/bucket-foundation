from __future__ import annotations

import json
import os
import queue
import shutil
import subprocess
import threading
import time

PREFIX = "cadence_"
START_TIMEOUT_S = 10.0
CALL_TIMEOUT_S = 30.0
RENDER_TIMEOUT_S = 900.0
FAIL_WINDOW_S = 300.0
COOLDOWN_S = 300.0


class CadenceUnavailable(RuntimeError):
    pass


class CadenceTimeout(RuntimeError):
    pass


def default_command() -> list[str] | None:
    path = os.environ.get("CADENCE_MCP_BIN") or shutil.which("cadence_mcp")
    return [path] if path and os.path.exists(path) else None


class CadenceProxy:
    def __init__(
        self,
        command: list[str] | None = None,
        clock=time.monotonic,
        start_timeout: float = START_TIMEOUT_S,
        call_timeout: float = CALL_TIMEOUT_S,
        render_timeout: float = RENDER_TIMEOUT_S,
    ):
        self.command = command if command is not None else default_command()
        self.clock = clock
        self.start_timeout = start_timeout
        self.call_timeout = call_timeout
        self.render_timeout = render_timeout
        self._proc: subprocess.Popen | None = None
        self._lines: queue.Queue = queue.Queue()
        self._lock = threading.Lock()
        self._next_id = 0
        self._tools: list[dict] | None = None
        self._failures: list[float] = []
        self._down_until = 0.0

    @property
    def configured(self) -> bool:
        return bool(self.command)

    @staticmethod
    def _reader(proc: subprocess.Popen, lines: queue.Queue) -> None:
        for line in proc.stdout:
            lines.put(line)
        lines.put(None)

    def _start(self) -> None:
        if not self.command:
            raise CadenceUnavailable("cadence_mcp binary not found; set CADENCE_MCP_BIN")
        self._lines = queue.Queue()
        self._proc = subprocess.Popen(
            self.command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1
        )
        threading.Thread(target=self._reader, args=(self._proc, self._lines), daemon=True).start()
        self._request(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "bucket-workbench", "version": "0.1.0"},
            },
            self.start_timeout,
        )

    def _stop(self) -> None:
        if self._proc and self._proc.poll() is None:
            self._proc.kill()
            self._proc.wait()
        self._proc = None

    def _request(self, method: str, params: dict, timeout: float) -> dict:
        self._next_id += 1
        rid = self._next_id
        self._proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": rid, "method": method, "params": params}) + "\n")
        self._proc.stdin.flush()
        deadline = self.clock() + timeout
        while True:
            left = deadline - self.clock()
            if left <= 0:
                raise CadenceTimeout(f"{method} timed out after {timeout:g}s")
            try:
                line = self._lines.get(timeout=min(left, 0.5))
            except queue.Empty:
                continue
            if line is None:
                raise CadenceUnavailable("cadence_mcp exited")
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            if msg.get("id") == rid:
                return msg

    def _note_failure(self) -> None:
        now = self.clock()
        self._failures = [t for t in self._failures if now - t < FAIL_WINDOW_S] + [now]
        if len(self._failures) >= 2:
            self._down_until = now + COOLDOWN_S
            self._failures = []

    def _call(self, method: str, params: dict, timeout: float) -> dict:
        with self._lock:
            if self.clock() < self._down_until:
                raise CadenceUnavailable("cadence is cooling down after repeated failures")
            for attempt in (1, 2):
                try:
                    if self._proc is None or self._proc.poll() is not None:
                        self._start()
                    return self._request(method, params, timeout)
                except (CadenceTimeout, CadenceUnavailable, BrokenPipeError, OSError) as exc:
                    self._stop()
                    self._note_failure()
                    if attempt == 2 or self.clock() < self._down_until:
                        if isinstance(exc, CadenceTimeout):
                            raise
                        raise CadenceUnavailable(str(exc)) from exc
            raise CadenceUnavailable("unreachable")

    def tools(self) -> list[dict]:
        if not self.configured:
            return []
        if self._tools is None:
            msg = self._call("tools/list", {}, self.call_timeout)
            self._tools = [
                {**t, "name": PREFIX + t["name"], "description": "[cadence] " + t.get("description", "")}
                for t in msg.get("result", {}).get("tools", [])
            ]
        return self._tools

    def call(self, name: str, arguments: dict) -> dict:
        inner = name.removeprefix(PREFIX)
        timeout = self.render_timeout if inner == "render" else self.call_timeout
        msg = self._call("tools/call", {"name": inner, "arguments": arguments}, timeout)
        if "error" in msg:
            raise RuntimeError(msg["error"].get("message", "cadence error"))
        return msg.get("result", {})

    def close(self) -> None:
        with self._lock:
            self._stop()
