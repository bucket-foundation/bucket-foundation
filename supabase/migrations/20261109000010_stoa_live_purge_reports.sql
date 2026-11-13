create or replace function bucket.live_purge()
returns integer language plpgsql security definer set search_path = bucket, pg_temp as $$
declare
  gone integer;
begin
  insert into bucket.live_summaries (room_id, host_user, product, created_at, closed_at, player_count, right_rate, top_nicknames)
  select r.id, r.host_user, r.product, r.created_at, coalesce(r.closed_at, r.expires_at),
    (select count(*) from bucket.live_players p where p.room_id = r.id and not p.removed),
    coalesce((
      select jsonb_agg(jsonb_build_object('idx', q.idx, 'right', (
        select round(avg(s.correct::int)::numeric, 3) from bucket.live_scores s where s.room_id = r.id and s.idx = q.idx
      )) order by q.idx)
      from bucket.live_questions q where q.room_id = r.id
    ), '[]'::jsonb),
    coalesce((
      select array_agg(t.nickname_key order by t.total desc, t.nickname_key)
      from (
        select p.nickname_key, sum(s.points + s.bonus) as total
        from bucket.live_players p join bucket.live_scores s on s.player_id = p.id
        where p.room_id = r.id and not p.removed
        group by p.id, p.nickname_key
        order by total desc, p.nickname_key
        limit 5
      ) t
    ), '{}')
  from bucket.live_rooms r
  where coalesce(r.closed_at, r.expires_at) < clock_timestamp() - interval '24 hours'
  on conflict (room_id) do nothing;

  delete from bucket.live_rooms r
  where coalesce(r.closed_at, r.expires_at) < clock_timestamp() - interval '24 hours';
  get diagnostics gone = row_count;
  delete from bucket.live_limits where minute < clock_timestamp() - interval '2 minutes';
  delete from bucket.live_reports where reported_at < clock_timestamp() - interval '2 minutes';
  return gone;
end $$;


revoke all on function bucket.live_purge() from public, anon, authenticated;
