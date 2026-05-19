#!/usr/bin/env bash
# One-line Sacred-History Corpus status for bkt-nuc session start.
# Mirrors pursue-status.sh / canon-intake-status.sh. Thin wrapper that
# delegates to the runner's own status script (single source of truth).
exec bash "$HOME/agfarms/bucket-foundation/_intake/sacred-history-corpus/runners/sacred-history-status.sh" "$@"
