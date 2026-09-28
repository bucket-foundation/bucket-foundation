from __future__ import annotations

import json
import sys

import pytest

from workbench.cadence import CadenceProxy, CadenceTimeout, CadenceUnavailable
from workbench.service import ToolError

from .conftest import FIXTURES, staff

FAKE = [sys.executable, str(FIXTURES / "fake_cadence.py")]

@pytest.fixture
def proxy():
    p = CadenceProxy(FAKE, start_timeout=3, call_timeout=2, render_timeout=4)
    yield p
    p.close()

def test_prefix_and_forward(proxy):
    names = [t["name"] for t in proxy.tools()]
    assert names == ["cadence_create_track", "cadence_render"]
    out = proxy.call("cadence_create_track", {"name": "vo"})
    assert json.loads(out["content"][0]["text"]) == {"called": "create_track", "args": {"name": "vo"}}

def test_crash_restarts_once(proxy, tmp_path, monkeypatch):
    count = tmp_path / "count"
    monkeypatch.setenv("FAKE_CADENCE_COUNT", str(count))
    proxy.tools()
    with pytest.raises(CadenceUnavailable):
        proxy.call("cadence_crash", {})
    assert count.read_text().count("start") == 2

def test_call_timeout_then_unavailable_window(proxy):
    with pytest.raises(CadenceTimeout):
        proxy.call("cadence_hang", {})
    with pytest.raises(CadenceUnavailable, match="cooling down"):
        proxy.call("cadence_create_track", {})

def test_start_timeout(monkeypatch):
    monkeypatch.setenv("FAKE_CADENCE_MODE", "slow_start")
    p = CadenceProxy(FAKE, start_timeout=1, call_timeout=1)
    with pytest.raises((CadenceTimeout, CadenceUnavailable)):
        p.tools()
    p.close()

def test_missing_binary():
    p = CadenceProxy([])
    assert p.tools() == []
    with pytest.raises(CadenceUnavailable, match="CADENCE_MCP_BIN"):
        p.call("cadence_render", {})

def test_service_maps_cadence_errors(bench):
    with pytest.raises(ToolError) as exc:
        bench.call(staff(), "cadence_render", {})
    assert exc.value.code == "cadence_unavailable"
