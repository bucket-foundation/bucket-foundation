alter table bucket.learn_events drop constraint if exists learn_events_name_check;
alter table bucket.learn_events add constraint learn_events_name_check
  check (name in ('age_band_set', 'placement_done', 'study_session_done', 'assess_done', 'tutor_turn', 'exposure', 'session_mix'));

alter table graph.event_usage drop constraint if exists event_usage_name_check;
alter table graph.event_usage add constraint event_usage_name_check
  check (name in ('placement_done', 'study_session_done', 'assess_done', 'exposure', 'session_mix'));

create or replace function bucket.record_learn_events_batch(
  p_user_id uuid,
  p_events  jsonb,
  p_caps    jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_band    text;
  v_day     date := (pg_catalog.now() at time zone 'utc')::date;
  v_event   jsonb;
  v_name    text;
  v_id      uuid;
  v_used    jsonb := '{}'::jsonb;
  v_count   int;
  v_out     jsonb := '[]'::jsonb;
begin
  select lp.birth_year_bucket into v_band from graph.learner_profiles lp where lp.learner_id = p_user_id;
  if v_band is distinct from '18plus' then
    select coalesce(jsonb_agg(jsonb_build_object('id', e->>'event_id', 'outcome', 'refused')), '[]'::jsonb) into v_out from jsonb_array_elements(p_events) e;
    return v_out;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('learn_events_batch:' || p_user_id::text));

  for v_name in select distinct e->>'name' from jsonb_array_elements(p_events) e loop
    select count(*) into v_count from bucket.learn_events le
      where le.user_id = p_user_id and le.name = v_name and le.created_at >= v_day::timestamp at time zone 'utc';
    v_used := v_used || jsonb_build_object(v_name, v_count);
  end loop;

  for v_event in select * from jsonb_array_elements(p_events) loop
    v_name := v_event->>'name';
    v_id := (v_event->>'event_id')::uuid;
    if exists (select 1 from bucket.learn_events le where le.user_id = p_user_id and le.event_id = v_id) then
      v_out := v_out || jsonb_build_array(jsonb_build_object('id', v_id, 'outcome', 'duplicate'));
    elsif (v_used->>v_name)::int >= coalesce((p_caps->>v_name)::int, 0) then
      v_out := v_out || jsonb_build_array(jsonb_build_object('id', v_id, 'outcome', 'rate_limited'));
    else
      insert into bucket.learn_events (user_id, event_id, name, props, arm)
      values (p_user_id, v_id, v_name, coalesce(v_event->'props', '{}'::jsonb), v_event->>'arm');
      v_used := jsonb_set(v_used, array[v_name], to_jsonb((v_used->>v_name)::int + 1));
      v_out := v_out || jsonb_build_array(jsonb_build_object('id', v_id, 'outcome', 'recorded'));
    end if;
  end loop;
  return v_out;
end;
$$;

revoke all on function bucket.record_learn_events_batch(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function bucket.record_learn_events_batch(uuid, jsonb, jsonb) to service_role;
