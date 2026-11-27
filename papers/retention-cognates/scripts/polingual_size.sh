#!/usr/bin/env bash
set -euo pipefail
docker exec supabase_db_bucket-foundation psql -U postgres -At -F ' ' -c "
select 'rows', count(*), count(distinct user_id) from bucket.academy_progress where branch like 'lang%';
select 'review_log_entries', coalesce(sum(jsonb_array_length(data->'log')), 0), count(distinct user_id) from bucket.academy_progress where jsonb_typeof(data->'log') = 'array';
select 'cards_reps_ge_2', count(*), count(distinct a.user_id) from bucket.academy_progress a, jsonb_each(case when jsonb_typeof(a.data->'cards') = 'object' then a.data->'cards' else '{}' end) c where (c.value->>'reps')::int >= 2;
"
