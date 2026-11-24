create table if not exists bucket.lobby_message_reports (
  id             uuid        primary key default gen_random_uuid(),
  reporter_id    uuid        not null,
  lobby_id       uuid        references bucket.lobbies (id) on delete set null,
  message_id     bigint      not null,
  target_user_id uuid        not null,
  target_name    text        not null check (char_length(target_name) between 1 and 60),
  body           text        not null check (char_length(body) between 1 and 200),
  reason         text        not null check (reason in ('offensive_name', 'harassment', 'spam', 'other')),
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    text,
  action         text        check (action in ('dismissed', 'removed', 'banned')),
  check (reporter_id <> target_user_id),
  unique (reporter_id, message_id)
);

create index if not exists lobby_message_reports_open_idx
  on bucket.lobby_message_reports (created_at desc) where reviewed_at is null;
create index if not exists lobby_message_reports_target_idx
  on bucket.lobby_message_reports (target_user_id);

create table if not exists bucket.lobby_chat_blocks (
  blocker_id     uuid        not null,
  target_user_id uuid        not null,
  name           text        not null check (char_length(name) between 1 and 60),
  created_at     timestamptz not null default now(),
  primary key (blocker_id, target_user_id),
  check (blocker_id <> target_user_id)
);

create table if not exists bucket.lobby_report_limits (
  bucket_key text        not null,
  hour       timestamptz not null,
  hits       int         not null default 0,
  primary key (bucket_key, hour)
);

create or replace function bucket.lobby_report_take(p_keys text[], p_limit int)
returns boolean language plpgsql security definer set search_path = bucket as $$
declare
  v_hour timestamptz := date_trunc('hour', clock_timestamp());
  v_key text;
begin
  delete from bucket.lobby_report_limits where hour < v_hour;
  if exists (select 1 from bucket.lobby_report_limits where hour = v_hour and bucket_key = any (p_keys) and hits >= p_limit) then
    return false;
  end if;
  foreach v_key in array p_keys loop
    insert into bucket.lobby_report_limits (bucket_key, hour, hits) values (v_key, v_hour, 1)
      on conflict (bucket_key, hour) do update set hits = bucket.lobby_report_limits.hits + 1;
  end loop;
  return true;
end $$;

create or replace function bucket.open_lobby_reports(p_limit int default 100)
returns setof bucket.lobby_message_reports language sql stable security definer set search_path = bucket as $$
  select * from bucket.lobby_message_reports where reviewed_at is null order by created_at limit p_limit;
$$;

create or replace function bucket.review_lobby_report(p_id uuid, p_reviewer text, p_action text)
returns boolean language plpgsql security definer set search_path = bucket as $$
declare
  r bucket.lobby_message_reports;
begin
  update bucket.lobby_message_reports set reviewed_at = now(), reviewed_by = p_reviewer, action = p_action
    where id = p_id and reviewed_at is null returning * into r;
  if r.id is null then
    return false;
  end if;
  if p_action in ('removed', 'banned') then
    delete from bucket.lobby_messages where id = r.message_id;
  end if;
  if p_action = 'banned' then
    delete from bucket.lobby_messages where user_id = r.target_user_id;
  end if;
  return true;
end $$;

create or replace function bucket.merge_lobby_guest(p_guest uuid, p_user uuid)
returns int language plpgsql security definer set search_path = bucket as $$
declare
  n int;
begin
  if p_guest = p_user then
    return 0;
  end if;
  delete from bucket.lobby_players g using bucket.lobby_players u
    where g.user_id = p_guest and u.user_id = p_user and u.lobby_id = g.lobby_id;
  delete from bucket.lobby_answers g using bucket.lobby_answers u
    where g.user_id = p_guest and u.user_id = p_user and u.lobby_id = g.lobby_id and u.round = g.round;
  delete from bucket.lobby_powers g using bucket.lobby_powers u
    where g.user_id = p_guest and u.user_id = p_user and u.lobby_id = g.lobby_id and u.round = g.round;
  delete from bucket.lobby_message_reports g using bucket.lobby_message_reports u
    where g.reporter_id = p_guest and u.reporter_id = p_user and u.message_id = g.message_id;
  delete from bucket.lobby_message_reports where reporter_id = p_guest and target_user_id = p_user;
  delete from bucket.lobby_chat_blocks g using bucket.lobby_chat_blocks u
    where g.blocker_id = p_guest and u.blocker_id = p_user and u.target_user_id = g.target_user_id;
  delete from bucket.lobby_chat_blocks where blocker_id = p_guest and target_user_id = p_user;
  update bucket.lobby_players set user_id = p_user where user_id = p_guest;
  get diagnostics n = row_count;
  update bucket.lobby_answers set user_id = p_user where user_id = p_guest;
  update bucket.lobby_powers set user_id = p_user where user_id = p_guest;
  update bucket.lobby_messages set user_id = p_user where user_id = p_guest;
  update bucket.lobbies set host_id = p_user where host_id = p_guest;
  update bucket.lobby_message_reports set reporter_id = p_user where reporter_id = p_guest;
  update bucket.lobby_message_reports set target_user_id = p_user where target_user_id = p_guest and reporter_id <> p_user;
  delete from bucket.lobby_message_reports where target_user_id = p_guest;
  update bucket.lobby_chat_blocks set blocker_id = p_user where blocker_id = p_guest;
  insert into bucket.lobby_chat_blocks (blocker_id, target_user_id, name, created_at)
    select blocker_id, p_user, name, created_at from bucket.lobby_chat_blocks where target_user_id = p_guest and blocker_id <> p_user
    on conflict do nothing;
  delete from bucket.lobby_chat_blocks where target_user_id = p_guest;
  return n;
end $$;

create or replace function bucket.delete_lobby_user(p_user uuid)
returns int language plpgsql security definer set search_path = bucket as $$
declare
  v_lobby uuid;
  n int := 0;
begin
  for v_lobby in select lobby_id from bucket.lobby_players where user_id = p_user loop
    perform bucket.leave_lobby(v_lobby, p_user);
    n := n + 1;
  end loop;
  delete from bucket.lobby_messages where user_id = p_user;
  delete from bucket.lobby_answers where user_id = p_user;
  delete from bucket.lobby_powers where user_id = p_user;
  delete from bucket.lobbies where host_id = p_user;
  delete from bucket.lobby_limits where bucket_key like '%:' || p_user::text;
  delete from bucket.lobby_message_reports where reporter_id = p_user or target_user_id = p_user;
  delete from bucket.lobby_chat_blocks where blocker_id = p_user or target_user_id = p_user;
  delete from bucket.lobby_report_limits where bucket_key = 'report:user:' || p_user::text;
  return n;
end $$;

alter table bucket.lobby_message_reports enable row level security;
alter table bucket.lobby_message_reports force row level security;
alter table bucket.lobby_chat_blocks enable row level security;
alter table bucket.lobby_chat_blocks force row level security;
alter table bucket.lobby_report_limits enable row level security;
alter table bucket.lobby_report_limits force row level security;
revoke all on bucket.lobby_message_reports, bucket.lobby_chat_blocks, bucket.lobby_report_limits from public, anon, authenticated;
grant select, insert, update, delete on bucket.lobby_message_reports, bucket.lobby_chat_blocks, bucket.lobby_report_limits to service_role;

revoke execute on function bucket.lobby_report_take(text[], int) from public, anon, authenticated;
revoke execute on function bucket.open_lobby_reports(int) from public, anon, authenticated;
revoke execute on function bucket.review_lobby_report(uuid, text, text) from public, anon, authenticated;
revoke execute on function bucket.merge_lobby_guest(uuid, uuid) from public, anon, authenticated;
revoke execute on function bucket.delete_lobby_user(uuid) from public, anon, authenticated;
grant execute on function bucket.lobby_report_take(text[], int) to service_role;
grant execute on function bucket.open_lobby_reports(int) to service_role;
grant execute on function bucket.review_lobby_report(uuid, text, text) to service_role;
