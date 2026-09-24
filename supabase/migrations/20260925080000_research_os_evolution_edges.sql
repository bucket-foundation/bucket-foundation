create or replace function graph.promote_evolution_edge(p_silver uuid, p_reviewer uuid)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_item graph.silver_items;
  v_kind text;
  v_from uuid;
  v_to   uuid;
  v_edge uuid;
begin
  if p_silver is null or p_reviewer is null then
    raise exception 'promote_evolution_edge: a silver item and a reviewer are required' using errcode = '22023';
  end if;
  select * into v_item from graph.silver_items where id = p_silver for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'silver_not_found');
  end if;
  if v_item.kind <> 'edge_candidate' then
    return jsonb_build_object('ok', false, 'error', 'not_an_edge_candidate');
  end if;
  if v_item.parser <> 'evolution-import' then
    return jsonb_build_object('ok', false, 'error', 'not_evolution');
  end if;
  if v_item.status in ('withdrawn', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'silver_' || v_item.status);
  end if;
  v_kind := v_item.proposal->>'edge_kind';
  if v_kind is null or v_kind not in ('performs', 'uses', 'automates', 'enables', 'replaces', 'descends_from', 'influences', 'part_of', 'maps_to') then
    return jsonb_build_object('ok', false, 'error', 'not_an_evolution_edge');
  end if;
  select id into v_from from graph.nodes where slug = v_item.proposal->>'from_slug';
  select id into v_to from graph.nodes where slug = v_item.proposal->>'to_slug';
  if v_from is null or v_to is null then
    return jsonb_build_object('ok', false, 'error', 'endpoint_not_found');
  end if;
  if v_kind in ('descends_from', 'replaces') then
    perform pg_advisory_xact_lock(hashtext('graph.edges lineage'), hashtext(v_kind));
    if exists (
      with recursive reach(id) as (
        select v_to
        union
        select e.to_id from graph.edges e join reach r on e.from_id = r.id where e.kind = v_kind
      )
      select 1 from reach where id = v_from
    ) then
      return jsonb_build_object('ok', false, 'error', 'lineage_cycle');
    end if;
  end if;
  insert into graph.edges (from_id, to_id, kind, provenance)
    values (v_from, v_to, v_kind, jsonb_build_object('type', 'evolution_edge', 'silver_item_id', p_silver, 'rule', v_item.proposal->>'rule'))
    on conflict (from_id, to_id, kind) do nothing
    returning id into v_edge;
  if v_edge is null then
    select id into v_edge from graph.edges where from_id = v_from and to_id = v_to and kind = v_kind;
  end if;
  insert into graph.gold_lineage (edge_id, silver_item_id, promoted_by, reviewer_id)
    values (v_edge, p_silver, 'reviewer', p_reviewer)
    on conflict (edge_id, silver_item_id) where edge_id is not null do nothing;
  return jsonb_build_object('ok', true, 'edge', v_edge);
end;
$$;

revoke all on function graph.promote_evolution_edge(uuid, uuid) from public, anon, authenticated;
grant execute on function graph.promote_evolution_edge(uuid, uuid) to service_role;
