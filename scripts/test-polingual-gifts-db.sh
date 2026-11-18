#!/usr/bin/env bash
set -euo pipefail
DB="${GIFT_TEST_DB_URL:?set GIFT_TEST_DB_URL to a local Postgres}"
case "$DB" in *127.0.0.1*|*localhost*|*host=/*) ;; *) echo "refusing a non-local database"; exit 2 ;; esac
here="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"
q() { psql "$DB" -v ON_ERROR_STOP=1 -qtAX -c "$1"; }
fail() { echo "FAIL: $1"; exit 1; }

q "create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql as 'select null::uuid'" 2>/dev/null
for r in anon authenticated service_role; do q "do \$\$ begin create role $r; exception when duplicate_object then null; end \$\$"; done
psql "$DB" -v ON_ERROR_STOP=1 -qX -f "$here/20261118110000_academy_entitlements.sql" >/dev/null 2>&1
psql "$DB" -v ON_ERROR_STOP=1 -qX -f "$here/20261118120000_polingual_gifts.sql" >/dev/null
q "truncate bucket.polingual_gifts, bucket.academy_entitlements; delete from auth.users"
A=00000000-0000-4000-8000-00000000000a
B=00000000-0000-4000-8000-00000000000b
C=00000000-0000-4000-8000-00000000000c
D=00000000-0000-4000-8000-00000000000d
T=2026-12-25T12:00:00Z
q "insert into auth.users values ('$A'), ('$B'), ('$C'), ('$D')"
gift() { q "insert into bucket.polingual_gifts (stripe_event_id, stripe_session_id, stripe_payment_intent, paid_at, buyer_email, recipient_email, recipient_name, note, deliver_on, deliver_after, code_hash, expires_at) values ('evt_$1', 'cs_$1', 'pi_$1', '2026-12-01T00:00:00Z', 'b@x.co', 'r@x.co', 'R', 'hi', '2026-12-25', '2026-12-25T00:00:00Z', lpad('$1', 64, '0'), '$2')"; }
redeem() { q "select outcome from bucket.redeem_polingual_gift(lpad('$1', 64, '0'), '$2', '${3:-$T}')"; }
void() { q "select outcome || ':' || revoked from bucket.void_polingual_gift('pi_$1', '$2', '${3:-$T}')"; }
ends() { q "select status || ' ' || to_char(current_period_end at time zone 'utc', 'YYYY-MM-DD\"T\"HH24:MI') from bucket.academy_entitlements where user_id = '$1'"; }
for n in 1 2 4 5 6 7 8; do gift $n 2027-12-25T00:00:00Z; done
gift 3 2026-12-01T00:00:00Z

[ "$(redeem 9 $A)" = invalid ] || fail "unknown code"
[ "$(redeem 3 $A)" = expired ] || fail "expired code"
[ "$(redeem 1 $A)" = redeemed ] || fail "first redeem"
[ "$(ends $A)" = "active 2027-12-25T12:00" ] || fail "one year from redemption"
[ "$(q "select redeemed_by = '$A' from bucket.polingual_gifts where stripe_session_id = 'cs_1'")" = t ] || fail "owner set"
[ "$(redeem 1 $A)" = already ] || fail "same user sees already"
[ "$(redeem 1 $B)" = used ] || fail "single use"
[ "$(redeem 2 $A)" = redeemed ] || fail "second gift stacks"
[ "$(ends $A)" = "active 2028-12-25T12:00" ] || fail "second gift adds a year"

[ "$(void 2 refund 2026-12-26T12:00:00Z)" = "voided:true" ] || fail "refund after redeem ends that grant"
[ "$(ends $A)" = "active 2027-12-25T12:00" ] || fail "the other gift's year stays"
[ "$(void 2 refund)" = "already:false" ] || fail "second void is a no-op"
[ "$(void 1 dispute 2026-12-27T12:00:00Z)" = "voided:true" ] || fail "dispute after redeem"
[ "$(ends $A)" = "canceled 2026-12-27T12:00" ] || fail "last grant ends at the dispute"
[ "$(void zzz refund)" = "unknown:false" ] || fail "unknown payment"

[ "$(void 5 refund)" = "voided:false" ] || fail "refund before redeem"
[ "$(redeem 5 $B)" = void ] || fail "voided code is refused"
[ "$(q "select count(*) from bucket.academy_entitlements where user_id = '$B'")" = 0 ] || fail "voided code grants nothing"

[ "$(redeem 6 $D)" = redeemed ] || fail "redeem before a subscription"
q "update bucket.academy_entitlements set plan = 'yearly', stripe_subscription = 'sub_9', current_period_end = '2027-06-01T00:00:00Z' where user_id = '$D'"
[ "$(void 6 refund)" = "voided:false" ] || fail "a Stripe subscription row is never revoked by a gift refund"
[ "$(ends $D)" = "active 2027-06-01T00:00" ] || fail "subscription row untouched"

q "insert into bucket.academy_entitlements (user_id, product, status, plan, stripe_subscription) values ('$C', 'polingual', 'active', 'yearly', 'sub_1')"
[ "$(redeem 4 $C)" = subscribed ] || fail "live subscription keeps the code"
[ "$(q "select redeemed_at is null from bucket.polingual_gifts where stripe_session_id = 'cs_4'")" = t ] || fail "code stays unused for a subscriber"

q "create table if not exists bucket.test_outcomes (outcome text); truncate bucket.test_outcomes"
pids=()
for i in $(seq 1 12); do q "insert into bucket.test_outcomes select outcome from bucket.redeem_polingual_gift(lpad('4', 64, '0'), '$B', '$T')" & pids+=($!); done
for p in "${pids[@]}"; do wait "$p" || fail "a concurrent redeem errored"; done
[ "$(q "select count(*) from bucket.test_outcomes where outcome = 'redeemed'")" = 1 ] || fail "exactly one concurrent redeem wins"
[ "$(q "select count(*) from bucket.test_outcomes where outcome = 'already'")" = 11 ] || fail "the rest report already"
q "drop table bucket.test_outcomes"

q "update bucket.polingual_gifts set redeemed_by = '$B', redeemed_at = '2026-12-01T00:00:00Z' where stripe_session_id = 'cs_7'"
[ "$(q "select bucket.purge_polingual_gift_pii('2026-12-10T00:00:00Z', '2027-01-01T00:00:00Z')")" = 2 ] || fail "purge takes the long-redeemed and the long-expired gift"
[ "$(q "select recipient_email is null and recipient_name is null and note is null and buyer_email = 'b@x.co' and stripe_payment_intent = 'pi_7' from bucket.polingual_gifts where stripe_session_id = 'cs_7'")" = t ] || fail "recipient fields cleared, payment record kept"
[ "$(q "select recipient_email from bucket.polingual_gifts where stripe_session_id = 'cs_8'")" = "r@x.co" ] || fail "a live gift keeps its recipient"
[ "$(q "select bucket.purge_polingual_gift_pii('2026-12-10T00:00:00Z')")" = 0 ] || fail "purge runs once per gift"

[ "$(q "insert into bucket.polingual_gifts (stripe_event_id, stripe_session_id, paid_at, buyer_email, deliver_on, deliver_after, expires_at) values ('evt_dupe', 'cs_1', now(), 'b@x.co', '2026-12-25', now(), now()) on conflict (stripe_session_id) do nothing returning 1" | wc -l | tr -d ' ')" = 0 ] || fail "one gift per checkout session"
[ "$(q "select count(*) from information_schema.columns where table_schema = 'bucket' and table_name = 'polingual_gifts' and column_name = 'code'")" = 0 ] || fail "no plaintext code column"
[ "$(q "select has_table_privilege('anon', 'bucket.polingual_gifts', 'select') or has_table_privilege('authenticated', 'bucket.polingual_gifts', 'select')")" = f ] || fail "table closed to anon and authenticated"
echo "polingual gifts: ok"
