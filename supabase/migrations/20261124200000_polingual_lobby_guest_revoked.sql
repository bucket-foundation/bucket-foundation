create table if not exists bucket.lobby_guest_revoked (
  guest_id   uuid        primary key,
  revoked_at timestamptz not null default now()
);

alter table bucket.lobby_guest_revoked enable row level security;
revoke all on bucket.lobby_guest_revoked from public, anon, authenticated;
grant select, insert, delete on bucket.lobby_guest_revoked to service_role;
