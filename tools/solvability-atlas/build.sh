#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
out="${1:-out}"
HF_HUB_OFFLINE="${HF_HUB_OFFLINE:-1}" python3 atlas.py "$out"
python3 site.py "$out"
