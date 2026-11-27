alter table bucket.lobby_players add column if not exists band text check (band in ('under13', 'teen', 'adult'));

create table if not exists bucket.league_weeks (
  id        text        primary key check (id ~ '^\d{4}-\d{2}-\d{2}$'),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  band      text        not null default 'utc'
);

create table if not exists bucket.league_members (
  week_id    text        not null references bucket.league_weeks (id) on delete cascade,
  user_id    uuid        not null,
  cohort     int         not null check (cohort >= 0),
  tier       smallint    not null check (tier between 1 and 8),
  points     int         not null default 0 check (points >= 0),
  updated_at timestamptz not null default now(),
  primary key (week_id, user_id)
);

create index if not exists league_members_cohort_idx on bucket.league_members (week_id, tier, cohort, points desc);

create table if not exists bucket.league_claims (
  user_id    uuid        not null,
  game_key   text        not null check (char_length(game_key) <= 120),
  week_id    text        not null,
  day        date        not null,
  points     int         not null check (points >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, game_key)
);

create index if not exists league_claims_day_idx on bucket.league_claims (user_id, day);

alter table bucket.league_weeks enable row level security;
alter table bucket.league_members enable row level security;
alter table bucket.league_claims enable row level security;
revoke all on bucket.league_weeks from anon, authenticated;
revoke all on bucket.league_members from anon, authenticated;
revoke all on bucket.league_claims from anon, authenticated;

create or replace function bucket.league_claim(p_week text, p_user uuid, p_key text, p_day date, p_points int, p_cap int)
returns int language plpgsql security definer set search_path = bucket as $$
declare
  v_today int;
  v_add int;
begin
  perform 1 from bucket.league_members where week_id = p_week and user_id = p_user for update;
  if not found then
    raise exception 'not_member';
  end if;
  select coalesce(sum(points), 0) into v_today from bucket.league_claims where user_id = p_user and day = p_day;
  v_add := least(greatest(p_points, 0), greatest(p_cap - v_today, 0));
  insert into bucket.league_claims (user_id, game_key, week_id, day, points) values (p_user, p_key, p_week, p_day, v_add)
  on conflict (user_id, game_key) do nothing;
  if not found then
    return -1;
  end if;
  update bucket.league_members set points = points + v_add, updated_at = now() where week_id = p_week and user_id = p_user;
  return v_add;
end $$;

revoke execute on function bucket.league_claim(text, uuid, text, date, int, int) from public, anon, authenticated;

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
  delete from bucket.lobby_cards where user_id = p_user;
  delete from bucket.league_members where user_id = p_user;
  delete from bucket.league_claims where user_id = p_user;
  delete from bucket.lobby_messages where user_id = p_user;
  delete from bucket.lobby_answers where user_id = p_user;
  delete from bucket.lobbies where host_id = p_user;
  delete from bucket.lobby_limits where bucket_key like '%:' || p_user::text;
  return n;
end $$;

revoke execute on function bucket.delete_lobby_user(uuid) from public, anon, authenticated;
