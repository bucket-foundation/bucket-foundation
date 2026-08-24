#!/usr/bin/env python3
"""
bkt-ibj, ingest PatentsView snapshots into DuckDB.

Mirrors the schema in data/patents/uspto/schema/uspto.sql at a high level,
but adapted for DuckDB (no schemas namespace, no FK enforcement) and
scoped to claim 1 + abstract + bibliographic for v1 local index.

Re-runnable: drops + recreates tables. Idempotent given the same input parquets.
"""
from __future__ import annotations
import os
import sys
import duckdb
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "raw" / "patentsview"
DB = ROOT / "data" / "patents.duckdb"
DB.parent.mkdir(parents=True, exist_ok=True)


def src(name: str) -> str:
    """Return DuckDB read_parquet/read_csv expression for a table by name."""
    pq = DATA / f"{name}.parquet"
    if pq.exists():
        return f"read_parquet('{pq}')"
    tsv = DATA / f"{name}.tsv"
    if tsv.exists():
        return f"read_csv_auto('{tsv}', delim='\\t', header=true, ignore_errors=true)"
    raise FileNotFoundError(f"missing snapshot: {name} (looked in {DATA})")


def main() -> int:
    print(f"==> opening {DB}")
    con = duckdb.connect(str(DB))
    con.execute("INSTALL fts; LOAD fts;")
    con.execute("INSTALL vss; LOAD vss;")

    print("==> creating tables ...")

    # Bibliographic core
    con.execute(f"""
 CREATE OR REPLACE TABLE patent AS
 SELECT
 patent_id,
 patent_type,
 patent_title,
 patent_abstract,
 patent_date AS grant_date,
 CAST(num_claims AS INTEGER) AS num_claims
 FROM {src('g_patent')}
 WHERE patent_id IS NOT NULL;
    """)

    con.execute(f"""
 CREATE OR REPLACE TABLE inventor AS
 SELECT
 patent_id,
 inventor_id,
 disambig_inventor_name_first AS first_name,
 disambig_inventor_name_last AS last_name
 FROM {src('g_inventor_disambiguated')};
    """)

    con.execute(f"""
 CREATE OR REPLACE TABLE assignee AS
 SELECT
 patent_id,
 assignee_id,
 disambig_assignee_organization AS org,
 disambig_assignee_individual_name_first AS first_name,
 disambig_assignee_individual_name_last AS last_name
 FROM {src('g_assignee_disambiguated')};
    """)

    con.execute(f"""
 CREATE OR REPLACE TABLE location AS
 SELECT
 location_id,
 disambig_city AS city,
 disambig_state AS state,
 disambig_country AS country,
 CAST(latitude AS DOUBLE) AS lat,
 CAST(longitude AS DOUBLE) AS lng
 FROM {src('g_location_disambiguated')};
    """)

    con.execute(f"""
 CREATE OR REPLACE TABLE cpc AS
 SELECT patent_id, cpc_section, cpc_class, cpc_subclass, cpc_group, cpc_sequence
 FROM {src('g_cpc_current')};
    """)

    # Citations (skip if too large for first pass)
    try:
        con.execute(f"""
 CREATE OR REPLACE TABLE citation AS
 SELECT patent_id, citation_patent_id, citation_category
 FROM {src('g_us_patent_citation')};
        """)
    except Exception as e:
        print(f"   (skipping citations table: {e})")

    # Claim 1 only for v1 dense index (full claims explode VRAM budget)
    try:
        con.execute(f"""
 CREATE OR REPLACE TABLE claim AS
 SELECT patent_id, CAST(claim_sequence AS INTEGER) AS seq, claim_text
 FROM {src('g_claim')}
 WHERE CAST(claim_sequence AS INTEGER) = 1;
        """)
    except Exception as e:
        print(f"   (skipping claims table: {e})")

    # FTS index over title + abstract + claim 1
    print("==> building FTS index (sparse layer) ...")
    con.execute("""
 CREATE OR REPLACE TABLE patent_fts_doc AS
 SELECT
 p.patent_id,
 COALESCE(p.patent_title, '') || ' ' ||
 COALESCE(p.patent_abstract, '') || ' ' ||
 COALESCE(c.claim_text, '') AS doc
 FROM patent p LEFT JOIN claim c USING (patent_id);
    """)
    con.execute("PRAGMA create_fts_index('patent_fts_doc', 'patent_id', 'doc', overwrite=1);")

    # Empty embeddings table; populated by 03-embed.py
    con.execute("""
 CREATE TABLE IF NOT EXISTS patent_embedding (
 patent_id VARCHAR PRIMARY KEY,
 embedding FLOAT[384]
 );
    """)

    # Stats
    n = con.execute("SELECT count(*) FROM patent").fetchone()[0]
    print(f"==> ingest done: {n:,} grants in DuckDB at {DB}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
