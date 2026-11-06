create schema if not exists bucket;

create table if not exists bucket.translation_reports (
  id          uuid        primary key,
  lang        text        not null check (lang ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  root        text        check (root is null or root ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  item_id     text        check (char_length(item_id) <= 120),
  text        text        check (char_length(text) <= 400),
  shown       text        not null check (char_length(shown) between 1 and 400),
  reason      text        not null check (reason in ('meaning', 'spelling', 'sound', 'script')),
  suggestion  text        check (char_length(suggestion) <= 400),
  context     text        check (char_length(context) <= 40),
  user_id     uuid        references auth.users (id) on delete set null,
  device_id   uuid,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  check (item_id is not null or text is not null)
);

create index if not exists translation_reports_created_idx on bucket.translation_reports (created_at desc);
create index if not exists translation_reports_item_idx on bucket.translation_reports (lang, item_id);
create index if not exists translation_reports_user_idx on bucket.translation_reports (user_id);
create index if not exists translation_reports_resolved_idx on bucket.translation_reports (resolved_at) where resolved_at is not null;

alter table bucket.translation_reports enable row level security;
alter table bucket.translation_reports force row level security;

revoke all on bucket.translation_reports from public, anon, authenticated;
grant select, insert, update, delete on bucket.translation_reports to service_role;

create or replace function bucket.translation_report_rate_hit(p_key text, p_limit int, p_window_seconds int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits int;
  v_start timestamptz;
begin
  insert into bucket.session_rate as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits, window_start into v_hits, v_start;
  if v_hits <= p_limit then
    return 0;
  end if;
  return greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - now())))::int);
end $$;

create or replace function bucket.purge_translation_reports()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  delete from bucket.translation_reports
   where resolved_at is not null or created_at < now() - interval '180 days';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function bucket.translation_report_rate_hit(text, int, int) from public, anon, authenticated;
revoke all on function bucket.purge_translation_reports() from public, anon, authenticated;
grant execute on function bucket.translation_report_rate_hit(text, int, int) to service_role;
grant execute on function bucket.purge_translation_reports() to service_role;
