#!/usr/bin/env bash
# Adds a /llm/ location to the atlas-api.agfarms.dev vhost that proxies to the
# reverse-tunnelled home GPU shim on 127.0.0.1:18011. Idempotent + safe:
# backs up, validates with `nginx -t`, and ROLLS BACK if validation fails.
# Run on prod-hetzner-1:   sudo bash /tmp/setup-llm-nginx.sh
set -euo pipefail

VHOST=/etc/nginx/sites-enabled/atlas-api.agfarms.dev
STAMP=$(date +%Y%m%d-%H%M%S)
BAK="/etc/nginx/sites-enabled/.atlas-api.agfarms.dev.bak-$STAMP"

[ -f "$VHOST" ] || { echo "ERROR: $VHOST not found"; exit 1; }

if grep -q "location /llm/" "$VHOST"; then
  echo "/llm/ location already present — just validating + reloading."
else
  cp "$VHOST" "$BAK"
  echo "backed up -> $BAK"

  BLOCK=$(cat <<'NGINX'
    # Bucket Academy LLM — reverse-tunnel to Gian's home GPU shim (bearer-auth at the shim).
    location /llm/ {
        proxy_pass http://127.0.0.1:18011/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_send_timeout 180s;
        proxy_buffering off;
    }

NGINX
)
  # insert the block immediately before the first "location / {"
  awk -v block="$BLOCK" '
    !done && /location \/ \{/ { print block; done=1 }
    { print }
  ' "$VHOST" > "${VHOST}.new"

  grep -q "location /llm/" "${VHOST}.new" || { echo "ERROR: insertion failed"; rm -f "${VHOST}.new"; exit 1; }
  mv "${VHOST}.new" "$VHOST"
  echo "inserted /llm/ location."
fi

if nginx -t; then
  systemctl reload nginx
  echo "nginx reloaded OK."
else
  echo "nginx -t FAILED — rolling back."
  [ -f "$BAK" ] && cp "$BAK" "$VHOST"
  exit 1
fi

echo "=== local verify (on box) ==="
curl -s -m 8 https://atlas-api.agfarms.dev/llm/health || curl -s -m 8 -k https://127.0.0.1/llm/health -H 'Host: atlas-api.agfarms.dev' || true
echo
echo "DONE."
