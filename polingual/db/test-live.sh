#!/usr/bin/env bash
set -euo pipefail
DB="${LIVE_TEST_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
case "$DB" in *127.0.0.1*|*localhost*) ;; *) echo "refusing a non-local database"; exit 2 ;; esac
here="$(cd "$(dirname "$0")" && pwd)"
tests="$here/../../supabase/tests"
for f in "$tests"/stoa_*.sql; do
  psql "$DB" -X -q -v ON_ERROR_STOP=1 -f "$f"
done
