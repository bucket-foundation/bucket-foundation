create or replace function bucket.academy_progress_weight(d jsonb)
returns integer
language sql
immutable
as $$
  select case when d is null or jsonb_typeof(d) <> 'object' then 0 else
    (case jsonb_typeof(d->'cards') when 'object' then (select count(*) from jsonb_object_keys(d->'cards')) else 0 end)::int
    + (case jsonb_typeof(d->'prof') when 'object' then (select count(*) from jsonb_object_keys(d->'prof')) else 0 end)::int
    + (case jsonb_typeof(d->'stats'->'history') when 'object' then (select count(*) from jsonb_object_keys(d->'stats'->'history')) else 0 end)::int
    + (case jsonb_typeof(d->'systems') when 'array' then jsonb_array_length(d->'systems') else 0 end)
    + (case jsonb_typeof(d->'removed') when 'object' then (select count(*) from jsonb_object_keys(d->'removed')) else 0 end)::int
    + (case when jsonb_typeof(d->'stats'->'xp') = 'number' and (d->'stats'->>'xp')::numeric > 0 then 1 else 0 end)
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
  written text[] := '{}';
  refused text[] := '{}';
begin
  for r in select value from jsonb_array_elements(p_rows) order by value->>'branch' loop
    perform pg_advisory_xact_lock(hashtextextended(p_user::text || '/' || (r->>'branch'), 0));
    select data into cur from bucket.academy_progress where user_id = p_user and branch = r->>'branch' for update;
    if not p_reset and bucket.academy_progress_weight(r->'data') = 0 and cur is not null and bucket.academy_progress_weight(cur) > 0 then
      refused := refused || (r->>'branch');
    else
      insert into bucket.academy_progress (user_id, branch, data, updated_at, fold_key)
      values (p_user, r->>'branch', coalesce(r->'data', '{}'::jsonb), now(), null)
      on conflict (user_id, branch) do update set data = excluded.data, updated_at = excluded.updated_at, fold_key = null;
      written := written || (r->>'branch');
    end if;
  end loop;
  return jsonb_build_object('written', to_jsonb(written), 'refused', to_jsonb(refused));
end
$$;

revoke all on function bucket.academy_progress_write(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function bucket.academy_progress_write(uuid, jsonb, boolean) to service_role;
