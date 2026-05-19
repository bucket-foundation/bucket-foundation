#!/usr/bin/env bash
# One-line status for the Sacred-History Corpus dry-run runner.
# Mirrors scripts/pursue-status.sh; safe for bkt-nuc session-start.
D="$HOME/agfarms/bucket-foundation/_intake/sacred-history-corpus"
S="$D/.status.json"
[ -f "$S" ] || { echo "[sacred-history] no run yet (scaffold only)"; exit 0; }
MODE=$(jq -r .mode "$S" 2>/dev/null || echo "?")
FETCHED=$(jq -r .fetched_ok "$S" 2>/dev/null || echo "?")
ROWS=$(jq -r .manifest_rows "$S" 2>/dev/null || echo "?")
BYTES=$(jq -r .total_bytes "$S" 2>/dev/null || echo "?")
SRC=$(jq -r .distinct_sources_in_manifest "$S" 2>/dev/null || echo "?")
LAST=$(jq -r .last_run "$S" 2>/dev/null || echo "?")
TIMER=$(systemctl --user is-active sacred-history-mirror.timer 2>/dev/null || echo "not-installed")
printf "[sacred-history] mode=%s · %s/%s fetched (%sB) across %s sources · PD/open LIVE, Tier-B gated · recurring · timer=%s · %s\n" \
  "$MODE" "$FETCHED" "$ROWS" "$BYTES" "$SRC" "$TIMER" "$LAST"
