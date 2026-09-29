from __future__ import annotations

import json
import secrets as pysecrets
import time

import pytest

from workbench import auth
from workbench.service import ToolError

from .conftest import FOUNDER, STAFF, audit_lines, founder, staff


class Clock:
    def __init__(self):
        self.t = 1_000_000.0

    def __call__(self):
        return self.t


def test_token_issue_and_verify(tmp_path):
    store = auth.TokenStore(tmp_path / "t.json")
    _tid, secret = store.issue(STAFF, ["read", "local"])
    p = store.verify(secret)
    assert p.user == STAFF and p.role == "staff" and p.scopes == {"read", "local"}
    raw = (tmp_path / "t.json").read_text()
    assert secret not in raw
    assert oct((tmp_path / "t.json").stat().st_mode)[-3:] == "600"


def test_token_scopes_capped_by_role(tmp_path):
    store = auth.TokenStore(tmp_path / "t.json")
    _, secret = store.issue(STAFF, ["read", "repo", "gdrive"])
    assert store.verify(secret).scopes == {"read"}
    _, fsecret = store.issue(FOUNDER, ["read", "repo"])
    assert store.verify(fsecret).scopes == {"read", "repo"}


def test_token_expiry(tmp_path):
    clock = Clock()
    store = auth.TokenStore(tmp_path / "t.json", clock)
    _, secret = store.issue(STAFF, ["read"], ttl_days=1)
    clock.t += 86401
    with pytest.raises(auth.AuthError, match="expired"):
        store.verify(secret)


def test_ttl_bounds(tmp_path):
    store = auth.TokenStore(tmp_path / "t.json")
    with pytest.raises(ValueError):
        store.issue(STAFF, ["read"], ttl_days=31)
    with pytest.raises(ValueError):
        store.issue(STAFF, ["root"])


def test_revoke(tmp_path):
    store = auth.TokenStore(tmp_path / "t.json")
    tid, secret = store.issue(STAFF, ["read"])
    store.revoke(tid)
    with pytest.raises(auth.AuthError, match="revoked"):
        store.verify(secret)
    assert store.list()[0]["active"] is False


def test_rotate_overlap(tmp_path):
    clock = Clock()
    store = auth.TokenStore(tmp_path / "t.json", clock)
    tid, old = store.issue(STAFF, ["read", "local"])
    new_id, new = store.rotate(tid)
    assert new_id != tid
    assert store.verify(old).user == STAFF
    assert store.verify(new).scopes == {"read", "local"}
    clock.t += auth.ROTATE_GRACE_S + 1
    with pytest.raises(auth.AuthError, match="expired"):
        store.verify(old)
    assert store.verify(new).user == STAFF


@pytest.mark.parametrize("secret", [None, "", "nope", "bwt_abc_def", "bwt_" + "x" * 40])
def test_bad_tokens(tmp_path, secret):
    with pytest.raises(auth.AuthError):
        auth.TokenStore(tmp_path / "t.json").verify(secret)


def _signed(key: bytes, clock: Clock, **over):
    msg = {"user": STAFF, "role": "staff", "exp": clock.t + 30, "nonce": pysecrets.token_hex(12)} | over
    body = json.dumps(msg).encode()
    return body, auth.sign(body, key)


def test_signed_request_accepts_and_rejects_replay():
    clock, key = Clock(), b"k" * 32
    signer = auth.SignedRequests([key], clock)
    body, sig = _signed(key, clock)
    p, _ = signer.verify(body, sig)
    assert p.user == STAFF and p.role == "staff"
    with pytest.raises(auth.AuthError, match="replayed"):
        signer.verify(body, sig)


def test_signed_request_unsigned_and_expired():
    clock, key = Clock(), b"k" * 32
    signer = auth.SignedRequests([key], clock)
    body, sig = _signed(key, clock)
    with pytest.raises(auth.AuthError, match="bad signature"):
        signer.verify(body, None)
    with pytest.raises(auth.AuthError, match="bad signature"):
        signer.verify(body, auth.sign(body, b"z" * 32))
    body, sig = _signed(key, clock, exp=clock.t - 1)
    with pytest.raises(auth.AuthError, match="expired"):
        signer.verify(body, sig)
    body, sig = _signed(key, clock, exp=clock.t + 3600)
    with pytest.raises(auth.AuthError, match="expired"):
        signer.verify(body, sig)


def test_signing_key_rotation(monkeypatch):
    clock, old, new = Clock(), b"o" * 32, b"n" * 32
    monkeypatch.setenv("WORKBENCH_SIGNING_KEYS", f"{new.decode()},{old.decode()}")
    signer = auth.SignedRequests(auth.signing_keys(), clock)
    for key in (new, old):
        body, sig = _signed(key, clock)
        assert signer.verify(body, sig)[0].user == STAFF
    monkeypatch.setenv("WORKBENCH_SIGNING_KEYS", "short")
    with pytest.raises(auth.AuthError, match="32 characters"):
        auth.signing_keys()


def test_signed_role_checks():
    clock, key = Clock(), b"k" * 32
    signer = auth.SignedRequests([key], clock)
    body, sig = _signed(key, clock, role="learner")
    with pytest.raises(auth.AuthError, match="not staff"):
        signer.verify(body, sig)
    body, sig = _signed(key, clock, role="founder")
    with pytest.raises(auth.AuthError, match="founder role"):
        signer.verify(body, sig)
    body, sig = _signed(key, clock, role="founder", user=FOUNDER)
    assert signer.verify(body, sig)[0].founder
    body, sig = _signed(key, clock, role="staff", user=FOUNDER)
    assert not signer.verify(body, sig)[0].founder


def test_scope_rules(bench):
    with pytest.raises(ToolError) as exc:
        bench.call(staff(), "pub", {"word": "x"})
    assert exc.value.code == "forbidden"
    assert bench.call(staff(), "mine", {"word": "x"})["ok"]
    with pytest.raises(ToolError) as exc:
        bench.call(staff(), "mine", {"word": "x", "for_user": "other@example.org"})
    assert exc.value.code == "forbidden"
    r = bench.call(founder(), "mine", {"word": "x", "for_user": "other@example.org"})
    assert "other-example-org" in r["run_dir"]
    assert bench.call(founder(), "pub", {"word": "x"})["ok"]
    with pytest.raises(ToolError) as exc:
        bench.call(auth.anonymous(), "echo", {"word": "x"})
    assert exc.value.code == "forbidden"
    assert bench.call(auth.anonymous(), "look", {"word": "x"})["ok"]
    results = [(line["user"], line["tool"], line["result"].split(":")[0]) for line in audit_lines(bench)]
    assert (STAFF, "pub", "refused") in results
    assert (STAFF, "mine", "done") in results
    assert (FOUNDER, "pub", "done") in results
    assert ("local", "echo", "refused") in results


def test_pending_tool_refused(bench):
    with pytest.raises(ToolError) as exc:
        bench.call(founder(), "later", {"word": "x"})
    assert exc.value.code == "pending" and "PR #1" in str(exc.value)


def test_list_hides_out_of_scope(bench):
    assert {t["id"] for t in bench.list_tools(staff())} == {"echo", "mine", "look", "later"}
    assert {t["id"] for t in bench.list_tools(auth.anonymous())} == {"look"}
    assert "pub" in {t["id"] for t in bench.list_tools(founder())}


def test_founder_requires_env(monkeypatch):
    monkeypatch.setenv("BUCKET_FOUNDER_EMAIL", "")
    assert auth.principal(FOUNDER).role == "staff"
    time.sleep(0)
