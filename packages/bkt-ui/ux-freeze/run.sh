#!/usr/bin/env bash
set -euo pipefail
ui="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
root="$(cd "$ui/../.." && pwd)"
suite="${1:-window}"
shift || true
docker run --rm --ipc=host --network host --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI="${CI:-}" \
  -e UX_FREEZE_SITE_URL -e UX_FREEZE_MAIL_URL \
  -v "$root:$root" -w "$ui" mcr.microsoft.com/playwright:v1.58.2-noble \
  bash ux-freeze/inside.sh "$suite" "$@"
