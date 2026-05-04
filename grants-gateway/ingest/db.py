"""Shared SQLite schema + idempotent upsert for the grants corpus.

Schema is the column-projection of the TS `Grant` interface in
../src/types.ts. Keep them aligned by hand for now; v0.2 can codegen.
"""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "grants.db"

DDL = """
CREATE TABLE IF NOT EXISTS grants (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  funder          TEXT NOT NULL,
  source          TEXT NOT NULL,
  summary         TEXT NOT NULL DEFAULT '',
  eligibility     TEXT NOT NULL DEFAULT '',
  topics_json     TEXT NOT NULL DEFAULT '[]',
  amount_max_usd  REAL,
  amount_min_usd  REAL,
  deadline        TEXT,
  rolling         INTEGER NOT NULL DEFAULT 0,
  canonical_url   TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_grants_source   ON grants(source);
CREATE INDEX IF NOT EXISTS idx_grants_funder   ON grants(funder);
CREATE INDEX IF NOT EXISTS idx_grants_deadline ON grants(deadline);
CREATE INDEX IF NOT EXISTS idx_grants_amax     ON grants(amount_max_usd);
CREATE VIRTUAL TABLE IF NOT EXISTS grants_fts USING fts5(
  id UNINDEXED, title, summary, topics, funder, eligibility
);
"""

UPSERT_SQL = """
INSERT INTO grants (id,title,funder,source,summary,eligibility,topics_json,
  amount_max_usd,amount_min_usd,deadline,rolling,canonical_url,last_seen_at)
VALUES (:id,:title,:funder,:source,:summary,:eligibility,:topics_json,
  :amount_max_usd,:amount_min_usd,:deadline,:rolling,:canonical_url,:last_seen_at)
ON CONFLICT(id) DO UPDATE SET
  title          = excluded.title,
  funder         = excluded.funder,
  summary        = excluded.summary,
  eligibility    = excluded.eligibility,
  topics_json    = excluded.topics_json,
  amount_max_usd = excluded.amount_max_usd,
  amount_min_usd = excluded.amount_min_usd,
  deadline       = excluded.deadline,
  rolling        = excluded.rolling,
  canonical_url  = excluded.canonical_url,
  last_seen_at   = excluded.last_seen_at
;
"""

FTS_UPSERT_SQL = """
INSERT INTO grants_fts (id,title,summary,topics,funder,eligibility)
VALUES (:id,:title,:summary,:topics_text,:funder,:eligibility);
"""

FTS_DELETE_SQL = "DELETE FROM grants_fts WHERE id = :id;"


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def connect(path: Optional[Path] = None) -> sqlite3.Connection:
    p = path or DB_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(p))
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("PRAGMA synchronous=NORMAL;")
    con.executescript(DDL)
    return con


def upsert(con: sqlite3.Connection, rows: Iterable[dict]) -> int:
    """Idempotent upsert. Each row dict matches the Grant schema.

    Returns the number of rows touched.
    """
    n = 0
    cur = con.cursor()
    for r in rows:
        topics = r.get("topics") or []
        params = {
            "id": r["id"],
            "title": (r.get("title") or "")[:1000],
            "funder": (r.get("funder") or "unknown")[:500],
            "source": r["source"],
            "summary": r.get("summary") or "",
            "eligibility": r.get("eligibility") or "",
            "topics_json": json.dumps(topics, ensure_ascii=False),
            "amount_max_usd": r.get("amount_max_usd"),
            "amount_min_usd": r.get("amount_min_usd"),
            "deadline": r.get("deadline"),
            "rolling": 1 if r.get("rolling") else 0,
            "canonical_url": r.get("canonical_url") or "",
            "last_seen_at": r.get("last_seen_at") or now_iso(),
        }
        cur.execute(UPSERT_SQL, params)
        cur.execute(FTS_DELETE_SQL, {"id": params["id"]})
        cur.execute(
            FTS_UPSERT_SQL,
            {**params, "topics_text": " ".join(topics)},
        )
        n += 1
        if n % 500 == 0:
            con.commit()
    con.commit()
    return n


def count(con: sqlite3.Connection, source: Optional[str] = None) -> int:
    if source:
        return con.execute(
            "SELECT COUNT(*) FROM grants WHERE source = ?", (source,)
        ).fetchone()[0]
    return con.execute("SELECT COUNT(*) FROM grants").fetchone()[0]
