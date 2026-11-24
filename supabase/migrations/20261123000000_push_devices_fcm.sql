create table if not exists bucket.push_devices_fcm (
  token      text        primary key check (token ~ '^[A-Za-z0-9_:-]{100,4096}$'),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  bundle_id  text        not null check (bundle_id in ('com.polingual.app')),
  updated_at timestamptz not null default now()
);

create index if not exists push_devices_fcm_user_idx on bucket.push_devices_fcm (user_id);

alter table bucket.push_devices_fcm enable row level security;
alter table bucket.push_devices_fcm force row level security;

revoke all on bucket.push_devices_fcm from public, anon, authenticated;
grant select, insert, update, delete on bucket.push_devices_fcm to service_role;
