alter table bucket.lobbies add column if not exists ended_at timestamptz;
alter table bucket.lobby_players add column if not exists total integer not null default 0;
