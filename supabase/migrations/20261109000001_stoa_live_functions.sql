create or replace function bucket.live_ms(t timestamptz)
returns bigint language sql immutable as $$
  select (extract(epoch from t) * 1000)::bigint
$$;

create or replace function bucket.live_setting(r bucket.live_rooms, k text, fallback integer)
returns integer language sql immutable as $$
  select coalesce((r.settings ->> k)::integer, fallback)
$$;

create or replace function bucket.live_event(p_room uuid, p_type text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  s bigint;
begin
  update bucket.live_rooms set seq = seq + 1 where id = p_room returning seq into s;
  return jsonb_build_object('seq', s, 'type', p_type, 'issued_at', bucket.live_ms(clock_timestamp()), 'payload', p_payload);
end $$;

create or replace function bucket.live_standings(p_room uuid, p_limit integer)
returns jsonb language sql stable security definer set search_path = bucket, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('player_id', t.id, 'nickname', t.nickname_key, 'points', t.total) order by t.total desc, t.nickname_key), '[]'::jsonb)
  from (
    select p.id, p.nickname_key, coalesce(sum(s.points + s.bonus), 0)::integer as total
    from bucket.live_players p left join bucket.live_scores s on s.player_id = p.id
    where p.room_id = p_room and not p.removed
    group by p.id, p.nickname_key
    order by total desc, p.nickname_key
    limit p_limit
  ) t
$$;

create or replace function bucket.live_counts(p_room uuid, p_idx integer)
returns jsonb language sql stable security definer set search_path = bucket, pg_temp as $$
  select jsonb_agg(coalesce(x.n, 0) order by o.choice)
  from generate_series(0, 3) as o (choice)
  left join (
    select a.choice, count(*)::integer as n
    from bucket.live_answers a join bucket.live_players p on p.id = a.player_id
    where a.room_id = p_room and a.idx = p_idx and not p.removed
    group by a.choice
  ) x on x.choice = o.choice
$$;

create or replace function bucket.live_open(p_room uuid, p_idx integer)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  q bucket.live_questions;
  win integer;
  tf numeric;
  g integer;
  t timestamptz := clock_timestamp();
  total integer;
begin
  select * into r from bucket.live_rooms where id = p_room;
  select * into q from bucket.live_questions where room_id = p_room and idx = p_idx;
  select count(*) into total from bucket.live_questions where room_id = p_room;
  win := bucket.live_setting(r, 'window_ms', 20000);
  select coalesce(max(time_factor), 1), coalesce(max(grace_ms), 0) into tf, g
  from bucket.live_players where room_id = p_room and not removed;
  update bucket.live_rooms
  set phase = 'question', idx = p_idx, opens_at = t,
      closes_at = t + make_interval(secs => win / 1000.0),
      next_at = t + make_interval(secs => (win * tf + g) / 1000.0)
  where id = p_room;
  return bucket.live_event(p_room, 'open', jsonb_build_object(
    'idx', q.idx, 'round', q.round, 'kind', q.kind, 'prompt', q.prompt, 'options', q.options, 'total', total,
    'opens_at', bucket.live_ms(t), 'closes_at', bucket.live_ms(t + make_interval(secs => win / 1000.0))
  ));
end $$;

create or replace function bucket.live_reveal(p_room uuid)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  q bucket.live_questions;
  win integer;
  right_n integer;
begin
  perform pg_advisory_xact_lock(bucket.live_answer_lock(p_room));
  select * into r from bucket.live_rooms where id = p_room;
  select * into q from bucket.live_questions where room_id = p_room and idx = r.idx;
  win := bucket.live_setting(r, 'window_ms', 20000);

  with s as (
    select p.id, p.streak,
      coalesce(a.choice = q.answer and a.received_at <= r.opens_at + make_interval(secs => (win * p.time_factor + p.grace_ms) / 1000.0), false) as correct,
      case when a.received_at is null then 0 else
        greatest(0, round(500 * (1 - greatest(0, extract(epoch from a.received_at - r.opens_at) * 1000 - p.grace_ms) / (win * p.time_factor))))::integer
      end as speed
    from bucket.live_players p
    left join bucket.live_answers a on a.room_id = p.room_id and a.idx = r.idx and a.player_id = p.id
    where p.room_id = p_room and not p.removed
  ), u as (
    update bucket.live_players p set streak = case when s.correct then s.streak + 1 else 0 end
    from s where p.id = s.id
    returning p.id, p.streak
  )
  insert into bucket.live_scores (room_id, idx, player_id, correct, points, bonus)
  select p_room, r.idx, s.id, s.correct,
    case when s.correct then 500 + s.speed else 0 end,
    case when s.correct and u.streak % 3 = 0 then 100 else 0 end
  from s join u on u.id = s.id
  on conflict do nothing;

  select count(*) into right_n from bucket.live_scores where room_id = p_room and idx = r.idx and correct;
  update bucket.live_rooms
  set phase = 'reveal', next_at = clock_timestamp() + make_interval(secs => bucket.live_setting(r, 'reveal_ms', 5000) / 1000.0)
  where id = p_room;
  return bucket.live_event(p_room, 'reveal', jsonb_build_object(
    'idx', r.idx, 'answer', q.answer, 'counts', bucket.live_counts(p_room, r.idx), 'right', right_n
  ));
end $$;

create or replace function bucket.live_finale(p_room uuid)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  improved jsonb;
  missed jsonb;
begin
  select jsonb_build_object('player_id', t.id, 'nickname', t.nickname_key, 'delta', t.delta) into improved
  from (
    select p.id, p.nickname_key,
      coalesce(sum(s.points + s.bonus) filter (where q.round = 3), 0) - coalesce(sum(s.points + s.bonus) filter (where q.round = 1), 0) as delta
    from bucket.live_players p
    join bucket.live_scores s on s.player_id = p.id
    join bucket.live_questions q on q.room_id = s.room_id and q.idx = s.idx
    where p.room_id = p_room and not p.removed
    group by p.id, p.nickname_key
    having bool_or(q.round = 3) and bool_or(q.round = 1)
    order by delta desc, p.nickname_key
    limit 1
  ) t;

  select jsonb_build_object('idx', q.idx, 'prompt', q.prompt, 'options', q.options, 'answer', q.answer, 'right_rate', t.rate) into missed
  from (
    select s.idx, round(avg(s.correct::integer)::numeric, 3) as rate
    from bucket.live_scores s join bucket.live_players p on p.id = s.player_id
    where s.room_id = p_room and not p.removed
    group by s.idx
    order by rate, s.idx
    limit 1
  ) t join bucket.live_questions q on q.room_id = p_room and q.idx = t.idx;

  update bucket.live_rooms set phase = 'finale', next_at = null where id = p_room;
  return bucket.live_event(p_room, 'finale', jsonb_build_object(
    'top', bucket.live_standings(p_room, 5), 'most_improved', improved, 'most_missed', missed
  ));
end $$;

create or replace function bucket.live_close(p_room uuid)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
begin
  update bucket.live_rooms set phase = 'closed', closed_at = clock_timestamp(), next_at = null, paused_at = null where id = p_room;
  return bucket.live_event(p_room, 'closed', jsonb_build_object('top', bucket.live_standings(p_room, 5)));
end $$;

create or replace function bucket.live_advance(p_room uuid)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  total integer;
  per_round integer;
begin
  select * into r from bucket.live_rooms where id = p_room;
  select count(*) into total from bucket.live_questions where room_id = p_room;
  per_round := bucket.live_setting(r, 'per_round', 5);
  if r.phase = 'board' then
    return bucket.live_open(p_room, r.idx + 1);
  end if;
  if r.idx >= total - 1 then
    return bucket.live_finale(p_room);
  end if;
  if (r.idx + 1) % per_round = 0 then
    update bucket.live_rooms
    set phase = 'board', next_at = clock_timestamp() + make_interval(secs => bucket.live_setting(r, 'board_ms', 10000) / 1000.0)
    where id = p_room;
    return bucket.live_event(p_room, 'board', jsonb_build_object(
      'round', (r.idx / per_round) + 1, 'standings', bucket.live_standings(p_room, 10)
    ));
  end if;
  return bucket.live_open(p_room, r.idx + 1);
end $$;

create or replace function bucket.live_answer_lock(p_room uuid)
returns bigint language sql immutable as $$
  select hashtextextended('bucket.live.answers:' || p_room::text, 0)
$$;

create or replace function bucket.live_take(p_key text, p_limit integer)
returns boolean language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  n integer;
begin
  insert into bucket.live_limits (bucket_key, minute, hits)
  values (p_key, date_trunc('minute', clock_timestamp()), 1)
  on conflict (bucket_key, minute) do update set hits = bucket.live_limits.hits + 1
  returning hits into n;
  return n <= p_limit;
end $$;

create or replace function bucket.live_full(p_key text, p_limit integer)
returns boolean language sql stable security definer set search_path = bucket, pg_temp as $$
  select coalesce((select hits >= p_limit from bucket.live_limits where bucket_key = p_key and minute = date_trunc('minute', clock_timestamp())), false)
$$;

create or replace function bucket.live_step(p_room uuid)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  ev jsonb := '[]'::jsonb;
  act text;
  active integer;
  answered integer;
begin
  for i in 1..4 loop
    select * into r from bucket.live_rooms where id = p_room;
    exit when not found or r.phase = 'closed';
    act := null;
    if clock_timestamp() >= r.expires_at then
      act := 'close';
    elsif r.paused_at is not null then
      exit;
    elsif r.phase = 'lobby' then
      if r.probe_at is null or clock_timestamp() >= r.probe_at + interval '5 seconds' then
        act := 'probe';
      end if;
    elsif r.phase = 'question' then
      if clock_timestamp() >= r.next_at then
        act := 'reveal';
      else
        select count(*) into active from bucket.live_players where room_id = p_room and not removed;
        select count(*) into answered from bucket.live_answers a join bucket.live_players p on p.id = a.player_id
        where a.room_id = p_room and a.idx = r.idx and not p.removed;
        if active > 0 and answered >= active then
          act := 'reveal';
        end if;
      end if;
    elsif r.phase in ('reveal', 'board') and clock_timestamp() >= r.next_at then
      act := 'advance';
    end if;
    exit when act is null;

    update bucket.live_rooms set seq = seq
    where id = p_room and seq = r.seq and phase = r.phase and paused_at is null;
    exit when not found;

    if act = 'close' then
      ev := ev || bucket.live_close(p_room);
      exit;
    elsif act = 'probe' then
      update bucket.live_rooms set probe_at = clock_timestamp() where id = p_room;
      ev := ev || bucket.live_event(p_room, 'probe', '{}'::jsonb);
      exit;
    elsif act = 'reveal' then
      ev := ev || bucket.live_reveal(p_room);
    else
      ev := ev || bucket.live_advance(p_room);
    end if;
  end loop;
  return ev;
end $$;

create or replace function bucket.live_wrap(p_room uuid, p_events jsonb, p_extra jsonb)
returns jsonb language sql stable security definer set search_path = bucket, pg_temp as $$
  select coalesce(p_extra, '{}'::jsonb) || jsonb_build_object('room_id', r.id, 'topic', r.topic, 'sign_key', r.sign_key, 'events', p_events)
  from bucket.live_rooms r where r.id = p_room
$$;

create or replace function bucket.live_tick(p_room uuid)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
begin
  if not exists (select 1 from bucket.live_rooms where id = p_room) then
    raise exception 'no_room';
  end if;
  return bucket.live_wrap(p_room, bucket.live_step(p_room), null);
end $$;

create or replace function bucket.live_create_room(
  p_id uuid, p_host uuid, p_code text, p_product text, p_settings jsonb, p_seed bigint,
  p_sign_key text, p_verify_key text, p_questions jsonb
)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  s jsonb := coalesce(p_settings, '{}'::jsonb);
begin
  if jsonb_typeof(s) <> 'object'
    or coalesce((s ->> 'rounds')::integer, 3) not between 1 and 3
    or coalesce((s ->> 'per_round')::integer, 5) not between 1 and 10
    or coalesce((s ->> 'window_ms')::integer, 20000) not between 5000 and 60000
    or coalesce((s ->> 'reveal_ms')::integer, 5000) not between 1000 and 30000
    or coalesce((s ->> 'board_ms')::integer, 10000) not between 1000 and 60000
    or jsonb_typeof(p_questions) <> 'array'
    or jsonb_array_length(p_questions) <> coalesce((s ->> 'rounds')::integer, 3) * coalesce((s ->> 'per_round')::integer, 5)
  then
    raise exception 'bad_settings';
  end if;
  perform pg_advisory_xact_lock(hashtext('bucket.live.host:' || p_host::text));
  if (select count(*) from bucket.live_rooms where host_user = p_host and closed_at is null and expires_at > clock_timestamp()) >= 3 then
    raise exception 'too_many_rooms';
  end if;
  begin
    insert into bucket.live_rooms (id, host_user, code, product, settings, seed, sign_key, verify_key)
    values (p_id, p_host, p_code, p_product, s, p_seed, p_sign_key, p_verify_key)
    returning * into r;
  exception when unique_violation then
    raise exception 'code_taken';
  end;
  insert into bucket.live_questions (room_id, idx, round, kind, prompt, options, answer)
  select p_id, x.idx, x.round, x.kind, x.prompt, x.options, x.answer
  from jsonb_to_recordset(p_questions) as x (idx integer, round smallint, kind text, prompt jsonb, options jsonb, answer smallint);
  return jsonb_build_object('room_id', r.id, 'code', r.code, 'topic', r.topic, 'expires_at', bucket.live_ms(r.expires_at), 'verify_key', r.verify_key);
end $$;

create or replace function bucket.live_join(p_code text, p_nickname text, p_ip text)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  ev jsonb;
  pid uuid;
begin
  if bucket.live_full('miss:' || p_ip, 60) then
    return jsonb_build_object('error', 'slow_down', 'events', '[]'::jsonb);
  end if;
  select * into r from bucket.live_rooms where code = p_code and closed_at is null;
  if not found or r.phase = 'finale' then
    perform bucket.live_take('miss:' || p_ip, 60);
    return jsonb_build_object('error', 'no_room', 'events', '[]'::jsonb);
  end if;
  if not bucket.live_take('join:' || r.id::text, 150) then
    return bucket.live_wrap(r.id, '[]'::jsonb, jsonb_build_object('error', 'slow_down'));
  end if;
  ev := bucket.live_step(r.id);
  select * into r from bucket.live_rooms where id = r.id;
  if r.phase in ('finale', 'closed') then
    return bucket.live_wrap(r.id, ev, jsonb_build_object('error', 'no_room'));
  end if;
  if r.locked then
    return bucket.live_wrap(r.id, ev, jsonb_build_object('error', 'locked'));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('bucket.live.join:' || r.id::text, 0));
  if (select count(*) from bucket.live_players where room_id = r.id and not removed) >= 100 then
    return bucket.live_wrap(r.id, ev, jsonb_build_object('error', 'room_full'));
  end if;
  begin
    insert into bucket.live_players (room_id, nickname_key) values (r.id, p_nickname) returning id into pid;
  exception when unique_violation then
    return bucket.live_wrap(r.id, ev, jsonb_build_object('error', 'name_taken'));
  end;
  return bucket.live_wrap(r.id, ev, jsonb_build_object(
    'player_id', pid, 'token_version', r.token_version, 'expires_at', bucket.live_ms(r.expires_at), 'verify_key', r.verify_key
  ));
end $$;

create or replace function bucket.live_snapshot(p_room uuid, p_player uuid, p_host boolean)
returns jsonb language plpgsql stable security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  q bucket.live_questions;
  p bucket.live_players;
  out jsonb;
begin
  select * into r from bucket.live_rooms where id = p_room;
  select * into q from bucket.live_questions where room_id = p_room and idx = r.idx;
  out := jsonb_build_object(
    'server_now', bucket.live_ms(clock_timestamp()),
    'room', jsonb_build_object(
      'id', r.id, 'code', r.code, 'product', r.product, 'mode', r.mode, 'school_mode', r.school_mode, 'locked', r.locked,
      'phase', r.phase, 'idx', r.idx, 'seq', r.seq, 'token_version', r.token_version, 'verify_key', r.verify_key,
      'opens_at', bucket.live_ms(r.opens_at), 'closes_at', bucket.live_ms(r.closes_at), 'next_at', bucket.live_ms(r.next_at),
      'paused', r.paused_at is not null, 'expires_at', bucket.live_ms(r.expires_at),
      'total', (select count(*) from bucket.live_questions where room_id = p_room),
      'players', (select count(*) from bucket.live_players where room_id = p_room and not removed)
    ),
    'standings', bucket.live_standings(p_room, 10)
  );
  if q.idx is not null then
    out := out || jsonb_build_object('question', jsonb_build_object(
      'idx', q.idx, 'round', q.round, 'kind', q.kind, 'prompt', q.prompt, 'options', q.options,
      'answer', case when r.phase = 'question' then null else q.answer end,
      'counts', case when r.phase = 'question' then null else bucket.live_counts(p_room, q.idx) end
    ));
  end if;
  if p_host then
    out := out || jsonb_build_object(
      'answered', (select count(*) from bucket.live_answers a join bucket.live_players x on x.id = a.player_id
                   where a.room_id = p_room and a.idx = r.idx and not x.removed),
      'roster', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nickname', x.nickname_key, 'team_slot', x.team_slot,
                   'time_factor', x.time_factor, 'grace_ms', x.grace_ms) order by x.joined_at), '[]'::jsonb)
                 from bucket.live_players x where x.room_id = p_room and not x.removed)
    );
  end if;
  if p_player is not null then
    select * into p from bucket.live_players where id = p_player and room_id = p_room;
    if found then
      out := out || jsonb_build_object('player', jsonb_build_object(
        'id', p.id, 'nickname', p.nickname_key, 'removed', p.removed, 'grace_ms', p.grace_ms, 'time_factor', p.time_factor,
        'streak', p.streak,
        'points', (select coalesce(sum(s.points + s.bonus), 0) from bucket.live_scores s where s.player_id = p.id),
        'choice', (select a.choice from bucket.live_answers a where a.room_id = p_room and a.idx = r.idx and a.player_id = p.id)
      ));
    end if;
  end if;
  return out;
end $$;

create or replace function bucket.live_state(p_room uuid, p_player uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
begin
  select * into r from bucket.live_rooms where id = p_room;
  if not found then
    raise exception 'no_room';
  end if;
  if p_host is not null and r.host_user <> p_host then
    raise exception 'not_host';
  end if;
  if not bucket.live_take(case when p_host is not null then 'host:' || p_room::text else 'player:' || coalesce(p_player::text, '') end,
                          case when p_host is not null then 300 else 120 end) then
    return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('error', 'slow_down'));
  end if;
  return bucket.live_wrap(p_room, bucket.live_step(p_room), bucket.live_snapshot(p_room, p_player, p_host is not null));
end $$;

create or replace function bucket.live_answer(p_room uuid, p_player uuid, p_tv integer, p_idx integer, p_choice smallint)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  p bucket.live_players;
  t timestamptz := clock_timestamp();
begin
  perform pg_advisory_xact_lock_shared(bucket.live_answer_lock(p_room));
  select * into r from bucket.live_rooms where id = p_room;
  if not found then
    raise exception 'no_room';
  end if;
  select * into p from bucket.live_players where id = p_player and room_id = p_room;
  if not found or p.removed then
    raise exception 'removed';
  end if;
  if p_tv <> r.token_version then
    raise exception 'stale_token';
  end if;
  if not bucket.live_take('player:' || p_player::text, 120) then
    return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('error', 'slow_down'));
  end if;
  if r.phase <> 'question' or r.idx <> p_idx then
    return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('error', 'not_open'));
  end if;
  if r.paused_at is not null then
    return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('error', 'paused'));
  end if;
  if t > r.opens_at + make_interval(secs => (bucket.live_setting(r, 'window_ms', 20000) * p.time_factor + p.grace_ms) / 1000.0) then
    return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('error', 'late'));
  end if;
  insert into bucket.live_answers (room_id, idx, player_id, choice, received_at)
  values (p_room, p_idx, p_player, p_choice, t)
  on conflict do nothing;
  if not found then
    return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('error', 'duplicate'));
  end if;
  return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('received_at', bucket.live_ms(t)));
end $$;

create or replace function bucket.live_rotate(p_room uuid)
returns boolean language plpgsql security definer set search_path = bucket, pg_temp as $$
begin
  update bucket.live_rooms set topic = gen_random_uuid(), rotated_at = clock_timestamp()
  where id = p_room and (rotated_at is null or rotated_at <= clock_timestamp() - interval '2 minutes');
  if not found then
    return false;
  end if;
  delete from bucket.live_reports where room_id = p_room;
  return true;
end $$;

create or replace function bucket.live_probe(p_room uuid, p_player uuid, p_tv integer, p_grace integer, p_failed boolean)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  p bucket.live_players;
  rotated boolean := false;
  reporters integer;
  active integer;
begin
  select * into r from bucket.live_rooms where id = p_room;
  if not found then
    raise exception 'no_room';
  end if;
  select * into p from bucket.live_players where id = p_player and room_id = p_room;
  if not found or p.removed then
    raise exception 'removed';
  end if;
  if p_tv <> r.token_version then
    raise exception 'stale_token';
  end if;
  if not bucket.live_take('player:' || p_player::text, 120) then
    return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('error', 'slow_down'));
  end if;
  if p_grace is not null and r.phase = 'lobby' then
    update bucket.live_players set grace_ms = least(1000, greatest(0, p_grace)) where id = p_player;
  end if;
  if coalesce(p_failed, false) then
    insert into bucket.live_reports (room_id, player_id, reported_at) values (p_room, p_player, clock_timestamp())
    on conflict (room_id, player_id) do update set reported_at = excluded.reported_at;
    select count(*) into reporters from bucket.live_reports x join bucket.live_players y on y.id = x.player_id
    where x.room_id = p_room and not y.removed and x.reported_at > clock_timestamp() - interval '30 seconds';
    select count(*) into active from bucket.live_players where room_id = p_room and not removed;
    if reporters >= greatest(3, ceil(0.2 * active)) then
      rotated := bucket.live_rotate(p_room);
    end if;
  end if;
  return bucket.live_wrap(p_room, bucket.live_step(p_room), jsonb_build_object('rotated', rotated));
end $$;

create or replace function bucket.live_host(p_room uuid, p_host uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  ev jsonb;
  shift interval;
begin
  select * into r from bucket.live_rooms where id = p_room;
  if not found then
    raise exception 'no_room';
  end if;
  if r.host_user <> p_host then
    raise exception 'not_host';
  end if;
  ev := bucket.live_step(p_room);
  select * into r from bucket.live_rooms where id = p_room for update;
  if r.phase = 'closed' then
    return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'closed'));
  end if;
  if p_action = 'start' then
    if r.phase <> 'lobby' then
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'bad_phase'));
    end if;
    ev := ev || bucket.live_open(p_room, 0);
  elsif p_action = 'pause' then
    if r.phase not in ('question', 'reveal', 'board') or r.paused_at is not null then
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'bad_phase'));
    end if;
    update bucket.live_rooms set paused_at = clock_timestamp() where id = p_room;
    ev := ev || bucket.live_event(p_room, 'pause', jsonb_build_object('idx', r.idx));
  elsif p_action = 'resume' then
    if r.paused_at is null then
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'bad_phase'));
    end if;
    shift := clock_timestamp() - r.paused_at;
    update bucket.live_rooms
    set paused_at = null, opens_at = opens_at + shift, closes_at = closes_at + shift, next_at = next_at + shift
    where id = p_room returning * into r;
    ev := ev || bucket.live_event(p_room, 'resume', jsonb_build_object(
      'idx', r.idx, 'phase', r.phase, 'opens_at', bucket.live_ms(r.opens_at), 'closes_at', bucket.live_ms(r.closes_at), 'next_at', bucket.live_ms(r.next_at)
    ));
  elsif p_action = 'skip' then
    if r.paused_at is not null then
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'paused'));
    end if;
    if r.phase = 'question' then
      ev := ev || bucket.live_reveal(p_room);
    elsif r.phase in ('reveal', 'board') then
      ev := ev || bucket.live_advance(p_room);
    else
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'bad_phase'));
    end if;
  elsif p_action = 'end' then
    ev := ev || bucket.live_close(p_room);
  elsif p_action in ('lock', 'unlock') then
    update bucket.live_rooms set locked = (p_action = 'lock') where id = p_room;
  elsif p_action = 'kick_all' then
    update bucket.live_players set removed = true where room_id = p_room and not removed;
    update bucket.live_rooms set token_version = token_version + 1 where id = p_room;
  elsif p_action = 'rotate' then
    if not bucket.live_rotate(p_room) then
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'too_soon'));
    end if;
  else
    raise exception 'bad_action';
  end if;
  return bucket.live_wrap(p_room, ev, null);
end $$;

create or replace function bucket.live_player_admin(p_room uuid, p_host uuid, p_player uuid, p_action text, p_value text)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  p bucket.live_players;
  ev jsonb;
begin
  select * into r from bucket.live_rooms where id = p_room;
  if not found then
    raise exception 'no_room';
  end if;
  if r.host_user <> p_host then
    raise exception 'not_host';
  end if;
  select * into p from bucket.live_players where id = p_player and room_id = p_room and not removed;
  if not found then
    return bucket.live_wrap(p_room, '[]'::jsonb, jsonb_build_object('error', 'no_player'));
  end if;
  ev := bucket.live_step(p_room);
  if p_action = 'remove' then
    update bucket.live_players set removed = true where id = p_player;
  elsif p_action = 'rename' then
    begin
      update bucket.live_players set nickname_key = p_value where id = p_player;
    exception when unique_violation then
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'name_taken'));
    end;
  elsif p_action = 'time' then
    update bucket.live_players set time_factor = p_value::numeric where id = p_player returning * into p;
    select * into r from bucket.live_rooms where id = p_room;
    if r.phase = 'question' then
      update bucket.live_rooms
      set next_at = greatest(next_at, opens_at + make_interval(secs => (bucket.live_setting(r, 'window_ms', 20000) * p.time_factor + p.grace_ms) / 1000.0))
      where id = p_room;
    end if;
  elsif p_action = 'move' then
    update bucket.live_players set team_slot = p_value::smallint where id = p_player;
  else
    raise exception 'bad_action';
  end if;
  return bucket.live_wrap(p_room, ev, jsonb_build_object('token_version', (select token_version from bucket.live_rooms where id = p_room)));
end $$;

create or replace function bucket.live_due()
returns setof uuid language sql stable security definer set search_path = bucket, pg_temp as $$
  select id from bucket.live_rooms
  where closed_at is null and ((paused_at is null and next_at <= clock_timestamp()) or expires_at <= clock_timestamp())
  order by next_at nulls first
  limit 50
$$;

revoke all on function
  bucket.live_ms(timestamptz), bucket.live_setting(bucket.live_rooms, text, integer), bucket.live_event(uuid, text, jsonb),
  bucket.live_standings(uuid, integer), bucket.live_counts(uuid, integer), bucket.live_open(uuid, integer),
  bucket.live_reveal(uuid), bucket.live_finale(uuid), bucket.live_close(uuid), bucket.live_advance(uuid),
  bucket.live_answer_lock(uuid), bucket.live_take(text, integer), bucket.live_full(text, integer), bucket.live_rotate(uuid),
  bucket.live_step(uuid), bucket.live_wrap(uuid, jsonb, jsonb), bucket.live_snapshot(uuid, uuid, boolean),
  bucket.live_tick(uuid), bucket.live_create_room(uuid, uuid, text, text, jsonb, bigint, text, text, jsonb),
  bucket.live_join(text, text, text), bucket.live_state(uuid, uuid, uuid), bucket.live_answer(uuid, uuid, integer, integer, smallint),
  bucket.live_probe(uuid, uuid, integer, integer, boolean), bucket.live_host(uuid, uuid, text),
  bucket.live_player_admin(uuid, uuid, uuid, text, text), bucket.live_due()
from public, anon, authenticated, service_role;

grant usage on schema bucket to service_role;
grant execute on function
  bucket.live_tick(uuid), bucket.live_create_room(uuid, uuid, text, text, jsonb, bigint, text, text, jsonb),
  bucket.live_join(text, text, text), bucket.live_state(uuid, uuid, uuid), bucket.live_answer(uuid, uuid, integer, integer, smallint),
  bucket.live_probe(uuid, uuid, integer, integer, boolean), bucket.live_host(uuid, uuid, text),
  bucket.live_player_admin(uuid, uuid, uuid, text, text), bucket.live_due()
to service_role;
