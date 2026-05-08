#!/usr/bin/env bash
# Idempotent autonomous mirror for war.gov PURSUE Release 01.
# Runs until everything is mirrored, then exits 0. Safe to run repeatedly,
# safe to interrupt. Tries multiple paths per URL (direct → wayback → SPN).
# Designed to be invoked by:
#   - systemd --user timer (hourly)
#   - @reboot
#   - bkt-nuc session startup
#   - manually
set -u
DEST="$HOME/agfarms/bucket-foundation/_intake/war-gov-pursue-release-01"
LOG="$DEST/runner.log"
URLS="$DEST/urls.tsv"
LOCK="$DEST/.runner.lock"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

[ -f "$URLS" ] || { echo "no urls.tsv yet, exiting"; exit 0; }

# Single-instance lock
exec 9> "$LOCK"
flock -n 9 || { echo "[$(date -Iseconds)] another runner active, skip" >> "$LOG"; exit 0; }

mkdir -p "$DEST"/{pdfs,videos,images,thumbnails,other}
echo "[$(date -Iseconds)] === runner start ===" >> "$LOG"

ok=0; skip=0; fail=0; tried=0
while IFS=$'\t' read -r kind url; do
  [ -z "${url:-}" ] && continue
  fn=$(basename "$url" | tr ' ' '_')
  case "$kind" in
    PDF*)   sub=pdfs ;;
    VID*)   sub=videos ;;
    IMG*)   sub=images ;;
    THUMB*) sub=thumbnails ;;
    *)      sub=other ;;
  esac
  out="$DEST/$sub/$fn"
  # Already mirrored?
  if [ -f "$out" ] && [ "$(stat -c%s "$out" 2>/dev/null || echo 0)" -gt 1000 ]; then
    skip=$((skip+1)); continue
  fi
  tried=$((tried+1))
  rm -f "$out"

  # Path 1: direct war.gov (works if local Akamai ban has cleared)
  code=$(curl -sL --max-time 240 -A "$UA" -H "Referer: https://www.war.gov/UFO/" \
    -o "$out" -w "%{http_code}" "$url" 2>/dev/null)
  sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$code" = "200" ] && [ "$sz" -gt 1000 ]; then
    ok=$((ok+1))
    echo "[$(date -Iseconds)] OK direct $sz $sub/$fn" >> "$LOG"
    sleep 2; continue
  fi
  rm -f "$out"

  # Path 2: Wayback raw (id_) — bytes as-is from the archived response
  code=$(curl -sL --max-time 240 -A "$UA" \
    -o "$out" -w "%{http_code}" "https://web.archive.org/web/2026id_/$url" 2>/dev/null)
  sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$code" = "200" ] && [ "$sz" -gt 1000 ]; then
    ok=$((ok+1))
    echo "[$(date -Iseconds)] OK wayback $sz $sub/$fn" >> "$LOG"
    sleep 2; continue
  fi
  rm -f "$out"

  # Path 3: nudge Wayback Save Page Now (don't wait — IA will crawl async)
  curl -sL --max-time 30 -o /dev/null -A "$UA" "https://web.archive.org/save/$url" >/dev/null 2>&1 || true

  fail=$((fail+1))
  echo "[$(date -Iseconds)] FAIL direct=$code $kind $url" >> "$LOG"
  sleep 4
done < "$URLS"

echo "[$(date -Iseconds)] === runner done: tried=$tried ok=$ok skip=$skip fail=$fail ===" >> "$LOG"

# Update status snapshot for quick reporting
TOTAL=$(wc -l < "$URLS")
HAVE=$(find "$DEST"/{pdfs,videos,images} -type f -size +1k 2>/dev/null | wc -l)
cat > "$DEST/.status.json" <<EOF
{
  "last_run": "$(date -Iseconds)",
  "urls_total": $TOTAL,
  "files_mirrored": $HAVE,
  "this_run_ok": $ok,
  "this_run_fail": $fail,
  "this_run_skip": $skip,
  "complete": $([ "$fail" -eq 0 ] && [ "$tried" -gt 0 ] && echo true || echo false)
}
EOF

# If everything's done, disable the timer (we're complete)
if [ "$tried" -gt 0 ] && [ "$fail" -eq 0 ]; then
  systemctl --user stop pursue-mirror.timer 2>/dev/null || true
  systemctl --user disable pursue-mirror.timer 2>/dev/null || true
  echo "[$(date -Iseconds)] === MIRROR COMPLETE - timer disabled ===" >> "$LOG"
fi
