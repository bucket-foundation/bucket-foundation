#!/usr/bin/env bash
# Pull the full 6.5M polingual.photons metadata from prod -> local CSV.gz.
# Read-only COPY TO STDOUT (brief AccessShare lock); gzip on the remote so only
# compressed bytes cross the wire. Columns needed for all 5 axes; skips the big
# provenance/payload jsonb and the generated tsvectors (rebuilt locally).
set -uo pipefail
cd /home/gian/agfarms/bucket-foundation
OUT=_intake/photons/polingual_full.csv.gz
HOST="${AGFARMS_HOST:-giany@5.161.236.151}"
echo "[pull] start $(date -u)"
sshpass -p "$AGFARMS_PASS" ssh -o StrictHostKeyChecking=accept-new "$HOST" \
  "docker exec agf-supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \"COPY (SELECT id,kind,lang,surface,meaning_en,tier,array_to_string(branch,',') AS branch_csv,pos,ipa,relations FROM polingual.photons) TO STDOUT WITH (FORMAT csv)\" | gzip -1" > "$OUT"
rc=$?
echo "[pull] done rc=$rc $(date -u) size=$(du -h "$OUT" 2>/dev/null | cut -f1)"
exit $rc
