"""`hte-serve`: a stdlib-only HTTP JSON server over `hte.api.hypothesize`,
`POST /hypothesize` and `GET /health`, so `bucket-mcp`'s own `hypothesize`
tool (`hte/mcp_tool.py`) has a live endpoint to call without importing
this package directly. `docs/RESEARCH-OS-INTEGRATION.md`'s own "this
section names the seam, it does not cut it" rule holds here too: this
module never imports from, or writes to, `bucket-mcp.py`.

    python3 -m hte.serve --port 8420 --fake
    hte-serve --port 8420 --fake          # once installed (`pyproject.toml`'s console script)

`--fake` sets `HTE_LLM_MODE=fake` for the whole process before the first
request, so local development never shells out to `claude -p`; drop it
to run real campaigns.

No authentication of any kind. Bind this to `127.0.0.1` (the default) and
let whatever process starts it alongside `bucket-mcp` own the trust
boundary; `bucket-mcp` is the only intended caller, per `docs/
K12-INTEGRATION.md`'s own request/response shape. Every response carries
a `request_id`; every request logs one structured line to stderr, method,
path, status, and elapsed time, never a prompt or a request body.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .api import CampaignError, HypothesizeError, RequestValidationError, hypothesize

DEFAULT_PORT = 8420
# 2 MiB: a production batch of a few dozen records, `docs/PRODUCTION-
# SCHEMA.md`'s own shape, fits well inside this; an unauthenticated
# localhost port is one bug away from an unbounded read otherwise.
DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024


def _log(request_id: str, message: str) -> None:
    """One structured line per request, stderr only: `<UTC timestamp>
    request_id=<id> <message>`. Never a request body or a prompt string."""
    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(f"{stamp} request_id={request_id} {message}", file=sys.stderr, flush=True)


class _Handler(BaseHTTPRequestHandler):
    server_version = "hte-serve/0.1"
    max_body_bytes = DEFAULT_MAX_BODY_BYTES

    def log_message(self, format: str, *args: Any) -> None:
        # Silence BaseHTTPRequestHandler's own default access log;
        # `_log()` above is this server's one structured line per request.
        pass

    def _write_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        # Every response closes the connection: simpler and safer than
        # keep-alive for a low-traffic, single-caller local endpoint,
        # and avoids a keep-alive stream desyncing after a drained-but-
        # not-fully-read oversized POST body (see `do_POST` below).
        self.close_connection = True
        request_id = uuid.uuid4().hex[:12]
        started = time.monotonic()
        if self.path == "/health":
            self._write_json(200, {"ok": True, "status": "healthy"})
            _log(request_id, f"GET /health 200 {time.monotonic() - started:.3f}s")
            return
        self._write_json(404, {"ok": False, "error": f"no such route: GET {self.path}", "request_id": request_id})
        _log(request_id, f"GET {self.path} 404 {time.monotonic() - started:.3f}s")

    def do_POST(self) -> None:
        self.close_connection = True
        request_id = uuid.uuid4().hex[:12]
        started = time.monotonic()

        if self.path != "/hypothesize":
            self._write_json(404, {"ok": False, "error": f"no such route: POST {self.path}", "request_id": request_id})
            _log(request_id, f"POST {self.path} 404 {time.monotonic() - started:.3f}s")
            return

        length_header = self.headers.get("Content-Length")
        try:
            content_length = int(length_header) if length_header is not None else -1
        except ValueError:
            content_length = -1
        if content_length < 0:
            self._write_json(400, {
                "ok": False, "error": "Content-Length header is required and must be a non-negative integer",
                "request_id": request_id,
            })
            _log(request_id, f"POST /hypothesize 400 (missing Content-Length) {time.monotonic() - started:.3f}s")
            return
        if content_length > self.max_body_bytes:
            # 413 Payload Too Large (RFC 9110 §15.5.14). Drain up to the
            # cap so the socket does not hang mid-write on the client's
            # side, then refuse; `close_connection = True` above means
            # any bytes still unread past the cap never desync a
            # follow-on request on this same connection.
            self.rfile.read(min(content_length, self.max_body_bytes))
            self._write_json(413, {
                "ok": False,
                "error": f"request body of {content_length} bytes exceeds the {self.max_body_bytes}-byte cap",
                "request_id": request_id,
            })
            _log(request_id, f"POST /hypothesize 413 {time.monotonic() - started:.3f}s")
            return

        raw_body = self.rfile.read(content_length)
        try:
            request = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            self._write_json(400, {"ok": False, "error": f"request body is not valid JSON: {exc}", "request_id": request_id})
            _log(request_id, f"POST /hypothesize 400 (bad JSON) {time.monotonic() - started:.3f}s")
            return

        try:
            response = hypothesize(request)
        except RequestValidationError as exc:
            self._write_json(400, {"ok": False, "error": str(exc), "request_id": request_id})
            _log(request_id, f"POST /hypothesize 400 (RequestValidationError) {time.monotonic() - started:.3f}s")
            return
        except (CampaignError, HypothesizeError) as exc:
            self._write_json(502, {"ok": False, "error": str(exc), "request_id": request_id})
            _log(request_id, f"POST /hypothesize 502 ({type(exc).__name__}) {time.monotonic() - started:.3f}s")
            return
        except Exception as exc:  # pragma: no cover - defensive; hypothesize() documents its own error contract
            self._write_json(500, {"ok": False, "error": f"internal error: {type(exc).__name__}", "request_id": request_id})
            _log(request_id, f"POST /hypothesize 500 ({type(exc).__name__}) {time.monotonic() - started:.3f}s")
            return

        response["request_id"] = request_id
        self._write_json(200, response)
        _log(request_id, f"POST /hypothesize 200 {time.monotonic() - started:.3f}s")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hte-serve", description="Serve hte.api.hypothesize over HTTP.")
    parser.add_argument("--host", default="127.0.0.1", help="bind address (default 127.0.0.1; no auth, keep this off any public interface)")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--max-body-bytes", type=int, default=DEFAULT_MAX_BODY_BYTES)
    parser.add_argument("--fake", action="store_true", help="force HTE_LLM_MODE=fake for this process (local development, no claude CLI, no network)")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.fake:
        os.environ["HTE_LLM_MODE"] = "fake"

    _Handler.max_body_bytes = args.max_body_bytes
    server = ThreadingHTTPServer((args.host, args.port), _Handler)
    mode_note = " (HTE_LLM_MODE=fake)" if args.fake else ""
    print(
        f"hte-serve listening on http://{args.host}:{args.port}{mode_note}, no auth, POST /hypothesize + GET /health",
        file=sys.stderr,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
