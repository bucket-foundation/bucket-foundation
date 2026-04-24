"""On-disk cache for API responses. Keyed by URL+params hash."""
from __future__ import annotations
import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any, Optional

CACHE_DIR = Path(os.path.expanduser("~/.cache/bucket-canon"))
DEFAULT_TTL = 60 * 60 * 24 * 7  # 7 days


def _ensure() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _key(url: str, params: Optional[dict] = None) -> str:
    payload = url + "?" + json.dumps(params or {}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get(url: str, params: Optional[dict] = None, ttl: int = DEFAULT_TTL) -> Optional[Any]:
    _ensure()
    path = CACHE_DIR / f"{_key(url, params)}.json"
    if not path.exists():
        return None
    try:
        blob = json.loads(path.read_text())
    except Exception:
        return None
    if time.time() - blob.get("_at", 0) > ttl:
        return None
    return blob.get("data")


def put(url: str, data: Any, params: Optional[dict] = None) -> None:
    _ensure()
    path = CACHE_DIR / f"{_key(url, params)}.json"
    path.write_text(json.dumps({"_at": time.time(), "data": data}))
