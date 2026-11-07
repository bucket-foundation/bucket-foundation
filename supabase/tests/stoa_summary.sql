\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000003_stoa_live_rotation.sql
\ir ../migrations/20261109000009_stoa_live_summary.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0},
                {"idx":1,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  ps uuid[];
  res jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test'),
    (other, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || other || '@bucket.test');
  perform bucket.live_create_room(rid, host, 'C5V0K1', 'polingual', '{"rounds": 1, "per_round": 2, "school_mode": true}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  select array_agg((bucket.live_join('C5V0K1', n, 'ip-' || n) ->> 'player_id')::uuid order by n) into ps from unnest(array['amber-otter', 'brave-owl', 'calm-fern']) n;
  insert into bucket.live_scores (room_id, idx, player_id, correct, points, bonus) values
    (rid, 0, ps[1], true, 900, 0), (rid, 1, ps[1], false, 0, 0),
    (rid, 0, ps[2], true, 800, 0), (rid, 1, ps[2], true, 950, 100),
    (rid, 0, ps[3], false, 0, 0), (rid, 1, ps[3], false, 0, 0);
  update bucket.live_players set removed = true where id = ps[3];

  res := bucket.live_summary(rid, host);
  assert res ->> 'code' = 'C5V0K1';
  assert res -> 'rows' = '[{"nickname":"brave-owl","points":1850,"correct":2},{"nickname":"amber-otter","points":900,"correct":1}]'::jsonb,
    'rows rank by points and hold nickname, points and right answers only';
  assert not (res::text ~ '[0-9a-f]{8}-[0-9a-f]{4}-'), 'no player or room id leaves in the summary';

  begin
    perform bucket.live_summary(rid, other);
    assert false, 'another user cannot read the summary';
  exception when raise_exception then
    assert sqlerrm = 'not_host';
  end;
end $$;

\echo 'stoa_summary.sql: all checks pass'
rollback;
