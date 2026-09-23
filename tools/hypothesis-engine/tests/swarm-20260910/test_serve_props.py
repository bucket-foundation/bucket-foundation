from __future__ import annotations

import json
import threading
from http.server import ThreadingHTTPServer

import pytest

from hte import serve
from hte.api import CampaignError, HypothesizeError
from hte.serve import DEFAULT_MAX_BODY_BYTES, DEFAULT_PORT, _Handler, build_parser
from tests.test_serve import (
    _fixture_request,
    _post,
)

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
    def _boom(request, *, config=None):
        raise HypothesizeError("a base-class failure neither subclass names")

    monkeypatch.setattr(serve, "hypothesize", _boom)
    body = json.dumps(_fixture_request()).encode("utf-8")
    status, payload = _post(server, "/hypothesize", body)
    assert status == 502
    assert payload["ok"] is False
    assert payload["error"] == "a base-class failure neither subclass names"

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

class _FakeServer:

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
    _Handler.max_body_bytes = DEFAULT_MAX_BODY_BYTES

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


