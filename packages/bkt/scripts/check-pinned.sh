#!/usr/bin/env bash
set -euo pipefail
base="${1:-origin/dev}"
git diff --exit-code "$base...HEAD" -- \
  src/app/api/canon/search/route.ts \
  src/lib/canon-search-index.ts \
  src/app/canon/CanonGlobeMount.tsx
