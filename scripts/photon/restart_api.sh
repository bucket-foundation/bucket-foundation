#!/usr/bin/env bash
# Restart the pgvector query API with a fresh connection pool.
cd /home/gian/agfarms/bucket-foundation
pkill -f "uvicorn.*server_pg" 2>/dev/null || true
sleep 2
nohup python3 -m uvicorn server_pg:app --host 127.0.0.1 --port 8090 --app-dir services/photon-api \
  > _intake/photons/logs/server_pg.log 2>&1 &
echo "restarted pgvector API pid $!"
