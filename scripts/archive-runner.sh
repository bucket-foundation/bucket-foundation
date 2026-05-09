#!/usr/bin/env bash
# Idempotent archive.org puller. Re-runnable; skips already-fetched files.
set -u
LIST="$HOME/agfarms/bucket-foundation/_intake/.archive-targets.txt"
LOG="$HOME/agfarms/bucket-foundation/_intake/.archive-runner.log"
LOCK="$HOME/agfarms/bucket-foundation/_intake/.archive-runner.lock"
exec 9> "$LOCK"; flock -n 9 || { echo "[$(date -Iseconds)] another runner active" >> "$LOG"; exit 0; }
echo "[$(date -Iseconds)] === archive runner start ===" >> "$LOG"
"$HOME/bin/agf-archive" batch "$LIST" --venture bucket-foundation --formats pdf,epub,txt >> "$LOG" 2>&1
echo "[$(date -Iseconds)] === archive runner done ===" >> "$LOG"
