alter table bucket.lobbies add column if not exists playlist text[];
alter table bucket.lobbies add column if not exists mix boolean not null default false;
alter table bucket.lobbies add column if not exists start_at timestamptz;
alter table bucket.lobbies drop constraint if exists lobbies_playlist_check;
alter table bucket.lobbies add constraint lobbies_playlist_check check (playlist is null or cardinality(playlist) between 1 and 8);

alter table bucket.lobby_prompts drop constraint if exists lobby_prompts_mode_check;
alter table bucket.lobby_prompts add constraint lobby_prompts_mode_check check (mode in ('form', 'flag', 'tiles', 'mixed'));
