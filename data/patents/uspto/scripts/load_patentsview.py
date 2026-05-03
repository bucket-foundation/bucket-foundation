#!/usr/bin/env python3
"""load_patentsview.py — bulk-load PatentsView snapshots into Postgres.

Bead: bkt-5qg / bkt-tfu (Bucket Foundation Global Patent Index)

Pipeline:
    fetch_patentsview.sh   ->   ./parquet/patentsview/*.tsv.zip
    psql -f schema/uspto.sql                          (creates patents.* tables)
    load_patentsview.py    ->   patents.uspto_*       (this script)

Design choices:
    * Stdlib + duckdb only. No pandas, no sqlalchemy. Keeps runtime image small
      and cold-start fast on the loader pod.
    * DuckDB reads zipped TSV directly via `read_csv` and converts to parquet
      in-place, then we COPY parquet into Postgres via psycopg's COPY protocol.
      (psycopg is the one extra dep — TODO note below.)
    * Idempotent at the row level: every load is `INSERT ... ON CONFLICT DO UPDATE`
      so reruns converge instead of duplicating.

Env:
    DATABASE_URL    postgres://user:pass@host:5432/db   (required at runtime)
    PV_DIR          override input dir (default: ../parquet/patentsview)

Usage:
    DATABASE_URL=postgres://... python3 load_patentsview.py [--table g_patent]
    python3 load_patentsview.py --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# TODO(bkt-5qg): pip install psycopg[binary] duckdb — pin in requirements.txt
# import duckdb
# import psycopg

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PV_DIR = ROOT / "parquet" / "patentsview"

# Mapping: PatentsView table -> (target Postgres table, conflict-key columns)
TABLE_MAP: dict[str, tuple[str, tuple[str, ...]]] = {
    "g_patent":                 ("patents.uspto_grant",       ("patent_id",)),
    "g_inventor":               ("patents.uspto_inventor",    ("inventor_id", "patent_id")),
    "g_inventor_disambiguated": ("patents.uspto_inventor",    ("inventor_id", "patent_id")),
    "g_assignee":               ("patents.uspto_assignee",    ("assignee_id", "patent_id")),
    "g_assignee_disambiguated": ("patents.uspto_assignee",    ("assignee_id", "patent_id")),
    "g_location_disambiguated": ("patents.uspto_location",    ("location_id",)),
    "g_us_patent_citation":     ("patents.uspto_citation",    ("citing_patent_id", "cited_patent_id", "citation_sequence")),
    # g_cpc_current loads as an array update on patents.uspto_grant.cpc_codes — TODO
}


def unzip_to_parquet(tsv_zip: Path, out_dir: Path) -> Path:
    """Convert PatentsView TSV.zip -> parquet using DuckDB in-process.

    TODO(bkt-5qg): implement. Approximate sketch:
        con = duckdb.connect()
        out = out_dir / (tsv_zip.stem + ".parquet")
        con.execute(f\"\"\"
            COPY (SELECT * FROM read_csv_auto('{tsv_zip}', delim='\\t', header=true))
            TO '{out}' (FORMAT PARQUET, COMPRESSION ZSTD);
        \"\"\")
        return out
    """
    raise NotImplementedError("unzip_to_parquet — wiring deferred to runtime bead")


def copy_parquet_to_postgres(parquet_path: Path, target_table: str, conflict_keys: tuple[str, ...], dsn: str) -> int:
    """Bulk-COPY parquet rows into Postgres.

    Strategy:
        1. CREATE TEMP TABLE LIKE target_table.
        2. duckdb COPY parquet -> temp via psycopg COPY FROM STDIN with binary format.
        3. INSERT INTO target SELECT ... FROM temp ON CONFLICT (keys) DO UPDATE.
        4. Return rowcount.

    TODO(bkt-5qg): wire psycopg + duckdb integration. Stream rows via Arrow batches
    so we never materialize the full table in Python memory.
    """
    raise NotImplementedError("copy_parquet_to_postgres — wiring deferred to runtime bead")


def load_table(pv_table: str, pv_dir: Path, dsn: str, dry_run: bool = False) -> None:
    if pv_table not in TABLE_MAP:
        raise SystemExit(f"unknown PatentsView table: {pv_table}")

    target, conflict_keys = TABLE_MAP[pv_table]
    src_zip = pv_dir / f"{pv_table}.tsv.zip"
    if not src_zip.exists():
        print(f"[load] SKIP {pv_table}: missing {src_zip}", file=sys.stderr)
        return

    print(f"[load] {pv_table} -> {target} (conflict={conflict_keys})")
    if dry_run:
        return

    parquet_path = unzip_to_parquet(src_zip, pv_dir)
    n = copy_parquet_to_postgres(parquet_path, target, conflict_keys, dsn)
    print(f"[load] {pv_table}: {n} rows upserted")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--table", help="load a single PatentsView table; default: all")
    ap.add_argument("--pv-dir", default=str(DEFAULT_PV_DIR), help="parquet/TSV input dir")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL", "")
    if not dsn and not args.dry_run:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        return 2

    pv_dir = Path(args.pv_dir)
    targets = [args.table] if args.table else list(TABLE_MAP.keys())
    for tbl in targets:
        load_table(tbl, pv_dir, dsn, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
