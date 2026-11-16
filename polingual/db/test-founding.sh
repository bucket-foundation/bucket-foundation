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

q "create table if not exists polingual.test_outcomes (run text, outcome text)"
q "truncate polingual.test_outcomes"
seen() { q "select count(*) from polingual.test_outcomes where run = '$1' and outcome = '$2'"; }

pids=()
for i in $(seq 1 20); do q "insert into polingual.test_outcomes select 'race', outcome from polingual.claim_founding_code('race@x.co', 'ip-race-$i')" & pids+=($!); done
for p in "${pids[@]}"; do wait "$p" || fail "a concurrent claim errored"; done
[ "$(q "select count(*) from polingual.founding_codes where email = 'race@x.co'")" = 1 ] || fail "concurrent claims for one email took more than one code"
[ "$(seen race claimed)" = 1 ] || fail "exactly one concurrent claim reports claimed"

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

claim() { q "select outcome || ':' || spots_left from polingual.claim_founding_family('$1', '$1', '$2', '$3')"; }
confirm() { q "select outcome || ':' || spots_left from polingual.confirm_founding_family('$1')"; }

q "truncate polingual.founding_families, polingual.founding_attempts"
[ "$(q "select total || ':' || spots_left from polingual.founding_family_spots()")" = 500:500 ] || fail "family spots start at 500"
[ "$(claim fam@x.co tok-fam fip1)" = pending:500 ] || fail "an unconfirmed claim holds no spot"
[ "$(claim fam@x.co tok-fam2 fip1)" = recent:500 ] || fail "same family email within 10 minutes resends nothing"
[ "$(confirm tok-nope)" = invalid:500 ] || fail "an unknown token confirms nothing"
[ "$(confirm tok-fam)" = confirmed:499 ] || fail "confirming takes one spot"
[ "$(confirm tok-fam)" = already:499 ] || fail "a second confirm takes no second spot"
[ "$(claim fam@x.co tok-fam3 fip1)" = recent:499 ] || fail "a confirmed family that signs up again within 10 minutes gets no second email"
q "update polingual.founding_families set sent_at = now() - interval '11 minutes' where email = 'fam@x.co'"
[ "$(claim fam@x.co tok-fam4 fip1)" = confirmed:499 ] || fail "a confirmed family gets its confirmation again after 10 minutes"
[ "$(confirm tok-fam4)" = invalid:499 ] || fail "a repeat signup does not replace a confirmed token"
[ "$(q "select address from polingual.confirm_founding_family('tok-fam')")" = fam@x.co ] || fail "confirm returns the address to email"

q "select 1 from polingual.claim_founding_family('late@x.co', 'late@x.co', 'tok-old', 'fip2')" >/dev/null
q "update polingual.founding_families set sent_at = now() - interval '11 minutes' where email = 'late@x.co'"
[ "$(claim late@x.co tok-new fip2)" = resend:499 ] || fail "family resend after 10 minutes"
[ "$(confirm tok-old)" = invalid:499 ] || fail "a resend retires the old link"

q "insert into polingual.founding_families (email, address, token_hash, sent_at) values ('old@x.co', 'old@x.co', 'tok-expired', now() - interval '8 days'), ('week@x.co', 'week@x.co', 'tok-week', now() - interval '6 days')"
[ "$(confirm tok-expired)" = invalid:499 ] || fail "a confirm link older than 7 days is dead"
[ "$(q "select count(*) from polingual.founding_families where email = 'old@x.co'")" = 0 ] || fail "an expired pending row is purged"
[ "$(confirm tok-week)" = confirmed:498 ] || fail "a 6 day old link still confirms"
q "insert into polingual.founding_families (email, address, token_hash, sent_at) values ('old2@x.co', 'old2@x.co', 'tok-expired2', now() - interval '8 days')"
q "update polingual.founding_families set sent_at = now() - interval '30 days' where email = 'fam@x.co'"
[ "$(claim fresh@x.co tok-fresh fip3)" = pending:498 ] || fail "claim after a purge"
[ "$(q "select count(*) from polingual.founding_families where email = 'old2@x.co'")" = 0 ] || fail "the claim path purges expired pending rows"
[ "$(q "select count(*) from polingual.founding_families where email = 'fam@x.co' and confirmed_at is not null")" = 1 ] || fail "a confirmed row never expires"
[ "$(claim old2@x.co tok-again fip3)" = pending:498 ] || fail "an expired address can sign up again"

for i in $(seq 1 20); do q "select 1 from polingual.claim_founding_family('fdrain$i@x.co', 'fdrain$i@x.co', 'tok-drain-$i', 'fip-drain')" >/dev/null; done
[ "$(q "select count(*) from polingual.founding_families where email like 'fdrain%'")" = 3 ] || fail "20 family claims from one ip made more than 3 rows"

q "truncate polingual.founding_families, polingual.founding_attempts"
q "insert into polingual.founding_families (email, address, token_hash, confirmed_at) select 'seed' || g || '@x.co', 'seed' || g || '@x.co', 'tok-seed-' || g, now() from generate_series(1, 495) g"
q "insert into polingual.founding_families (email, address, token_hash) select 'cap' || g || '@x.co', 'cap' || g || '@x.co', 'tok-cap-' || g from generate_series(1, 20) g"
[ "$(q "select spots_left from polingual.founding_family_spots()")" = 5 ] || fail "20 unconfirmed emails take no spots"
pids=()
for i in $(seq 1 20); do q "insert into polingual.test_outcomes select 'cap', outcome from polingual.confirm_founding_family('tok-cap-$i')" & pids+=($!); done
for p in "${pids[@]}"; do wait "$p" || fail "a concurrent family confirm errored"; done
[ "$(q "select count(*) from polingual.founding_families where confirmed_at is not null")" = 500 ] || fail "20 concurrent confirms on 5 open spots did not stop at 500"
[ "$(seen cap confirmed)" = 5 ] || fail "exactly 5 concurrent confirms report confirmed"
[ "$(seen cap full)" = 15 ] || fail "the other 15 report full"
[ "$(claim new@x.co tok-new2 fip-late)" = full:0 ] || fail "family 501 is refused"
[ "$(claim seed1@x.co tok-x fip-seed)" = full:0 ] || fail "a full list answers a holder and a stranger alike"

q "select polingual.forget_founding_email('seed1@x.co')"
[ "$(q "select spots_left from polingual.founding_family_spots()")" = 1 ] || fail "forget frees the family spot"
[ "$(q "select has_function_privilege('anon', 'polingual.claim_founding_family(text, text, text, text, int, int)', 'execute')")" = f ] || fail "anon cannot claim a family spot"
[ "$(q "select has_function_privilege('anon', 'polingual.confirm_founding_family(text, int)', 'execute')")" = f ] || fail "anon cannot confirm a family spot"
[ "$(q "select has_function_privilege('anon', 'polingual.purge_founding_pending(int)', 'execute')")" = f ] || fail "anon cannot purge"
[ "$(q "select has_function_privilege('anon', 'polingual.founding_family_spots(int)', 'execute')")" = f ] || fail "anon cannot read family spots"

q "drop table polingual.test_outcomes"
q "truncate polingual.founding_codes, polingual.founding_attempts, polingual.founding_families"
echo "founding.sql: all checks pass"
