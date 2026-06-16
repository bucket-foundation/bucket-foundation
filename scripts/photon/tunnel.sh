#!/usr/bin/env bash
# Expose the local full-6.5M Polingual API (127.0.0.1:8090) over a Cloudflare
# quick tunnel so the DEPLOYED app can reach it. Set Vercel POLINGUAL_API_URL to
# the printed URL; the proxy auto-falls-back to polingual.agfarms.dev (209k) and
# then the baked offline subset when this box/tunnel is unreachable.
#
# NOTE: the quick-tunnel URL is EPHEMERAL (changes each restart). For a stable
# hostname run a NAMED tunnel: `cloudflared tunnel login` (one browser auth) then
# `cloudflared tunnel create polingual-local` + route DNS to polingual-local.agfarms.dev.
cd /home/gian/agfarms/bucket-foundation
mkdir -p _intake/photons/logs
pkill -f "cloudflared tunnel --url http://127.0.0.1:8090" 2>/dev/null || true
sleep 1
nohup cloudflared tunnel --url http://127.0.0.1:8090 --no-autoupdate \
  > _intake/photons/logs/tunnel.log 2>&1 &
echo "cloudflared pid $!"
for i in $(seq 1 30); do
  u=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' _intake/photons/logs/tunnel.log | head -1)
  [ -n "$u" ] && { echo "TUNNEL URL: $u"; echo "-> set Vercel POLINGUAL_API_URL to this"; break; }
  sleep 2
done
