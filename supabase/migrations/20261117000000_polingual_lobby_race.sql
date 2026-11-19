alter table bucket.lobbies drop constraint if exists lobbies_game_check;
alter table bucket.lobbies add constraint lobbies_game_check check (game in (
  'daily', 'same-word', 'flags', 'live', 'tiles', 'duel', 'spy',
  'mini', 'word-groups', 'match', 'voice', 'letters', 'polyword', 'flag-tiles', 'babel', 'shift', 'snake', 'atlas', 'forehead', 'ispy', 'flag-duel'
));
