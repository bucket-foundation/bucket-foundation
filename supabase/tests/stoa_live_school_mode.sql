\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000004_stoa_live_school_mode.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');
  perform bucket.live_create_room(a, host, 'SCH001', 'polingual', '{"rounds": 1, "per_round": 1, "school_mode": true}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  perform bucket.live_create_room(b, host, 'SCH002', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  assert (select school_mode from bucket.live_rooms where id = a), 'school mode comes from the room settings';
  assert not (select school_mode from bucket.live_rooms where id = b), 'school mode is off by default';
  assert (bucket.live_state(a, null, host) -> 'room' ->> 'school_mode') = 'true', 'state reports school mode';
end $$;

\echo 'stoa_live_school_mode.sql: all checks pass'
rollback;
