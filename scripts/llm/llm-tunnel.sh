#!/usr/bin/env bash
# Expose the bearer-protected LLM shim (127.0.0.1:11500) over a Cloudflare quick
# tunnel so the DEPLOYED tutor (Vercel) can reach Gian's GPU. We tunnel the SHIM,
# never the raw llama-server — every /v1/* call still requires the bearer secret.
#
# The quick-tunnel hostname is EPHEMERAL (changes each restart). For a stable
# hostname run a NAMED tunnel: `cloudflared tunnel login` then
# `cloudflared tunnel create bkt-llm` + route DNS to e.g. llm.agfarms.dev
# (same pattern as polingual). Set Vercel LLM_BASE_URL to <url>/v1.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SHIM_PORT="${LLM_SHIM_PORT:-11500}"
LOG="$DIR/logs/tunnel.log"
mkdir -p "$DIR/logs"

pkill -f "cloudflared tunnel --url http://127.0.0.1:${SHIM_PORT}" 2>/dev/null || true
sleep 1
exec cloudflared tunnel --url "http://127.0.0.1:${SHIM_PORT}" --no-autoupdate
