#!/usr/bin/env bash
set -euo pipefail
db="${1:-supabase_db_bucket-foundation}"
fixture="$(dirname "$0")/fixtures/progress-weight.json"
python3 -c 'import json,sys; [print(c["name"]+"\t"+str(c["weight"])+"\t"+json.dumps(c["data"])) for c in json.load(open(sys.argv[1]))]' "$fixture" | while IFS=$'\t' read -r name want data; do
  got=$(printf "select bucket.academy_progress_weight(%s::jsonb);" "'${data//\'/\'\'}'" | docker exec -i "$db" psql -U postgres -qAt)
  if [ "$got" != "$want" ]; then echo "FAIL $name: sql $got, fixture $want"; exit 1; fi
  echo "ok $name"
done
