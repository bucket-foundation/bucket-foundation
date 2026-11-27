create table if not exists bucket.lobby_cards (
  lobby_id   uuid        not null references bucket.lobbies (id) on delete cascade,
  user_id    uuid        not null,
  card       jsonb       not null check (pg_column_size(card) < 4096),
  created_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

create index if not exists lobby_cards_created_idx on bucket.lobby_cards (created_at);

create table if not exists bucket.lobby_family (
  lobby_id   uuid        primary key references bucket.lobbies (id) on delete cascade,
  share      boolean     not null default true,
  updated_at timestamptz not null default now()
);

alter table bucket.lobby_cards enable row level security;
alter table bucket.lobby_family enable row level security;
revoke all on bucket.lobby_cards from anon, authenticated;
revoke all on bucket.lobby_family from anon, authenticated;
