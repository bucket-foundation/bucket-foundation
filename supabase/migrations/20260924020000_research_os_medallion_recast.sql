alter table graph.edge_proposals add column if not exists prior_edge jsonb;

alter table graph.edge_proposals drop constraint if exists edge_proposals_decided_kind_check;
alter table graph.edge_proposals add constraint edge_proposals_decided_kind_check
  check (decided_kind is null or decided_kind in ('prerequisite', 'derives_from', 'cites'));

create or replace function graph.recast_edge_to_cites(
  p_proposal uuid,
  p_reviewer uuid,
  p_reason   text default null
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_p        graph.edge_proposals;
  v_kind     text;
  v_factor   uuid;
  v_dep      uuid;
  v_from     uuid;
  v_to       uuid;
  v_edge     graph.edges;
  v_cites    uuid;
  v_inserted boolean := false;
  v_moved    uuid[] := '{}';
begin
  if p_reviewer is null then
    raise exception 'recast_edge_to_cites: a reviewer is required' using errcode = '22023';
  end if;

  select * into v_p from graph.edge_proposals where id = p_proposal for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'proposal_not_found');
  end if;
  if v_p.action <> 'demote' then
    return jsonb_build_object('ok', false, 'error', 'not_a_demotion');
  end if;
  if v_p.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'already_decided', 'status', v_p.status);
  end if;

  v_kind := coalesce(v_p.proposed_kind, 'derives_from');
  if v_kind <> 'derives_from' then
    return jsonb_build_object('ok', false, 'error', 'kind_not_supported');
  end if;
  select id into v_factor from graph.nodes where slug = v_p.from_slug;
  select id into v_dep from graph.nodes where slug = v_p.to_slug;
  v_from := v_dep;
  v_to := v_factor;

  select * into v_edge from graph.edges
    where from_id = v_from and to_id = v_to and kind = v_kind
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'edge_gone');
  end if;

  insert into graph.edges (from_id, to_id, kind, weight, provenance, confidence, confidence_source)
    values (v_edge.from_id, v_edge.to_id, 'cites', v_edge.weight,
            v_edge.provenance || jsonb_build_object('recast_proposal_id', p_proposal, 'recast_from', v_edge.kind),
            v_edge.confidence, v_edge.confidence_source)
    on conflict (from_id, to_id, kind) do nothing
    returning id into v_cites;
  v_inserted := v_cites is not null;
  if not v_inserted then
    select id into v_cites from graph.edges where from_id = v_edge.from_id and to_id = v_edge.to_id and kind = 'cites';
  end if;

  with moved as (
    update graph.edge_flags f set edge_id = v_cites
      where f.edge_id = v_edge.id
        and not exists (select 1 from graph.edge_flags g where g.edge_id = v_cites and g.learner_id = f.learner_id)
      returning f.id
  )
  select coalesce(array_agg(id), '{}') into v_moved from moved;

  delete from graph.edges where id = v_edge.id;

  update graph.edge_proposals set
    status          = 'rejected',
    reviewer_id     = p_reviewer,
    decision_reason = p_reason,
    decided_kind    = 'cites',
    decided_at      = now(),
    prior_edge      = to_jsonb(v_edge) || jsonb_build_object('cites_inserted', v_inserted, 'cites_id', v_cites, 'moved_flag_ids', to_jsonb(v_moved))
  where id = p_proposal;

  return jsonb_build_object('ok', true, 'edge_id', v_edge.id, 'cites_id', v_cites, 'cites_inserted', v_inserted, 'moved_flags', cardinality(v_moved));
end;
$$;

create or replace function graph.restore_recast_edge(p_proposal uuid)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_p     graph.edge_proposals;
  v_edge  graph.edges;
  v_cites uuid;
  v_moved uuid[];
  v_target uuid;
begin
  select * into v_p from graph.edge_proposals where id = p_proposal for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'proposal_not_found');
  end if;
  if v_p.action <> 'demote' or v_p.status <> 'rejected' or v_p.decided_kind <> 'cites' or v_p.prior_edge is null then
    return jsonb_build_object('ok', false, 'error', 'not_recast');
  end if;

  v_edge := jsonb_populate_record(null::graph.edges, v_p.prior_edge);
  v_cites := nullif(v_p.prior_edge->>'cites_id', '')::uuid;
  select coalesce(array_agg(value::uuid), '{}') into v_moved from jsonb_array_elements_text(coalesce(v_p.prior_edge->'moved_flag_ids', '[]'::jsonb));

  insert into graph.edges (id, from_id, to_id, kind, weight, provenance, created_at, confidence, confidence_source)
    values (v_edge.id, v_edge.from_id, v_edge.to_id, v_edge.kind, v_edge.weight, v_edge.provenance, v_edge.created_at, v_edge.confidence, v_edge.confidence_source)
    on conflict do nothing;

  select id into v_target from graph.edges where from_id = v_edge.from_id and to_id = v_edge.to_id and kind = v_edge.kind;
  update graph.edge_flags f set edge_id = v_target
    where f.id = any (v_moved)
      and not exists (select 1 from graph.edge_flags g where g.edge_id = v_target and g.learner_id = f.learner_id);

  if coalesce((v_p.prior_edge->>'cites_inserted')::boolean, false) then
    delete from graph.edges
      where id = v_cites and kind = 'cites' and provenance->>'recast_proposal_id' = p_proposal::text;
  end if;

  update graph.edge_proposals set
    status = 'pending', reviewer_id = null, decision_reason = null, decided_kind = null, decided_at = null, prior_edge = null
  where id = p_proposal;

  return jsonb_build_object('ok', true, 'edge_id', v_target);
end;
$$;

revoke all on function graph.recast_edge_to_cites(uuid, uuid, text) from public, anon, authenticated;
revoke all on function graph.restore_recast_edge(uuid) from public, anon, authenticated;
grant execute on function graph.recast_edge_to_cites(uuid, uuid, text) to service_role;
grant execute on function graph.restore_recast_edge(uuid) to service_role;
