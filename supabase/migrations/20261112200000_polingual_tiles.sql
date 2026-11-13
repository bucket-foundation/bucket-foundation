alter table bucket.lobbies drop constraint if exists lobbies_game_check;
alter table bucket.lobbies add constraint lobbies_game_check check (game in ('daily', 'same-word', 'flags', 'live', 'tiles'));

alter table bucket.lobby_prompts drop constraint if exists lobby_prompts_mode_check;
alter table bucket.lobby_prompts add constraint lobby_prompts_mode_check check (mode in ('form', 'flag', 'tiles'));
alter table bucket.lobby_prompts drop constraint if exists lobby_prompts_choices_check;
alter table bucket.lobby_prompts add constraint lobby_prompts_choices_check check (cardinality(choices) between 2 and 16);
alter table bucket.lobby_prompts drop constraint if exists lobby_prompts_check;
alter table bucket.lobby_prompts add constraint lobby_prompts_check check (mode = 'tiles' or answer = any (choices));

alter table bucket.lobbies add column if not exists reveal_seconds int not null default 0;
alter table bucket.lobbies drop constraint if exists lobbies_reveal_seconds_check;
alter table bucket.lobbies add constraint lobbies_reveal_seconds_check check (reveal_seconds between 0 and 10);
