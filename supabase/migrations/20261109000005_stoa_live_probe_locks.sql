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
  ev := bucket.live_step(p_room);
  select * into r from bucket.live_rooms where id = p_room;
  if p_grace is not null and r.phase = 'lobby' then
    update bucket.live_players set grace_ms = least(1000, greatest(0, p_grace)) where id = p_player;
  end if;
  if not coalesce(p_failed, false) then
    return bucket.live_wrap(p_room, ev, jsonb_build_object('rotated', false));
  end if;
  perform 1 from bucket.live_rooms where id = p_room for update;
  insert into bucket.live_reports (room_id, player_id, reported_at) values (p_room, p_player, clock_timestamp())
  on conflict (room_id, player_id) do update set reported_at = excluded.reported_at;
  select count(*) into reporters from bucket.live_reports x join bucket.live_players y on y.id = x.player_id
  where x.room_id = p_room and not y.removed
    and x.reported_at > clock_timestamp() - interval '30 seconds';
  select count(*) into active from bucket.live_players where room_id = p_room and not removed;
  if reporters >= greatest(3, ceil(0.2 * active)) then
    rotated := bucket.live_rotate(p_room, false);
  end if;
  return bucket.live_wrap(p_room, ev || coalesce(rotated, '[]'::jsonb), jsonb_build_object('rotated', rotated is not null));
end $$;

revoke all on function bucket.live_probe(uuid, uuid, integer, integer, boolean) from public, anon, authenticated;
grant execute on function bucket.live_probe(uuid, uuid, integer, integer, boolean) to service_role;
