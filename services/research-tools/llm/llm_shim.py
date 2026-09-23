#!/usr/bin/env python3
from __future__ import annotations

import hmac
import json
import os
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("LLM_SHIM_HOST", "127.0.0.1")
PORT = int(os.environ.get("LLM_SHIM_PORT", "8011"))
UPSTREAM = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
MAX_BODY = int(os.environ.get("LLM_SHIM_MAX_BODY", str(1024 * 1024)))
TIMEOUT_S = float(os.environ.get("LLM_SHIM_TIMEOUT_S", "120"))
SECRET = os.environ.get("LLM_GATEWAY_SECRET", "")

def _bearer_ok(header_value: str | None) -> bool:
    if not SECRET:
        return False
    if not header_value or not header_value.startswith("Bearer "):
        return False
    presented = header_value[len("Bearer "):].strip()
    return hmac.compare_digest(presented, SECRET)

class Handler(BaseHTTPRequestHandler):
    server_version = "llm-shim/1.0"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        sys.stderr.write("shim %s - %s\n" % (self.address_string(), fmt % args))

    def _json(self, status: int, obj: dict) -> None:
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _proxy(self, method: str) -> None:
        if not self.path.startswith("/v1/"):
            self._json(404, {"error": "not found"})
            return
        if not _bearer_ok(self.headers.get("Authorization")):
            self.send_response(401)
            self.send_header("WWW-Authenticate", "Bearer")
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        body = b""
        if method == "POST":
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            if length > MAX_BODY:
                self._json(413, {"error": "request too large"})
                return
            body = self.rfile.read(length) if length > 0 else b""
        url = UPSTREAM + self.path
        fwd_headers = {"Content-Type": self.headers.get("Content-Type", "application/json")}
        req = urllib.request.Request(url, data=body if method == "POST" else None,
                                     headers=fwd_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                data = resp.read()
                ctype = resp.headers.get("Content-Type", "application/json")
                self.send_response(resp.status)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except (urllib.error.URLError, OSError, TimeoutError):
            self._json(502, {"error": "upstream LLM unreachable"})

    def do_GET(self) -> None:  # noqa: N802
        self._proxy("GET")

    def do_POST(self) -> None:  # noqa: N802
        self._proxy("POST")

def main() -> int:
    if not SECRET:
        sys.stderr.write(
            "FATAL: LLM_GATEWAY_SECRET is not set. Refusing to start an open proxy.\n"
        )
        return 2
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    sys.stderr.write(f"llm-shim listening on {HOST}:{PORT} -> {UPSTREAM} (/v1/* only, bearer-gated)\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
