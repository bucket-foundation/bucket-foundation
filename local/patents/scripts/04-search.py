#!/usr/bin/env python3
"""
bkt-ibj — hybrid search over the local patent index (FTS + vss + RRF).

Mirrors the Kruse Index fusion recipe (~/jackkruse/): FTS BM25 ranks fused with
dense cosine ranks via Reciprocal Rank Fusion (k=60).

Usage:
    ./04-search.py "memristor neuromorphic computing"
    ./04-search.py "edison filament" --from 1879 --to 1881 --limit 20
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

import duckdb
import requests

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "patents.duckdb"
EMBED_URL = "http://localhost:8081/v1/embeddings"
RRF_K = 60


def embed(text: str) -> list[float]:
    r = requests.post(EMBED_URL, json={"model": "bge-small-en-v1.5", "input": [text]}, timeout=30)
    r.raise_for_status()
    return r.json()["data"][0]["embedding"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="+")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--from", dest="frm", type=str, default=None, help="grant_date >= YYYY-MM-DD")
    ap.add_argument("--to", type=str, default=None, help="grant_date <= YYYY-MM-DD")
    ap.add_argument("--cpc", type=str, default=None, help="CPC class prefix filter, e.g. G06N")
    args = ap.parse_args()

    q = " ".join(args.query)
    con = duckdb.connect(str(DB), read_only=True)
    con.execute("LOAD fts; LOAD vss;")

    # Sparse: BM25 via FTS
    fts_rows = con.execute(
        """
        SELECT patent_id, fts_main_patent_fts_doc.match_bm25(patent_id, ?) AS score
        FROM patent_fts_doc
        WHERE score IS NOT NULL
        ORDER BY score DESC
        LIMIT 200
        """,
        [q],
    ).fetchall()

    # Dense: vss cosine
    try:
        vec = embed(q)
        dense_rows = con.execute(
            """
            SELECT patent_id, array_cosine_similarity(embedding, ?::FLOAT[384]) AS score
            FROM patent_embedding
            ORDER BY score DESC
            LIMIT 200
            """,
            [vec],
        ).fetchall()
    except Exception as e:
        print(f"!!! dense path skipped (embed server down?): {e}", file=sys.stderr)
        dense_rows = []

    # RRF fusion
    rrf: dict[str, float] = {}
    for rank, (pid, _) in enumerate(fts_rows):
        rrf[pid] = rrf.get(pid, 0.0) + 1.0 / (RRF_K + rank + 1)
    for rank, (pid, _) in enumerate(dense_rows):
        rrf[pid] = rrf.get(pid, 0.0) + 1.0 / (RRF_K + rank + 1)

    fused = sorted(rrf.items(), key=lambda kv: -kv[1])
    if not fused:
        print("(no results)")
        return 0

    pids = [p for p, _ in fused[: max(args.limit * 4, 40)]]
    placeholders = ",".join(["?"] * len(pids))
    where_extra = []
    params: list = list(pids)
    if args.frm:
        where_extra.append("grant_date >= ?")
        params.append(args.frm)
    if args.to:
        where_extra.append("grant_date <= ?")
        params.append(args.to)
    extra_sql = (" AND " + " AND ".join(where_extra)) if where_extra else ""
    rows = con.execute(
        f"""
        SELECT patent_id, grant_date, patent_title,
               substr(coalesce(patent_abstract,''), 1, 220) AS abstract_snippet
        FROM patent
        WHERE patent_id IN ({placeholders}) {extra_sql}
        """,
        params,
    ).fetchall()

    by_id = {r[0]: r for r in rows}
    print(f"\n==> top {args.limit} for: {q!r}\n")
    shown = 0
    for pid, score in fused:
        if pid not in by_id:
            continue
        r = by_id[pid]
        print(f"  US{r[0]:>9}  {r[1]}  rrf={score:.4f}")
        print(f"    {r[2]}")
        if r[3]:
            print(f"    {r[3]}...")
        print(f"    https://patents.google.com/patent/US{r[0]}")
        print()
        shown += 1
        if shown >= args.limit:
            break
    return 0


if __name__ == "__main__":
    sys.exit(main())
