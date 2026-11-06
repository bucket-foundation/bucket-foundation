alter table bucket.live_rooms add column if not exists topic_history jsonb not null default '[]'::jsonb;

drop function if exists bucket.live_rotate(uuid);

create or replace function bucket.live_rotate(p_room uuid, p_force boolean)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  ev jsonb;
begin
  update bucket.live_rooms
  set topic_history = (
        select coalesce(jsonb_agg(h order by (h ->> 'until') desc), '[]'::jsonb)
        from (
          select h from jsonb_array_elements(
            jsonb_build_array(jsonb_build_object('topic', topic, 'until', bucket.live_ms(clock_timestamp() + interval '60 seconds'))) || topic_history
          ) h
          where (h ->> 'until')::bigint > bucket.live_ms(clock_timestamp())
          order by (h ->> 'until')::bigint desc
          limit 3
        ) kept
      ),
      topic = gen_random_uuid(), rotated_at = clock_timestamp()
  where id = p_room and (p_force or rotated_at is null or rotated_at <= clock_timestamp() - interval '2 minutes');
  if not found then
    return null;
  end if;
  delete from bucket.live_reports where room_id = p_room;
  ev := bucket.live_event(p_room, 'rotate', '{}'::jsonb);
  return jsonb_build_array(ev);
end $$;

create or replace function bucket.live_wrap(p_room uuid, p_events jsonb, p_extra jsonb)
returns jsonb language sql volatile security definer set search_path = bucket, pg_temp as $$
  select coalesce(p_extra, '{}'::jsonb) || jsonb_build_object('room_id', r.id, 'topic', r.topic, 'sign_key', r.sign_key, 'events', p_events,
    'topics', jsonb_build_array(r.topic) || coalesce((
      select jsonb_agg(h -> 'topic' order by (h ->> 'until')::bigint desc)
      from jsonb_array_elements(r.topic_history) h
      where (h ->> 'until')::bigint > bucket.live_ms(clock_timestamp())
    ), '[]'::jsonb))
  from bucket.live_rooms r where r.id = p_room
$$;

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
  begin
    insert into bucket.live_players (room_id, nickname_key) values (r.id, p_nickname) returning id into pid;
  exception when unique_violation then
    return bucket.live_wrap(r.id, ev, jsonb_build_object('error', 'name_taken'));
  end;
  return bucket.live_wrap(r.id, ev, jsonb_build_object(
    'player_id', pid, 'token_version', r.token_version, 'expires_at', bucket.live_ms(r.expires_at), 'verify_key', r.verify_key
  ));
end $$;

create or replace function bucket.live_probe(p_room uuid, p_player uuid, p_tv integer, p_grace integer, p_failed boolean)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
  p bucket.live_players;
  rotated jsonb;
  ev jsonb;
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
    ev := bucket.live_step(p_room);
    if reporters >= greatest(3, ceil(0.2 * active)) then
      rotated := bucket.live_rotate(p_room, false);
    end if;
    return bucket.live_wrap(p_room, ev || coalesce(rotated, '[]'::jsonb), jsonb_build_object('rotated', rotated is not null));
  end if;
  return bucket.live_wrap(p_room, bucket.live_step(p_room), jsonb_build_object('rotated', false));
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
    ev := ev || bucket.live_rotate(p_room, true);
  else
    raise exception 'bad_action';
  end if;
  return bucket.live_wrap(p_room, ev, null);
end $$;


revoke all on function bucket.live_rotate(uuid, boolean), bucket.live_wrap(uuid, jsonb, jsonb) from public, anon, authenticated, service_role;
revoke all on function bucket.live_join(text, text, text), bucket.live_probe(uuid, uuid, integer, integer, boolean), bucket.live_host(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function bucket.live_join(text, text, text), bucket.live_probe(uuid, uuid, integer, integer, boolean), bucket.live_host(uuid, uuid, text)
  to service_role;
