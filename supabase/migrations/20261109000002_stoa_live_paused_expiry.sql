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
    where id = p_room and seq = r.seq and phase = r.phase and paused_at is not distinct from r.paused_at;
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

revoke all on function bucket.live_step(uuid) from public, anon, authenticated, service_role;
