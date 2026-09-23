create or replace function graph.restore_withdrawn_node(
  p_node     uuid,
  p_reviewer uuid
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_q      graph.medallion_withdrawn_nodes;
  v_active boolean;
  v_revived integer;
begin
  if p_reviewer is null then
    raise exception 'restore_withdrawn_node: a reviewer is required' using errcode = '22023';
  end if;

  select * into v_q from graph.medallion_withdrawn_nodes where node_id = p_node for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_queued');
  end if;
  if v_q.reviewed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_reviewed');
  end if;

  select exists (
    select 1 from graph.evidence_source_admissions
    where source_id = v_q.source_id and status = 'active'
  ) into v_active;
  if not v_active then
    return jsonb_build_object('ok', false, 'error', 'source_withdrawn');
  end if;

  with revived as (
    update graph.silver_items s
      set status = case when exists (select 1 from graph.gold_lineage l where l.silver_item_id = s.id) then 'promoted' else 'candidate' end
      where s.status = 'withdrawn'
        and exists (
          select 1 from graph.evidence_source_admissions a
          where a.source_id = s.source_id and a.source_revision = s.source_revision and a.status = 'active'
        )
        and s.id in (select l.silver_item_id from graph.gold_lineage l where l.node_id = p_node)
      returning s.id
  )
  select count(*) into v_revived from revived;

  update graph.nodes set visibility = v_q.prior_visibility where id = p_node;
  update graph.medallion_withdrawn_nodes set reviewed_at = now(), reviewer_id = p_reviewer where node_id = p_node;

  return jsonb_build_object('ok', true, 'visibility', v_q.prior_visibility, 'silver_revived', v_revived);
end;
$$;

revoke all on function graph.restore_withdrawn_node(uuid, uuid) from public, anon, authenticated;
grant execute on function graph.restore_withdrawn_node(uuid, uuid) to service_role;
