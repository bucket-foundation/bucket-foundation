"""`hte.serve`: the stdlib HTTP server over `hte.api.hypothesize`, exercised
end to end on an ephemeral localhost port, fake mode only
(`HTE_LLM_MODE=fake`, no `claude` CLI, no network).
"""
from __future__ import annotations

import http.client
import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

from hte import mcp_tool, serve
from hte.corpus import production
from hte.serve import DEFAULT_MAX_BODY_BYTES, _Handler

# Same compact JSON-Schema-subset validator `tests/test_api.py` uses;
# duplicated rather than imported across test files to avoid relying on
# pytest's own import-mode behavior for two files at the same directory
# level (`README.md`'s own note on `tests/swarm/` and `tests/swarm2/`
# colliding on a bare module name is the cautionary tale this sidesteps).
_TYPE_MAP = {
    "object": dict, "array": list, "string": str, "integer": int,
    "number": (int, float), "boolean": bool, "null": type(None),
}


def _check_type(value, type_spec) -> bool:
    names = type_spec if isinstance(type_spec, list) else [type_spec]
    return isinstance(value, tuple(_TYPE_MAP[n] for n in names))


def _schema_errors(instance, schema, path: str = "$") -> list[str]:
    if "oneOf" in schema:
        for sub in schema["oneOf"]:
            if not _schema_errors(instance, sub, path):
                return []
        return [f"{path}: matched none of oneOf"]
    if "type" in schema and not _check_type(instance, schema["type"]):
        return [f"{path}: expected type {schema['type']}, got {type(instance).__name__}"]
    problems: list[str] = []
    if isinstance(instance, dict):
        for key in schema.get("required", []):
            if key not in instance:
                problems.append(f"{path}.{key}: required field missing")
        for key, sub_schema in schema.get("properties", {}).items():
            if key in instance:
                problems.extend(_schema_errors(instance[key], sub_schema, f"{path}.{key}"))
    if isinstance(instance, list):
        for i, item in enumerate(instance):
            problems.extend(_schema_errors(item, schema.get("items", {}), f"{path}[{i}]"))
    return problems


@pytest.fixture
def server(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield httpd.server_address
    finally:
        httpd.shutdown()
        thread.join(timeout=5)
        httpd.server_close()


def _post(address, path: str, body: bytes, headers: dict | None = None):
    url = f"http://{address[0]}:{address[1]}{path}"
    request = urllib.request.Request(url, data=body, method="POST", headers=headers or {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read())


def _fixture_request() -> dict:
    records = [p.to_dict() for p in production.load_raw()]
    return {"productions": records, "status_min": "draft", "seeds": 1, "max_hypotheses": 20}


def test_health_returns_200(server):
    url = f"http://{server[0]}:{server[1]}/health"
    with urllib.request.urlopen(url, timeout=10) as resp:
        assert resp.status == 200
        body = json.loads(resp.read())
    assert body["ok"] is True


def test_post_hypothesize_returns_200_and_matches_the_output_schema(server):
    body = json.dumps(_fixture_request()).encode("utf-8")
    status, payload = _post(server, "/hypothesize", body)
    assert status == 200
    assert payload["ok"] is True
    assert "request_id" in payload
    errors = _schema_errors(payload, mcp_tool.TOOL_DEFINITION["outputSchema"])
    assert errors == []


def test_post_hypothesize_with_bad_json_returns_400(server):
    status, payload = _post(server, "/hypothesize", b"{not valid json")
    assert status == 400
    assert payload["ok"] is False


def test_post_hypothesize_with_invalid_request_returns_400(server):
    status, payload = _post(server, "/hypothesize", json.dumps({}).encode("utf-8"))
    assert status == 400
    assert payload["ok"] is False
    assert "productions" in payload["error"]


def test_post_hypothesize_with_oversized_body_returns_413(server):
    padding = "x" * (DEFAULT_MAX_BODY_BYTES + 1024)
    huge = json.dumps({"productions": [], "padding": padding}).encode("utf-8")
    status, payload = _post(server, "/hypothesize", huge)
    assert status == 413
    assert payload["ok"] is False


def test_get_unknown_route_returns_404(server):
    url = f"http://{server[0]}:{server[1]}/no-such-route"
    try:
        urllib.request.urlopen(url, timeout=10)
        pytest.fail("expected a 404")
    except urllib.error.HTTPError as exc:
        assert exc.code == 404


def test_post_unknown_route_returns_404(server):
    status, payload = _post(server, "/no-such-route", b"{}")
    assert status == 404
    assert payload["ok"] is False


# --------------------------------------------------------------------------
# Content-Length edge cases: `do_POST` checks the header itself before it
# ever reads a body, a branch distinct from the bad-JSON and oversized-body
# paths above and untested by either.
# --------------------------------------------------------------------------


def _post_raw(address, path: str, *, content_length_header: str | None) -> tuple[int, dict]:
    """A `POST` with full control over whether/what `Content-Length` header
    is sent, below `urllib.request`'s own level (it always computes and
    sends a correct one for a `bytes` body), using `http.client`'s own
    low-level `putrequest`/`putheader`/`endheaders` so a missing or
    malformed header reaches the server exactly as this test intends."""
    conn = http.client.HTTPConnection(address[0], address[1], timeout=10)
    try:
        conn.putrequest("POST", "/hypothesize", skip_accept_encoding=True)
        conn.putheader("Content-Type", "application/json")
        if content_length_header is not None:
            conn.putheader("Content-Length", content_length_header)
        conn.endheaders()
        resp = conn.getresponse()
        return resp.status, json.loads(resp.read())
    finally:
        conn.close()


def test_post_hypothesize_missing_content_length_returns_400(server):
    status, payload = _post_raw(server, "/hypothesize", content_length_header=None)
    assert status == 400
    assert payload["ok"] is False
    assert "Content-Length" in payload["error"]


def test_post_hypothesize_non_integer_content_length_returns_400(server):
    status, payload = _post_raw(server, "/hypothesize", content_length_header="not-a-number")
    assert status == 400
    assert payload["ok"] is False
    assert "Content-Length" in payload["error"]


def test_post_hypothesize_negative_content_length_returns_400(server):
    status, payload = _post_raw(server, "/hypothesize", content_length_header="-1")
    assert status == 400
    assert payload["ok"] is False
    assert "Content-Length" in payload["error"]


# --------------------------------------------------------------------------
# unexpected exception -> 500: `hypothesize()` documents its own error
# contract (`RequestValidationError`/`CampaignError`), so `do_POST`'s own
# catch-all is meant to be unreachable; this test forces it anyway, so a
# real bug surfaces as the documented shape instead of crashing the
# handler thread or leaking exception text onto the wire.
# --------------------------------------------------------------------------


def test_post_hypothesize_with_unexpected_exception_returns_500(server, monkeypatch):
    def _boom(request, *, config=None):
        raise RuntimeError("an ordinary bug, not a HypothesizeError, and not for the client to read")

    monkeypatch.setattr(serve, "hypothesize", _boom)
    body = json.dumps(_fixture_request()).encode("utf-8")
    status, payload = _post(server, "/hypothesize", body)
    assert status == 500
    assert payload["ok"] is False
    assert payload["error"] == "internal error: RuntimeError"
    # the bug's own message never reaches the client, only the bare
    # exception class name
    assert "ordinary bug" not in payload["error"]
