#!/usr/bin/env bash
# run-all.sh — sacred-history corpus analysis pipeline.
#
# Hooks into the existing sacred-history-mirror.timer cycle: after
# every ingest run lands new content in work/, this re-builds the
# index + graphs + claims. Idempotent and resumable; safe to re-run.
#
# Local AI only. ollama must be up at $OLLAMA_URL (default
# http://localhost:11434).
#
# Optional env:
#   OLLAMA_URL=http://...
#   OLLAMA_EMBED_MODEL=nomic-embed-text
#   OLLAMA_LLM_FAST=llama3.2:3b
#   OLLAMA_LLM_ESCALATE=qwen3.5:latest
#   MAX_CLUSTERS=20  (branch-analysis cap)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
TOOLS="$ROOT/tools"
WORK="$ROOT/work"
LOG="$WORK/run-all.log"

mkdir -p "$WORK"

echo "[$(date -Iseconds)] sacred-history analysis: BEGIN" | tee -a "$LOG"

# 0. Rights gate (bkt-npa) — fail closed. spec/rights.json must validate
#    against RIGHTS-POLICY.md invariants before any content is processed.
echo "[$(date -Iseconds)] step 0/4: rights-check (spec/rights.json gate)" | tee -a "$LOG"
python3 "$TOOLS/rights-check.py" validate 2>&1 | tee -a "$LOG"

# 1. Index (FTS5 + vectors)
echo "[$(date -Iseconds)] step 1/4: build-index" | tee -a "$LOG"
python3 "$TOOLS/build-index.py" 2>&1 | tee -a "$LOG"

# 2. Entity graph (bkt-pdx)
echo "[$(date -Iseconds)] step 2/4: build-entity-graph" | tee -a "$LOG"
python3 "$TOOLS/build-entity-graph.py" 2>&1 | tee -a "$LOG"

# 3. Timeline graph (bkt-k01)
echo "[$(date -Iseconds)] step 3/4: build-timeline" | tee -a "$LOG"
python3 "$TOOLS/build-timeline.py" 2>&1 | tee -a "$LOG"

# 4. Branch analysis (bkt-fvg) — local LLM, may take minutes
echo "[$(date -Iseconds)] step 4/4: branch-analysis" | tee -a "$LOG"
python3 "$TOOLS/branch-analysis.py" 2>&1 | tee -a "$LOG"

echo "[$(date -Iseconds)] sacred-history analysis: END" | tee -a "$LOG"
