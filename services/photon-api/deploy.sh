#!/usr/bin/env bash
# deploy.sh — idempotently stand up the Polingual Photon API on prod-hetzner-1.
#
# What it does (all idempotent, re-runnable):
#   1. rsync the photon substrate (index.sqlite + 2 .f32.bin + kaikki-cache)
#      and the server code to ~/polingual-photon/ on the box.
#   2. Create/refresh a Python venv + install requirements.
#   3. Install + (re)start a systemd --user service on 127.0.0.1:8088.
#   4. Install the nginx vhost for polingual.agfarms.dev + issue/renew the
#      Let's Encrypt cert + reload nginx (needs sudo).
#   5. Verify /healthz and a real cross-lingual query come back.
#
# It NEVER touches other tenants' namespaces, the shared K3s ingress, Supabase,
# or any other vhost. The service is a plain user-space uvicorn process.
#
# Requires on the local box: sshpass, rsync, and these env vars:
#   AGFARMS_PASS   SSH + sudo password for giany@prod-hetzner-1
# Optional:
#   PHOTONS_SRC    local path to the photon substrate dir
#                  (default: <repo>/_intake/photons)
set -euo pipefail

HOST="${AGFARMS_HOST:-giany@5.161.236.151}"
PASS="${AGFARMS_PASS:?set AGFARMS_PASS (SSH+sudo password for the box)}"
DOMAIN="polingual.agfarms.dev"
REMOTE_DIR="polingual-photon"            # under the remote user's $HOME
PORT=8088

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
PHOTONS_SRC="${PHOTONS_SRC:-$REPO_ROOT/_intake/photons}"

ssh_e()  { sshpass -p "$PASS" ssh -o StrictHostKeyChecking=accept-new "$HOST" "$@"; }
sudo_e() {
  # Run a (possibly multi-line) privileged script on the box WITHOUT letting the
  # remote login shell (dash/sh) re-parse it: ship the body to a remote temp file
  # via stdin, then `sudo -S bash <file>` feeding the password on stdin. This
  # avoids the bash-%q-vs-dash "Unterminated quoted string" failure.
  local _rf="/tmp/_sudo_$$_${RANDOM}.sh"
  printf '%s\n' "$1" | sshpass -p "$PASS" ssh -o StrictHostKeyChecking=accept-new "$HOST" "cat > $_rf"
  sshpass -p "$PASS" ssh -o StrictHostKeyChecking=accept-new "$HOST" \
    "printf '%s\n' '$PASS' | sudo -S -p '' bash $_rf; _rc=\$?; rm -f $_rf; exit \$_rc"
}
rsync_e(){ sshpass -p "$PASS" rsync -e "ssh -o StrictHostKeyChecking=accept-new" "$@"; }

say(){ printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

# --------------------------------------------------------------------------- #
say "Preflight: local artifacts"
for f in index.sqlite semantic-vectors.f32.bin phonetic-vectors.f32.bin; do
  [ -f "$PHOTONS_SRC/$f" ] || { echo "MISSING: $PHOTONS_SRC/$f"; exit 1; }
done
ls -la "$PHOTONS_SRC"/index.sqlite "$PHOTONS_SRC"/*.f32.bin

# --------------------------------------------------------------------------- #
say "1. Create remote dirs"
ssh_e "mkdir -p ~/$REMOTE_DIR/photons"

say "2. rsync photon substrate (~150MB; only changed bytes after first run)"
rsync_e -avz --partial --inplace \
  "$PHOTONS_SRC/index.sqlite" \
  "$PHOTONS_SRC/semantic-vectors.f32.bin" \
  "$PHOTONS_SRC/phonetic-vectors.f32.bin" \
  "$HOST:~/$REMOTE_DIR/photons/"
if [ -d "$PHOTONS_SRC/kaikki-cache" ]; then
  rsync_e -avz --partial "$PHOTONS_SRC/kaikki-cache/" \
    "$HOST:~/$REMOTE_DIR/photons/kaikki-cache/"
fi

say "3. rsync server code"
rsync_e -avz "$HERE/server.py" "$HERE/requirements.txt" \
  "$HOST:~/$REMOTE_DIR/"

# --------------------------------------------------------------------------- #
say "4. Python venv + deps (idempotent)"
ssh_e bash -s <<REMOTE
set -e
cd ~/$REMOTE_DIR
if [ ! -x venv/bin/python ]; then python3 -m venv venv; fi
venv/bin/pip install --quiet --upgrade pip
venv/bin/pip install --quiet -r requirements.txt
echo "deps installed: \$(venv/bin/python -c 'import fastapi,uvicorn,numpy;print(fastapi.__version__,uvicorn.__version__,numpy.__version__)')"
REMOTE

# --------------------------------------------------------------------------- #
say "5. systemd --user service"
rsync_e -avz "$HERE/polingual-photon.service" \
  "$HOST:~/.config/systemd/user/polingual-photon.service" 2>/dev/null || {
    ssh_e "mkdir -p ~/.config/systemd/user"
    rsync_e -avz "$HERE/polingual-photon.service" \
      "$HOST:~/.config/systemd/user/polingual-photon.service"
  }
ssh_e bash -s <<REMOTE
set -e
export XDG_RUNTIME_DIR=/run/user/\$(id -u)
systemctl --user daemon-reload
systemctl --user enable polingual-photon.service
systemctl --user restart polingual-photon.service
sleep 4
systemctl --user --no-pager status polingual-photon.service | head -8 || true
REMOTE

say "5b. local health check on 127.0.0.1:$PORT"
ssh_e "curl -fsS http://127.0.0.1:$PORT/healthz | head -c 400; echo"

# --------------------------------------------------------------------------- #
say "6. nginx vhost + TLS (sudo)"
rsync_e -avz "$HERE/polingual.agfarms.dev.nginx" "$HOST:/tmp/$DOMAIN.nginx"

# Ensure the limit_req zone exists once (idempotent: only add if missing).
sudo_e "grep -rq 'zone=polingual' /etc/nginx/ || \
  printf 'limit_req_zone \$binary_remote_addr zone=polingual:10m rate=4r/s;\n' \
    > /etc/nginx/conf.d/polingual-ratelimit.conf"

# Issue cert first WITHOUT the ssl vhost present (webroot via a temp http server
# is complex; use certbot --nginx after a minimal http-only vhost, OR standalone
# is risky on a box already bound to :80). Safest: install an http-only stub,
# let certbot --nginx upgrade it.
sudo_e "
set -e
# Stub http-only vhost so certbot --nginx can find the server_name.
if [ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
  cat > /etc/nginx/sites-available/$DOMAIN <<'STUB'
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 200 'polingual provisioning'; add_header Content-Type text/plain; }
}
STUB
  ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
  nginx -t && systemctl reload nginx
  certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos \
    -m gianyrox@gmail.com --keep-until-expiring
fi
"

# Now install the real TLS vhost.
sudo_e "
set -e
cp /tmp/$DOMAIN.nginx /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
nginx -t
systemctl reload nginx
rm -f /tmp/$DOMAIN.nginx
"

# --------------------------------------------------------------------------- #
say "7. Verify live over HTTPS"
echo "--- /healthz ---"
curl -fsS "https://$DOMAIN/healthz" | head -c 600; echo
echo "--- cross-lingual semantic for a non-English word ---"
curl -fsS "https://$DOMAIN/semantic?surface=agua&lang=es&k=6" | head -c 800; echo

say "DONE — https://$DOMAIN is live."
