-- Bucket Academy learning groups: family and friends groups that share learning summaries.
--
-- Private `bucket` schema, reached only through the /api/academy/groups routes with a
-- service-role client. Row-Level Security mirrors the API rules for defense in depth.
-- Size limits, cheer limits, leaving and owner hand-off run inside the database under
-- locks so concurrent requests cannot break them.
--
-- Idempotent: safe to re-run.

create schema if not exists bucket;

create table if not exists bucket.learning_groups (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 1 and 60),
  kind        text        not null check (kind in ('family', 'friends')),
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  invite_code text        not null unique check (invite_code ~ '^[0-9A-HJKMNP-TV-Z]{10}$'),
  weekly_goal int         not null default 0 check (weekly_goal between 0 and 10000),
  created_at  timestamptz not null default now()
);

alter table bucket.learning_groups
  add column if not exists weekly_goal int not null default 0 check (weekly_goal between 0 and 10000);

create index if not exists learning_groups_owner_idx
  on bucket.learning_groups (owner_id);

create table if not exists bucket.group_members (
  group_id     uuid        not null references bucket.learning_groups (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  role         text        not null check (role in ('owner', 'member')),
  display_name text        not null check (char_length(display_name) between 1 and 40),
  joined_at    timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx
  on bucket.group_members (user_id);

create table if not exists bucket.group_cheers (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references bucket.learning_groups (id) on delete cascade,
  from_id    uuid        not null references auth.users (id) on delete cascade,
  to_id      uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('cheer', 'nudge')),
  created_at timestamptz not null default now(),
  seen_at    timestamptz,
  check (from_id <> to_id)
);

create index if not exists group_cheers_to_idx
  on bucket.group_cheers (to_id, created_at desc);
create index if not exists group_cheers_pair_idx
  on bucket.group_cheers (group_id, from_id, to_id, created_at desc);

create or replace function bucket.is_group_member(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select exists (select 1 from bucket.group_members m where m.group_id = gid and m.user_id = uid);
$$;

create or replace function bucket.is_group_owner(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select exists (select 1 from bucket.learning_groups g where g.id = gid and g.owner_id = uid);
$$;

drop function if exists bucket.shares_group(uuid, uuid);

alter table bucket.learning_groups enable row level security;
alter table bucket.group_members enable row level security;
alter table bucket.group_cheers enable row level security;

drop policy if exists group_mate_select on bucket.academy_progress;
drop policy if exists sender_insert on bucket.group_cheers;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'learning_groups' and policyname = 'member_select') then
    create policy member_select on bucket.learning_groups for select
      using (bucket.is_group_member(id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'learning_groups' and policyname = 'owner_insert') then
    create policy owner_insert on bucket.learning_groups for insert
      with check (auth.uid() = owner_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'learning_groups' and policyname = 'owner_update') then
    create policy owner_update on bucket.learning_groups for update
      using (auth.uid() = owner_id)
      with check (bucket.is_group_member(id, owner_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'learning_groups' and policyname = 'owner_delete') then
    create policy owner_delete on bucket.learning_groups for delete
      using (auth.uid() = owner_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'group_members' and policyname = 'mate_select') then
    create policy mate_select on bucket.group_members for select
      using (bucket.is_group_member(group_id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'group_members' and policyname = 'owner_self_insert') then
    create policy owner_self_insert on bucket.group_members for insert
      with check (auth.uid() = user_id and bucket.is_group_owner(group_id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'group_members' and policyname = 'self_or_owner_delete') then
    create policy self_or_owner_delete on bucket.group_members for delete
      using (auth.uid() = user_id or bucket.is_group_owner(group_id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'group_cheers' and policyname = 'party_select') then
    create policy party_select on bucket.group_cheers for select
      using (auth.uid() in (from_id, to_id) and bucket.is_group_member(group_id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'group_cheers' and policyname = 'recipient_update') then
    create policy recipient_update on bucket.group_cheers for update
      using (auth.uid() = to_id)
      with check (auth.uid() = to_id);
  end if;
end $$;

revoke insert, update, delete on bucket.group_cheers from anon, authenticated;
grant update (seen_at) on bucket.group_cheers to authenticated;

create or replace function bucket.learning_groups_limit()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('bucket.groups.owner:' || new.owner_id::text));
  if (select count(*) from bucket.learning_groups where owner_id = new.owner_id) >= 10 then
    raise exception 'owned_limit';
  end if;
  return new;
end $$;

drop trigger if exists learning_groups_limit on bucket.learning_groups;
create trigger learning_groups_limit
  before insert on bucket.learning_groups
  for each row execute function bucket.learning_groups_limit();

create or replace function bucket.group_members_limit()
returns trigger language plpgsql as $$
declare
  cap int;
begin
  perform pg_advisory_xact_lock(hashtext('bucket.groups.member:' || new.user_id::text));
  select case kind when 'family' then 6 else 30 end into cap
    from bucket.learning_groups where id = new.group_id for update;
  if (select count(*) from bucket.group_members where group_id = new.group_id) >= cap then
    raise exception 'group_full';
  end if;
  if (select count(*) from bucket.group_members where user_id = new.user_id) >= 20 then
    raise exception 'joined_limit';
  end if;
  return new;
end $$;

drop trigger if exists group_members_limit on bucket.group_members;
create trigger group_members_limit
  before insert on bucket.group_members
  for each row execute function bucket.group_members_limit();

create or replace function bucket.send_cheer(p_group uuid, p_from uuid, p_to uuid, p_kind text)
returns setof bucket.group_cheers language plpgsql security definer set search_path = bucket as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  if p_from = p_to then
    raise exception 'self';
  end if;
  perform pg_advisory_xact_lock(hashtext('bucket.groups.cheer:' || p_from::text || ':' || p_to::text));
  if not bucket.is_group_member(p_group, p_from) or not bucket.is_group_member(p_group, p_to) then
    raise exception 'not_member';
  end if;
  if (select count(*) from bucket.group_cheers
      where from_id = p_from and to_id = p_to and created_at >= day_start) >= 3 then
    raise exception 'cheer_limit';
  end if;
  return query
    insert into bucket.group_cheers (group_id, from_id, to_id, kind)
    values (p_group, p_from, p_to, p_kind)
    returning *;
end $$;

create or replace function bucket.leave_group(p_group uuid, p_user uuid)
returns text language plpgsql security definer set search_path = bucket as $$
declare
  v_owner uuid;
  v_next  uuid;
begin
  select owner_id into v_owner from bucket.learning_groups where id = p_group for update;
  if not found then
    return 'not_found';
  end if;
  if not bucket.is_group_member(p_group, p_user) then
    return 'not_member';
  end if;
  select user_id into v_next from bucket.group_members
    where group_id = p_group and user_id <> p_user
    order by joined_at, user_id limit 1;
  if v_next is null then
    delete from bucket.learning_groups where id = p_group;
    return 'deleted';
  end if;
  if v_owner = p_user then
    update bucket.learning_groups set owner_id = v_next where id = p_group;
    update bucket.group_members set role = 'owner' where group_id = p_group and user_id = v_next;
  end if;
  delete from bucket.group_members where group_id = p_group and user_id = p_user;
  return 'left';
end $$;

create or replace function bucket.hand_off_owned_groups()
returns trigger language plpgsql security definer set search_path = bucket as $$
declare
  g record;
  v_next uuid;
begin
  for g in select id from bucket.learning_groups where owner_id = old.id for update loop
    select user_id into v_next from bucket.group_members
      where group_id = g.id and user_id <> old.id
      order by joined_at, user_id limit 1;
    if v_next is not null then
      update bucket.learning_groups set owner_id = v_next where id = g.id;
      update bucket.group_members set role = 'owner' where group_id = g.id and user_id = v_next;
    end if;
  end loop;
  return old;
end $$;

drop trigger if exists bucket_hand_off_owned_groups on auth.users;
create trigger bucket_hand_off_owned_groups
  before delete on auth.users
  for each row execute function bucket.hand_off_owned_groups();

revoke execute on function bucket.is_group_member(uuid, uuid) from public, anon;
revoke execute on function bucket.is_group_owner(uuid, uuid) from public, anon;
grant execute on function bucket.is_group_member(uuid, uuid) to authenticated;
grant execute on function bucket.is_group_owner(uuid, uuid) to authenticated;

revoke execute on function bucket.send_cheer(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function bucket.leave_group(uuid, uuid) from public, anon, authenticated;
revoke execute on function bucket.hand_off_owned_groups() from public, anon, authenticated;
revoke execute on function bucket.learning_groups_limit() from public, anon, authenticated;
revoke execute on function bucket.group_members_limit() from public, anon, authenticated;
grant execute on function bucket.send_cheer(uuid, uuid, uuid, text) to service_role;
grant execute on function bucket.leave_group(uuid, uuid) to service_role;
