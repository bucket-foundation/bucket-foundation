from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

TOPICS_URL = "https://api.openalex.org/topics"
SELECT = "id,display_name,description,keywords,subfield,field,domain"


def topic_text(t: dict) -> str:
    parts = [t.get("display_name") or "", t.get("description") or "", " ".join(t.get("keywords") or [])]
    for level in ("subfield", "field", "domain"):
        v = t.get(level) or {}
        parts.append(v.get("display_name") or "")
    return ". ".join(p for p in parts if p)


def fetch_topics(cache: Path, contact: str | None = None, pause: float = 0.2) -> list[dict]:
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    ua = "bucket.foundation prime-directions" + (f" (mailto:{contact})" if contact else "")
    out, cursor = [], "*"
    while cursor:
        q = urllib.parse.urlencode({"per-page": 200, "cursor": cursor, "select": SELECT})
        req = urllib.request.Request(f"{TOPICS_URL}?{q}", headers={"User-Agent": ua})
        with urllib.request.urlopen(req, timeout=60) as r:
            page = json.load(r)
        for t in page.get("results", []):
            out.append({
                "id": t["id"].rsplit("/", 1)[-1], "name": t.get("display_name") or "",
                "field": (t.get("field") or {}).get("display_name") or "",
                "domain": (t.get("domain") or {}).get("display_name") or "",
                "text": topic_text(t),
            })
        cursor = (page.get("meta") or {}).get("next_cursor")
        time.sleep(pause)
    if not out:
        raise RuntimeError("OpenAlex returned no topics")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(out), encoding="utf-8")
    return out


def load_basis(path: Path) -> list[dict]:
    rows = json.loads(Path(path).read_text(encoding="utf-8"))
    if not rows or not all("text" in r and "name" in r for r in rows):
        raise ValueError(f"{path} is not a basis file of {{name, text}} rows")
    return rows
