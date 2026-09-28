create or replace function graph.prefer_history_factoid(
  p_silver uuid,
  p_role   text
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_f graph.factoids;
begin
  if p_silver is null or p_role is null then
    raise exception 'prefer_history_factoid: a silver item and a role are required' using errcode = '22023';
  end if;
  select * into v_f from graph.factoids where silver_item_id = p_silver and role = p_role for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'factoid_not_found');
  end if;
  if v_f.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;
  if v_f.preferred then
    return jsonb_build_object('ok', true, 'changed', false, 'factoid', v_f.id);
  end if;
  perform pg_advisory_xact_lock(hashtext('graph.factoids'), hashtext(v_f.subject_id::text || ' ' || p_role));
  update graph.factoids set preferred = false
    where subject_id = v_f.subject_id and role = p_role and preferred and status = 'active' and id <> v_f.id;
  update graph.factoids set preferred = true where id = v_f.id;
  return jsonb_build_object('ok', true, 'changed', true, 'factoid', v_f.id);
end;
$$;

revoke all on function graph.prefer_history_factoid(uuid, text) from public, anon, authenticated;
grant execute on function graph.prefer_history_factoid(uuid, text) to service_role;
