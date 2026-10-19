create or replace function bucket.end_session(p_user uuid, p_session uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  delete from auth.sessions where id = p_session and user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;

create index if not exists session_rate_window_idx on bucket.session_rate (window_start);

create or replace function bucket.session_rate_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_hits int;
begin
  if random() < 0.01 then
    delete from bucket.session_rate where window_start < now() - interval '1 day';
  end if;
  insert into bucket.session_rate as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

create or replace function bucket.clear_fold_skips(p_user uuid, p_branch text, p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  update bucket.academy_review_log set fold_note = null
   where user_id = p_user and branch = p_branch and review_id = any(p_ids) and fold_note is not null;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function bucket.fold_skip_versions(p_user uuid, p_branch text)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct atoms_version from bucket.academy_review_log
   where user_id = p_user and branch = p_branch and fold_note is not null;
$$;

revoke all on function bucket.end_session(uuid, uuid) from public, anon, authenticated;
revoke all on function bucket.clear_fold_skips(uuid, text, uuid[]) from public, anon, authenticated;
revoke all on function bucket.fold_skip_versions(uuid, text) from public, anon, authenticated;
grant execute on function bucket.end_session(uuid, uuid) to service_role;
grant execute on function bucket.clear_fold_skips(uuid, text, uuid[]) to service_role;
grant execute on function bucket.fold_skip_versions(uuid, text) to service_role;
