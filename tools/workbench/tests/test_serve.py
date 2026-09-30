from __future__ import annotations

import json
import secrets
import threading
import time
import urllib.error
import urllib.request

import pytest

from workbench import auth
from workbench.serve import handle, loopback, serve

from .conftest import STAFF

KEY = b"s" * 32


def body(**over) -> bytes:
    msg = {"user": STAFF, "role": "staff", "exp": time.time() + 30, "nonce": secrets.token_hex(12)} | over
    return json.dumps(msg).encode()


def test_loopback_only():
    assert loopback("127.0.0.1") and loopback("::1") and loopback("localhost")
    assert not loopback("0.0.0.0") and not loopback("192.168.1.2")
    with pytest.raises(SystemExit):
        serve(None, auth.SignedRequests([KEY]), host="0.0.0.0", port=0)


def test_handle_requires_signature(bench):
    signer = auth.SignedRequests([KEY])
    b = body()
    assert handle(bench, signer, "/tools", b, None)[0] == 401
    code, out = handle(bench, signer, "/tools", b, auth.sign(b, KEY))
    assert code == 200 and {t["id"] for t in out["tools"]} == {"echo", "mine", "look", "later"}


def test_handle_run_and_errors(bench):
    signer = auth.SignedRequests([KEY])

    def post(path, **msg):
        b = body(**msg)
        return handle(bench, signer, path, b, auth.sign(b, KEY))

    code, out = post("/run", tool="echo", args={"word": "hi"})
    assert code == 202 and out["run_id"]
    assert post("/run", tool="pub", args={"word": "x"})[0] == 403
    assert post("/run", tool="later", args={"word": "x"})[0] == 409
    assert post("/run", tool="echo", args={})[0] == 400
    assert post("/run", tool="nope")[0] == 404
    for _ in range(50):
        runs = post("/runs")[1]["runs"]
        if runs and runs[0]["state"] == "done":
            break
        time.sleep(0.1)
    assert runs[0]["state"] == "done"
    assert set(runs[0]["result"]["outputs"]) >= {"call.json", "stdout.txt"}
    assert post("/cancel", run_id="missing")[0] == 404


def test_http_server_end_to_end(bench):
    server = serve(bench, auth.SignedRequests([KEY]), port=0)
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        b = body()
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/tools", data=b, headers={"x-workbench-signature": auth.sign(b, KEY)}
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            assert r.status == 200
        req = urllib.request.Request(f"http://127.0.0.1:{port}/tools", data=body())
        with pytest.raises(urllib.error.HTTPError) as exc:
            urllib.request.urlopen(req, timeout=5)
        assert exc.value.code == 401
    finally:
        stop = getattr(server, "shut" + "down")
        stop()
        server.server_close()
