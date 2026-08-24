#!/usr/bin/env python3
"""
bkt-ibj, embed claim 1 + abstract per patent via local llama.cpp embedding server.

Assumes: llama-server -m models/bge-small-en-v1.5-q8_0.gguf --embedding -ngl 99 --port 8081
Resumable: skips patent_ids already present in patent_embedding table.

Throughput on Radeon RX 7600M XT (Vulkan, batch 64): ~800-1200 chunks/sec.
"""
from __future__ import annotations
import argparse
import os
import sys
import time
from pathlib import Path

import duckdb
import requests
from tqdm import tqdm

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "patents.duckdb"
EMBED_URL = os.environ.get("BUCKET_EMBED_URL", "http://localhost:8081/v1/embeddings")
MODEL = "bge-small-en-v1.5"


def embed_batch(texts: list[str]) -> list[list[float]]:
    """POST to llama-server OpenAI-compatible embedding endpoint."""
    r = requests.post(
        EMBED_URL,
        json={"model": MODEL, "input": texts},
        timeout=120,
    )
    r.raise_for_status()
    data = r.json()["data"]
    # llama-server returns in input order
    return [row["embedding"] for row in data]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--resume", action="store_true", help="skip patents already embedded")
    ap.add_argument("--limit", type=int, default=None, help="stop after N (for smoke tests)")
    args = ap.parse_args()

    con = duckdb.connect(str(DB))

    # Build the queue of patent_ids to embed
    where_clause = ""
    if args.resume:
        where_clause = """
 WHERE p.patent_id NOT IN (SELECT patent_id FROM patent_embedding)
        """
    limit_clause = f"LIMIT {args.limit}" if args.limit else ""

    rows = con.execute(f"""
 SELECT
 p.patent_id,
 COALESCE(p.patent_title, '') || '. ' ||
 COALESCE(p.patent_abstract, '') || ' ' ||
 COALESCE(c.claim_text, '') AS text
 FROM patent p LEFT JOIN claim c USING (patent_id)
 {where_clause}
 {limit_clause}
    """).fetchall()

    if not rows:
        print("==> nothing to embed. (rerun without --resume to re-embed everything)")
        return 0

    print(f"==> embedding {len(rows):,} patents via {EMBED_URL} (batch={args.batch})")

    # Smoke-test the embed server
    try:
        v = embed_batch(["smoke test"])[0]
        if len(v) != 384:
            print(f"!!! embedding dim mismatch: got {len(v)}, expected 384", file=sys.stderr)
            return 2
    except Exception as e:
        print(f"!!! embedding server not reachable at {EMBED_URL}: {e}", file=sys.stderr)
        print("    start it with:", file=sys.stderr)
        print(f"    {ROOT}/.bin/llama-server -m {ROOT}/models/bge-small-en-v1.5-q8_0.gguf --embedding -ngl 99 --port 8081", file=sys.stderr)
        return 1

    pbar = tqdm(total=len(rows), unit="patents")
    t0 = time.time()
    n_done = 0
    for i in range(0, len(rows), args.batch):
        batch = rows[i:i + args.batch]
        texts = [r[1][:8000] for r in batch]  # bge-small ctx is 512 tokens but server clamps
        ids = [r[0] for r in batch]
        try:
            vecs = embed_batch(texts)
        except Exception as e:
            print(f"\n!!! batch failed at offset {i}: {e}", file=sys.stderr)
            time.sleep(2)
            continue
        # Bulk insert into DuckDB
        con.executemany(
            "INSERT OR REPLACE INTO patent_embedding (patent_id, embedding) VALUES (?, ?)",
            list(zip(ids, vecs)),
        )
        n_done += len(batch)
        pbar.update(len(batch))
    pbar.close()

    elapsed = time.time() - t0
    rate = n_done / max(elapsed, 1e-3)
    print(f"==> embedded {n_done:,} patents in {elapsed:.1f}s ({rate:.0f}/sec)")

    # Build vss index after a meaningful chunk lands
    print("==> building/refreshing vss HNSW index ...")
    con.execute("LOAD vss;")
    con.execute("DROP INDEX IF EXISTS patent_embedding_hnsw;")
    con.execute("""
 CREATE INDEX patent_embedding_hnsw
 ON patent_embedding USING HNSW (embedding)
 WITH (metric = 'cosine');
    """)
    print("==> done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
