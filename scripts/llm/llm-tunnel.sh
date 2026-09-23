#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SHIM_PORT="${LLM_SHIM_PORT:-11500}"
LOG="$DIR/logs/tunnel.log"
mkdir -p "$DIR/logs"

pkill -f "cloudflared tunnel --url http://127.0.0.1:${SHIM_PORT}" 2>/dev/null || true
sleep 1
exec cloudflared tunnel --url "http://127.0.0.1:${SHIM_PORT}" --no-autoupdate
