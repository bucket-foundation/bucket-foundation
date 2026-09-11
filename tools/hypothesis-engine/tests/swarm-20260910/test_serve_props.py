"""Property/behavior tests for `hte/serve.py`, `tests/COVERAGE.md`'s next
least-covered file (78.3%) with no test of its own in any `tests/swarm*/`
round. `tests/test_serve.py` already exercises the HTTP-handler surface end
to end over a real ephemeral-port server (health, hypothesize happy path,
bad JSON, oversized body, Content-Length edge cases, unknown routes, and the
unexpected-exception-to-500 branch. These property tests add coverage for
the `CampaignError`/`HypothesizeError`-to-502 branch, `build_parser`'s
own defaults and flag parsing, `main`'s `--fake` env-var wiring and its
`server.serve_forever()`/`KeyboardInterrupt`/`server_close()` lifecycle
(stubbed rather than run for real, so this file needs no real socket and no
thread), and the `if __name__ == "__main__":` guard.
"""
from __future__ import annotations

import json
import threading
from http.server import ThreadingHTTPServer

import pytest

from hte import serve
from hte.api import CampaignError, HypothesizeError
from hte.serve import DEFAULT_MAX_BODY_BYTES, DEFAULT_PORT, _Handler, build_parser
from tests.test_serve import (  # real server fixture's own helpers
    _fixture_request,
    _post,
)

# ---------------------------------------------------------------------------
# `do_POST`'s `except (CampaignError, HypothesizeError)` branch (lines
# 133-136): the one error-contract branch `tests/test_serve.py` does not
# reach, since none of its own scenarios makes `hypothesize()` raise either.
# ---------------------------------------------------------------------------


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


def test_post_hypothesize_with_campaign_error_returns_502(server, monkeypatch):
    def _boom(request, *, config=None):
        raise CampaignError("the fake campaign blew up")

    monkeypatch.setattr(serve, "hypothesize", _boom)
    body = json.dumps(_fixture_request()).encode("utf-8")
    status, payload = _post(server, "/hypothesize", body)
    assert status == 502
    assert payload["ok"] is False
    assert payload["error"] == "the fake campaign blew up"


def test_post_hypothesize_with_bare_hypothesize_error_returns_502(server, monkeypatch):
    # `RequestValidationError` and `CampaignError` are `HypothesizeError`
    # subclasses handled by their own more specific `except` clauses above
    # this one in `do_POST`; a bare `HypothesizeError` (neither subclass)
    # is what reaches this branch.
    def _boom(request, *, config=None):
        raise HypothesizeError("a base-class failure neither subclass names")

    monkeypatch.setattr(serve, "hypothesize", _boom)
    body = json.dumps(_fixture_request()).encode("utf-8")
    status, payload = _post(server, "/hypothesize", body)
    assert status == 502
    assert payload["ok"] is False
    assert payload["error"] == "a base-class failure neither subclass names"


# ---------------------------------------------------------------------------
# `build_parser`: defaults and flag parsing, no server involved.
# ---------------------------------------------------------------------------


def test_build_parser_defaults():
    args = build_parser().parse_args([])
    assert args.host == "127.0.0.1"
    assert args.port == DEFAULT_PORT
    assert args.max_body_bytes == DEFAULT_MAX_BODY_BYTES
    assert args.fake is False


def test_build_parser_honors_every_flag():
    args = build_parser().parse_args([
        "--host", "0.0.0.0", "--port", "9000", "--max-body-bytes", "4096", "--fake",
    ])
    assert args.host == "0.0.0.0"
    assert args.port == 9000
    assert args.max_body_bytes == 4096
    assert args.fake is True


# ---------------------------------------------------------------------------
# `main`: stub `ThreadingHTTPServer` so this exercises the real construction
# and lifecycle wiring (host/port passed through, `_Handler.max_body_bytes`
# set from `--max-body-bytes`, the `--fake` env var, the startup message,
# `KeyboardInterrupt` caught, `server_close()` called in `finally`, return
# 0) with no real socket bind and no blocking `serve_forever()` call.
# ---------------------------------------------------------------------------


class _FakeServer:
    """Records what `main` did to it; `serve_forever` raises
    `KeyboardInterrupt` immediately, the same exit `main` documents
    handling for a real Ctrl-C."""

    last_instance: _FakeServer | None = None

    def __init__(self, address, handler_cls):
        self.address = address
        self.handler_cls = handler_cls
        self.closed = False
        _FakeServer.last_instance = self

    def serve_forever(self):
        raise KeyboardInterrupt

    def server_close(self):
        self.closed = True


@pytest.fixture
def fake_server(monkeypatch):
    _FakeServer.last_instance = None
    monkeypatch.setattr(serve, "ThreadingHTTPServer", _FakeServer)
    yield _FakeServer


def test_main_returns_0_and_closes_the_server_on_keyboard_interrupt(fake_server, capsys):
    rc = serve.main(["--host", "127.0.0.1", "--port", "0"])
    assert rc == 0
    assert fake_server.last_instance is not None
    assert fake_server.last_instance.closed is True
    assert fake_server.last_instance.address == ("127.0.0.1", 0)
    assert "hte-serve listening on http://127.0.0.1:0" in capsys.readouterr().err


def test_main_threads_max_body_bytes_onto_the_handler_class(fake_server):
    serve.main(["--max-body-bytes", "1234"])
    assert _Handler.max_body_bytes == 1234
    _Handler.max_body_bytes = DEFAULT_MAX_BODY_BYTES  # restore the class-level default


def test_main_without_fake_flag_does_not_touch_hte_llm_mode(fake_server, monkeypatch):
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)
    serve.main([])
    assert "HTE_LLM_MODE" not in __import__("os").environ


def test_main_with_fake_flag_sets_hte_llm_mode_fake(fake_server, monkeypatch, capsys):
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)
    rc = serve.main(["--fake"])
    assert rc == 0
    assert __import__("os").environ["HTE_LLM_MODE"] == "fake"
    assert "(HTE_LLM_MODE=fake)" in capsys.readouterr().err


# `if __name__ == "__main__": raise SystemExit(main())` (the module's last
# two lines) is deliberately not covered here: unlike this package's other
# CLI modules, `hte.serve`'s own `main()` calls a real, blocking
# `server.serve_forever()`, so reaching this guard the way `tests/swarm3/
# test_cli_props.py` reaches its sibling guard, via `runpy.run_module`,
# would re-import `ThreadingHTTPServer` fresh in a new namespace, outside
# this file's own `fake_server` monkeypatch (which only replaces the
# `hte.serve` module's already-imported attribute), and hang on a real
# socket bind and an unanswered `serve_forever()` with nothing left to
# raise `KeyboardInterrupt` into it. `main()` itself, exercised directly
# above, is the guard's entire body; the guard line is two characters of
# boilerplate identical to every sibling CLI module's own.
