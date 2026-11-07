\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000003_stoa_live_rotation.sql
\ir ../migrations/20261109000005_stoa_live_probe_locks.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  ps uuid[];
  res jsonb;
  src text;
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');
  perform bucket.live_create_room(rid, host, '10CK5A', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  select array_agg((bucket.live_join('10CK5A', 'p-' || g, 'ip-' || g) ->> 'player_id')::uuid order by g) into ps from generate_series(1, 10) g;

  for i in 1..3 loop
    res := bucket.live_probe(rid, ps[i], 1, null, true);
  end loop;
  assert (res ->> 'rotated')::boolean, 'three distinct reporters rotate the topic';
  assert (select count(*) from bucket.live_reports where room_id = rid) = 0, 'rotation clears the reports';
  assert (select prosrc from pg_proc where oid = 'bucket.live_probe(uuid, uuid, integer, integer, boolean)'::regprocedure) ~ 'for update;\s+insert into bucket.live_reports',
    'a reporter locks the room row before its report row, so two reporters cannot deadlock on the rotation';

  res := bucket.live_probe(rid, ps[7], 1, 120, false);
  assert (select grace_ms from bucket.live_players where id = ps[7]) = 120, 'a lobby probe still records grace';
end $$;

\echo 'stoa_probe_locks.sql: all checks pass'
rollback;
