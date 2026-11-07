\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000003_stoa_live_rotation.sql
\ir ../migrations/20261109000004_stoa_live_school_mode.sql
\ir ../migrations/20261109000007_stoa_live_chorus.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  open_rid uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0},
                {"idx":1,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  ps uuid[];
  op uuid;
  res jsonb;
  teams jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');

  begin
    perform bucket.live_create_room(gen_random_uuid(), host, 'CH0R25', 'polingual', '{"rounds":1,"per_round":2,"mode":"chorus","teams":5}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
    assert false, 'five teams is too many';
  exception when raise_exception then
    assert sqlerrm = 'bad_settings';
  end;
  begin
    perform bucket.live_create_room(gen_random_uuid(), host, 'CH0R25', 'polingual', '{"rounds":1,"per_round":2,"teams":2}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
    assert false, 'open floor takes no teams';
  exception when raise_exception then
    assert sqlerrm = 'bad_settings';
  end;

  perform bucket.live_create_room(rid, host, 'CH0R25', 'polingual', '{"rounds":1,"per_round":2,"mode":"chorus","teams":2}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  assert (select mode from bucket.live_rooms where id = rid) = 'chorus';
  select array_agg((bucket.live_join('CH0R25', 'p-' || g, 'ip-' || g) ->> 'player_id')::uuid order by g) into ps from generate_series(1, 6) g;
  assert (select array_agg(team_slot order by joined_at, id) from bucket.live_players where room_id = rid) is not null;
  assert (select count(*) filter (where team_slot = 0) = 3 and count(*) filter (where team_slot = 1) = 3 from bucket.live_players where room_id = rid),
    'six joins split three and three';
  assert bucket.live_join('CH0R25', 'p-7', 'ip-7') ->> 'team_slot' = '0', 'a tie goes to the first team';

  res := bucket.live_player_admin(rid, host, ps[1], 'move', '3');
  assert res ->> 'error' = 'team', 'a two-team room has no team 3';
  update bucket.live_players set team_slot = 0 where room_id = rid;
  update bucket.live_players set removed = true where room_id = rid and nickname_key = 'p-7';
  for i in 3..6 loop
    res := bucket.live_player_admin(rid, host, ps[i], 'move', '1');
    assert res ->> 'error' is null, 'the host moves a player in the lobby';
  end loop;
  assert (select count(*) from bucket.live_players where room_id = rid and team_slot = 1) = 4, 'team 1 holds four, team 0 holds two';

  teams := bucket.live_snapshot(rid, ps[3], true) -> 'team_standings';
  assert jsonb_array_length(teams) = 2 and (teams -> 0 ->> 'points')::int = 0, 'both teams start at 0';
  assert (bucket.live_snapshot(rid, ps[3], false) -> 'player' ->> 'team_slot')::int = 1, 'a phone sees its team';
  assert (bucket.live_snapshot(rid, null, true) -> 'room' ->> 'teams')::int = 2;

  perform bucket.live_host(rid, host, 'start');
  res := bucket.live_player_admin(rid, host, ps[3], 'move', '0');
  assert res ->> 'error' = 'bad_phase', 'teams lock once the game starts';

  insert into bucket.live_scores (room_id, idx, player_id, correct, points) values
    (rid, 0, ps[1], true, 800), (rid, 0, ps[2], true, 800),
    (rid, 0, ps[3], true, 800), (rid, 0, ps[4], true, 800), (rid, 0, ps[5], true, 800), (rid, 0, ps[6], false, 0);
  teams := bucket.live_team_standings(rid);
  assert teams -> 0 ->> 'team' = '0' and (teams -> 0 ->> 'points')::int = 950, 'two of two right: mean 800 plus the unison 150';
  assert (teams -> 1 ->> 'points')::int = 600 and (teams -> 1 ->> 'unisons')::int = 0, 'three of four right: mean 600, under 80% so no unison';

  insert into bucket.live_scores (room_id, idx, player_id, correct, points, bonus) values
    (rid, 1, ps[1], true, 900, 0), (rid, 1, ps[2], false, 0, 0),
    (rid, 1, ps[3], true, 1000, 0), (rid, 1, ps[4], true, 1000, 0), (rid, 1, ps[5], true, 900, 100), (rid, 1, ps[6], true, 1000, 0);
  teams := bucket.live_team_standings(rid);
  assert teams -> 0 ->> 'team' = '1' and (teams -> 0 ->> 'points')::int = 600 + 1000 + 150, 'four of four right: mean 1000 with the streak bonus, plus 150';
  assert (teams -> 1 ->> 'points')::int = 950 + 450, 'one of two right: mean 450';
  assert (teams -> 0 ->> 'members')::int = 4 and (teams -> 1 ->> 'members')::int = 2;

  perform bucket.live_create_room(open_rid, host, 'C0PEN1', 'polingual', '{"rounds":1,"per_round":2}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  op := (bucket.live_join('C0PEN1', 'solo-1', 'ip-1') ->> 'player_id')::uuid;
  assert (select team_slot from bucket.live_players where id = op) is null, 'open floor players have no team';
  assert not (bucket.live_snapshot(open_rid, null, true) ? 'team_standings'), 'open floor shows no team board';
  assert bucket.live_player_admin(open_rid, host, op, 'move', '1') ->> 'error' = 'bad_phase', 'open floor has no moves';
end $$;

\echo 'stoa_chorus.sql: all checks pass'
rollback;
