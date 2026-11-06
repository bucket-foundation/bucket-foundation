\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000000_stoa_live.sql
\o

create function pg_temp.raises(stmt text, code text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return sqlerrm like '%' || code || '%' or sqlstate = code;
end $$;

create function pg_temp.room(host uuid, code text) returns uuid language sql as $$
  insert into bucket.live_rooms (sign_key, verify_key, code, product, host_user, seed)
  values (repeat('k', 32), repeat('A', 43), code, 'polingual', host, 7)
  returning id
$$;

do $$
declare
  host uuid := gen_random_uuid();
  fresh uuid;
  old uuid;
  open_old uuid;
  p1 uuid;
  p2 uuid;
  q1 uuid;
  n integer;
  s bucket.live_summaries;
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');

  fresh := pg_temp.room(host, 'ABC123');
  old := pg_temp.room(host, 'ABC124');
  open_old := pg_temp.room(host, 'ABC125');

  assert pg_temp.raises(format('insert into bucket.live_rooms (sign_key, verify_key, code, product, host_user, seed) values (%L, %L, %L, %L, %L, 1)', repeat('k', 32), repeat('A', 43), 'ABC123', 'polingual', host), '23505'),
    'an open code is unique';
  assert pg_temp.raises(format('insert into bucket.live_rooms (sign_key, verify_key, code, product, host_user, seed) values (%L, %L, %L, %L, %L, 1)', repeat('k', 32), repeat('A', 43), 'ABCI23', 'polingual', host), '23514'),
    'codes use the Crockford alphabet';

  for q1 in select unnest(array[fresh, old, open_old]) loop
    insert into bucket.live_questions (room_id, idx, round, kind, prompt, options, answer)
    values (q1, 0, 1, 'pick_word', '{"en":"water"}', '["agua","fuego","tierra","aire"]', 0);
    insert into bucket.live_players (room_id, nickname_key) values (q1, 'brave-otter') returning id into p1;
    insert into bucket.live_players (room_id, nickname_key) values (q1, 'quiet-lamp') returning id into p2;
    insert into bucket.live_answers (room_id, idx, player_id, choice) values (q1, 0, p1, 0);
    insert into bucket.live_scores (room_id, idx, player_id, correct, points) values (q1, 0, p1, true, 900), (q1, 0, p2, false, 0);
  end loop;

  assert pg_temp.raises(format('insert into bucket.live_answers (room_id, idx, player_id, choice) values (%L, 0, %L, 1)', open_old, p1), '23505'),
    'one answer per player per question';
  assert pg_temp.raises(format('update bucket.live_answers set choice = 1 where player_id = %L', p1), 'insert_only'),
    'answers are insert-only';
  assert pg_temp.raises(format('update bucket.live_scores set points = 1000 where player_id = %L', p1), 'insert_only'),
    'scores are written once';
  assert pg_temp.raises(format('insert into bucket.live_players (room_id, nickname_key) values (%L, %L)', open_old, 'quiet-lamp'), '23505'),
    'a nickname is unique among active players in a room';
  assert pg_temp.raises(format('insert into bucket.live_players (room_id, nickname_key) values (%L, %L)', open_old, 'Bobby Tables'), '23514'),
    'nicknames come from the generated key format';

  update bucket.live_rooms set created_at = clock_timestamp() - interval '28 hours', expires_at = clock_timestamp() - interval '25 hours',
    phase = 'closed', closed_at = clock_timestamp() - interval '25 hours' where id = old;
  update bucket.live_rooms set created_at = clock_timestamp() - interval '28 hours', expires_at = clock_timestamp() - interval '25 hours'
    where id = open_old;
  update bucket.live_rooms set phase = 'closed', closed_at = clock_timestamp() - interval '23 hours' where id = fresh;

  n := bucket.live_purge();
  assert n = 2, format('purge deletes the two rooms past 24 hours, got %s', n);
  assert exists (select 1 from bucket.live_rooms where id = fresh), 'a room closed 23 hours ago stays';
  assert not exists (select 1 from bucket.live_rooms where id in (old, open_old)), 'old rooms are gone';
  select count(*) into n from bucket.live_players where room_id in (old, open_old);
  assert n = 0, 'players are deleted with the room';
  select count(*) into n from bucket.live_questions where room_id in (old, open_old);
  assert n = 0, 'questions are deleted with the room';
  select count(*) into n from bucket.live_answers where room_id in (old, open_old);
  assert n = 0, 'answers are deleted with the room';
  select count(*) into n from bucket.live_scores where room_id in (old, open_old);
  assert n = 0, 'scores are deleted with the room';
  select count(*) into n from bucket.live_players where room_id = fresh;
  assert n = 2, 'the fresh room keeps its players';

  select * into s from bucket.live_summaries where room_id = old;
  assert s.player_count = 2, 'summary counts players';
  assert s.top_nicknames = array['brave-otter', 'quiet-lamp'], format('summary keeps top nicknames, got %s', s.top_nicknames);
  assert s.right_rate = '[{"idx": 0, "right": 0.500}]'::jsonb, format('summary keeps the right rate, got %s', s.right_rate);
  assert bucket.live_purge() = 0, 'a second purge finds nothing';

  assert bucket.live_sweep_ping() is null, 'no due room and no sweep secret means no request';

  select count(*) into n from cron.job where jobname in ('stoa-purge', 'stoa-sweep');
  assert n = 2, 'both cron jobs are scheduled';
  assert (select schedule from cron.job where jobname = 'stoa-sweep') = '10 seconds', 'sweep runs every 10 seconds';
end $$;

select has_table_privilege('anon', 'bucket.live_answers', 'select') as anon_reads_answers \gset
\if :anon_reads_answers
  \echo 'FAIL: anon can read answers'
  select 1/0;
\endif
select has_table_privilege('service_role', 'bucket.live_rooms', 'select') as service_reads_rooms \gset
\if :service_reads_rooms
  \echo 'FAIL: service_role reads rooms without a live_* function'
  select 1/0;
\endif
select has_function_privilege('anon', 'bucket.live_purge()', 'execute') as anon_purges \gset
\if :anon_purges
  \echo 'FAIL: anon can run the purge'
  select 1/0;
\endif

\echo 'stoa_live.sql: all checks pass'
rollback;
