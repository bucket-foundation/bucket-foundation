\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000002_stoa_live_paused_expiry.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  ev jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');
  perform bucket.live_create_room(rid, host, 'PA75ED', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  perform bucket.live_join('PA75ED', 'brave-otter', 'ip1');
  perform bucket.live_host(rid, host, 'start');
  perform bucket.live_host(rid, host, 'pause');
  update bucket.live_rooms set next_at = clock_timestamp() - interval '1 second' where id = rid;
  ev := bucket.live_tick(rid) -> 'events';
  assert jsonb_array_length(ev) = 0, 'a paused room before expiry holds still';
  update bucket.live_rooms set created_at = clock_timestamp() - interval '3 hours', expires_at = clock_timestamp() - interval '1 second' where id = rid;
  assert rid in (select bucket.live_due()), 'the sweep finds a paused room past expiry';
  ev := bucket.live_tick(rid) -> 'events';
  assert ev -> 0 ->> 'type' = 'closed', format('a paused room past expiry closes, got %s', ev);
  assert (select phase from bucket.live_rooms where id = rid) = 'closed', 'the room row is closed';
  assert rid not in (select bucket.live_due()), 'a closed room leaves the sweep';
end $$;

\echo 'stoa_paused_expiry.sql: all checks pass'
rollback;
