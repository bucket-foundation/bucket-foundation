create table if not exists bucket.lobby_bonus_claims (
  lobby_id    uuid        not null references bucket.lobbies (id) on delete cascade,
  started_at  timestamptz not null,
  slot        text        not null check (slot ~ '^(atlas|forehead):[0-9]{1,3}$'),
  user_id     uuid        not null,
  created_at  timestamptz not null default now(),
  primary key (lobby_id, started_at, slot, user_id)
);

create index if not exists lobby_bonus_claims_user_idx on bucket.lobby_bonus_claims (user_id);

create table if not exists bucket.lobby_bonus_votes (
  lobby_id    uuid        not null references bucket.lobbies (id) on delete cascade,
  started_at  timestamptz not null,
  round       int         not null check (round between 0 and 49),
  user_id     uuid        not null,
  choice      text        not null check (length(choice) between 1 and 80),
  created_at  timestamptz not null default now(),
  primary key (lobby_id, started_at, round, user_id)
);

create index if not exists lobby_bonus_votes_user_idx on bucket.lobby_bonus_votes (user_id);

alter table bucket.lobbies add column if not exists guests_watch boolean not null default false;

alter table bucket.lobby_bonus_claims enable row level security;
alter table bucket.lobby_bonus_votes enable row level security;
revoke all on bucket.lobby_bonus_claims from anon, authenticated;
revoke all on bucket.lobby_bonus_votes from anon, authenticated;
