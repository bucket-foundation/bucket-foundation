#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec npx ts-node --compiler-options '{"module":"commonjs"}' scripts/beads/dispatch-pending.ts "$@"
