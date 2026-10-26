create table if not exists bucket.apple_tokens (
  user_id       uuid        primary key references auth.users (id) on delete cascade,
  client_id     text        not null check (client_id in ('foundation.bucket.app', 'com.polingual.app')),
  refresh_token text        not null,
  updated_at    timestamptz not null default now()
);

alter table bucket.apple_tokens enable row level security;
alter table bucket.apple_tokens force row level security;

revoke all on bucket.apple_tokens from public, anon, authenticated;
grant select, insert, update, delete on bucket.apple_tokens to service_role;
