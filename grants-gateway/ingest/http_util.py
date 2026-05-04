"""Tiny stdlib HTTP helper with retry + polite UA. No third-party deps."""
from __future__ import annotations

import gzip
import io
import json
import time
import urllib.error
import urllib.request
from typing import Any, Optional

UA = "bucket-foundation-grants-gateway/0.1 (+https://bucket.foundation; ops@bucket.foundation)"


def _open(req: urllib.request.Request, timeout: int = 60) -> bytes:
    last: Optional[Exception] = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read()
                if r.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                return raw
        except urllib.error.HTTPError as e:
            # Don't retry permanent client errors (4xx). Retry 408/429/5xx.
            if e.code in (408, 425, 429) or 500 <= e.code < 600:
                last = e
                wait = 2 ** attempt
                time.sleep(wait)
                continue
            raise RuntimeError(f"HTTP {e.code} {req.full_url}") from e
        except (urllib.error.URLError, TimeoutError) as e:
            last = e
            wait = 2 ** attempt
            time.sleep(wait)
    raise RuntimeError(f"HTTP failed after retries: {last}")


def get(url: str, *, headers: Optional[dict] = None, timeout: int = 60) -> bytes:
    h = {"User-Agent": UA, "Accept-Encoding": "gzip"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    return _open(req, timeout=timeout)


def get_json(url: str, *, headers: Optional[dict] = None, timeout: int = 60) -> Any:
    raw = get(url, headers=headers, timeout=timeout)
    return json.loads(raw.decode("utf-8"))


def post_json(url: str, body: dict, *, headers: Optional[dict] = None, timeout: int = 120) -> Any:
    h = {
        "User-Agent": UA,
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if headers:
        h.update(headers)
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    raw = _open(req, timeout=timeout)
    return json.loads(raw.decode("utf-8"))
