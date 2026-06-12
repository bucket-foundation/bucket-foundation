#!/usr/bin/env bash
# One autonomous build-loop run for Bucket Academy. Fired by the systemd user timer.
# Spins a fresh headless Claude that advances the app per LOOP_TASK.md, then exits.
set -u
PROJ="$HOME/agfarms/bucket-foundation/learning"
BL="$PROJ/.buildloop"
cd "$HOME/agfarms/bucket-foundation" || exit 1
export HSA_OVERRIDE_GFX_VERSION=11.0.0
set -a; . "$HOME/.env" 2>/dev/null; set +a

# don't pile up: skip if a previous run is still going
if [ -f "$BL/.running" ] && kill -0 "$(cat "$BL/.running" 2>/dev/null)" 2>/dev/null; then
  echo "$(date -u +%FT%TZ) skip — previous run still active" >> "$BL/run.log"; exit 0
fi
echo $$ > "$BL/.running"
trap 'rm -f "$BL/.running"' EXIT

TS=$(date -u +%FT%TZ)
{ echo; echo "========== build run $TS =========="; } >> "$BL/run.log"

timeout 1500 "$HOME/.local/bin/claude" -p "$(cat "$BL/LOOP_TASK.md")" \
  --dangerously-skip-permissions \
  --disallowed-tools Agent \
  --output-format text >> "$BL/run.log" 2>&1

echo "---------- run done $(date -u +%FT%TZ) ----------" >> "$BL/run.log"
