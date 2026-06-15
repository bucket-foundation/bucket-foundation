#!/usr/bin/env bash
# Completion monitor (replaces the PID-based finalize_full.sh): fire as soon as
# ZERO embeddings are NULL — regardless of which workers filled them — then stop
# the encoders (data is done; this is finishing, not pausing), build phonetic
# vectors + both HNSW indexes, and report FULL FINAL STATE.
set -uo pipefail
cd /home/gian/agfarms/bucket-foundation
PG=(env PGPASSWORD=bucket psql -h 127.0.0.1 -p 5433 -U bucket -d polingual -v ON_ERROR_STOP=1)

echo "[complete] waiting for 0 NULL embeddings $(date -u)"
while :; do
  n=$("${PG[@]}" -tAc "select count(*) from photons_full where embedding is null" 2>/dev/null || echo 999999)
  [ "${n:-999999}" -le 0 ] && break
  sleep 30
done
echo "[complete] ALL embedded $(date -u) — stopping encoders"
pkill -f embed_full.py 2>/dev/null || true
pkill -f embed_worker.py 2>/dev/null || true
sleep 5

echo "[complete] phonetic vectors"
python3 scripts/photon/phonetic_full.py

echo "[complete] HNSW semantic"
"${PG[@]}" -c "SET maintenance_work_mem='2GB'" -c "SET max_parallel_maintenance_workers=4" \
  -c "CREATE INDEX IF NOT EXISTS ix_pf_emb_hnsw ON photons_full USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)"
echo "[complete] HNSW phonetic"
"${PG[@]}" -c "SET maintenance_work_mem='2GB'" -c "SET max_parallel_maintenance_workers=4" \
  -c "CREATE INDEX IF NOT EXISTS ix_pf_pho_hnsw ON photons_full USING hnsw (phonetic vector_cosine_ops) WITH (m=16, ef_construction=64)"
"${PG[@]}" -c "ANALYZE photons_full"

echo "[complete] ===== FULL FINAL STATE $(date -u) ====="
"${PG[@]}" -tAc "select 'rows '||count(*)||', langs '||count(distinct lang)||', semantic '||count(*) filter(where embedding is not null)||', phonetic '||count(*) filter(where phonetic is not null) from photons_full"
"${PG[@]}" -tAc "select 'table+indexes '||pg_size_pretty(pg_total_relation_size('photons_full'))"
