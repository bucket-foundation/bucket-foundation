#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export EVOLUTION_DATA="${EVOLUTION_DATA:-$REPO/_intake/evolution}"
export PYTHONPATH="$REPO/tools/research-eval${PYTHONPATH:+:$PYTHONPATH}"
cd "$REPO"
exec python3 -m bucket_eval.evolution.live "$@"
