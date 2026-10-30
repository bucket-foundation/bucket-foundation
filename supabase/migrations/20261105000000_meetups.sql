-- Polingual polyglot meetups: public meetups by language, RSVPs, reports and blocks.
--
-- Private `bucket` schema, reached only through /api/polingual/meetups with a
-- service-role client. Limits, capacity and report counting run inside the
-- database under advisory locks. Row-Level Security is on with no client policies.
--
-- Idempotent: safe to re-run.

create schema if not exists bucket;

create table if not exists bucket.meetup_terms (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  version     int         not null,
  accepted_at timestamptz not null default now()
);

create table if not exists bucket.meetups (
  id            uuid        primary key default gen_random_uuid(),
  host_id       uuid        references auth.users (id) on delete set null,
  host_name     text        not null check (char_length(host_name) between 1 and 40),
  title         text        not null check (char_length(title) between 1 and 80),
  about         text        not null default '' check (char_length(about) <= 500),
  langs         text[]      not null check (cardinality(langs) between 1 and 6),
  starts_at     timestamptz not null,
  duration_min  int         not null check (duration_min between 15 and 480),
  mode          text        not null check (mode in ('in_person', 'online')),
  city          text        not null default '' check (char_length(city) <= 80),
  area          text        not null default '' check (char_length(area) <= 60),
  place_name    text        not null default '' check (char_length(place_name) <= 120),
  lat           numeric(5, 2) check (lat between -90 and 90),
  lon           numeric(5, 2) check (lon between -180 and 180),
  online_url    text        check (online_url is null or online_url ~ '^https://[^\s]{4,300}$'),
  capacity      int         check (capacity is null or capacity between 2 and 200),
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz,
  taken_down_at timestamptz,
  check (mode = 'online' or (lat is not null and lon is not null and city <> '')),
  check (mode = 'in_person' or online_url is not null)
);

create index if not exists meetups_starts_idx on bucket.meetups (starts_at);
create index if not exists meetups_place_idx on bucket.meetups (lat, lon);
create index if not exists meetups_host_idx on bucket.meetups (host_id, created_at desc);

create table if not exists bucket.meetup_rsvps (
  meetup_id    uuid        not null references bucket.meetups (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  display_name text        not null check (char_length(display_name) between 1 and 40),
  notified     boolean     not null default false,
  created_at   timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

create index if not exists meetup_rsvps_user_idx on bucket.meetup_rsvps (user_id);

create table if not exists bucket.meetup_reports (
  meetup_id   uuid        not null references bucket.meetups (id) on delete cascade,
  reporter_id uuid        not null references auth.users (id) on delete cascade,
  reason      text        not null check (reason in ('unsafe', 'offensive', 'spam', 'other')),
  note        text        not null default '' check (char_length(note) <= 300),
  status      text        not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  counts      boolean     not null default false,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key (meetup_id, reporter_id)
);

create index if not exists meetup_reports_open_idx on bucket.meetup_reports (status, created_at desc);
create index if not exists meetup_reports_reporter_idx on bucket.meetup_reports (reporter_id, created_at desc);

create table if not exists bucket.meetup_blocks (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  blocked_id uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id),
  check (user_id <> blocked_id)
);

create index if not exists meetup_blocks_blocked_idx on bucket.meetup_blocks (blocked_id);

alter table bucket.meetup_terms enable row level security;
alter table bucket.meetups enable row level security;
alter table bucket.meetup_rsvps enable row level security;
alter table bucket.meetup_reports enable row level security;
alter table bucket.meetup_blocks enable row level security;

revoke all on bucket.meetup_terms, bucket.meetups, bucket.meetup_rsvps, bucket.meetup_reports, bucket.meetup_blocks from anon, authenticated;

create or replace function bucket.meetup_host_gone()
returns trigger language plpgsql as $$
begin
  if new.host_id is null and old.host_id is not null and new.cancelled_at is null then
    new.cancelled_at := now();
  end if;
  return new;
end $$;

drop trigger if exists meetup_host_gone on bucket.meetups;
create trigger meetup_host_gone
  before update of host_id on bucket.meetups
  for each row execute function bucket.meetup_host_gone();

create or replace function bucket.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select exists (
    select 1 from bucket.meetup_blocks
    where (user_id = a and blocked_id = b) or (user_id = b and blocked_id = a)
  );
$$;

create or replace function bucket.create_meetup(
  p_host uuid, p_terms int, p_host_name text, p_title text, p_about text, p_langs text[],
  p_starts timestamptz, p_duration int, p_mode text, p_city text, p_area text, p_place text,
  p_lat numeric, p_lon numeric, p_url text, p_capacity int
) returns setof bucket.meetups language plpgsql security definer set search_path = bucket as $$
begin
  perform pg_advisory_xact_lock(hashtext('bucket.meetups.host:' || p_host::text));
  if not exists (select 1 from bucket.meetup_terms where user_id = p_host and version >= p_terms) then
    raise exception 'terms_required';
  end if;
  if p_starts < now() + interval '30 minutes' or p_starts > now() + interval '120 days' then
    raise exception 'bad_time';
  end if;
  if (select count(*) from bucket.meetups
      where host_id = p_host and cancelled_at is null and taken_down_at is null and starts_at > now()) >= 3 then
    raise exception 'host_limit';
  end if;
  if (select count(*) from bucket.meetups where host_id = p_host and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'host_rate';
  end if;
  return query
    insert into bucket.meetups (host_id, host_name, title, about, langs, starts_at, duration_min, mode,
                                city, area, place_name, lat, lon, online_url, capacity)
    values (p_host, p_host_name, p_title, p_about, p_langs, p_starts, p_duration, p_mode,
            p_city, p_area, p_place, round(p_lat, 2), round(p_lon, 2), p_url, p_capacity)
    returning *;
end $$;

create or replace function bucket.rsvp_meetup(p_meetup uuid, p_user uuid, p_terms int, p_name text, p_going boolean)
returns text language plpgsql security definer set search_path = bucket as $$
declare
  m bucket.meetups;
begin
  perform pg_advisory_xact_lock(hashtext('bucket.meetups.rsvp:' || p_meetup::text));
  select * into m from bucket.meetups where id = p_meetup for update;
  if not found or m.host_id is null or bucket.blocked_between(m.host_id, p_user) then
    return 'not_found';
  end if;
  if not p_going then
    delete from bucket.meetup_rsvps where meetup_id = p_meetup and user_id = p_user;
    return 'left';
  end if;
  if m.host_id = p_user then
    return 'host';
  end if;
  if not exists (select 1 from bucket.meetup_terms where user_id = p_user and version >= p_terms) then
    return 'terms_required';
  end if;
  if m.cancelled_at is not null or m.taken_down_at is not null or m.starts_at < now() then
    return 'closed';
  end if;
  if exists (select 1 from bucket.meetup_rsvps where meetup_id = p_meetup and user_id = p_user) then
    return 'going';
  end if;
  if m.capacity is not null and (select count(*) from bucket.meetup_rsvps where meetup_id = p_meetup) >= m.capacity then
    return 'full';
  end if;
  if (select count(*) from bucket.meetup_rsvps r join bucket.meetups x on x.id = r.meetup_id
      where r.user_id = p_user and x.starts_at > now() and x.cancelled_at is null) >= 10 then
    return 'rsvp_limit';
  end if;
  insert into bucket.meetup_rsvps (meetup_id, user_id, display_name) values (p_meetup, p_user, p_name);
  return 'joined';
end $$;

create or replace function bucket.report_meetup(p_meetup uuid, p_user uuid, p_reason text, p_note text)
returns text language plpgsql security definer set search_path = bucket as $$
declare
  m bucket.meetups;
  aged boolean;
  first_report boolean;
begin
  perform pg_advisory_xact_lock(hashtext('bucket.meetups.report:' || p_meetup::text));
  select * into m from bucket.meetups where id = p_meetup;
  if not found then
    return 'not_found';
  end if;
  if (select count(*) from bucket.meetup_reports where reporter_id = p_user and created_at > now() - interval '24 hours') >= 10 then
    return 'report_limit';
  end if;
  if exists (select 1 from bucket.meetup_reports where meetup_id = p_meetup and reporter_id = p_user) then
    return 'reported';
  end if;
  select coalesce(u.created_at < now() - interval '7 days', false) into aged from auth.users u where u.id = p_user;
  first_report := not exists (select 1 from bucket.meetup_reports where meetup_id = p_meetup);
  insert into bucket.meetup_reports (meetup_id, reporter_id, reason, note, counts)
  values (p_meetup, p_user, p_reason, p_note,
          coalesce(aged, false) and m.host_id is not null and not exists (
            select 1 from bucket.meetup_blocks where user_id = m.host_id and blocked_id = p_user));
  return case when first_report then 'first' else 'reported' end;
end $$;

revoke execute on function bucket.create_meetup(uuid, int, text, text, text, text[], timestamptz, int, text, text, text, text, numeric, numeric, text, int) from public, anon, authenticated;
revoke execute on function bucket.rsvp_meetup(uuid, uuid, int, text, boolean) from public, anon, authenticated;
revoke execute on function bucket.report_meetup(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function bucket.blocked_between(uuid, uuid) from public, anon, authenticated;
