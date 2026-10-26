#!/usr/bin/env bash
set -euo pipefail
DB="${FOUNDING_TEST_DB_URL:?set FOUNDING_TEST_DB_URL to a local or branch Postgres}"
case "$DB" in *127.0.0.1*|*localhost*) ;; *) [ "${FOUNDING_TEST_ALLOW_REMOTE:-}" = 1 ] || { echo "refusing a non-local database"; exit 2; } ;; esac
here="$(cd "$(dirname "$0")" && pwd)"
q() { psql "$DB" -v ON_ERROR_STOP=1 -qtAX -c "$1"; }
fail() { echo "FAIL: $1"; exit 1; }

psql "$DB" -v ON_ERROR_STOP=1 -qX -f "$here/founding.sql" >/dev/null
q "truncate polingual.founding_codes, polingual.founding_attempts"
q "insert into polingual.founding_codes (code) select 'TEST' || lpad(g::text, 4, '0') from generate_series(1, 200) g"

[ "$(q "select outcome from polingual.claim_founding_code('a@x.co', 'ip1')")" = claimed ] || fail "first claim"
[ "$(q "select outcome from polingual.claim_founding_code('a@x.co', 'ip1')")" = recent ] || fail "same email within 10 minutes resends nothing"
[ "$(q "select count(*) from polingual.founding_codes where email = 'a@x.co'")" = 1 ] || fail "one code per email"

for i in $(seq 1 50); do q "select 1 from polingual.claim_founding_code('drain$i@x.co', 'ip-drain')" >/dev/null; done
[ "$(q "select count(*) from polingual.founding_codes where email like 'drain%'")" = 3 ] || fail "50 claims from one ip took more than 3 codes"

pids=()
for i in $(seq 1 20); do q "select outcome from polingual.claim_founding_code('race@x.co', 'ip-race-$i')" > "/tmp/founding-race-$$-$i" 2>&1 & pids+=($!); done
for p in "${pids[@]}"; do wait "$p" || fail "a concurrent claim errored"; done
[ "$(q "select count(*) from polingual.founding_codes where email = 'race@x.co'")" = 1 ] || fail "concurrent claims for one email took more than one code"
[ "$(cat /tmp/founding-race-$$-* | grep -c claimed)" = 1 ] || fail "exactly one concurrent claim reports claimed"
rm -f /tmp/founding-race-$$-*

q "update polingual.founding_codes set email = 'filler' || code where email is null"
[ "$(q "select outcome from polingual.claim_founding_code('late@x.co', 'ip-late')")" = full ] || fail "full when no code is left"

q "update polingual.founding_codes set sent_at = now() - interval '11 minutes' where email = 'a@x.co'"
[ "$(q "select outcome from polingual.claim_founding_code('a@x.co', 'ip1')")" = resend ] || fail "resend after 10 minutes"

q "insert into polingual.founding_attempts (ip_hash, at) values ('old', now() - interval '2 days')"
q "select 1 from polingual.claim_founding_code('gc@x.co', 'ip-gc')" >/dev/null
[ "$(q "select count(*) from polingual.founding_attempts where ip_hash = 'old'")" = 0 ] || fail "ip hashes older than a day are deleted"

q "select polingual.forget_founding_email('a@x.co')"
[ "$(q "select count(*) from polingual.founding_codes where email = 'a@x.co'")" = 0 ] || fail "forget removes the address"

[ "$(q "select has_function_privilege('anon', 'polingual.founding_spots()', 'execute')")" = f ] || fail "anon cannot read spots"
[ "$(q "select has_function_privilege('anon', 'polingual.claim_founding_code(text, text, int)', 'execute')")" = f ] || fail "anon cannot claim"

q "truncate polingual.founding_codes, polingual.founding_attempts"
echo "founding.sql: all checks pass"
