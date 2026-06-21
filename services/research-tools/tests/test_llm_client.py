"""Tests for the shared LLM seam (llm_client) and its fall-back contract.

The whole point of the seam is that a flaky/absent LLM NEVER breaks a tool:
  * unset env => disabled => chat() returns None
  * unreachable endpoint => chat() returns None (no raise, no hang)
  * ProtocolGPT + QuantumBioRAG keep their deterministic output when chat==None

No real network is touched: we point LLM_BASE_URL at a dead port.

Run:  cd services/research-tools && python3 -m pytest tests/test_llm_client.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import llm_client  # noqa: E402
import tools_protocol as proto  # noqa: E402
import tools_rag as rag  # noqa: E402


# A guaranteed-dead endpoint: TEST-NET-1 (RFC 5737) never routes anywhere.
DEAD_URL = "http://192.0.2.1:1/v1"


# ---------------------------------------------------------------------------
# llm_client core contract
# ---------------------------------------------------------------------------
def test_disabled_when_no_base_url(monkeypatch):
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    assert llm_client.enabled() is False
    assert llm_client.chat("sys", "hi") is None


def test_enabled_when_base_url_set(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", DEAD_URL)
    assert llm_client.enabled() is True


def test_chat_returns_none_on_unreachable(monkeypatch):
    """Unreachable endpoint must yield None quickly, never raise."""
    monkeypatch.setenv("LLM_BASE_URL", DEAD_URL)
    monkeypatch.setenv("LLM_TIMEOUT_S", "1")
    assert llm_client.chat("sys", "user", timeout=1) is None


def test_defaults(monkeypatch):
    monkeypatch.delenv("LLM_MODEL", raising=False)
    assert llm_client.model() == llm_client.DEFAULT_MODEL
    monkeypatch.setenv("LLM_MODEL", "llama3.2:3b")
    assert llm_client.model() == "llama3.2:3b"


def test_chat_parses_openai_shape(monkeypatch):
    """When the endpoint responds with a valid OpenAI body, chat() returns text."""
    monkeypatch.setenv("LLM_BASE_URL", "http://x/v1")

    class _Resp:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self):
            return (
                b'{"choices":[{"message":{"content":"polished text"}}]}'
            )

    monkeypatch.setattr(llm_client.urllib.request, "urlopen",
                        lambda *a, **k: _Resp())
    assert llm_client.chat("s", "u") == "polished text"


def test_chat_returns_none_on_garbage_body(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://x/v1")

    class _Resp:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self):
            return b"not json at all"

    monkeypatch.setattr(llm_client.urllib.request, "urlopen",
                        lambda *a, **k: _Resp())
    assert llm_client.chat("s", "u") is None


# ---------------------------------------------------------------------------
# ProtocolGPT: deterministic path survives an unreachable LLM
# ---------------------------------------------------------------------------
METHODS = (
    "Add 5 µL Tris buffer, then incubate for 30 min at 37°C. "
    "Centrifuge at 12000 rpm for 10 min. Add 2 µL phenol and mix."
)


def test_protocol_deterministic_when_llm_unreachable(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", DEAD_URL)
    monkeypatch.setenv("LLM_TIMEOUT_S", "1")
    out = proto.run_protocol_gpt({"methods": METHODS})
    assert out["n_steps"] >= 2
    # LLM was configured but unreachable -> polish NOT applied, steps intact.
    assert out["llm_cleanup_applied"] is False
    assert any("incubate" in s["action"].lower() for s in out["steps"])
    # safety lexicon still fired on phenol (deterministic path is the product).
    assert any("toxic" in f["flag"] for f in out["safety_flags"])


def test_protocol_no_llm_when_unset(monkeypatch):
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    out = proto.run_protocol_gpt({"methods": METHODS})
    assert out["llm_cleanup_available"] is False
    assert out["llm_cleanup_applied"] is False


def test_protocol_polish_applied_when_llm_responds(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://x/v1")

    def _fake_chat(system, user, **kw):
        import json as _json
        req = _json.loads(user)
        steps = [{"n": s["n"], "action": f"Polished step {s['n']}"} for s in req["steps"]]
        return _json.dumps({"steps": steps})

    monkeypatch.setattr(proto.llm_client, "chat", _fake_chat)
    out = proto.run_protocol_gpt({"methods": METHODS})
    assert out["llm_cleanup_applied"] is True
    assert out["steps"][0]["action"].startswith("Polished step")
    # structure preserved: numbers/reagents/safety untouched by polish.
    assert any("toxic" in f["flag"] for f in out["safety_flags"])


# ---------------------------------------------------------------------------
# QuantumBioRAG: synthesis is additive + None when LLM down
# ---------------------------------------------------------------------------
def test_qbio_synthesis_none_when_llm_unreachable(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", DEAD_URL)
    monkeypatch.setenv("LLM_TIMEOUT_S", "1")
    # avoid real network for retrieval — force degraded (no works).
    monkeypatch.setattr(rag, "search_works",
                        lambda *a, **k: (_ for _ in ()).throw(rag.NetworkUnavailable()))
    out = rag.run_quantum_bio_rag({"claim": "cryptochrome enables magnetoreception"})
    assert "verdict" in out  # deterministic product present
    assert out["synthesis"] is None  # LLM down -> no synthesis, no crash
    assert out["synthesis_available"] is True  # seam was configured


def test_qbio_no_synthesis_when_llm_unset(monkeypatch):
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.setattr(rag, "search_works",
                        lambda *a, **k: (_ for _ in ()).throw(rag.NetworkUnavailable()))
    out = rag.run_quantum_bio_rag({"claim": "cryptochrome enables magnetoreception"})
    assert out["synthesis"] is None
    assert out["synthesis_available"] is False
