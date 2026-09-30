from __future__ import annotations

import ipaddress
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .auth import AuthError, SignedRequests
from .service import ToolError, Workbench

DEFAULT_PORT = 8430
MAX_BODY = 256 * 1024
STATUS = {
    "unauthorized": 401,
    "forbidden": 403,
    "unknown_tool": 404,
    "not_found": 404,
    "pending": 409,
    "bad_arguments": 400,
    "rate_limited": 429,
    "busy": 503,
    "cadence_unavailable": 503,
    "timeout": 504,
    "cancelled": 409,
}


def loopback(host: str) -> bool:
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return host == "localhost"


def handle(bench: Workbench, signer: SignedRequests, path: str, body: bytes, signature: str | None) -> tuple[int, dict]:
    try:
        p, msg = signer.verify(body, signature)
    except AuthError as exc:
        return 401, {"error": exc.code, "message": str(exc)}
    except (ValueError, json.JSONDecodeError):
        return 400, {"error": "bad_request"}
    try:
        if path == "/tools":
            return 200, {"tools": bench.list_tools(p)}
        if path == "/run":
            return 202, bench.call(p, str(msg.get("tool", "")), msg.get("args") or {}, wait=False)
        if path == "/runs":
            return 200, {"runs": bench.runs(p)}
        if path == "/cancel":
            ok = bench.cancel(p, str(msg.get("run_id", "")))
            return (200 if ok else 404), {"cancelled": ok}
    except ToolError as exc:
        return STATUS.get(exc.code, 500), {"error": exc.code, "message": str(exc), **exc.data}
    return 404, {"error": "not_found"}


def serve(bench: Workbench, signer: SignedRequests, host: str = "127.0.0.1", port: int = DEFAULT_PORT):
    if not loopback(host):
        raise SystemExit(f"refusing to bind {host}; workbench-serve binds loopback only")

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            size = int(self.headers.get("content-length") or 0)
            if size > MAX_BODY:
                self._send(413, {"error": "too_large"})
                return
            code, out = handle(
                bench, signer, self.path, self.rfile.read(size), self.headers.get("x-workbench-signature")
            )
            self._send(code, out)

        def do_GET(self):
            if self.path == "/health":
                self._send(200, {"ok": True})
            else:
                self._send(405, {"error": "method_not_allowed"})

        def _send(self, code: int, out: dict):
            data = json.dumps(out, default=str).encode()
            self.send_response(code)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *a):
            return

    server = ThreadingHTTPServer((host, port), Handler)
    return server
