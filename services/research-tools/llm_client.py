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
    return bool(os.environ.get("LLM_BASE_URL"))

def chat(
    system: str,
    user: str,
    *,
    max_tokens: int = 700,
    temperature: float = 0.2,
    timeout: Optional[float] = None,
) -> Optional[str]:
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
        return None
    except Exception:
        return None
