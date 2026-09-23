#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${BUCKET_BASE:-https://www.bucket.foundation}/api/indexnow/ping"
echo "→ calling $ENDPOINT"
curl -fsS "$ENDPOINT" | python3 -m json.tool
