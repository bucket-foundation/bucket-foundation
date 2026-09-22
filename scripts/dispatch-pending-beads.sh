#!/usr/bin/env bash
#
# Files BEADS-PENDING.jsonl rows as beads through scripts/beads/dispatch-pending.ts.
# One request per create, a lookup by exact title before any resend, and
# dependency edges read back before a row retires to BEADS-DISPATCHED.jsonl.
# BEADS-PENDING.jsonl itself is never rewritten.
#
#   NUCLEUS_ADMIN_USER=... NUCLEUS_ADMIN_PASSWORD=... \
#     ./scripts/dispatch-pending-beads.sh --source research-os-ai           # dry run
#   ./scripts/dispatch-pending-beads.sh --source research-os-ai --apply     # write
#
set -euo pipefail
cd "$(dirname "$0")/.."
exec npx ts-node --compiler-options '{"module":"commonjs"}' scripts/beads/dispatch-pending.ts "$@"
