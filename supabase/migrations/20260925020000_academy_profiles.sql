create schema if not exists bucket;

create table if not exists bucket.academy_profiles (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  handle       text        not null,
  display_name text,
  is_public    boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint academy_profiles_pkey primary key (user_id),
  constraint academy_profiles_handle_shape check (handle ~ '^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$')
);

create unique index if not exists academy_profiles_handle_uidx on bucket.academy_profiles (lower(handle));
create index if not exists academy_profiles_public_idx on bucket.academy_profiles (is_public) where is_public = true;

drop trigger if exists academy_profiles_touch on bucket.academy_profiles;
create trigger academy_profiles_touch
  before insert or update on bucket.academy_profiles
  for each row execute function bucket.touch_updated_at();

alter table bucket.academy_profiles enable row level security;

drop policy if exists own_select on bucket.academy_profiles;
create policy own_select on bucket.academy_profiles for select using (auth.uid() = user_id);
drop policy if exists own_insert on bucket.academy_profiles;
create policy own_insert on bucket.academy_profiles for insert with check (auth.uid() = user_id);
drop policy if exists own_update on bucket.academy_profiles;
create policy own_update on bucket.academy_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists own_delete on bucket.academy_profiles;
create policy own_delete on bucket.academy_profiles for delete using (auth.uid() = user_id);

revoke all on bucket.academy_profiles from public, anon, authenticated;
grant select, insert, update, delete on bucket.academy_profiles to service_role;
