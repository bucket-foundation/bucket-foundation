create table if not exists bucket.lobby_screens (
  lobby_id   uuid        not null references bucket.lobbies (id) on delete cascade,
  user_id    uuid        not null,
  created_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

create index if not exists lobby_screens_user_idx on bucket.lobby_screens (user_id);

alter table bucket.lobby_screens enable row level security;
revoke all on bucket.lobby_screens from anon, authenticated;
