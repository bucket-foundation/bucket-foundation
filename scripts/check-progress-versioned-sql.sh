#!/usr/bin/env bash
set -euo pipefail
db="${1:-supabase_db_bucket-foundation}"
here="$(dirname "$0")"
migration="$here/../supabase/migrations/20261125000000_academy_progress_versioned_write.sql"
out=$(python3 - "$migration" "$here/fixtures/card-merge-cases.json" <<'PY' | docker exec -i "$db" psql -U postgres -qAt -v ON_ERROR_STOP=1
import json, sys
u = "'00000000-0000-0000-0000-0000000000c1'"
q = lambda v: "'" + json.dumps(v).replace("'", "''") + "'::jsonb"
w = lambda rows: f"(bucket.academy_progress_write({u}, {rows}))"
ver = f"(select to_jsonb(updated_at)#>>'{{}}' from bucket.academy_progress where user_id = {u} and branch = 'lang-sys-t')"
print("begin;")
print(open(sys.argv[1]).read())
print(f"insert into auth.users (id) values ({u});")
for i, c in enumerate(json.load(open(sys.argv[2]))):
    for x, y in ((c["a"], c["b"]), (c["b"], c["a"])):
        print(f"select 'case{i}', bucket.academy_card_later({q(x)}, {q(y)}) = {q(c[c['winner']])};")
print("select 'first-null', " + w(q([{"branch": "lang-sys-t", "data": {"cards": {"fr:chat": {"reps": 2, "lastReview": 9000}}}, "version": None}])) + "->'written' = '[\"lang-sys-t\"]';")
print("select 'second-null', " + w(q([{"branch": "lang-sys-t", "data": {"cards": {"x": {"reps": 1}}}, "version": None}])) + "->'stale' = '[\"lang-sys-t\"]';")
print("select 'old-version', " + w(q([{"branch": "lang-sys-t", "data": {"cards": {"x": {"reps": 1}}}, "version": "2000-01-01T00:00:00Z"}])) + "->'stale' = '[\"lang-sys-t\"]';")
print(f"select 'current-version', bucket.academy_progress_write({u}, jsonb_build_array(jsonb_build_object('branch','lang-sys-t','data',{q({'cards': {'fr:chat': {'reps': 3, 'lastReview': 2000}}})},'version',{ver})))->'written' = '[\"lang-sys-t\"]';")
print(f"select 'reps-kept', (select data->'cards'->'fr:chat'->>'reps' from bucket.academy_progress where user_id = {u} and branch = 'lang-sys-t') = '3';")
print("select 'lower-reps-push', " + w(q([{"branch": "lang-sys-t", "data": {"cards": {"fr:chat": {"reps": 2, "lastReview": 9999}}}}])) + "->'written' = '[\"lang-sys-t\"]';")
print(f"select 'converged', (select data->'cards'->'fr:chat' from bucket.academy_progress where user_id = {u} and branch = 'lang-sys-t') = {q({'reps': 3, 'lastReview': 2000})};")
print("select 'mixed', " + w(q([{"branch": "lang-sys-t", "data": {"cards": {}}, "version": "2000-01-01T00:00:00Z"}, {"branch": "lang-sys-u", "data": {"cards": {"y": {"reps": 1}}}}])) + " = '{\"written\":[\"lang-sys-u\"],\"refused\":[],\"stale\":[\"lang-sys-t\"]}'::jsonb;")
print("rollback;")
PY
)
echo "$out"
if echo "$out" | grep -q '|f$'; then echo FAIL; exit 1; fi
