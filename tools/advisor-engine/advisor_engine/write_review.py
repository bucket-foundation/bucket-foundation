from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

from .paths import write_private
from .query import Result
from .scan import assert_clean

SCHEMA = "bucket.advisor-review/1"
ROW_KEYS = ("institution", "country", "field", "order_status", "identity", "research_areas", "shared_terms", "reasons", "lineage", "unknowns", "profile_url")


def review(r: Result) -> dict:
    rows = []
    for row in r.rows:
        out = {"rank": row["position"], "name": row["name"], "score": row["score"], "percentile": row["percentile"]}
        out.update({k: row[k] for k in ROW_KEYS if row[k] not in ("", [])})
        out["coverage"] = r.warnings or ["No coverage warning for this search."]
        rows.append(out)
    return {
        "schema": SCHEMA,
        "context": {"key": re.sub(r"[^A-Za-z0-9]", "", r.build_id)[:32], "summary": " ".join([r.summary, *r.warnings]), "order_status": r.mode},
        "rows": rows,
    }


def save(home: Path, r: Result, target: Path | None = None) -> Path:
    body = json.dumps(review(r), ensure_ascii=False, indent=1)
    assert_clean(body)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return write_private(home, target or home / "out" / f"review-{stamp}.json", body.encode())
