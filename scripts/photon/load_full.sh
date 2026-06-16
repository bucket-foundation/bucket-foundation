#!/usr/bin/env bash
# Load the full 6.56M polingual metadata into local pgvector, add vector columns
# (filled later by embed_full.py), and build the SQL-axis indexes so lookup /
# spelling / FTS work immediately on the full corpus.
set -euo pipefail
cd /home/gian/agfarms/bucket-foundation
PG=(env PGPASSWORD=bucket psql -h 127.0.0.1 -p 5433 -U bucket -d polingual -v ON_ERROR_STOP=1)
CSV=_intake/photons/polingual_full.csv.gz

echo "[load] schema"
"${PG[@]}" <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
DROP TABLE IF EXISTS photons_full;
CREATE TABLE photons_full (
  id text PRIMARY KEY, kind text, lang text, surface text, meaning_en text,
  tier text, branch_csv text, pos text, ipa text, relations jsonb,
  embedding vector(768), phonetic vector(64)
);
SQL

echo "[load] COPY 6.56M rows (gzip stream)"
t=$(date +%s)
zcat "$CSV" | "${PG[@]}" -c "\copy photons_full(id,kind,lang,surface,meaning_en,tier,branch_csv,pos,ipa,relations) FROM STDIN WITH (FORMAT csv)"
echo "[load] COPY done in $(( $(date +%s) - t ))s"

echo "[load] SQL-axis indexes (lookup / spelling / FTS)"
t=$(date +%s)
"${PG[@]}" <<'SQL'
CREATE INDEX ix_pf_lang ON photons_full(lang);
CREATE INDEX ix_pf_surface_lower ON photons_full(lower(surface));
-- plain (surface,lang) btree: the API queries WHERE surface=%s [AND lang=%s]
-- directly (not lower(surface)), so this is what makes lookup/_qvec fast.
CREATE INDEX ix_pf_surface_lang ON photons_full(surface, lang);
CREATE INDEX ix_pf_surface_trgm ON photons_full USING gin (lower(surface) gin_trgm_ops);
ALTER TABLE photons_full ADD COLUMN meaning_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(meaning_en,''))) STORED;
CREATE INDEX ix_pf_meaning_tsv ON photons_full USING gin (meaning_tsv);
ANALYZE photons_full;
SQL
echo "[load] indexes done in $(( $(date +%s) - t ))s"

"${PG[@]}" -tAc "select count(*) || ' rows, ' || count(distinct lang) || ' langs' from photons_full"
"${PG[@]}" -tAc "select pg_size_pretty(pg_total_relation_size('photons_full'))"
