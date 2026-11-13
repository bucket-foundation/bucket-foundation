\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000003_stoa_live_rotation.sql
\ir ../migrations/20261109000006_stoa_live_report_networks.sql
\ir ../migrations/20261109000010_stoa_live_purge_reports.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"pick_word","prompt":{},"options":["a","b","c","d"],"answer":0}]';
  ps uuid[];
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');
  perform bucket.live_create_room(rid, host, 'PVRGE1', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  select array_agg((bucket.live_join('PVRGE1', 'p-' || g, 'ip-' || g) ->> 'player_id')::uuid order by g) into ps from generate_series(1, 4) g;
  perform bucket.live_probe(rid, ps[1], 1, null, true, md5('a'));
  perform bucket.live_probe(rid, ps[2], 1, null, true, md5('b'));
  update bucket.live_reports set reported_at = clock_timestamp() - interval '3 minutes' where player_id = ps[1];
  update bucket.live_limits set minute = date_trunc('minute', clock_timestamp()) - interval '3 minutes' where bucket_key like 'joinip:%';
  perform bucket.live_purge();
  assert (select array_agg(player_id) from bucket.live_reports where room_id = rid) = array[ps[2]], 'the purge drops network keys older than 2 minutes and keeps fresh ones';
  assert not exists (select 1 from bucket.live_limits where bucket_key like 'joinip:%'), 'hashed address counters older than 2 minutes go too';
  assert exists (select 1 from cron.job where jobname = 'stoa-purge' and schedule = '*/5 * * * *'), 'the purge runs every 5 minutes, so a hashed address lives under 10 minutes';
end $$;

\echo 'stoa_purge_reports.sql: all checks pass'
rollback;
