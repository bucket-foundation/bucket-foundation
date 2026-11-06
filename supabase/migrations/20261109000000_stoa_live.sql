create schema if not exists bucket;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

create table if not exists bucket.live_rooms (
  id            uuid        primary key default gen_random_uuid(),
  topic         uuid        not null default gen_random_uuid() unique,
  sign_key      text        not null check (char_length(sign_key) <= 512 and sign_key ~ '^v1\.[A-Za-z0-9_-]{40,}$'),
  verify_key    text        not null check (verify_key ~ '^[A-Za-z0-9_-]{43}$'),
  token_version integer     not null default 1 check (token_version > 0),
  code          text        not null check (code ~ '^[0-9A-HJKMNP-TV-Z]{6}$'),
  product       text        not null check (product in ('polingual', 'bucket')),
  host_user     uuid        not null references auth.users (id) on delete cascade,
  mode          text        not null default 'open_floor' check (mode in ('open_floor', 'chorus')),
  school_mode   boolean     not null default false,
  settings      jsonb       not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  seed          bigint      not null,
  phase         text        not null default 'lobby' check (phase in ('lobby', 'question', 'reveal', 'board', 'finale', 'closed')),
  idx           integer     not null default -1 check (idx >= -1),
  opens_at      timestamptz,
  closes_at     timestamptz,
  next_at       timestamptz,
  paused_at     timestamptz,
  probe_at      timestamptz,
  seq           bigint      not null default 0 check (seq >= 0),
  locked        boolean     not null default false,
  rotated_at    timestamptz,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz,
  expires_at    timestamptz not null default now() + interval '3 hours',
  check (expires_at <= created_at + interval '3 hours'),
  check ((phase = 'closed') = (closed_at is not null))
);

create unique index if not exists live_rooms_open_code on bucket.live_rooms (code) where closed_at is null;
create index if not exists live_rooms_due on bucket.live_rooms (next_at) where closed_at is null;
create index if not exists live_rooms_gone on bucket.live_rooms ((coalesce(closed_at, expires_at)));

create table if not exists bucket.live_players (
  id           uuid        primary key default gen_random_uuid(),
  room_id      uuid        not null references bucket.live_rooms (id) on delete cascade,
  nickname_key text        not null check (nickname_key ~ '^[a-z0-9]+(-[a-z0-9]+){1,3}$'),
  team_slot    smallint    check (team_slot between 0 and 3),
  time_factor  numeric(3, 2) not null default 1 check (time_factor between 1 and 3),
  grace_ms     integer     not null default 0 check (grace_ms between 0 and 1000),
  streak       integer     not null default 0 check (streak >= 0),
  removed      boolean     not null default false,
  joined_at    timestamptz not null default clock_timestamp()
);

create unique index if not exists live_players_nickname on bucket.live_players (room_id, nickname_key) where not removed;
create index if not exists live_players_room on bucket.live_players (room_id);

create table if not exists bucket.live_questions (
  room_id uuid     not null references bucket.live_rooms (id) on delete cascade,
  idx     integer  not null check (idx >= 0),
  round   smallint not null check (round between 1 and 3),
  kind    text     not null check (kind in ('pick_word', 'which_language')),
  prompt  jsonb    not null check (jsonb_typeof(prompt) = 'object'),
  options jsonb    not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  answer  smallint not null check (answer between 0 and 3),
  primary key (room_id, idx)
);

create table if not exists bucket.live_answers (
  room_id     uuid        not null,
  idx         integer     not null,
  player_id   uuid        not null references bucket.live_players (id) on delete cascade,
  choice      smallint    not null check (choice between 0 and 3),
  received_at timestamptz not null default clock_timestamp(),
  primary key (room_id, idx, player_id),
  foreign key (room_id, idx) references bucket.live_questions (room_id, idx) on delete cascade
);

create table if not exists bucket.live_scores (
  room_id   uuid     not null,
  idx       integer  not null,
  player_id uuid     not null references bucket.live_players (id) on delete cascade,
  correct   boolean  not null,
  points    integer  not null check (points between 0 and 1000),
  bonus     smallint not null default 0 check (bonus in (0, 100)),
  primary key (room_id, idx, player_id),
  foreign key (room_id, idx) references bucket.live_questions (room_id, idx) on delete cascade
);

create table if not exists bucket.live_reports (
  room_id     uuid        not null references bucket.live_rooms (id) on delete cascade,
  player_id   uuid        not null references bucket.live_players (id) on delete cascade,
  reported_at timestamptz not null default clock_timestamp(),
  primary key (room_id, player_id)
);

create table if not exists bucket.live_limits (
  bucket_key text        not null check (char_length(bucket_key) <= 120),
  minute     timestamptz not null,
  hits       integer     not null default 0,
  primary key (bucket_key, minute)
);

create index if not exists live_limits_minute on bucket.live_limits (minute);

create table if not exists bucket.live_summaries (
  room_id       uuid        primary key,
  host_user     uuid        not null references auth.users (id) on delete cascade,
  product       text        not null,
  created_at    timestamptz not null,
  closed_at     timestamptz not null,
  player_count  integer     not null,
  right_rate    jsonb       not null,
  top_nicknames text[]      not null
);

create index if not exists live_summaries_host on bucket.live_summaries (host_user, created_at desc);

create or replace function bucket.live_answers_insert_only()
returns trigger language plpgsql set search_path = bucket, pg_temp as $$
begin
  raise exception 'insert_only';
end $$;

drop trigger if exists live_answers_insert_only on bucket.live_answers;
create trigger live_answers_insert_only before update on bucket.live_answers
  for each row execute function bucket.live_answers_insert_only();

drop trigger if exists live_scores_write_once on bucket.live_scores;
create trigger live_scores_write_once before update on bucket.live_scores
  for each row execute function bucket.live_answers_insert_only();

alter table bucket.live_rooms enable row level security;
alter table bucket.live_players enable row level security;
alter table bucket.live_questions enable row level security;
alter table bucket.live_answers enable row level security;
alter table bucket.live_scores enable row level security;
alter table bucket.live_summaries enable row level security;
alter table bucket.live_reports enable row level security;
alter table bucket.live_limits enable row level security;

revoke all on bucket.live_rooms, bucket.live_players, bucket.live_questions, bucket.live_answers, bucket.live_scores, bucket.live_summaries,
  bucket.live_reports, bucket.live_limits
  from public, anon, authenticated, service_role;

create or replace function bucket.live_purge()
returns integer language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  gone integer;
begin
  insert into bucket.live_summaries (room_id, host_user, product, created_at, closed_at, player_count, right_rate, top_nicknames)
  select r.id, r.host_user, r.product, r.created_at, coalesce(r.closed_at, r.expires_at),
    (select count(*) from bucket.live_players p where p.room_id = r.id and not p.removed),
    coalesce((
      select jsonb_agg(jsonb_build_object('idx', q.idx, 'right', (
        select round(avg(s.correct::int)::numeric, 3) from bucket.live_scores s where s.room_id = r.id and s.idx = q.idx
      )) order by q.idx)
      from bucket.live_questions q where q.room_id = r.id
    ), '[]'::jsonb),
    coalesce((
      select array_agg(t.nickname_key order by t.total desc, t.nickname_key)
      from (
        select p.nickname_key, sum(s.points + s.bonus) as total
        from bucket.live_players p join bucket.live_scores s on s.player_id = p.id
        where p.room_id = r.id and not p.removed
        group by p.id, p.nickname_key
        order by total desc, p.nickname_key
        limit 5
      ) t
    ), '{}')
  from bucket.live_rooms r
  where coalesce(r.closed_at, r.expires_at) < clock_timestamp() - interval '24 hours'
  on conflict (room_id) do nothing;

  delete from bucket.live_rooms r
  where coalesce(r.closed_at, r.expires_at) < clock_timestamp() - interval '24 hours';
  get diagnostics gone = row_count;
  delete from bucket.live_limits where minute < clock_timestamp() - interval '2 minutes';
  return gone;
end $$;

create or replace function bucket.live_sweep_ping()
returns bigint language plpgsql security definer set search_path = bucket, extensions, pg_temp as $$
declare
  url text;
  secret text;
begin
  if not exists (
    select 1 from bucket.live_rooms
    where closed_at is null and paused_at is null and (next_at <= clock_timestamp() or expires_at <= clock_timestamp())
  ) then
    return null;
  end if;
  if not exists (select 1 from pg_extension where extname = 'supabase_vault') then
    raise exception 'stoa sweep needs the supabase_vault extension';
  end if;
  select decrypted_secret into url from vault.decrypted_secrets where name = 'stoa_sweep_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'stoa_sweep_secret';
  if url is null or secret is null then
    return null;
  end if;
  return net.http_post(
    url := url,
    headers := jsonb_build_object('content-type', 'application/json', 'authorization', 'Bearer ' || secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
end $$;

revoke all on function bucket.live_purge() from public, anon, authenticated;
revoke all on function bucket.live_sweep_ping() from public, anon, authenticated;
revoke all on function bucket.live_answers_insert_only() from public, anon, authenticated;

select cron.schedule('stoa-purge', '*/5 * * * *', 'select bucket.live_purge()');
select cron.schedule('stoa-sweep', '10 seconds', 'select bucket.live_sweep_ping()');
