#!/usr/bin/env bash
# Install (or refresh) the evidence-search encoder as a systemd --user
# service. Idempotent: re-running copies the unit, reloads, and restarts.
#
#   scripts/systemd/install-evidence-worker.sh <vectors directory> [port]
#
# The vectors directory is the one `python3 -m evidence_search build-vectors`
# wrote, the level that holds manifest.json. On a first run this mints the
# shared secret into ~/.config/evidence-worker.env, chmod 600, and prints
# nothing of it; a later run keeps the secret already there. Put the same
# secret and address in .env.local as EVIDENCE_WORKER_SECRET and
# EVIDENCE_WORKER_URL so the app can reach it.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VECTORS="${1:-}"
PORT="${2:-8431}"
ENV_FILE="$HOME/.config/evidence-worker.env"
DEST="$HOME/.config/systemd/user"

if [ -z "$VECTORS" ]; then
  echo "usage: $(basename "$0") <vectors directory> [port]" >&2
  exit 2
fi
VECTORS="$(cd "$VECTORS" && pwd)"
if [ ! -f "$VECTORS/manifest.json" ]; then
  echo "no manifest.json in $VECTORS; name the directory build-vectors wrote" >&2
  exit 2
fi
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "the port is a number from 1024 to 65535; got $PORT" >&2
  exit 2
fi

mkdir -p "$(dirname "$ENV_FILE")" "$DEST"
if [ -f "$ENV_FILE" ] && grep -q '^EVIDENCE_WORKER_SECRET=.\{32,\}$' "$ENV_FILE"; then
  SECRET="$(sed -n 's/^EVIDENCE_WORKER_SECRET=//p' "$ENV_FILE")"
  echo "keeping the secret already in $ENV_FILE"
else
  # 48 base64 characters from the kernel. Minted here and never printed:
  # a secret that reaches a terminal reaches its scrollback.
  SECRET="$(head -c 36 /dev/urandom | base64 | tr -d '\n/+=' | cut -c1-48)"
  echo "minted a new secret in $ENV_FILE"
fi

umask 077
cat > "$ENV_FILE" <<ENV
# Read by evidence-worker.service. Outside the repository on purpose.
EVIDENCE_WORKER_SECRET=$SECRET
EVIDENCE_VECTORS_DIR=$VECTORS
EVIDENCE_WORKER_PORT=$PORT
ENV
chmod 600 "$ENV_FILE"

cp "$HERE/evidence-worker.service" "$DEST/evidence-worker.service"
systemctl --user daemon-reload
systemctl --user enable evidence-worker.service
systemctl --user restart evidence-worker.service
loginctl enable-linger "$USER" 2>/dev/null || true

echo "installed: evidence-worker.service on 127.0.0.1:$PORT"
echo "vectors:   $VECTORS"
echo
echo "Put these in .env.local, with the secret copied from $ENV_FILE:"
echo "  EVIDENCE_WORKER_URL=http://127.0.0.1:$PORT"
echo "  EVIDENCE_WORKER_SECRET=<the value in $ENV_FILE>"
echo
# The weights take around half a minute to load, so a health check run
# now would answer nothing and read as a broken install.
echo "It answers once the weights load, around 35 seconds. Then:"
echo "  curl -sf -H \"x-evidence-worker-key: \$EVIDENCE_WORKER_SECRET\" http://127.0.0.1:$PORT/health"
systemctl --user --no-pager status evidence-worker.service | head -5 || true
