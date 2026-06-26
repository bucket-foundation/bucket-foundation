#!/usr/bin/env bash
# install-services.sh — stand up the whole local-GPU LLM stack on a fresh machine
# from the repo alone. Idempotent: re-running just re-syncs + restarts.
#
#   bkt-llm-server   llama.cpp on the dGPU (Vulkan)   127.0.0.1:11435
#     -> bkt-llm-shim       bearer-auth proxy          127.0.0.1:11500
#          -> bkt-llm-revtunnel  reverse SSH tunnel    Hetzner 127.0.0.1:18011
#
# Run:  bash scripts/llm/install-services.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
UNITDIR="$HOME/.config/systemd/user"
mkdir -p "$UNITDIR"

echo "== prerequisites (this box) =="
miss=0
chk () { if eval "$2" >/dev/null 2>&1; then echo "  ok   $1"; else echo "  MISS $1 — $3"; miss=1; fi; }
chk "llama.cpp Vulkan server" "test -x \"$(grep -oE '/[^ ]*llama-server' "$DIR/llm-server.sh" | head -1)\"" \
    "build llama.cpp with -DGGML_VULKAN=ON (see README)"
chk "node (for the shim)"      "command -v node"            "install Node 18+"
chk "ssh (for revtunnel)"      "command -v ssh"             "install openssh-client"
chk "shim secret env"          "test -f \"$DIR/shim.env\""  "create it: see below"
chk "bearer secret"            "test -f \"$DIR/.bearer-secret\"" "create it: see below"

if [ ! -f "$DIR/shim.env" ] || [ ! -f "$DIR/.bearer-secret" ]; then
  cat <<'SECRETS'

  To create the (gitignored) secret files:
    SECRET=$(openssl rand -base64 33 | tr -d '/+=' | cut -c1-43)
    printf 'bkt-tutor-%s' "$SECRET" > scripts/llm/.bearer-secret && chmod 600 scripts/llm/.bearer-secret
    printf 'LLM_SHIM_SECRET=%s\n' "$(cat scripts/llm/.bearer-secret)" > scripts/llm/shim.env && chmod 600 scripts/llm/shim.env

  The reverse tunnel also needs a working SSH key to giany@5.161.236.151
  (and the nginx /llm/ block on the box — run scripts/llm/setup-llm-nginx.sh there).
SECRETS
fi
[ "$miss" = 0 ] || { echo; echo "Resolve the MISS items above, then re-run."; exit 1; }

echo "== installing units =="
for u in bkt-llm-server bkt-llm-shim bkt-llm-revtunnel; do
  install -m 644 "$DIR/systemd/$u.service" "$UNITDIR/$u.service"
  echo "  -> $UNITDIR/$u.service"
done

echo "== enabling (linger so they survive logout) =="
loginctl enable-linger "$USER" 2>/dev/null || true
systemctl --user daemon-reload
systemctl --user enable --now bkt-llm-server bkt-llm-shim bkt-llm-revtunnel

sleep 4
echo "== status =="
systemctl --user is-active bkt-llm-server bkt-llm-shim bkt-llm-revtunnel | paste -sd' ' -
echo "== local shim health =="
curl -s -m 8 http://127.0.0.1:11500/health || echo "(not up yet — check: journalctl --user -u bkt-llm-server -n 40)"
echo
echo "DONE. Public endpoint (once the box-side nginx is in place): https://atlas-api.agfarms.dev/llm/v1"
