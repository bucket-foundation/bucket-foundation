#!/usr/bin/env bash
# Quick status report for PURSUE mirror. Used by bkt-nuc session start.
D="$HOME/agfarms/bucket-foundation/_intake/war-gov-pursue-release-01"
[ -f "$D/urls.tsv" ] || { echo "[pursue] no manifest yet"; exit 0; }
TOTAL=$(awk -F'\t' '$1!="THUMB" && $1!=""' "$D/urls.tsv" | wc -l)
HAVE=$(find "$D"/{pdfs,videos,images} -type f -size +1k 2>/dev/null | wc -l)
PCT=$(awk "BEGIN{printf \"%d\", ($HAVE/$TOTAL)*100}")
LAST=$(grep -E "===" "$D/runner.log" 2>/dev/null | tail -1)
TIMER=$(systemctl --user is-active pursue-mirror.timer 2>/dev/null || echo "inactive")

if [ "$HAVE" -ge "$TOTAL" ]; then
  printf "[pursue] ✅ COMPLETE %d/%d (%d%%)\n" "$HAVE" "$TOTAL" "$PCT"
else
  printf "[pursue] ⏳ %d/%d files (%d%%) · timer=%s\n" "$HAVE" "$TOTAL" "$PCT" "$TIMER"
  [ -n "$LAST" ] && echo "         $LAST"
fi
