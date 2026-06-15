#!/usr/bin/env bash
# Run when the semantic embed finishes: fill phonetic vectors, build both HNSW
# indexes, ANALYZE, and report. Waits for the embed PID, then finalizes — the
# last step to "full final state" on the local 6.5M pgvector corpus.
set -uo pipefail
cd /home/gian/agfarms/bucket-foundation
EMB_PID="${1:-937779}"
PG=(env PGPASSWORD=bucket psql -h 127.0.0.1 -p 5433 -U bucket -d polingual -v ON_ERROR_STOP=1)

echo "[finalize] waiting for semantic embed (pid $EMB_PID)…"
while [ -d "/proc/$EMB_PID" ]; do sleep 60; done
echo "[finalize] embed process ended $(date -u)"
"${PG[@]}" -tAc "select 'embedding NULLs: '||count(*) from photons_full where embedding is null"

echo "[finalize] phonetic vectors…"
python3 scripts/photon/phonetic_full.py

echo "[finalize] HNSW on embedding (semantic)…"
t=$(date +%s)
"${PG[@]}" -c "SET maintenance_work_mem='2GB'" \
          -c "SET max_parallel_maintenance_workers=4" \
          -c "CREATE INDEX IF NOT EXISTS ix_pf_emb_hnsw ON photons_full USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)"
echo "[finalize] semantic HNSW in $(( $(date +%s)-t ))s"

echo "[finalize] HNSW on phonetic…"
t=$(date +%s)
"${PG[@]}" -c "SET maintenance_work_mem='2GB'" \
          -c "SET max_parallel_maintenance_workers=4" \
          -c "CREATE INDEX IF NOT EXISTS ix_pf_pho_hnsw ON photons_full USING hnsw (phonetic vector_cosine_ops) WITH (m=16, ef_construction=64)"
echo "[finalize] phonetic HNSW in $(( $(date +%s)-t ))s"

"${PG[@]}" -c "ANALYZE photons_full"
echo "[finalize] ===== FULL FINAL STATE ====="
"${PG[@]}" -tAc "select 'rows '||count(*)||', langs '||count(distinct lang)||', semantic '||count(*) filter (where embedding is not null)||', phonetic '||count(*) filter (where phonetic is not null) from photons_full"
"${PG[@]}" -tAc "select 'table+indexes: '||pg_size_pretty(pg_total_relation_size('photons_full'))"
echo "[finalize] DONE $(date -u)"
