create table if not exists bucket.apple_tokens (
  user_id           uuid        not null references auth.users (id) on delete cascade,
  client_id         text        not null check (client_id in ('foundation.bucket.app', 'com.polingual.app')),
  refresh_token_enc text        not null check (refresh_token_enc like 'v1.%'),
  updated_at        timestamptz not null default now(),
  primary key (user_id, client_id)
);

create table if not exists bucket.apple_revoke_pending (
  id                bigint      generated always as identity primary key,
  client_id         text        not null check (client_id in ('foundation.bucket.app', 'com.polingual.app')),
  refresh_token_enc text        not null check (refresh_token_enc like 'v1.%'),
  attempts          integer     not null default 1,
  last_error        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function bucket.apple_revoke_pending_bump(p_id bigint, p_reason text)
returns void
language sql
security invoker
set search_path = ''
as $$
  update bucket.apple_revoke_pending
     set attempts = attempts + 1, last_error = left(p_reason, 200), updated_at = now()
   where id = p_id;
$$;

alter table bucket.apple_tokens enable row level security;
alter table bucket.apple_tokens force row level security;
alter table bucket.apple_revoke_pending enable row level security;
alter table bucket.apple_revoke_pending force row level security;

revoke all on bucket.apple_tokens from public, anon, authenticated;
revoke all on bucket.apple_revoke_pending from public, anon, authenticated;
revoke all on function bucket.apple_revoke_pending_bump(bigint, text) from public, anon, authenticated;
grant select, insert, update, delete on bucket.apple_tokens to service_role;
grant select, insert, update, delete on bucket.apple_revoke_pending to service_role;
grant execute on function bucket.apple_revoke_pending_bump(bigint, text) to service_role;
