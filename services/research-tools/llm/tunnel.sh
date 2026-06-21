#!/usr/bin/env bash
# tunnel.sh — expose the bearer-gated LLM shim (NOT raw Ollama) via cloudflared.
#
#   tunnel.sh run        # foreground (used by the systemd unit). Named tunnel if
#                        #   CF_TUNNEL_NAME is set + configured, else quick tunnel.
#   tunnel.sh url        # print the current public URL (quick-tunnel mode)
#   tunnel.sh stop       # kill any cloudflared started for this shim
#
# The shim binds 127.0.0.1:${LLM_SHIM_PORT:-8011}. We tunnel THAT — clients still
# must present Authorization: Bearer <LLM_GATEWAY_SECRET>, so the public URL is
# useless without the secret. NEVER point a tunnel at :11434 (raw Ollama).
set -euo pipefail

PORT="${LLM_SHIM_PORT:-8011}"
LOCAL="http://127.0.0.1:${PORT}"
LOGDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUICK_LOG="${LOGDIR}/quick-tunnel.log"

cmd="${1:-run}"

case "$cmd" in
  run)
    if [ -n "${CF_TUNNEL_NAME:-}" ] && cloudflared tunnel info "${CF_TUNNEL_NAME}" >/dev/null 2>&1; then
      echo "named tunnel: ${CF_TUNNEL_NAME} -> ${LOCAL}"
      exec cloudflared tunnel run --url "${LOCAL}" "${CF_TUNNEL_NAME}"
    fi
    echo "quick tunnel -> ${LOCAL} (ephemeral *.trycloudflare.com URL; see ${QUICK_LOG})"
    exec cloudflared tunnel --url "${LOCAL}" --no-autoupdate 2>&1 | tee "${QUICK_LOG}"
    ;;
  url)
    grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "${QUICK_LOG}" 2>/dev/null | tail -1 \
      || { echo "no quick-tunnel URL yet (named tunnel? use its DNS hostname)"; exit 1; }
    ;;
  stop)
    pkill -f "cloudflared tunnel .*${PORT}" 2>/dev/null || true
    pkill -f "cloudflared tunnel run --url ${LOCAL}" 2>/dev/null || true
    echo "stopped"
    ;;
  *)
    echo "usage: tunnel.sh {run|url|stop}" >&2; exit 1 ;;
esac
