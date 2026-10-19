create table if not exists bucket.session_rate (
  key          text        primary key check (length(key) between 1 and 200),
  window_start timestamptz not null,
  hits         int         not null
);

alter table bucket.session_rate enable row level security;

create or replace function bucket.session_rate_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_hits int;
begin
  delete from bucket.session_rate where window_start < now() - interval '1 day';
  insert into bucket.session_rate as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

revoke all on function bucket.session_rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function bucket.session_rate_hit(text, int, int) to service_role;
