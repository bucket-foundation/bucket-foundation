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
  written text[] := '{}';
  refused text[] := '{}';
  stale text[] := '{}';
begin
  for r in select value from jsonb_array_elements(p_rows) order by value->>'branch' loop
    perform pg_advisory_xact_lock(hashtextextended(p_user::text || '/' || (r->>'branch'), 0));
    cur := null;
    cur_at := null;
    select data, updated_at into cur, cur_at from bucket.academy_progress where user_id = p_user and branch = r->>'branch' for update;
    if r ? 'version' and (
      (jsonb_typeof(r->'version') = 'null' and cur_at is not null)
      or (jsonb_typeof(r->'version') = 'string' and (cur_at is null or cur_at <> (r->>'version')::timestamptz))
    ) then
      stale := stale || (r->>'branch');
    elsif not p_reset and bucket.academy_progress_weight(r->'data') = 0 and cur is not null and bucket.academy_progress_weight(cur) > 0 then
      refused := refused || (r->>'branch');
    else
      insert into bucket.academy_progress (user_id, branch, data, updated_at, fold_key)
      values (p_user, r->>'branch', coalesce(r->'data', '{}'::jsonb), clock_timestamp(), null)
      on conflict (user_id, branch) do update set data = excluded.data, updated_at = excluded.updated_at, fold_key = null;
      written := written || (r->>'branch');
    end if;
  end loop;
  return jsonb_build_object('written', to_jsonb(written), 'refused', to_jsonb(refused), 'stale', to_jsonb(stale));
end
$$;

revoke all on function bucket.academy_progress_write(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function bucket.academy_progress_write(uuid, jsonb, boolean) to service_role;
