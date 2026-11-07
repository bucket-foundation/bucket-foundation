\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000003_stoa_live_rotation.sql
\ir ../migrations/20261109000006_stoa_live_report_networks.sql
\ir ../migrations/20261109000011_stoa_live_probe_null_net.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  ps uuid[];
  res jsonb;
  t0 uuid;
  home text := md5('attacker');
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');
  perform bucket.live_create_room(rid, host, 'H0P5ED', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  select array_agg((bucket.live_join('H0P5ED', 'p-' || g, 'ip-' || g) ->> 'player_id')::uuid order by g) into ps from generate_series(1, 10) g;
  select topic into t0 from bucket.live_rooms where id = rid;

  begin
    perform bucket.live_probe(rid, ps[1], 1, null, true, 'not-a-hash');
    assert false, 'a report needs a network key';
  exception when raise_exception then
    assert sqlerrm = 'bad_action';
  end;

  begin
    perform bucket.live_probe(rid, ps[1], 1, null, true, null);
    assert false, 'a report with no network key is refused';
  exception when raise_exception then
    assert sqlerrm = 'bad_action';
  end;
  perform bucket.live_probe(rid, ps[1], 1, null, true, md5('first'));
  perform bucket.live_probe(rid, ps[1], 1, null, true, home);
  assert (select net from bucket.live_reports where player_id = ps[1]) = home, 'a second report replaces the network key';

  for i in 1..5 loop
    res := bucket.live_probe(rid, ps[i], 1, null, true, home);
  end loop;
  assert not (res ->> 'rotated')::boolean, 'five seats on one network, half the room, cannot force a hop';
  assert (select topic from bucket.live_rooms where id = rid) = t0, 'the topic stays';

  res := bucket.live_probe(rid, ps[6], 1, null, true, home);
  assert (res ->> 'rotated')::boolean, 'a majority of the room on one network, a class behind one school NAT, still rotates';

  update bucket.live_rooms set rotated_at = clock_timestamp() - interval '3 minutes' where id = rid;
  res := bucket.live_probe(rid, ps[7], 1, null, true, md5('a'));
  res := bucket.live_probe(rid, ps[8], 1, null, true, md5('b'));
  assert not (res ->> 'rotated')::boolean, 'two reporters stay under the floor of three';
  res := bucket.live_probe(rid, ps[9], 1, null, true, md5('c'));
  assert (res ->> 'rotated')::boolean, 'three reporters on three networks rotate';

  update bucket.live_rooms set rotated_at = clock_timestamp() - interval '3 minutes' where id = rid;
  update bucket.live_players set removed = true where id = any (ps[7:9]);
  res := bucket.live_probe(rid, ps[10], 1, null, true, md5('d'));
  assert not (res ->> 'rotated')::boolean, 'reports from removed seats do not count';

  res := bucket.live_probe(rid, ps[10], 1, 90, false, md5('d'));
  assert (select grace_ms from bucket.live_players where id = ps[10]) = 90, 'a lobby probe still records grace';
  assert not exists (select 1 from pg_proc where oid = to_regprocedure('bucket.live_probe(uuid, uuid, integer, integer, boolean)')),
    'the probe without a network key is gone';
end $$;

\echo 'stoa_report_networks.sql: all checks pass'
rollback;
