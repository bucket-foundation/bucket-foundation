create table if not exists bucket.group_blocks (
  id              uuid        primary key default gen_random_uuid(),
  blocker_id      uuid        not null references auth.users (id) on delete cascade,
  target_user_id  uuid        references auth.users (id) on delete cascade,
  target_group_id uuid        references bucket.learning_groups (id) on delete cascade,
  name            text        not null check (char_length(name) between 1 and 60),
  created_at      timestamptz not null default now(),
  check (num_nonnulls(target_user_id, target_group_id) = 1),
  check (blocker_id <> target_user_id)
);

create unique index if not exists group_blocks_user_key
  on bucket.group_blocks (blocker_id, target_user_id) where target_user_id is not null;
create unique index if not exists group_blocks_group_key
  on bucket.group_blocks (blocker_id, target_group_id) where target_group_id is not null;
create index if not exists group_blocks_target_user_idx
  on bucket.group_blocks (target_user_id) where target_user_id is not null;

create table if not exists bucket.group_reports (
  id             uuid        primary key default gen_random_uuid(),
  reporter_id    uuid        references auth.users (id) on delete set null,
  group_id       uuid        references bucket.learning_groups (id) on delete set null,
  group_name     text        not null check (char_length(group_name) between 1 and 60),
  target_kind    text        not null check (target_kind in ('member', 'group')),
  target_user_id uuid        references auth.users (id) on delete set null,
  target_name    text        not null check (char_length(target_name) between 1 and 60),
  reason         text        not null check (reason in ('offensive_name', 'harassment', 'spam', 'other')),
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz
);

create index if not exists group_reports_open_idx
  on bucket.group_reports (created_at desc) where reviewed_at is null;

create or replace function bucket.block_member(p_blocker uuid, p_target uuid, p_name text)
returns void language plpgsql security definer set search_path = bucket as $$
begin
  insert into bucket.group_blocks (blocker_id, target_user_id, name)
    values (p_blocker, p_target, p_name)
    on conflict (blocker_id, target_user_id) where target_user_id is not null do nothing;
  delete from bucket.group_members m
    using bucket.learning_groups g
    where g.id = m.group_id and g.owner_id = p_blocker and m.user_id = p_target;
end $$;

create or replace function bucket.block_group(p_blocker uuid, p_group uuid, p_name text)
returns text language plpgsql security definer set search_path = bucket as $$
begin
  insert into bucket.group_blocks (blocker_id, target_group_id, name)
    values (p_blocker, p_group, p_name)
    on conflict (blocker_id, target_group_id) where target_group_id is not null do nothing;
  return bucket.leave_group(p_group, p_blocker);
end $$;

revoke execute on function bucket.block_member(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function bucket.block_group(uuid, uuid, text) from public, anon, authenticated;
grant execute on function bucket.block_member(uuid, uuid, text) to service_role;
grant execute on function bucket.block_group(uuid, uuid, text) to service_role;

alter table bucket.group_blocks enable row level security;
alter table bucket.group_blocks force row level security;
alter table bucket.group_reports enable row level security;
alter table bucket.group_reports force row level security;

revoke all on bucket.group_blocks from public, anon, authenticated;
revoke all on bucket.group_reports from public, anon, authenticated;
grant select, insert, update, delete on bucket.group_blocks to service_role;
grant select, insert, update, delete on bucket.group_reports to service_role;
