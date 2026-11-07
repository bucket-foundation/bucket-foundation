\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000003_stoa_live_rotation.sql
\ir ../migrations/20261109000006_stoa_live_report_networks.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  ps uuid[];
  t0 uuid;
  t1 uuid;
  res jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');
  perform bucket.live_create_room(rid, host, 'R0TA7E', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);

  select array_agg((bucket.live_join('R0TA7E', 'p-' || g, 'ip-a') ->> 'player_id')::uuid order by g) into ps from generate_series(1, 60) g;
  assert array_position(ps, null) is null, 'one IP joins 60 players in a minute';
  assert bucket.live_join('R0TA7E', 'p-61', 'ip-a') ->> 'error' = 'slow_down', 'the 61st join from one IP in a minute waits';
  assert bucket.live_join('R0TA7E', 'p-61', 'ip-b') ->> 'player_id' is not null, 'another IP still joins';
  for i in 1..200 loop
    perform bucket.live_join('R0TA7E', 'p-61', 'ip-a');
  end loop;
  assert (select hits from bucket.live_limits where bucket_key = 'join:' || rid) = 61, 'one IP past its cap never drains the room bucket';

  select topic into t0 from bucket.live_rooms where id = rid;
  res := bucket.live_tick(rid);
  assert res -> 'topics' = jsonb_build_array(t0), 'one topic before any rotation';

  for i in 1..20 loop
    res := bucket.live_probe(rid, ps[i], 1, null, true, md5(i::text));
    exit when (res ->> 'rotated')::boolean;
  end loop;
  assert (res ->> 'rotated')::boolean, 'enough distinct reporters rotate the topic';
  assert res -> 'events' -> -1 ->> 'type' = 'rotate', 'rotation emits a signed rotate event';
  select topic into t1 from bucket.live_rooms where id = rid;
  assert t1 <> t0, 'the topic changed';
  assert res -> 'topics' = jsonb_build_array(t1, t0), 'the rotate event goes out on the old and the new topic';
  assert bucket.live_tick(rid) -> 'topics' = jsonb_build_array(t1, t0), 'both topics carry events for 60 seconds';

  for i in 21..40 loop
    res := bucket.live_probe(rid, ps[i], 1, null, true, md5(i::text));
  end loop;
  assert (select topic from bucket.live_rooms where id = rid) = t1, 'reports rotate at most once per 2 minutes';

  res := bucket.live_host(rid, host, 'rotate');
  assert res ->> 'error' is null and res -> 'events' -> -1 ->> 'type' = 'rotate', 'the host rotates inside the cooldown';
  assert (select topic from bucket.live_rooms where id = rid) not in (t0, t1), 'the host rotation picks a new topic';
  res := bucket.live_tick(rid);
  assert res -> 'topics' -> 1 = to_jsonb(t1) and res -> 'topics' -> 2 = to_jsonb(t0), 'two rotations inside 60 s keep both old topics live';
  assert jsonb_array_length(res -> 'topics') = 3, 'the new topic and two old ones';

  update bucket.live_rooms set rotated_at = null where id = rid;
  perform bucket.live_host(rid, host, 'rotate');
  perform bucket.live_host(rid, host, 'rotate');
  assert jsonb_array_length((select topic_history from bucket.live_rooms where id = rid)) = 3, 'the history keeps the last 3 topics';
  assert jsonb_array_length(bucket.live_tick(rid) -> 'topics') = 4, 'events go to the new topic and the last 3';

  update bucket.live_rooms set topic_history = (
    select jsonb_agg(jsonb_set(h, '{until}', to_jsonb(bucket.live_ms(clock_timestamp() - interval '1 second'))))
    from jsonb_array_elements(topic_history) h
  ) where id = rid;
  assert jsonb_array_length(bucket.live_tick(rid) -> 'topics') = 1, 'after 60 seconds only the new topic carries events';
end $$;

\echo 'stoa_rotation.sql: all checks pass'
rollback;
