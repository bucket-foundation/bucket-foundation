#!/usr/bin/env bash
# setup.sh — idempotent install of the local-LLM exposure stack:
#   1. generate a strong LLM_GATEWAY_SECRET (once; preserved on re-run)
#   2. write the env file to ~/.config/research-tools-llm/llm-shim.env (chmod 600,
#      OUTSIDE the git repo — the secret is NEVER committed)
#   3. install + enable + (re)start the llm-shim and llm-tunnel --user services
#   4. verify: 401 without bearer, 200 with bearer through the shim
#
# Re-running is safe: existing secret kept, units overwritten, services restarted.
# Ollama itself is assumed already running (system `ollama.service` — verified up).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CFG_DIR="${HOME}/.config/research-tools-llm"
ENV_FILE="${CFG_DIR}/llm-shim.env"
UNIT_DIR="${HOME}/.config/systemd/user"
SHIM_PORT="${LLM_SHIM_PORT:-8011}"

echo "==> research-tools local-LLM exposure setup"

# --- 1+2. secret + env file (idempotent: keep existing secret) ---------------
mkdir -p "${CFG_DIR}"
chmod 700 "${CFG_DIR}"

existing_secret=""
if [ -f "${ENV_FILE}" ]; then
  existing_secret="$(grep -E '^LLM_GATEWAY_SECRET=' "${ENV_FILE}" | head -1 | cut -d= -f2- || true)"
fi
if [ -n "${existing_secret}" ]; then
  SECRET="${existing_secret}"
  echo "    reusing existing LLM_GATEWAY_SECRET"
else
  SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  echo "    generated a new LLM_GATEWAY_SECRET"
fi

umask 077
cat > "${ENV_FILE}" <<EOF
# research-tools LLM exposure — SECRET. chmod 600, NOT in git. Do not commit.
LLM_GATEWAY_SECRET=${SECRET}
LLM_SHIM_HOST=127.0.0.1
LLM_SHIM_PORT=${SHIM_PORT}
OLLAMA_URL=http://127.0.0.1:11434
LLM_SHIM_TIMEOUT_S=120
# For a STABLE public hostname, set a named cloudflared tunnel name here:
# CF_TUNNEL_NAME=research-llm
EOF
chmod 600 "${ENV_FILE}"
echo "    wrote ${ENV_FILE} (chmod 600)"

# --- 3. install + enable + restart units -------------------------------------
mkdir -p "${UNIT_DIR}"
cp -f "${HERE}/llm-shim.service"   "${UNIT_DIR}/llm-shim.service"
cp -f "${HERE}/llm-tunnel.service" "${UNIT_DIR}/llm-tunnel.service"
chmod +x "${HERE}/tunnel.sh" "${HERE}/llm_shim.py"
systemctl --user daemon-reload
systemctl --user enable --now llm-shim.service
systemctl --user enable --now llm-tunnel.service
echo "    enabled+started llm-shim.service and llm-tunnel.service"

# --- 4. verify ---------------------------------------------------------------
sleep 2
base="http://127.0.0.1:${SHIM_PORT}"
echo "==> verify"
code_noauth="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "${base}/v1/models" || echo 000)"
code_auth="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 \
  -H "Authorization: Bearer ${SECRET}" "${base}/v1/models" || echo 000)"
code_blocked="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 \
  -H "Authorization: Bearer ${SECRET}" "${base}/api/tags" || echo 000)"
echo "    GET /v1/models   no bearer -> ${code_noauth} (expect 401)"
echo "    GET /v1/models   bearer    -> ${code_auth} (expect 200)"
echo "    GET /api/tags    bearer    -> ${code_blocked} (expect 404 — path not allow-listed)"

echo
echo "==> public URL (quick tunnel)"
for i in $(seq 1 20); do
  u="$(bash "${HERE}/tunnel.sh" url 2>/dev/null || true)"
  [ -n "${u}" ] && { echo "    TUNNEL URL: ${u}"; echo "    -> Vercel/K8s LLM_BASE_URL = ${u}/v1"; break; }
  sleep 2
done
echo
echo "Secret is in ${ENV_FILE} (NOT git). Read it with:"
echo "    grep LLM_GATEWAY_SECRET ${ENV_FILE}"
echo "Done."
