#!/usr/bin/env bash
# Idempotent AARO archive mirror via Wayback. Skip if file already present.
set -u
DEST=$HOME/agfarms/bucket-foundation/_intake/aaro-mil-archive
URLS=/tmp/aaro-urls.txt
[ -f "$URLS" ] || { echo "no urls; rebuild via CDX first"; exit 0; }
LOG=$DEST/runner.log
LOCK=$DEST/.runner.lock
exec 9> "$LOCK"; flock -n 9 || exit 0
mkdir -p $DEST/pdfs
echo "[$(date -Iseconds)] === aaro runner start ===" >> $LOG
i=0; ok=0; fail=0; skip=0
while read url; do
  i=$((i+1))
  out="$DEST/pdfs/aaro-$(printf %04d $i).pdf"
  if [ -s "$out" ] && [ "$(stat -c%s "$out")" -gt 5000 ]; then skip=$((skip+1)); continue; fi
  rm -f "$out"
  code=$(curl -sL --max-time 120 -A "Mozilla/5.0" -o "$out" -w "%{http_code}" "$url")
  sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$code" = "200" ] && [ "$sz" -gt 5000 ]; then ok=$((ok+1));
  else rm -f "$out"; fail=$((fail+1)); fi
  sleep 1.5
done < $URLS
echo "[$(date -Iseconds)] === done ok=$ok fail=$fail skip=$skip ===" >> $LOG
