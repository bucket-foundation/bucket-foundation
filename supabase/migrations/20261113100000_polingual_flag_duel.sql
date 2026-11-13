alter table bucket.lobbies drop constraint if exists lobbies_game_check;
alter table bucket.lobbies add constraint lobbies_game_check check (game in ('daily', 'same-word', 'flags', 'live', 'tiles', 'duel'));

alter table bucket.lobby_prompts drop constraint if exists lobby_prompts_mode_check;
alter table bucket.lobby_prompts add constraint lobby_prompts_mode_check check (mode in ('form', 'flag', 'tiles', 'mixed', 'meaning'));

create table if not exists bucket.lobby_powers (
  lobby_id uuid not null references bucket.lobbies (id) on delete cascade,
  user_id  uuid not null,
  round    int  not null check (round >= 0),
  kind     text not null check (kind in ('double', 'fifty')),
  created_at timestamptz not null default now(),
  primary key (lobby_id, user_id, round)
);

alter table bucket.lobby_powers enable row level security;
revoke all on bucket.lobby_powers from anon, authenticated;
