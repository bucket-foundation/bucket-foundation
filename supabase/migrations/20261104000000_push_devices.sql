create schema if not exists bucket;

create table if not exists bucket.push_devices (
  token      text        primary key check (token ~ '^[0-9a-f]{64,200}$'),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  env        text        not null check (env in ('sandbox', 'production')),
  bundle_id  text        not null check (bundle_id in ('foundation.bucket.app', 'com.polingual.app')),
  updated_at timestamptz not null default now()
);

create index if not exists push_devices_user_idx on bucket.push_devices (user_id);

alter table bucket.push_devices enable row level security;
alter table bucket.push_devices force row level security;

revoke all on bucket.push_devices from public, anon, authenticated;
grant select, insert, update, delete on bucket.push_devices to service_role;
