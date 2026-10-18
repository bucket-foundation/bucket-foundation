#!/usr/bin/env bash
set -euo pipefail
ui="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
root="$(cd "$ui/../.." && pwd)"
docker run --rm --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI="${CI:-}" \
  -v "$root:$root" -w "$ui" mcr.microsoft.com/playwright:v1.58.2-noble \
  bash ux-freeze/inside.sh "$@"
