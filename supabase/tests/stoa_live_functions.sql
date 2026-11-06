\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\o

create function pg_temp.raises(stmt text, code text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return sqlerrm = code;
end $$;

create function pg_temp.types(res jsonb) returns text language sql as $$
  select coalesce(string_agg(e ->> 'type', ',' order by (e ->> 'seq')::bigint), '') from jsonb_array_elements(res -> 'events') e
$$;

create function pg_temp.at(room uuid, ago_ms integer) returns void language sql as $$
  update bucket.live_rooms
  set opens_at = clock_timestamp() - make_interval(secs => ago_ms / 1000.0),
      closes_at = clock_timestamp() - make_interval(secs => ago_ms / 1000.0) + interval '20 seconds',
      next_at = clock_timestamp() - make_interval(secs => ago_ms / 1000.0) + interval '21 seconds'
  where id = room
$$;

create function pg_temp.due(room uuid) returns void language sql as $$
  update bucket.live_rooms set next_at = clock_timestamp() - interval '1 millisecond' where id = room
$$;

create function pg_temp.answer_at(room uuid, player uuid, i integer, c smallint, ms integer) returns void language sql as $$
  insert into bucket.live_answers (room_id, idx, player_id, choice, received_at)
  select room, i, player, c, r.opens_at + make_interval(secs => ms / 1000.0) from bucket.live_rooms r where r.id = room
$$;

create function pg_temp.points(room uuid, player uuid, i integer) returns integer language sql as $$
  select points + bonus from bucket.live_scores where room_id = room and player_id = player and idx = i
$$;

do $$
declare
  host uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  old uuid := gen_random_uuid();
  qs jsonb;
  res jsonb;
  a uuid;
  b uuid;
  c uuid;
  topic0 uuid;
  next0 timestamptz;
  ev jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email)
  select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || u || '@bucket.test'
  from unnest(array[host, other]) u;

  select jsonb_agg(jsonb_build_object('idx', i, 'round', i / 2 + 1, 'kind', 'pick_word', 'prompt', jsonb_build_object('en', 'w' || i),
    'options', '["a","b","c","d"]'::jsonb, 'answer', 0)) into qs from generate_series(0, 5) i;

  res := bucket.live_create_room(rid, host, 'QZ7K2M', 'polingual', '{"per_round": 2}', 42, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  assert res ->> 'code' = 'QZ7K2M' and res ->> 'room_id' = rid::text, 'room created';
  assert pg_temp.raises(format('select bucket.live_create_room(%L, %L, %L, %L, %L, 1, %L, %L, %L)', gen_random_uuid(), other, 'QZ7K2M', 'polingual', '{}', 'v1.' || repeat('x', 40), repeat('A', 43), qs), 'code_taken'),
    'an open code cannot be reused';

  assert pg_temp.raises('select bucket.live_join(''ZZZZZZ'', ''brave-otter'')', 'no_room'), 'unknown code';
  a := (bucket.live_join('QZ7K2M', 'brave-otter') ->> 'player_id')::uuid;
  b := (bucket.live_join('QZ7K2M', 'quiet-lamp') ->> 'player_id')::uuid;
  c := (bucket.live_join('QZ7K2M', 'swift-heron') ->> 'player_id')::uuid;
  assert bucket.live_join('QZ7K2M', 'quiet-lamp') ->> 'error' = 'name_taken', 'nicknames are unique in a room';
  res := bucket.live_join('QZ7K2M', 'calm-river');
  assert res ->> 'token_version' = '1' and res ? 'sign_key' and res ? 'topic', 'join returns version, sealed key and topic';
  update bucket.live_players set removed = true where id = (res ->> 'player_id')::uuid;

  update bucket.live_rooms set probe_at = null where id = rid;
  assert pg_temp.types(bucket.live_tick(rid)) = 'probe', 'the lobby sends a latency probe';
  assert pg_temp.types(bucket.live_tick(rid)) = '', 'probes wait 3 seconds';
  perform bucket.live_probe(rid, b, 1, 800, 0);
  perform bucket.live_probe(rid, c, 1, 5000, 0);
  assert (select grace_ms from bucket.live_players where id = b) = 800, 'grace is the reported median';
  assert (select grace_ms from bucket.live_players where id = c) = 1000, 'grace caps at 1000 ms';
  update bucket.live_players set grace_ms = 0 where id = c;

  assert pg_temp.raises(format('select bucket.live_host(%L, %L, %L)', rid, other, 'start'), 'not_host'), 'only the host starts';
  res := bucket.live_host(rid, host, 'start');
  assert pg_temp.types(res) = 'open', 'start opens question 0';
  assert not (res -> 'events' -> 0 -> 'payload' ? 'answer'), 'open carries no answer key';
  assert (bucket.live_state(rid, a, null) -> 'question' -> 'answer') = 'null'::jsonb, 'state hides the answer before reveal';
  assert pg_temp.raises(format('select bucket.live_state(%L, null, %L)', rid, other), 'not_host'), 'state checks the host';

  perform pg_temp.at(rid, 5000);
  res := bucket.live_answer(rid, a, 1, 0, 0::smallint);
  assert res ? 'received_at' and pg_temp.types(res) = '', 'an answer inside the window is stored';
  assert bucket.live_answer(rid, a, 1, 0, 1::smallint) ->> 'error' = 'duplicate', 'a second answer is refused';
  assert bucket.live_answer(rid, a, 1, 1, 0::smallint) ->> 'error' = 'not_open', 'an answer for another question is refused';
  perform pg_temp.at(rid, 20500);
  assert bucket.live_answer(rid, c, 1, 0, 0::smallint) ->> 'error' = 'late', 'an answer after close is late without grace';
  assert bucket.live_answer(rid, b, 1, 0, 0::smallint) ? 'received_at', 'an answer inside the grace window counts';

  delete from bucket.live_answers where room_id = rid and idx = 0;
  perform pg_temp.at(rid, 21000);
  perform pg_temp.answer_at(rid, a, 0, 0::smallint, 5000);
  perform pg_temp.answer_at(rid, b, 0, 0::smallint, 5000);
  perform pg_temp.answer_at(rid, c, 0, 1::smallint, 1000);
  update bucket.live_rooms set next_at = clock_timestamp() + interval '1 second' where id = rid;
  assert pg_temp.types(bucket.live_tick(rid)) = 'reveal', 'every active player answered, so the question reveals early';
  assert pg_temp.points(rid, a, 0) = 875, format('right at 5 s scores 500 + 375, got %s', pg_temp.points(rid, a, 0));
  assert pg_temp.points(rid, b, 0) = 895, format('grace of 800 ms takes off the clock, got %s', pg_temp.points(rid, b, 0));
  assert pg_temp.points(rid, c, 0) = 0, 'a wrong answer scores 0';
  assert (bucket.live_state(rid, a, null) -> 'question' ->> 'answer') = '0', 'state shows the answer after reveal';
  assert (bucket.live_state(rid, a, null) -> 'question' -> 'counts') = '[2,1,0,0]'::jsonb, 'reveal counts each option';

  assert pg_temp.types(bucket.live_tick(rid)) = '', 'nothing moves before the reveal ends';
  perform pg_temp.due(rid);
  assert pg_temp.types(bucket.live_tick(rid)) = 'open', 'an overdue reveal opens the next question on the next call';
  assert (select idx from bucket.live_rooms where id = rid) = 1, 'question 1 is open';

  perform pg_temp.at(rid, 21000);
  perform pg_temp.answer_at(rid, a, 1, 0::smallint, 20500);
  perform pg_temp.answer_at(rid, b, 1, 0::smallint, 20500);
  perform pg_temp.due(rid);
  assert pg_temp.types(bucket.live_tick(rid)) = 'reveal', 'an overdue question reveals with one player silent';
  assert pg_temp.points(rid, a, 1) = 0, 'past close plus grace scores 0';
  assert pg_temp.points(rid, b, 1) = 508, format('inside grace near the end scores 500 + 8, got %s', pg_temp.points(rid, b, 1));
  assert pg_temp.points(rid, c, 1) = 0, 'no answer scores 0';

  perform pg_temp.due(rid);
  res := bucket.live_tick(rid);
  assert pg_temp.types(res) = 'board', 'the end of a round shows the board';
  assert jsonb_array_length(res -> 'events' -> 0 -> 'payload' -> 'standings') = 3, 'the board ranks active players';
  assert res -> 'events' -> 0 -> 'payload' -> 'standings' -> 0 ->> 'nickname' = 'quiet-lamp', 'the leader is first';
  perform pg_temp.due(rid);
  assert pg_temp.types(bucket.live_tick(rid)) = 'open', 'the board break ends in question 2';

  perform pg_temp.at(rid, 3000);
  perform bucket.live_answer(rid, a, 1, 2, 0::smallint);
  perform bucket.live_answer(rid, c, 1, 2, 0::smallint);
  res := bucket.live_answer(rid, b, 1, 2, 0::smallint);
  assert pg_temp.types(res) = 'reveal', 'the last answer reveals the question';
  assert (select bonus from bucket.live_scores where room_id = rid and idx = 2 and player_id = b) = 100, 'three right in a row add 100';
  assert (select bonus from bucket.live_scores where room_id = rid and idx = 2 and player_id = a) = 0, 'a broken streak adds nothing';

  perform pg_temp.due(rid);
  assert pg_temp.types(bucket.live_tick(rid)) = 'open', 'question 3 opens';
  perform pg_temp.at(rid, 2000);
  assert pg_temp.types(bucket.live_host(rid, host, 'pause')) = 'pause', 'the host pauses';
  assert bucket.live_answer(rid, a, 1, 3, 0::smallint) ->> 'error' = 'paused', 'no answers while paused';
  update bucket.live_rooms set paused_at = clock_timestamp() - interval '10 seconds', next_at = clock_timestamp() - interval '1 second' where id = rid;
  assert pg_temp.types(bucket.live_tick(rid)) = '', 'a paused room does not advance';
  select next_at into next0 from bucket.live_rooms where id = rid;
  assert pg_temp.types(bucket.live_host(rid, host, 'resume')) = 'resume', 'the host resumes';
  assert (select next_at from bucket.live_rooms where id = rid) >= next0 + interval '10 seconds', 'resume moves every deadline by the pause';

  res := bucket.live_player_admin(rid, host, c, 'remove', null);
  assert res ->> 'token_version' = '2', 'removing a player bumps the token version';
  assert pg_temp.raises(format('select bucket.live_answer(%L, %L, 2, 3, 0::smallint)', rid, c), 'removed'), 'a removed player cannot answer';
  assert pg_temp.raises(format('select bucket.live_answer(%L, %L, 1, 3, 0::smallint)', rid, a), 'stale_token'), 'an old token version is refused';
  assert bucket.live_answer(rid, a, 2, 3, 0::smallint) ? 'received_at', 'a reissued token answers';
  assert (bucket.live_state(rid, c, null) -> 'player' ->> 'removed') = 'true', 'state reports the removal';
  assert bucket.live_player_admin(rid, host, a, 'rename', 'quiet-lamp') ->> 'error' = 'name_taken', 'rename keeps names unique';
  perform bucket.live_player_admin(rid, host, b, 'time', '2');
  assert (select next_at from bucket.live_rooms where id = rid) >= (select opens_at + interval '40 seconds' from bucket.live_rooms where id = rid),
    'extra time holds the question open for that player';

  assert pg_temp.types(bucket.live_host(rid, host, 'skip')) = 'reveal', 'skip reveals the question';
  assert pg_temp.types(bucket.live_host(rid, host, 'skip')) = 'board', 'skip ends the round';
  assert pg_temp.types(bucket.live_host(rid, host, 'skip')) = 'open', 'skip leaves the board';
  perform bucket.live_host(rid, host, 'skip');
  perform bucket.live_host(rid, host, 'skip');
  perform bucket.live_host(rid, host, 'skip');
  res := bucket.live_host(rid, host, 'skip');
  assert pg_temp.types(res) = 'finale', format('the last reveal leads to the finale, got %s', pg_temp.types(res));
  ev := res -> 'events' -> 0 -> 'payload';
  assert jsonb_array_length(ev -> 'top') = 2, 'the finale ranks active players';
  assert ev -> 'most_improved' ->> 'nickname' is not null, 'the finale names the most improved player';
  assert (ev -> 'most_missed' ->> 'right_rate')::numeric = 0, 'the most missed question nobody got right';
  assert bucket.live_join('QZ7K2M', 'late-comer') ->> 'error' = 'no_room', 'a code stops resolving at the finale';
  assert pg_temp.types(bucket.live_host(rid, host, 'end')) = 'closed', 'the host ends the room';
  assert pg_temp.raises('select bucket.live_join(''QZ7K2M'', ''late-comer'')', 'no_room'), 'a closed code resolves nothing';

  select topic into topic0 from bucket.live_rooms where id = rid;
  perform bucket.live_probe(rid, a, 2, null, 15);
  assert (select topic from bucket.live_rooms where id = rid) = topic0, '15 verify failures keep the topic';
  assert (bucket.live_probe(rid, a, 2, null, 10) ->> 'rotated') = 'true', 'over 20 failures a minute rotate the topic';
  assert (select topic from bucket.live_rooms where id = rid) <> topic0, 'the room has a new topic';

  perform bucket.live_create_room(old, host, 'XYZ123', 'polingual', '{}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  update bucket.live_rooms set created_at = clock_timestamp() - interval '3 hours', expires_at = clock_timestamp() - interval '1 second' where id = old;
  assert old in (select bucket.live_due()), 'the sweep finds an expired room';
  assert pg_temp.types(bucket.live_tick(old)) = 'closed', 'an expired room closes on its next tick';
  assert old not in (select bucket.live_due()), 'a closed room leaves the sweep';
  assert (select array_agg(e ->> 'seq' order by e ->> 'seq') from jsonb_array_elements(bucket.live_tick(old) -> 'events') e) is null, 'a closed room emits nothing';

  perform bucket.live_create_room(gen_random_uuid(), host, 'MAX001', 'polingual', '{}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  perform bucket.live_create_room(gen_random_uuid(), host, 'MAX002', 'polingual', '{}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  perform bucket.live_create_room(gen_random_uuid(), host, 'MAX003', 'polingual', '{}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  assert pg_temp.raises(format('select bucket.live_create_room(%L, %L, %L, %L, %L, 1, %L, %L, %L)', gen_random_uuid(), host, 'MAX004', 'polingual', '{}', 'v1.' || repeat('x', 40), repeat('A', 43), qs), 'too_many_rooms'),
    'a host holds three open rooms at most';
end $$;

do $$
declare
  host uuid := (select id from auth.users where email like 'stoa-%' limit 1);
  rid uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  n integer := 0;
begin
  update bucket.live_rooms set phase = 'closed', closed_at = clock_timestamp() where host_user = host and closed_at is null;
  perform bucket.live_create_room(rid, host, 'FAAA01', 'polingual', '{}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  insert into bucket.live_players (room_id, nickname_key) select rid, 'p-' || g from generate_series(1, 100) g;
  assert bucket.live_join('FAAA01', 'one-more') ->> 'error' = 'room_full', 'a room holds 100 players';
end $$;

select has_function_privilege('anon', 'bucket.live_join(text, text)', 'execute') as anon_joins \gset
\if :anon_joins
  \echo 'FAIL: anon can call live_join'
  select 1/0;
\endif
select not has_function_privilege('service_role', 'bucket.live_answer(uuid, uuid, integer, integer, smallint)', 'execute') as svc_blocked \gset
\if :svc_blocked
  \echo 'FAIL: service_role cannot call live_answer'
  select 1/0;
\endif
select has_function_privilege('service_role', 'bucket.live_reveal(uuid)', 'execute') as svc_reveals \gset
\if :svc_reveals
  \echo 'FAIL: service_role can call an internal step'
  select 1/0;
\endif

\echo 'stoa_live_functions.sql: all checks pass'
rollback;
