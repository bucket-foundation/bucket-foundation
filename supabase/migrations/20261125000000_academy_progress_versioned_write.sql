create or replace function bucket.academy_card_later(a jsonb, b jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when a is null or jsonb_typeof(a) <> 'object' then b
    when b is null or jsonb_typeof(b) <> 'object' then a
    when row(coalesce((b->>'reps')::numeric, 0), coalesce((b->>'lastReview')::numeric, 0), coalesce((b->>'lapses')::numeric, 0), coalesce((b->>'due')::numeric, 0))
       > row(coalesce((a->>'reps')::numeric, 0), coalesce((a->>'lastReview')::numeric, 0), coalesce((a->>'lapses')::numeric, 0), coalesce((a->>'due')::numeric, 0))
      then b
    else a
  end
$$;

create or replace function bucket.academy_merge_cards(cur jsonb, inc jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when jsonb_typeof(cur->'cards') <> 'object' or jsonb_typeof(inc) <> 'object' or jsonb_typeof(inc->'cards') <> 'object' then inc
    else jsonb_set(inc, '{cards}', coalesce((
      select jsonb_object_agg(k, bucket.academy_card_later(cur->'cards'->k, inc->'cards'->k))
      from (select jsonb_object_keys(cur->'cards') as k union select jsonb_object_keys(inc->'cards')) keys
    ), '{}'::jsonb))
  end
$$;

create or replace function bucket.academy_progress_write(p_user uuid, p_rows jsonb, p_reset boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = bucket, pg_temp
as $$
declare
  r jsonb;
  cur jsonb;
  cur_at timestamptz;
  incoming jsonb;
  written text[] := '{}';
  refused text[] := '{}';
  stale text[] := '{}';
begin
  for r in select value from jsonb_array_elements(p_rows) order by value->>'branch' loop
    perform pg_advisory_xact_lock(hashtextextended(p_user::text || '/' || (r->>'branch'), 0));
    cur := null;
    cur_at := null;
    select data, updated_at into cur, cur_at from bucket.academy_progress where user_id = p_user and branch = r->>'branch' for update;
    incoming := coalesce(r->'data', '{}'::jsonb);
    if r ? 'version' and (
      (jsonb_typeof(r->'version') = 'null' and cur_at is not null)
      or (jsonb_typeof(r->'version') = 'string' and (cur_at is null or cur_at <> (r->>'version')::timestamptz))
    ) then
      stale := stale || (r->>'branch');
    elsif not p_reset and bucket.academy_progress_weight(incoming) = 0 and cur is not null and bucket.academy_progress_weight(cur) > 0 then
      refused := refused || (r->>'branch');
    else
      if not p_reset and cur is not null and (r->>'branch') like 'lang-sys-%' then
        incoming := bucket.academy_merge_cards(cur, incoming);
      end if;
      insert into bucket.academy_progress (user_id, branch, data, updated_at, fold_key)
      values (p_user, r->>'branch', incoming, clock_timestamp(), null)
      on conflict (user_id, branch) do update set data = excluded.data, updated_at = excluded.updated_at, fold_key = null;
      written := written || (r->>'branch');
    end if;
  end loop;
  return jsonb_build_object('written', to_jsonb(written), 'refused', to_jsonb(refused), 'stale', to_jsonb(stale));
end
$$;

revoke all on function bucket.academy_progress_write(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function bucket.academy_progress_write(uuid, jsonb, boolean) to service_role;
