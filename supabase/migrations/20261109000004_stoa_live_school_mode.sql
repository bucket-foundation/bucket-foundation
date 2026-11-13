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
    insert into bucket.live_rooms (id, host_user, code, product, settings, seed, sign_key, verify_key, school_mode)
    values (p_id, p_host, p_code, p_product, s, p_seed, p_sign_key, p_verify_key, coalesce((s ->> 'school_mode')::boolean, false))
    returning * into r;
  exception when unique_violation then
    raise exception 'code_taken';
  end;
  insert into bucket.live_questions (room_id, idx, round, kind, prompt, options, answer)
  select p_id, x.idx, x.round, x.kind, x.prompt, x.options, x.answer
  from jsonb_to_recordset(p_questions) as x (idx integer, round smallint, kind text, prompt jsonb, options jsonb, answer smallint);
  return jsonb_build_object('room_id', r.id, 'code', r.code, 'topic', r.topic, 'expires_at', bucket.live_ms(r.expires_at), 'verify_key', r.verify_key);
end $$;

revoke all on function bucket.live_create_room(uuid, uuid, text, text, jsonb, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function bucket.live_create_room(uuid, uuid, text, text, jsonb, bigint, text, text, jsonb) to service_role;
