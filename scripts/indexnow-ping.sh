#!/usr/bin/env bash
# IndexNow one-shot: fan out sitemap URLs to Bing / Yandex / Seznam / Naver.
# Usage: ./scripts/indexnow-ping.sh
# Safe to re-run after any content change.
set -euo pipefail

ENDPOINT="${BUCKET_BASE:-https://www.bucket.foundation}/api/indexnow/ping"
echo "→ calling $ENDPOINT"
curl -fsS "$ENDPOINT" | python3 -m json.tool
