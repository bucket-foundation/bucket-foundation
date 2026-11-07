#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/../.."
DB="${LIVE_TEST_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
case "$DB" in *127.0.0.1*|*localhost*) ;; *) echo "refusing a non-local database"; exit 2 ;; esac
for m in "$root"/supabase/migrations/202611090000*_stoa_live*.sql; do
  psql "$DB" -X -q -v ON_ERROR_STOP=1 -c "set client_min_messages = warning" -f "$m" >/dev/null
done
psql "$DB" -X -q -c "notify pgrst, 'reload schema'"
status="$(cd "$root" && npx --yes supabase@2.117.0 status -o env 2>/dev/null)"
pick() { printf '%s\n' "$status" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" | head -1; }
export LIVE_LOCAL_URL="$(pick API_URL)"
export LIVE_LOCAL_SERVICE_KEY="$(pick SERVICE_ROLE_KEY)"
export LIVE_LOCAL_ANON_KEY="$(pick ANON_KEY)"
export POLINGUAL_DB_URL="$LIVE_LOCAL_URL"
export POLINGUAL_DB_SERVICE_KEY="$LIVE_LOCAL_SERVICE_KEY"
export POLINGUAL_DB_ANON_KEY="$LIVE_LOCAL_ANON_KEY"
export STOA_ROOM_SECRET="$(openssl rand -base64 48)"
export STOA_SWEEP_SECRET="$(openssl rand -base64 48)"
cd "$here/.."
npx playwright test -c playwright.live.config.ts "$@"
