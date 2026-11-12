create schema if not exists bucket;

create table if not exists bucket.lobbies (
  id            uuid        primary key default gen_random_uuid(),
  code          text        not null unique check (code ~ '^[0-9A-HJKMNP-TV-Z]{6}$'),
  host_id       uuid        not null,
  name          text        not null check (char_length(name) between 1 and 40),
  root          text        not null,
  targets       text[]      not null check (cardinality(targets) between 1 and 8),
  seed          text        not null check (seed ~ '^[0-9]{1,20}$'),
  status        text        not null default 'lobby' check (status in ('lobby', 'playing', 'done')),
  game          text        not null default 'daily' check (game in ('daily', 'same-word', 'flags', 'live')),
  listed        boolean     not null default true,
  rounds        int         not null default 8 check (rounds between 3 and 20),
  round_seconds int         not null default 10 check (round_seconds between 5 and 30),
  started_at    timestamptz,
  version       bigint      not null default 1,
  created_at    timestamptz not null default now()
);

create index if not exists lobbies_open_idx on bucket.lobbies (status, created_at desc);
create index if not exists lobbies_host_idx on bucket.lobbies (host_id);

create table if not exists bucket.lobby_players (
  lobby_id     uuid        not null references bucket.lobbies (id) on delete cascade,
  user_id      uuid        not null,
  display_name text        not null check (char_length(display_name) between 1 and 40),
  ready        boolean     not null default false,
  score        int         not null default 0,
  last_seen    timestamptz not null default now(),
  joined_at    timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

create index if not exists lobby_players_user_idx on bucket.lobby_players (user_id);

create table if not exists bucket.lobby_messages (
  id         bigint      generated always as identity primary key,
  lobby_id   uuid        not null references bucket.lobbies (id) on delete cascade,
  user_id    uuid        not null,
  body       text        not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists lobby_messages_lobby_idx on bucket.lobby_messages (lobby_id, id desc);

create table if not exists bucket.lobby_answers (
  lobby_id uuid    not null references bucket.lobbies (id) on delete cascade,
  user_id  uuid    not null,
  round    int     not null check (round >= 0),
  choice   text    not null check (char_length(choice) between 1 and 200),
  correct  boolean not null,
  ms       int     not null check (ms >= 0),
  points   int     not null check (points >= 0),
  created_at timestamptz not null default now(),
  primary key (lobby_id, user_id, round)
);

create table if not exists bucket.lobby_prompts (
  lobby_id uuid   not null references bucket.lobbies (id) on delete cascade,
  round    int    not null check (round >= 0),
  lang     text   not null,
  item_id  text   not null,
  mode     text   not null default 'form' check (mode in ('form', 'flag')),
  gloss    text   not null,
  choices  text[] not null check (cardinality(choices) between 2 and 6),
  answer   text   not null,
  primary key (lobby_id, round),
  check (answer = any (choices))
);

create table if not exists bucket.lobby_limits (
  bucket_key text        not null,
  minute     timestamptz not null,
  hits       int         not null default 0,
  primary key (bucket_key, minute)
);

create or replace function bucket.lobby_take(p_key text, p_limit int)
returns boolean language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  n int;
begin
  delete from bucket.lobby_limits where bucket_key = p_key and minute < date_trunc('minute', clock_timestamp());
  insert into bucket.lobby_limits (bucket_key, minute, hits)
  values (p_key, date_trunc('minute', clock_timestamp()), 1)
  on conflict (bucket_key, minute) do update set hits = bucket.lobby_limits.hits + 1
  returning hits into n;
  return n <= p_limit;
end $$;

create or replace function bucket.is_lobby_player(lid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select exists (select 1 from bucket.lobby_players p where p.lobby_id = lid and p.user_id = uid);
$$;

alter table bucket.lobbies enable row level security;
alter table bucket.lobby_players enable row level security;
alter table bucket.lobby_messages enable row level security;
alter table bucket.lobby_answers enable row level security;
alter table bucket.lobby_prompts enable row level security;
alter table bucket.lobby_limits enable row level security;

drop policy if exists player_select on bucket.lobbies;
create policy player_select on bucket.lobbies for select using (bucket.is_lobby_player(id, auth.uid()));
drop policy if exists player_select on bucket.lobby_players;
create policy player_select on bucket.lobby_players for select using (bucket.is_lobby_player(lobby_id, auth.uid()));
drop policy if exists player_select on bucket.lobby_messages;
create policy player_select on bucket.lobby_messages for select using (bucket.is_lobby_player(lobby_id, auth.uid()));
drop policy if exists player_select on bucket.lobby_answers;
create policy player_select on bucket.lobby_answers for select using (bucket.is_lobby_player(lobby_id, auth.uid()));

revoke insert, update, delete on bucket.lobbies, bucket.lobby_players, bucket.lobby_messages, bucket.lobby_answers from anon, authenticated;
revoke all on bucket.lobby_prompts, bucket.lobby_limits from anon, authenticated;

create or replace function bucket.lobby_bump()
returns trigger language plpgsql as $$
begin
  update bucket.lobbies set version = version + 1
    where id = coalesce(new.lobby_id, old.lobby_id);
  return null;
end $$;

drop trigger if exists lobby_players_bump on bucket.lobby_players;
create trigger lobby_players_bump after insert or delete or update of ready, score, display_name on bucket.lobby_players
  for each row execute function bucket.lobby_bump();
drop trigger if exists lobby_messages_bump on bucket.lobby_messages;
create trigger lobby_messages_bump after insert or delete on bucket.lobby_messages
  for each row execute function bucket.lobby_bump();
drop trigger if exists lobby_answers_bump on bucket.lobby_answers;
create trigger lobby_answers_bump after insert on bucket.lobby_answers
  for each row execute function bucket.lobby_bump();

create or replace function bucket.lobby_version()
returns trigger language plpgsql as $$
begin
  if (new.status, new.started_at, new.host_id) is distinct from (old.status, old.started_at, old.host_id) then
    new.version := old.version + 1;
  end if;
  return new;
end $$;

drop trigger if exists lobbies_version on bucket.lobbies;
create trigger lobbies_version before update on bucket.lobbies
  for each row execute function bucket.lobby_version();

create or replace function bucket.lobby_players_limit()
returns trigger language plpgsql as $$
begin
  perform 1 from bucket.lobbies where id = new.lobby_id and status = 'lobby' for update;
  if not found then
    raise exception 'lobby_started';
  end if;
  if (select count(*) from bucket.lobby_players where lobby_id = new.lobby_id) >= 8 then
    raise exception 'lobby_full';
  end if;
  return new;
end $$;

drop trigger if exists lobby_players_limit on bucket.lobby_players;
create trigger lobby_players_limit before insert on bucket.lobby_players
  for each row execute function bucket.lobby_players_limit();

create or replace function bucket.lobby_answer(p_lobby uuid, p_user uuid, p_round int, p_choice text, p_correct boolean, p_ms int, p_points int)
returns text language plpgsql security definer set search_path = bucket as $$
begin
  if not bucket.is_lobby_player(p_lobby, p_user) then
    return 'not_member';
  end if;
  insert into bucket.lobby_answers (lobby_id, user_id, round, choice, correct, ms, points)
    values (p_lobby, p_user, p_round, p_choice, p_correct, p_ms, p_points)
    on conflict do nothing;
  if not found then
    return 'already';
  end if;
  update bucket.lobby_players set score = score + p_points where lobby_id = p_lobby and user_id = p_user;
  return 'ok';
end $$;

create or replace function bucket.leave_lobby(p_lobby uuid, p_user uuid)
returns text language plpgsql security definer set search_path = bucket as $$
declare
  v_host uuid;
  v_next uuid;
begin
  select host_id into v_host from bucket.lobbies where id = p_lobby for update;
  if not found then
    return 'not_found';
  end if;
  delete from bucket.lobby_players where lobby_id = p_lobby and user_id = p_user;
  if not found then
    return 'not_member';
  end if;
  select user_id into v_next from bucket.lobby_players where lobby_id = p_lobby order by joined_at limit 1;
  if v_next is null then
    delete from bucket.lobbies where id = p_lobby;
    return 'closed';
  end if;
  if v_host = p_user then
    update bucket.lobbies set host_id = v_next where id = p_lobby;
  end if;
  return 'ok';
end $$;

revoke execute on function bucket.lobby_answer(uuid, uuid, int, text, boolean, int, int) from public, anon, authenticated;
revoke execute on function bucket.leave_lobby(uuid, uuid) from public, anon, authenticated;
revoke execute on function bucket.lobby_take(text, int) from public, anon, authenticated;

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
  update bucket.lobby_players set user_id = p_user where user_id = p_guest;
  get diagnostics n = row_count;
  update bucket.lobby_answers set user_id = p_user where user_id = p_guest;
  update bucket.lobby_messages set user_id = p_user where user_id = p_guest;
  update bucket.lobbies set host_id = p_user where host_id = p_guest;
  return n;
end $$;

revoke execute on function bucket.merge_lobby_guest(uuid, uuid) from public, anon, authenticated;
