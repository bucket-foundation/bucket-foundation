#!/usr/bin/env bash
# Kill the spilled single-pass HNSW build and rebuild in-RAM. The graph needs
# ~19GB (vector data) to stay resident; 16GB spilled to disk (pathologically
# slow). Give it 30GB (host has ~39GB free) so it never spills.
set -uo pipefail
cd /home/gian/agfarms/bucket-foundation
PG=(env PGPASSWORD=bucket psql -h 127.0.0.1 -p 5433 -U bucket -d polingual -v ON_ERROR_STOP=1)

echo "[rebuild] cancelling the running spilled build…"
pkill -f build_hnsw.sh 2>/dev/null || true
"${PG[@]}" -tAc "select pg_terminate_backend(pid) from pg_stat_activity where query ilike 'CREATE INDEX%hnsw%' and state='active'" || true
sleep 5
"${PG[@]}" -c "DROP INDEX IF EXISTS ix_pf_emb_hnsw" -c "DROP INDEX IF EXISTS ix_pf_pho_hnsw" || true

echo "[rebuild] semantic HNSW in-RAM (30GB work_mem) $(date -u)"
t=$(date +%s)
"${PG[@]}" -c "SET maintenance_work_mem='30GB'" -c "SET max_parallel_maintenance_workers=0" \
  -c "CREATE INDEX ix_pf_emb_hnsw ON photons_full USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)"
echo "[rebuild] semantic done in $(( $(date +%s)-t ))s"

echo "[rebuild] phonetic HNSW (4GB work_mem — only ~2M small 64-d vecs) $(date -u)"
t=$(date +%s)
"${PG[@]}" -c "SET maintenance_work_mem='4GB'" -c "SET max_parallel_maintenance_workers=0" \
  -c "CREATE INDEX ix_pf_pho_hnsw ON photons_full USING hnsw (phonetic vector_cosine_ops) WITH (m=16, ef_construction=64)"
echo "[rebuild] phonetic done in $(( $(date +%s)-t ))s"

"${PG[@]}" -c "ANALYZE photons_full"
echo "[rebuild] ===== FULL FINAL STATE $(date -u) ====="
"${PG[@]}" -tAc "select indexname||'  '||pg_size_pretty(pg_relation_size(indexname::regclass)) from pg_indexes where tablename='photons_full' and indexname like '%hnsw%'"
"${PG[@]}" -tAc "select 'rows '||count(*)||', langs '||count(distinct lang)||', semantic '||count(*) filter(where embedding is not null)||', phonetic '||count(*) filter(where phonetic is not null) from photons_full"
"${PG[@]}" -tAc "select 'table+indexes '||pg_size_pretty(pg_total_relation_size('photons_full'))"
