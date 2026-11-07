create or replace function bucket.live_team_count(r bucket.live_rooms)
returns integer language sql immutable as $$
  select case when r.mode = 'chorus' then coalesce((r.settings ->> 'teams')::integer, 2) else 0 end
$$;

create or replace function bucket.live_team_standings(p_room uuid)
returns jsonb language sql stable security definer set search_path = bucket, pg_temp as $$
  with room as (
    select * from bucket.live_rooms where id = p_room
  ), teams as (
    select g as slot from room r, generate_series(0, bucket.live_team_count(r) - 1) g
  ), per_question as (
    select p.team_slot as slot, s.idx, avg(s.points + s.bonus) as mean, avg(s.correct::integer) as right_rate
    from bucket.live_scores s join bucket.live_players p on p.id = s.player_id
    where s.room_id = p_room and not p.removed and p.team_slot is not null
    group by p.team_slot, s.idx
  ), totals as (
    select slot, round(sum(mean))::integer as mean_points, count(*) filter (where right_rate >= 0.8)::integer as unisons
    from per_question group by slot
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'team', t.slot,
      'points', coalesce(x.mean_points, 0) + 150 * coalesce(x.unisons, 0),
      'unisons', coalesce(x.unisons, 0),
      'members', (select count(*) from bucket.live_players p where p.room_id = p_room and not p.removed and p.team_slot = t.slot)
    ) order by coalesce(x.mean_points, 0) + 150 * coalesce(x.unisons, 0) desc, t.slot), '[]'::jsonb)
  from teams t left join totals x on x.slot = t.slot
$$;

create or replace function bucket.live_create_room(
  p_id uuid, p_host uuid, p_code text, p_product text, p_settings jsonb, p_seed bigint,
  p_sign_key text, p_verify_key text, p_questions jsonb
)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  s jsonb := coalesce(p_settings, '{}'::jsonb);
  m text := coalesce(s ->> 'mode', 'open_floor');
begin
  if jsonb_typeof(s) <> 'object'
    or coalesce((s ->> 'rounds')::integer, 3) not between 1 and 3
    or coalesce((s ->> 'per_round')::integer, 5) not between 1 and 10
    or coalesce((s ->> 'window_ms')::integer, 20000) not between 5000 and 60000
    or coalesce((s ->> 'reveal_ms')::integer, 5000) not between 1000 and 30000
    or coalesce((s ->> 'board_ms')::integer, 10000) not between 1000 and 60000
    or m not in ('open_floor', 'chorus')
    or (m = 'chorus' and coalesce((s ->> 'teams')::integer, 2) not between 2 and 4)
    or (m = 'open_floor' and s ? 'teams')
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
    insert into bucket.live_rooms (id, host_user, code, product, settings, seed, sign_key, verify_key, school_mode, mode)
    values (p_id, p_host, p_code, p_product, s, p_seed, p_sign_key, p_verify_key, coalesce((s ->> 'school_mode')::boolean, false), m)
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
  slot smallint;
begin
  if bucket.live_full('miss:' || p_ip, 60) then
    return jsonb_build_object('error', 'slow_down', 'events', '[]'::jsonb);
  end if;
  select * into r from bucket.live_rooms where code = p_code and closed_at is null;
  if not found or r.phase = 'finale' then
    perform bucket.live_take('miss:' || p_ip, 60);
    return jsonb_build_object('error', 'no_room', 'events', '[]'::jsonb);
  end if;
  if not bucket.live_take('joinip:' || r.id::text || ':' || p_ip, 60) or not bucket.live_take('join:' || r.id::text, 150) then
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
  if r.mode = 'chorus' then
    select g into slot
    from generate_series(0, bucket.live_team_count(r) - 1) g
    order by (select count(*) from bucket.live_players x where x.room_id = r.id and not x.removed and x.team_slot = g), g
    limit 1;
  end if;
  begin
    insert into bucket.live_players (room_id, nickname_key, team_slot) values (r.id, p_nickname, slot) returning id into pid;
  exception when unique_violation then
    return bucket.live_wrap(r.id, ev, jsonb_build_object('error', 'name_taken'));
  end;
  return bucket.live_wrap(r.id, ev, jsonb_build_object(
    'player_id', pid, 'token_version', r.token_version, 'expires_at', bucket.live_ms(r.expires_at), 'verify_key', r.verify_key, 'team_slot', slot
  ));
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
    select * into r from bucket.live_rooms where id = p_room;
    if r.mode <> 'chorus' or r.phase <> 'lobby' then
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'bad_phase'));
    end if;
    if p_value::smallint not between 0 and bucket.live_team_count(r) - 1 then
      return bucket.live_wrap(p_room, ev, jsonb_build_object('error', 'team'));
    end if;
    update bucket.live_players set team_slot = p_value::smallint where id = p_player;
  else
    raise exception 'bad_action';
  end if;
  return bucket.live_wrap(p_room, ev, jsonb_build_object('token_version', (select token_version from bucket.live_rooms where id = p_room)));
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
      'id', r.id, 'code', r.code, 'product', r.product, 'mode', r.mode, 'teams', bucket.live_team_count(r), 'school_mode', r.school_mode, 'locked', r.locked,
      'phase', r.phase, 'idx', r.idx, 'seq', r.seq, 'token_version', r.token_version, 'verify_key', r.verify_key,
      'opens_at', bucket.live_ms(r.opens_at), 'closes_at', bucket.live_ms(r.closes_at), 'next_at', bucket.live_ms(r.next_at),
      'paused', r.paused_at is not null, 'expires_at', bucket.live_ms(r.expires_at),
      'total', (select count(*) from bucket.live_questions where room_id = p_room),
      'players', (select count(*) from bucket.live_players where room_id = p_room and not removed)
    ),
    'standings', bucket.live_standings(p_room, 10)
  );
  if r.mode = 'chorus' then
    out := out || jsonb_build_object('team_standings', bucket.live_team_standings(p_room));
  end if;
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
        'streak', p.streak, 'team_slot', p.team_slot,
        'points', (select coalesce(sum(s.points + s.bonus), 0) from bucket.live_scores s where s.player_id = p.id),
        'choice', (select a.choice from bucket.live_answers a where a.room_id = p_room and a.idx = r.idx and a.player_id = p.id)
      ));
    end if;
  end if;
  return out;
end $$;

revoke all on function bucket.live_team_count(bucket.live_rooms), bucket.live_team_standings(uuid), bucket.live_snapshot(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function bucket.live_create_room(uuid, uuid, text, text, jsonb, bigint, text, text, jsonb), bucket.live_join(text, text, text),
  bucket.live_player_admin(uuid, uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function bucket.live_create_room(uuid, uuid, text, text, jsonb, bigint, text, text, jsonb), bucket.live_join(text, text, text),
  bucket.live_player_admin(uuid, uuid, uuid, text, text)
  to service_role;
