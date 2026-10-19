create schema if not exists bucket;

create table if not exists bucket.devices (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  device_id    text        not null check (device_id ~ '^[A-Za-z0-9._-]{1,64}$'),
  label        text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

create table if not exists bucket.academy_sync_cursor (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  last_seq   bigint      not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists bucket.academy_review_baseline (
  user_id   uuid        not null references auth.users (id) on delete cascade,
  branch    text        not null,
  data      jsonb       not null default '{}'::jsonb,
  frozen_at timestamptz not null default now(),
  primary key (user_id, branch)
);

create table if not exists bucket.academy_review_log (
  user_id       uuid        not null references auth.users (id) on delete cascade,
  branch        text        not null check (branch ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  review_id     uuid        not null,
  card_id       text        not null check (length(card_id) between 1 and 256),
  rating        smallint    not null check (rating between 1 and 4),
  level         text        not null check (level in ('recall', 'apply', 'derive', 'teach')),
  reviewed_at   timestamptz not null,
  tz            text        not null check (length(tz) between 1 and 64),
  atoms_version text        not null check (length(atoms_version) between 1 and 64),
  device_id     text        not null check (device_id ~ '^[A-Za-z0-9._-]{1,64}$'),
  seq           bigint      not null,
  payload_hash  text        not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  received_at   timestamptz not null default now(),
  primary key (user_id, branch, review_id),
  unique (user_id, seq)
);

create index if not exists academy_review_log_user_seq_idx on bucket.academy_review_log (user_id, seq);

alter table bucket.academy_progress add column if not exists log_seq bigint;

alter table bucket.devices enable row level security;
alter table bucket.academy_sync_cursor enable row level security;
alter table bucket.academy_review_baseline enable row level security;
alter table bucket.academy_review_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['devices', 'academy_sync_cursor', 'academy_review_baseline', 'academy_review_log'] loop
    if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = t and policyname = 'own_select') then
      execute format('create policy own_select on bucket.%I for select using (auth.uid() = user_id)', t);
    end if;
  end loop;
end $$;

create or replace function bucket.append_reviews(p_user uuid, p_rows jsonb)
returns table (review_id uuid, status text, seq bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_last bigint;
  v_existing record;
  v_id uuid;
  v_branch text;
begin
  if p_user is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'append_reviews: bad arguments' using errcode = '22023';
  end if;

  insert into bucket.academy_sync_cursor (user_id) values (p_user) on conflict (user_id) do nothing;
  select c.last_seq into v_last from bucket.academy_sync_cursor c where c.user_id = p_user for update;

  for r in select value from jsonb_array_elements(p_rows) loop
    v_id := (r->>'review_id')::uuid;
    v_branch := r->>'branch';

    select l.seq, l.payload_hash into v_existing
      from bucket.academy_review_log l
     where l.user_id = p_user and l.branch = v_branch and l.review_id = v_id;

    if found then
      review_id := v_id;
      seq := v_existing.seq;
      status := case when v_existing.payload_hash = r->>'payload_hash' then 'duplicate' else 'conflict' end;
      return next;
      continue;
    end if;

    insert into bucket.academy_review_baseline (user_id, branch, data)
    select p_user, v_branch, coalesce((select p.data from bucket.academy_progress p where p.user_id = p_user and p.branch = v_branch), '{}'::jsonb)
    on conflict (user_id, branch) do nothing;

    insert into bucket.devices (user_id, device_id) values (p_user, r->>'device_id')
    on conflict (user_id, device_id) do update set last_seen_at = now();

    v_last := v_last + 1;
    insert into bucket.academy_review_log
      (user_id, branch, review_id, card_id, rating, level, reviewed_at, tz, atoms_version, device_id, seq, payload_hash)
    values
      (p_user, v_branch, v_id, r->>'card_id', (r->>'rating')::smallint, r->>'level', (r->>'reviewed_at')::timestamptz,
       r->>'tz', r->>'atoms_version', r->>'device_id', v_last, r->>'payload_hash');

    review_id := v_id;
    seq := v_last;
    status := 'inserted';
    return next;
  end loop;

  update bucket.academy_sync_cursor c set last_seq = v_last, updated_at = now() where c.user_id = p_user;
end $$;

create or replace function bucket.write_progress_fold(p_user uuid, p_branch text, p_data jsonb, p_seq bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  insert into bucket.academy_progress as p (user_id, branch, data, log_seq)
  values (p_user, p_branch, p_data, p_seq)
  on conflict (user_id, branch) do update
    set data = excluded.data, log_seq = excluded.log_seq
    where p.log_seq is null or p.log_seq <= excluded.log_seq;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function bucket.append_reviews(uuid, jsonb) from public, anon, authenticated;
revoke all on function bucket.write_progress_fold(uuid, text, jsonb, bigint) from public, anon, authenticated;
grant execute on function bucket.append_reviews(uuid, jsonb) to service_role;
grant execute on function bucket.write_progress_fold(uuid, text, jsonb, bigint) to service_role;
grant usage on schema bucket to service_role;
grant select on bucket.academy_review_log, bucket.academy_review_baseline, bucket.academy_sync_cursor, bucket.devices to service_role;
