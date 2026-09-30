create or replace function graph.promote_evolution_import(p_silver uuid)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_item graph.silver_items;
  v_rule text;
  v_node jsonb;
  v_id   uuid;
  v_kind text;
  v_from uuid;
  v_to   uuid;
  v_new  boolean := false;
begin
  if p_silver is null then
    raise exception 'promote_evolution_import: a silver item is required' using errcode = '22023';
  end if;
  select * into v_item from graph.silver_items where id = p_silver for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'silver_not_found');
  end if;
  if v_item.parser <> 'evolution-import' then
    return jsonb_build_object('ok', false, 'error', 'not_evolution');
  end if;
  if v_item.status in ('withdrawn', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'silver_' || v_item.status);
  end if;
  select rights_rule into v_rule from graph.evidence_source_admissions
    where source_id = v_item.source_id and source_revision = v_item.source_revision;
  if coalesce(v_rule, '') not in ('onet-cc-by', 'bls-oews-pd') then
    return jsonb_build_object('ok', false, 'error', 'rule_not_importable', 'rule', v_rule);
  end if;

  if v_item.kind = 'claim' then
    v_node := v_item.proposal->'node';
    if v_node is null or jsonb_typeof(v_node) <> 'object' or v_node->>'slug' is distinct from v_item.subject then
      return jsonb_build_object('ok', false, 'error', 'no_node_draft');
    end if;
    if v_node->>'kind' not in ('occupation', 'task', 'technology', 'software') then
      return jsonb_build_object('ok', false, 'error', 'not_an_evolution_node');
    end if;
    insert into graph.nodes (slug, title, kind, tier, branch, summary, labels, provenance)
      values (
        v_node->>'slug', v_node->>'title', v_node->>'kind', coalesce((v_node->>'tier')::int, 13), v_node->>'branch', v_node->>'summary',
        coalesce(v_node->'labels', '{}'::jsonb), coalesce(v_node->'provenance', '{}'::jsonb) || jsonb_build_object('silver_item_id', p_silver)
      )
      on conflict (slug) do nothing
      returning id into v_id;
    v_new := v_id is not null;
    if v_id is null then
      select id into v_id from graph.nodes where slug = v_node->>'slug' and kind = v_node->>'kind';
      if v_id is null then
        return jsonb_build_object('ok', false, 'error', 'slug_taken');
      end if;
    end if;
    insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, importer)
      values (v_id, p_silver, 'importer', 'evolution-import')
      on conflict (node_id, silver_item_id) where node_id is not null do nothing;
    return jsonb_build_object('ok', true, 'node', v_id, 'inserted', v_new);
  end if;

  if v_item.kind = 'edge_candidate' then
    if coalesce((v_item.proposal->>'cycle')::boolean, false) then
      return jsonb_build_object('ok', false, 'error', 'lineage_cycle');
    end if;
    v_kind := v_item.proposal->>'edge_kind';
    if v_kind not in ('performs', 'uses', 'part_of', 'maps_to') then
      return jsonb_build_object('ok', false, 'error', 'edge_kind_not_importable');
    end if;
    select id into v_from from graph.nodes where slug = v_item.proposal->>'from_slug';
    select id into v_to from graph.nodes where slug = v_item.proposal->>'to_slug';
    if v_from is null or v_to is null then
      return jsonb_build_object('ok', false, 'error', 'endpoint_not_found');
    end if;
    insert into graph.edges (from_id, to_id, kind, provenance)
      values (v_from, v_to, v_kind, jsonb_build_object('type', 'evolution_edge', 'silver_item_id', p_silver, 'rule', v_rule))
      on conflict (from_id, to_id, kind) do nothing
      returning id into v_id;
    v_new := v_id is not null;
    if v_id is null then
      select id into v_id from graph.edges where from_id = v_from and to_id = v_to and kind = v_kind;
    end if;
    insert into graph.gold_lineage (edge_id, silver_item_id, promoted_by, importer)
      values (v_id, p_silver, 'importer', 'evolution-import')
      on conflict (edge_id, silver_item_id) where edge_id is not null do nothing;
    return jsonb_build_object('ok', true, 'edge', v_id, 'inserted', v_new);
  end if;

  return jsonb_build_object('ok', false, 'error', 'not_importable_kind');
end;
$$;

revoke all on function graph.promote_evolution_import(uuid) from public, anon, authenticated;
grant execute on function graph.promote_evolution_import(uuid) to service_role;
