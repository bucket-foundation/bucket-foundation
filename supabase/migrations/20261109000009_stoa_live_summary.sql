create or replace function bucket.live_summary(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  r bucket.live_rooms;
begin
  select * into r from bucket.live_rooms where id = p_room;
  if not found then
    raise exception 'no_room';
  end if;
  if r.host_user <> p_host then
    raise exception 'not_host';
  end if;
  if not bucket.live_take('host:' || p_room::text, 300) then
    return jsonb_build_object('error', 'slow_down');
  end if;
  return jsonb_build_object(
    'code', r.code,
    'phase', r.phase,
    'rows', (
      select coalesce(jsonb_agg(jsonb_build_object('nickname', t.nickname_key, 'points', t.total, 'correct', t.correct) order by t.total desc, t.nickname_key), '[]'::jsonb)
      from (
        select p.nickname_key, coalesce(sum(s.points + s.bonus), 0)::integer as total, count(*) filter (where s.correct)::integer as correct
        from bucket.live_players p left join bucket.live_scores s on s.player_id = p.id
        where p.room_id = p_room and not p.removed
        group by p.id, p.nickname_key
      ) t
    )
  );
end $$;

revoke all on function bucket.live_summary(uuid, uuid) from public, anon, authenticated;
grant execute on function bucket.live_summary(uuid, uuid) to service_role;
