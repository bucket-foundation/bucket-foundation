#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
git -C "$repo" log -1 --format='%h %cs' --abbrev=9 2>/dev/null || true
