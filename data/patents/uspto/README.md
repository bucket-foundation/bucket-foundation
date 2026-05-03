# USPTO Patent Corpus

Bead: **bkt-5qg** — patents: ingest USPTO PatentsView + bulk XML (1976→present)
Parent epic: **bkt-tfu** — Global Patent Index
Sibling beads: **bkt-sq8** (pgvector embeddings on claims/abstracts), **bkt-nk7** (PostGIS on `uspto_location`)

This is the USPTO ingest pipeline for Bucket Foundation's Global Patent Index.
The index ships **paid from day one** behind feed402 — `raw $0.010 / query $0.005 / insight $0.002` per call.

## Layout

```
data/patents/uspto/
├── README.md             ← this file
├── schema/
│   └── uspto.sql         ← Postgres DDL (patents.* tables; PostGIS+pgvector compatible)
├── scripts/
│   ├── fetch_patentsview.sh   ← downloads PatentsView TSV snapshots (quarterly)
│   ├── fetch_bulk_xml.sh      ← downloads USPTO weekly red book ZIPs
│   └── load_patentsview.py    ← duckdb+psycopg loader skeleton
├── raw/                  ← bulk XML red books (gitignored, ~150GB)
│   └── bulk/{grant,application}/<YYYY>/ipg|ipa*.zip
└── parquet/              ← PatentsView snapshots + converted bulk XML (gitignored, ~80GB)
    └── patentsview/g_*.tsv.zip
```

## Sources

| Source | URL | Cadence | Approx size |
|--------|-----|---------|-------------|
| PatentsView tables | https://patentsview.org/download/data-download-tables | quarterly | ~80 GB compressed |
| USPTO bulk grant red book (PGFR) | https://bulkdata.uspto.gov/data/patent/grant/redbook/fulltext/ | weekly (Tue) | ~2 GB/week |
| USPTO bulk application red book (APP) | https://bulkdata.uspto.gov/data/patent/application/redbook/fulltext/ | weekly (Tue) | ~2 GB/week |

5-year backfill of bulk XML ≈ 150 GB. Full backfill from 1976 ≈ 400 GB.

## Run order

```bash
# 0. one-time: extensions + schema
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS vector;"
psql "$DATABASE_URL" -f schema/uspto.sql

# 1. PatentsView (quarterly snapshot, ~80GB)
./scripts/fetch_patentsview.sh

# 2. Load PatentsView -> Postgres (idempotent upserts)
DATABASE_URL=postgres://... python3 scripts/load_patentsview.py

# 3. Bulk XML weekly red books (~2GB/week, weekly cron)
YEAR_FROM=2020 ./scripts/fetch_bulk_xml.sh

# 4. xml->parquet conversion + load           [TODO bkt-5qg-followup]
#    parses claims, full description, drawings refs into patents.uspto_claim
#    and merges into patents.uspto_grant.raw_blob
```

## Idempotency

* `wget -c -nc` on every download — partial files resume, complete files are skipped.
* Loader uses `INSERT ... ON CONFLICT (key) DO UPDATE` — reruns converge.
* Re-pulling a quarterly PatentsView snapshot replaces the previous one in-place.

## Licensing & redistribution

USPTO patent grants and pre-grant publications are **U.S. Government works under 17 U.S.C. § 105 — public domain**. PatentsView is published by the USPTO Office of the Chief Economist and is explicitly designated for redistribution. We are clear to:

* mirror raw + processed copies on Bucket infrastructure,
* re-serve via the feed402 paywall (`raw / query / insight` tiers),
* expose the citation graph and disambiguated inventor/assignee identities,

as long as we don't claim copyright on the underlying patent text or assert exclusive rights. PatentsView's disambiguation models are themselves public domain (USPTO OCE).

No PII concerns: inventor names + city/state are part of the published patent record.

## What's NOT in this bead

* Embedding generation on claims / abstracts → **bkt-sq8** (pgvector)
* PostGIS geography column on `uspto_location` → **bkt-nk7**
* CPC hierarchy table + classification rollup → follow-up
* EPO / WIPO / CNIPA ingest → siblings under bkt-tfu
* feed402 endpoint wiring (`/uspto/grant`, `/uspto/search`, `/uspto/insight`) → follow-up
