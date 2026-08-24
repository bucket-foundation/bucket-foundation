"""research-tools, shared LLM client (the ONE configurable LLM seam)
====================================================================

A single, tiny OpenAI-compatible chat client used by the optional LLM step in
the research tools (ProtocolGPT methods->protocol polish, QuantumBioRAG answer
synthesis). It points at whatever OpenAI-compatible endpoint the environment
names, by default Gian's LOCAL GPU LLM (Ollama on the AMD RX 7600 at
http://localhost:11434/v1, model qwen3.5:latest). The default stays on-device.

DESIGN CONTRACT (the whole point):
 * The deterministic / rule-based path in each tool stays the PRODUCT. This
 client is only an *optional polish/synthesis* layer on top of it.
 * `chat()` NEVER raises and NEVER hangs the request. On ANY problem
 (env not set, endpoint down, timeout, bad status, malformed body) it
 returns None, and the caller falls back to its deterministic output.
 Never hard-fail.
 * stdlib-only (urllib). No SDK, no extra dependency in the gateway image.

ENV (all optional; absence => `enabled()` is False => callers stay rule-based):
 LLM_BASE_URL OpenAI-compatible base, e.g. http://localhost:11434/v1
 (the trailing /v1 is expected; /chat/completions is appended).
 LLM_MODEL model id (default qwen3.5:latest).
 LLM_API_KEY optional bearer token (sent as `Authorization: Bearer ...`).
 Required when going through the prod auth-shim/tunnel; unused
 for a bare local Ollama.
 LLM_TIMEOUT_S per-request timeout in seconds (default 20).

Security: the API key is read from the environment only, never logged, never
echoed, never written to disk by this module.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Optional

DEFAULT_BASE_URL = "http://localhost:11434/v1"
DEFAULT_MODEL = "qwen3.5:latest"
DEFAULT_TIMEOUT_S = 20.0


def base_url() -> str:
    return (os.environ.get("LLM_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")


def model() -> str:
    return os.environ.get("LLM_MODEL") or DEFAULT_MODEL


def _timeout() -> float:
    try:
        return float(os.environ.get("LLM_TIMEOUT_S") or DEFAULT_TIMEOUT_S)
    except (TypeError, ValueError):
        return DEFAULT_TIMEOUT_S


def enabled() -> bool:
    """True iff an LLM endpoint is explicitly configured via env.

 We require LLM_BASE_URL to be SET (not defaulted) so the optional polish is
 opt-in per environment: unset => tools run their pure deterministic path,
 exactly as they do today on the box with no key. This keeps prod behavior
 unchanged until someone wires the seam.
    """
    return bool(os.environ.get("LLM_BASE_URL"))


def chat(
    system: str,
    user: str,
    *,
    max_tokens: int = 700,
    temperature: float = 0.2,
    timeout: Optional[float] = None,
) -> Optional[str]:
    """One OpenAI-compatible chat-completion call. Returns the assistant text,
 or None on ANY failure (the caller then uses its deterministic output).

 This function is intentionally total: it swallows every exception and turns
 it into None so a flaky/absent LLM can NEVER break a tool request.
    """
    if not enabled():
        return None

    url = base_url() + "/chat/completions"
    payload: dict[str, Any] = {
        "model": model(),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": int(max_tokens),
        "temperature": float(temperature),
        "stream": False,
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    key = os.environ.get("LLM_API_KEY")
    if key:
        headers["Authorization"] = f"Bearer {key}"

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout or _timeout()) as resp:
            body = resp.read().decode("utf-8", "replace")
        obj = json.loads(body)
        choices = obj.get("choices") or []
        if not choices:
            return None
        msg = (choices[0] or {}).get("message") or {}
        content = msg.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()
        return None
    except (urllib.error.URLError, urllib.error.HTTPError, OSError,
            ValueError, KeyError, TimeoutError):
        # Unreachable / timeout / bad status / malformed JSON -> fall back.
        return None
    except Exception:
        # Defensive: NOTHING from the LLM path may propagate to the caller.
        return None
