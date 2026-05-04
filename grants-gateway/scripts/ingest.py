#!/usr/bin/env python3
"""Run all ingestors (or one) into data/grants.db. Idempotent.

Usage:
    python3 scripts/ingest.py                     # all sources
    python3 scripts/ingest.py --source=grants_gov # one source
    python3 scripts/ingest.py --source=nih        # one source

Sources: grants_gov, nih, nsf, usaspending, foundations
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

# Make `ingest` importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ingest import db as dbmod
from ingest import grants_gov, nih_reporter, nsf_awards, usaspending, foundations_990

SOURCES = {
    "grants_gov":   ("grants.gov",     grants_gov.fetch),
    "nih":          ("nih-reporter",   nih_reporter.fetch),
    "nsf":          ("nsf-awards",     nsf_awards.fetch),
    "usaspending":  ("usaspending",    usaspending.fetch),
    "foundations":  ("irs-990pf",      foundations_990.fetch),
}


def run_one(key: str, con) -> tuple[int, float]:
    label, fn = SOURCES[key]
    print(f"\n=== {label} ===")
    t0 = time.time()
    n = 0
    batch: list[dict] = []
    try:
        for row in fn():
            batch.append(row)
            if len(batch) >= 200:
                n += dbmod.upsert(con, batch)
                batch = []
                print(f"  [{label}] upserted {n} rows ({time.time()-t0:.1f}s)", flush=True)
        if batch:
            n += dbmod.upsert(con, batch)
    except KeyboardInterrupt:
        print(f"\n  [{label}] interrupted; partial upsert {n}")
        if batch:
            n += dbmod.upsert(con, batch)
        raise
    except Exception as e:
        print(f"  [{label}] FAILED after {n} rows: {e}")
        if batch:
            n += dbmod.upsert(con, batch)
    dt = time.time() - t0
    print(f"  [{label}] done: {n} rows in {dt:.1f}s")
    return n, dt


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=sorted(SOURCES.keys()), default=None)
    args = ap.parse_args()

    con = dbmod.connect()
    keys = [args.source] if args.source else list(SOURCES.keys())
    totals: dict[str, tuple[int, float]] = {}
    for k in keys:
        try:
            totals[k] = run_one(k, con)
        except KeyboardInterrupt:
            break

    print("\n=== summary ===")
    for k, (n, dt) in totals.items():
        print(f"  {k:14s}  {n:>7d} rows   {dt:6.1f}s")
    grand = dbmod.count(con)
    print(f"\n  total rows in corpus: {grand}")
    db_size = dbmod.DB_PATH.stat().st_size if dbmod.DB_PATH.exists() else 0
    print(f"  db file size: {db_size/1024/1024:.1f} MiB  ({dbmod.DB_PATH})")
    con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
