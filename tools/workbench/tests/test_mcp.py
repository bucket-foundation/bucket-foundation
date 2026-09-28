from __future__ import annotations

import json
import os
import subprocess
import sys

from workbench import auth
from workbench.paths import REPO

from .conftest import FIXTURES, STAFF

SERVER = REPO / "mcp-server" / "bucket-mcp.py"


def rpc(lines: list[dict], env: dict | None = None) -> list[dict]:
    data = "".join(json.dumps(x) + "\n" for x in lines)
    r = subprocess.run(
        [sys.executable, str(SERVER)],
        input=data,
        capture_output=True,
        text=True,
        timeout=120,
        env={**os.environ, "CADENCE_MCP_BIN": "/nonexistent", **(env or {})},
        check=False,
    )
    assert r.returncode == 0, r.stderr
    return [json.loads(x) for x in r.stdout.splitlines()]


def call(name: str, args: dict, i: int = 1) -> dict:
    return {"jsonrpc": "2.0", "id": i, "method": "tools/call", "params": {"name": name, "arguments": args}}


def test_tools_list_keeps_canon_and_adds_registry():
    (resp,) = rpc([{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}])
    names = [t["name"] for t in resp["result"]["tools"]]
    assert {"canon_search", "bucket_cite", "bucketmath_lookup", "helix_validate"} <= set(names)
    assert "helix_run" not in names
    assert len(names) == len(set(names))


def test_tools_list_with_token_shows_write_tools(data_home):
    _, secret = auth.TokenStore().issue(STAFF, ["read", "local"])
    (resp,) = rpc([{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}], {"BUCKET_WORKBENCH_TOKEN": secret})
    tools = {t["name"]: t for t in resp["result"]["tools"]}
    assert "helix_run" in tools and "helix_publish" not in tools
    assert tools["advisor_review"]["description"].startswith("[pending")


def test_bucketmath_lookup_unchanged():
    (resp,) = rpc([call("bucketmath_lookup", {"q": "lerp simplex", "limit": 3})])
    before = json.loads((FIXTURES / "bucketmath-lookup-before.json").read_text())
    assert resp == before


def test_helix_validate_and_errors(data_home):
    fixture = str(REPO / "tools" / "helix" / "tests" / "fixtures" / "series.json")
    ok, missing, unknown, pending, write = rpc(
        [
            call("helix_validate", {"input": fixture}, 1),
            call("helix_validate", {}, 2),
            call("no_such_tool", {}, 3),
            call("advisor_review", {"statement": fixture}, 4),
            call("helix_run", {"input": fixture}, 5),
        ]
    )
    assert "fixture-topics" in json.loads(ok["result"]["content"][0]["text"])["stdout_tail"]
    assert missing["error"]["code"] == -32602
    assert unknown["error"]["code"] == -32601
    assert pending["error"]["code"] == -32003
    assert write["error"]["code"] == -32003


def test_revoked_token_unauthorized(data_home):
    store = auth.TokenStore()
    tid, secret = store.issue(STAFF, ["read", "local"])
    store.revoke(tid)
    (resp,) = rpc([call("helix_validate", {"input": "x"})], {"BUCKET_WORKBENCH_TOKEN": secret})
    assert resp["error"]["code"] == -32001
    audit = (data_home / "workbench" / "audit.jsonl").read_text()
    assert "revoked" in audit


def test_canon_tool_still_dispatches():
    (resp,) = rpc([call("canon_list_branches", {})])
    assert "branches" in json.loads(resp["result"]["content"][0]["text"])
