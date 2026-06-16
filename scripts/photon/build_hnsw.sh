#!/usr/bin/env bash
# Build both HNSW indexes single-threaded (max_parallel_maintenance_workers=0)
# so the build uses private maintenance_work_mem instead of /dev/shm — the
# parallel path overflowed the container's 1GB shm. Disk has 253GB free.
set -uo pipefail
cd /home/gian/agfarms/bucket-foundation
pkill -f embed_full.py 2>/dev/null || true
pkill -f embed_worker.py 2>/dev/null || true
sleep 3
PG=(env PGPASSWORD=bucket psql -h 127.0.0.1 -p 5433 -U bucket -d polingual -v ON_ERROR_STOP=1)
TUNE='-c SET maintenance_work_mem=16GB -c SET max_parallel_maintenance_workers=0'

echo "[hnsw] semantic build start $(date -u)"
t=$(date +%s)
"${PG[@]}" -c "SET maintenance_work_mem='16GB'" -c "SET max_parallel_maintenance_workers=0" \
  -c "CREATE INDEX IF NOT EXISTS ix_pf_emb_hnsw ON photons_full USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)"
echo "[hnsw] semantic done in $(( $(date +%s)-t ))s"

echo "[hnsw] phonetic build start $(date -u)"
t=$(date +%s)
"${PG[@]}" -c "SET maintenance_work_mem='16GB'" -c "SET max_parallel_maintenance_workers=0" \
  -c "CREATE INDEX IF NOT EXISTS ix_pf_pho_hnsw ON photons_full USING hnsw (phonetic vector_cosine_ops) WITH (m=16, ef_construction=64)"
echo "[hnsw] phonetic done in $(( $(date +%s)-t ))s"

"${PG[@]}" -c "ANALYZE photons_full"
echo "[hnsw] ===== FULL FINAL STATE $(date -u) ====="
"${PG[@]}" -tAc "select indexname||'  '||pg_size_pretty(pg_relation_size(indexname::regclass)) from pg_indexes where tablename='photons_full' and indexname like '%hnsw%'"
"${PG[@]}" -tAc "select 'rows '||count(*)||', langs '||count(distinct lang)||', semantic '||count(*) filter(where embedding is not null)||', phonetic '||count(*) filter(where phonetic is not null) from photons_full"
"${PG[@]}" -tAc "select 'table+indexes '||pg_size_pretty(pg_total_relation_size('photons_full'))"
