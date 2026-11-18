#!/usr/bin/env bash
set -euo pipefail
DB="${GIFT_TEST_DB_URL:?set GIFT_TEST_DB_URL to a local Postgres}"
case "$DB" in *127.0.0.1*|*localhost*|*host=/*) ;; *) echo "refusing a non-local database"; exit 2 ;; esac
here="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"
q() { psql "$DB" -v ON_ERROR_STOP=1 -qtAX -c "$1"; }
fail() { echo "FAIL: $1"; exit 1; }

q "create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql as 'select null::uuid'"
for r in anon authenticated service_role; do q "do \$\$ begin create role $r; exception when duplicate_object then null; end \$\$"; done
psql "$DB" -v ON_ERROR_STOP=1 -qX -f "$here/20261026010100_academy_entitlements.sql" >/dev/null
psql "$DB" -v ON_ERROR_STOP=1 -qX -f "$here/20261118120000_polingual_gifts.sql" >/dev/null
q "truncate bucket.polingual_gifts, bucket.academy_entitlements; delete from auth.users"
A=00000000-0000-4000-8000-00000000000a
B=00000000-0000-4000-8000-00000000000b
C=00000000-0000-4000-8000-00000000000c
q "insert into auth.users values ('$A'), ('$B'), ('$C')"
gift() { q "insert into bucket.polingual_gifts (stripe_event_id, stripe_session_id, buyer_email, recipient_email, recipient_name, deliver_on, code, code_hash, expires_at) values ('evt_$1', 'cs_$1', 'b@x.co', 'r@x.co', 'R', '2026-12-25', 'CODE$1', lpad('$1', 64, '0'), '$2')"; }
redeem() { q "select outcome from bucket.redeem_polingual_gift(lpad('$1', 64, '0'), '$2', '2026-12-25T12:00:00Z')"; }
gift 1 2027-12-25T00:00:00Z
gift 2 2027-12-25T00:00:00Z
gift 3 2026-12-01T00:00:00Z
gift 4 2027-12-25T00:00:00Z

[ "$(redeem 9 $A)" = invalid ] || fail "unknown code"
[ "$(redeem 3 $A)" = expired ] || fail "expired code"
[ "$(redeem 1 $A)" = redeemed ] || fail "first redeem"
[ "$(q "select current_period_end from bucket.academy_entitlements where user_id = '$A'")" = "$(q "select '2027-12-25T12:00:00Z'::timestamptz")" ] || fail "one year from redemption"
[ "$(q "select code is null and redeemed_by = '$A' from bucket.polingual_gifts where stripe_session_id = 'cs_1'")" = t ] || fail "code cleared and owner set"
[ "$(redeem 1 $A)" = already ] || fail "same user sees already"
[ "$(redeem 1 $B)" = used ] || fail "single use"
[ "$(redeem 2 $A)" = redeemed ] || fail "second gift stacks"
[ "$(q "select current_period_end from bucket.academy_entitlements where user_id = '$A'")" = "$(q "select '2028-12-25T12:00:00Z'::timestamptz")" ] || fail "second gift adds a year"

q "insert into bucket.academy_entitlements (user_id, product, status, plan, stripe_subscription) values ('$C', 'polingual', 'active', 'yearly', 'sub_1')"
[ "$(redeem 4 $C)" = subscribed ] || fail "live subscription keeps the code"
[ "$(q "select redeemed_at is null and code = 'CODE4' from bucket.polingual_gifts where stripe_session_id = 'cs_4'")" = t ] || fail "code stays unused for a subscriber"

q "create table if not exists bucket.test_outcomes (outcome text); truncate bucket.test_outcomes"
pids=()
for i in $(seq 1 12); do q "insert into bucket.test_outcomes select outcome from bucket.redeem_polingual_gift(lpad('4', 64, '0'), '$B', now())" & pids+=($!); done
for p in "${pids[@]}"; do wait "$p" || fail "a concurrent redeem errored"; done
[ "$(q "select count(*) from bucket.test_outcomes where outcome = 'redeemed'")" = 1 ] || fail "exactly one concurrent redeem wins"
[ "$(q "select count(*) from bucket.test_outcomes where outcome = 'already'")" = 11 ] || fail "the rest report already"
q "drop table bucket.test_outcomes"
[ "$(q "insert into bucket.polingual_gifts (stripe_event_id, stripe_session_id, buyer_email, recipient_email, recipient_name, deliver_on, code, code_hash, expires_at) values ('evt_dupe', 'cs_1', 'b@x.co', 'r@x.co', 'R', '2026-12-25', 'X', lpad('7', 64, '0'), now()) on conflict (stripe_session_id) do nothing returning 1" | wc -l | tr -d ' ')" = 0 ] || fail "one gift per checkout session"
[ "$(q "select has_table_privilege('anon', 'bucket.polingual_gifts', 'select') or has_table_privilege('authenticated', 'bucket.polingual_gifts', 'select')")" = f ] || fail "table closed to anon and authenticated"
echo "polingual gifts: ok"
