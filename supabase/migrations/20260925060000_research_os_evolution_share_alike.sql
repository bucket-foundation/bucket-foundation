create or replace function graph.gold_lineage_rules()
returns trigger
language plpgsql
set search_path = graph, pg_temp
as $$
declare
  v_item      graph.silver_items;
  v_prov      text;
  v_source    text;
  v_edge_kind text;
  v_from_kind text;
  v_from_prov text;
  v_from_src  text;
  v_rule      text;
  v_role      text;
  v_batch     graph.evolution_batch_reviews;
begin
  select * into v_item from graph.silver_items where id = new.silver_item_id;
  if v_item.status in ('withdrawn', 'rejected') then
    raise exception 'gold_lineage: silver item % is %', new.silver_item_id, v_item.status using errcode = '23514';
  end if;
  if v_item.confidence < 0.5 then
    raise exception 'gold_lineage: silver item % is below the 0.5 promotion floor', new.silver_item_id using errcode = '23514';
  end if;
  if new.promoted_by = 'reviewer' and new.reviewer_id is null then
    raise exception 'gold_lineage: a reviewer promotion names its reviewer' using errcode = '23514';
  end if;

  select rights_rule into v_rule from graph.evidence_source_admissions
    where source_id = v_item.source_id and source_revision = v_item.source_revision;
  if coalesce(v_rule, '') in ('libraries-io-cc-by-sa', 'so-survey-odbl') then
    raise exception 'gold_lineage: % is share-alike and stays in silver until founder question 4 is answered', v_rule using errcode = '23514';
  end if;

  if new.promoted_by = 'batch' then
    if new.factoid_id is null then
      raise exception 'gold_lineage: a batch promotes factoids only' using errcode = '23514';
    end if;
    select role into v_role from graph.factoids where id = new.factoid_id;
    select * into v_batch from graph.evolution_batch_reviews where id = new.batch_review_id;
    if v_batch.id is null or v_batch.status <> 'approved'
      or v_batch.source_id <> v_item.source_id or v_batch.source_revision <> v_item.source_revision
      or v_batch.parser <> v_item.parser or v_batch.role is distinct from v_role then
      raise exception 'gold_lineage: batch review % does not cover silver item % role %', new.batch_review_id, new.silver_item_id, coalesce(v_role, '(none)') using errcode = '23514';
    end if;
    if new.reviewer_id is distinct from v_batch.reviewer_id then
      raise exception 'gold_lineage: a batch row names the approver of its sample' using errcode = '23514';
    end if;
    update graph.silver_items set status = 'promoted' where id = new.silver_item_id and status <> 'promoted';
    return new;
  end if;

  if new.factoid_id is not null then
    if new.promoted_by = 'importer' then
      if not (
        (new.importer = 'history-import' and coalesce(v_rule, '') in ('canon-site', 'canon-figure', 'canon-timeline'))
        or (new.importer = 'evolution-import' and coalesce(v_rule, '') in ('onet-cc-by', 'bls-oews-pd'))
      ) then
        raise exception 'gold_lineage: % may not promote a factoid under rule %', new.importer, coalesce(v_rule, '(none)') using errcode = '23514';
      end if;
    end if;
    update graph.silver_items set status = 'promoted' where id = new.silver_item_id and status <> 'promoted';
    return new;
  end if;

  if new.edge_id is not null then
    select e.kind, n.kind, n.provenance->>'type', n.provenance->>'source'
      into v_edge_kind, v_from_kind, v_from_prov, v_from_src
      from graph.edges e join graph.nodes n on n.id = e.from_id
      where e.id = new.edge_id;
    if v_from_kind = 'excerpt' and v_edge_kind in ('derives_from', 'prerequisite') then
      raise exception 'gold_lineage: an excerpt rests on nothing, so % from an excerpt is refused', v_edge_kind using errcode = '23514';
    end if;
    v_prov := v_from_prov;
    v_source := v_from_src;
  else
    select provenance->>'type', provenance->>'source' into v_prov, v_source from graph.nodes where id = new.node_id;
  end if;

  if new.promoted_by = 'importer' then
    if not (
      (new.importer = 'academy-import' and v_prov = 'academy_atom')
      or (new.importer = 'canon-import' and (v_prov = 'canon_entry' or (v_prov = 'primary_source' and coalesce(v_source, '') ~ '/primary-papers\.yaml$')))
      or (new.importer = 'evolution-import' and v_prov in ('onet_occupation', 'onet_task', 'onet_dwa', 'onet_tech_skill', 'bls_oews'))
    ) then
      raise exception 'gold_lineage: % may not promote provenance type %', new.importer, coalesce(v_prov, '(none)') using errcode = '23514';
    end if;
  end if;

  update graph.silver_items set status = 'promoted' where id = new.silver_item_id and status <> 'promoted';
  return new;
end;
$$;

revoke all on function graph.gold_lineage_rules() from public, anon, authenticated;
