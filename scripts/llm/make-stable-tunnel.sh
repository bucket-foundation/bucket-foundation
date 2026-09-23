#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
HOSTNAME_FQDN="${LLM_TUNNEL_HOSTNAME:-llm.agfarms.dev}"
TUNNEL_NAME="${LLM_TUNNEL_NAME:-bkt-llm}"
SHIM_PORT="${LLM_SHIM_PORT:-11500}"
CF="$(command -v cloudflared || echo "$HOME/.local/bin/cloudflared")"
CFDIR="$HOME/.cloudflared"
UNIT="$HOME/.config/systemd/user/bkt-llm-tunnel.service"

say () { printf '\n\033[1m%s\033[0m\n' "$*"; }

if [ ! -f "$CFDIR/cert.pem" ]; then
  echo "ERROR: $CFDIR/cert.pem not found."
  echo "Run the one founder step first:   $CF tunnel login"
  echo "(opens a browser → choose the agfarms.dev zone), then re-run this script."
  exit 1
fi

say "1. Ensuring named tunnel '$TUNNEL_NAME' exists"
if "$CF" tunnel list 2>/dev/null | awk '{print $2}' | grep -qx "$TUNNEL_NAME"; then
  echo "   tunnel '$TUNNEL_NAME' already exists — reusing"
else
  "$CF" tunnel create "$TUNNEL_NAME"
fi
UUID="$("$CF" tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$2==n{print $1}' | head -1)"
[ -n "$UUID" ] || { echo "ERROR: could not resolve tunnel UUID"; exit 1; }
echo "   UUID=$UUID"

say "2. Writing $CFDIR/config.yml (ingress → shim on :$SHIM_PORT)"
cat > "$CFDIR/config.yml" <<YAML
tunnel: $UUID
credentials-file: $CFDIR/$UUID.json
ingress:
  - hostname: $HOSTNAME_FQDN
    service: http://127.0.0.1:$SHIM_PORT
  - service: http_status:404
YAML
cat "$CFDIR/config.yml"

say "3. Routing DNS $HOSTNAME_FQDN → tunnel"
"$CF" tunnel route dns "$TUNNEL_NAME" "$HOSTNAME_FQDN" 2>&1 | sed 's/^/   /' || \
  echo "   (route may already exist — continuing)"

say "4. Repointing $UNIT at the named tunnel"
cat > "$UNIT" <<UNITEOF
[Unit]
Description=Bucket Academy LLM — NAMED cloudflared tunnel ($HOSTNAME_FQDN) to the auth-shim
After=bkt-llm-shim.service network-online.target
Wants=network-online.target
Requires=bkt-llm-shim.service

[Service]
Type=simple
ExecStart=$CF tunnel --no-autoupdate --config $CFDIR/config.yml run $TUNNEL_NAME
Restart=always
RestartSec=15
Environment=HOME=$HOME
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
UNITEOF
systemctl --user daemon-reload
systemctl --user restart bkt-llm-tunnel

say "5. Verifying https://$HOSTNAME_FQDN/health"
echo "https://$HOSTNAME_FQDN" > "$DIR/.tunnel-url"
ok=""
for i in $(seq 1 20); do
  if curl -fsS -m 8 "https://$HOSTNAME_FQDN/health" >/tmp/llm-stable-health.json 2>/dev/null; then
    ok=1; echo "   OK: $(cat /tmp/llm-stable-health.json)"; break
  fi
  sleep 3
done
[ -n "$ok" ] || { echo "   not healthy yet — DNS may still be propagating; re-check in a minute."; }

say "DONE — stable endpoint is $HOSTNAME_FQDN"
cat <<NEXT

Set this ONCE on the Vercel bucket-foundation project (it never changes again):

  LLM_BASE_URL = https://$HOSTNAME_FQDN/v1

then redeploy. After this, restarting the tunnel/laptop keeps the SAME URL, so
you never have to touch the Vercel env again. (The endpoint still goes dark
gracefully when the laptop is off — that's the local-GPU trade.)
NEXT
