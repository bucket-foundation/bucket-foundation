#!/usr/bin/env bash
cd ~/agfarms/bucket-foundation
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
