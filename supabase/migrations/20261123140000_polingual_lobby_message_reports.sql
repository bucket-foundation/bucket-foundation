create table if not exists bucket.lobby_message_reports (
  id             uuid        primary key default gen_random_uuid(),
  reporter_id    uuid        not null,
  lobby_id       uuid        references bucket.lobbies (id) on delete set null,
  message_id     bigint      not null,
  target_user_id uuid        not null,
  target_name    text        not null check (char_length(target_name) between 1 and 60),
  body           text        not null check (char_length(body) between 1 and 200),
  reason         text        not null check (reason in ('offensive_name', 'harassment', 'spam', 'other')),
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  check (reporter_id <> target_user_id),
  unique (reporter_id, message_id)
);

create index if not exists lobby_message_reports_open_idx
  on bucket.lobby_message_reports (created_at desc) where reviewed_at is null;
create index if not exists lobby_message_reports_target_idx
  on bucket.lobby_message_reports (target_user_id);

alter table bucket.lobby_message_reports enable row level security;
alter table bucket.lobby_message_reports force row level security;
revoke all on bucket.lobby_message_reports from public, anon, authenticated;
grant select, insert, update on bucket.lobby_message_reports to service_role;
