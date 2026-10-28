-- Bucket Academy learning groups: family and friends groups that share learning summaries.
--
-- Private `bucket` schema, reached only through the /api/academy/groups routes with a
-- service-role client. Row-Level Security mirrors the API rules for defense in depth.
-- Triggers enforce the size limits so concurrent joins cannot overfill a group.
--
-- Idempotent: safe to re-run.

create schema if not exists bucket;

create table if not exists bucket.learning_groups (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 1 and 60),
  kind        text        not null check (kind in ('family', 'friends')),
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  invite_code text        not null unique check (invite_code ~ '^[0-9A-HJKMNP-TV-Z]{10}$'),
  created_at  timestamptz not null default now()
);

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

create or replace function bucket.is_group_member(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select exists (select 1 from bucket.group_members m where m.group_id = gid and m.user_id = uid);
$$;

create or replace function bucket.is_group_owner(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select exists (select 1 from bucket.learning_groups g where g.id = gid and g.owner_id = uid);
$$;

create or replace function bucket.shares_group(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select exists (
    select 1 from bucket.group_members x
    join bucket.group_members y on y.group_id = x.group_id
    where x.user_id = a and y.user_id = b
  );
$$;

alter table bucket.learning_groups enable row level security;
alter table bucket.group_members enable row level security;

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

  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'academy_progress' and policyname = 'group_mate_select') then
    create policy group_mate_select on bucket.academy_progress for select
      using (bucket.shares_group(auth.uid(), user_id));
  end if;
end $$;

create or replace function bucket.learning_groups_limit()
returns trigger language plpgsql as $$
begin
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
