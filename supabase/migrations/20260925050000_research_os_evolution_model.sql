alter table graph.nodes drop constraint if exists nodes_kind_check;
alter table graph.nodes add constraint nodes_kind_check check (kind in (
  'fact','concept','law','derivation','primary_source','artifact',
  'hypothesis','extension','replication','peer_review','production',
  'figure','site','excerpt','event',
  'occupation','task','technology','software','discovery','topic'
));

alter table graph.nodes drop constraint if exists nodes_evolution_level;
alter table graph.nodes add constraint nodes_evolution_level check (
  case kind
    when 'occupation' then coalesce(provenance->>'level', '') in ('onet', 'isco_unit', 'hisco_micro')
    when 'task' then coalesce(provenance->>'level', '') in ('onet_task', 'dwa', 'iwa', 'gwa', 'factor')
    when 'technology' then coalesce(provenance->>'level', '') in ('class', 'artifact')
    when 'software' then coalesce(provenance->>'level', '') in ('os', 'language', 'package', 'application')
    when 'discovery' then coalesce(provenance->>'level', '') in ('finding', 'work')
    when 'topic' then coalesce(provenance->>'level', '') = 'openalex_topic'
    else true
  end
);

alter table graph.nodes drop constraint if exists nodes_evolution_slug;
alter table graph.nodes add constraint nodes_evolution_slug check (
  kind not in ('occupation', 'task', 'technology', 'software', 'discovery', 'topic')
  or slug ~ '^[a-z0-9][a-z0-9-]{0,199}$'
);

alter table graph.edges drop constraint if exists edges_kind_check;
alter table graph.edges add constraint edges_kind_check check (kind in (
  'prerequisite','derives_from','cites','generalizes','example_of','contradicts',
  'extends','replicates','reviews','answers',
  'contributes','authored','bridges',
  'performs','uses','automates','enables','replaces','descends_from','influences','part_of','maps_to'
));

create or replace function graph.evolution_edge_fits(p_kind text, p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'performs' then p_from = 'occupation' and p_to = 'task'
    when 'uses' then (p_from = 'occupation' and p_to in ('task', 'software'))
      or (p_from in ('technology', 'software') and p_to in ('technology', 'software'))
    when 'automates' then p_from in ('technology', 'software') and p_to = 'task'
    when 'enables' then p_from in ('discovery', 'technology') and p_to in ('technology', 'software')
    when 'replaces' then p_from = p_to and p_from in ('occupation', 'task', 'technology', 'software', 'discovery', 'topic')
    when 'descends_from' then p_from = p_to and p_from in ('software', 'technology')
    when 'influences' then p_from = 'software' and p_to = 'software'
    when 'part_of' then p_from = 'task' and p_to = 'task'
    when 'maps_to' then (p_from = 'occupation' and p_to = 'occupation')
      or (p_from in ('discovery', 'technology') and p_to in ('topic', 'technology'))
    else true
  end;
$$;

create or replace function graph.edges_evolution_endpoints()
returns trigger
language plpgsql
set search_path = graph, pg_temp
as $$
declare
  v_from text;
  v_to   text;
begin
  if new.kind not in ('performs', 'uses', 'automates', 'enables', 'replaces', 'descends_from', 'influences', 'part_of', 'maps_to') then
    return new;
  end if;
  select kind into v_from from graph.nodes where id = new.from_id;
  select kind into v_to from graph.nodes where id = new.to_id;
  if not graph.evolution_edge_fits(new.kind, v_from, v_to) then
    raise exception 'edges: % runs from % to %, which it does not join', new.kind, coalesce(v_from, '(missing)'), coalesce(v_to, '(missing)') using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists edges_evolution_endpoints on graph.edges;
create trigger edges_evolution_endpoints
  before insert or update of kind, from_id, to_id on graph.edges
  for each row execute function graph.edges_evolution_endpoints();

alter table graph.factoids drop constraint if exists factoids_role;
alter table graph.factoids add constraint factoids_role check (role in (
  'born', 'died', 'flourished', 'occurred', 'founded', 'occupied', 'composed', 'published', 'arose',
  'invented', 'discovered', 'released', 'emerged', 'adopted', 'declined', 'retired',
  'began', 'ended', 'measured'
));

alter table graph.factoids alter column subject_id drop not null;
alter table graph.factoids add column if not exists edge_id uuid references graph.edges (id) on delete restrict;
alter table graph.factoids add column if not exists measure jsonb;
alter table graph.factoids drop constraint if exists factoids_one_target;
alter table graph.factoids add constraint factoids_one_target check (num_nonnulls(subject_id, edge_id) = 1);
alter table graph.factoids drop constraint if exists factoids_measure;
alter table graph.factoids add constraint factoids_measure check (
  measure is null or (
    jsonb_typeof(measure) = 'object'
    and measure ? 'metric' and measure ? 'value' and measure ? 'unit'
    and jsonb_typeof(measure->'metric') = 'string'
    and jsonb_typeof(measure->'value') = 'number'
    and jsonb_typeof(measure->'unit') = 'string'
    and (not measure ? 'threshold' or jsonb_typeof(measure->'threshold') = 'number')
    and (measure - array['metric', 'value', 'unit', 'threshold']) = '{}'::jsonb
  )
);
alter table graph.factoids drop constraint if exists factoids_preferred_via;
alter table graph.factoids add constraint factoids_preferred_via check (
  preferred_via is null or preferred_via in ('reviewer', 'history-import', 'evolution-import', 'batch')
);
create unique index if not exists factoids_edge_preferred_uidx on graph.factoids (edge_id, role) where preferred and status = 'active';
create index if not exists factoids_edge_role_idx on graph.factoids (edge_id, role) where edge_id is not null;

create or replace function graph.factoid_role_fits(p_kind text, p_role text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'figure' then p_role in ('born', 'died', 'flourished')
    when 'site' then p_role in ('founded', 'occupied')
    when 'primary_source' then p_role in ('composed', 'published')
    when 'fact' then p_role = 'arose'
    when 'concept' then p_role = 'arose'
    when 'law' then p_role = 'arose'
    when 'event' then p_role = 'occurred'
    when 'occupation' then p_role in ('emerged', 'declined')
    when 'task' then p_role in ('emerged', 'declined')
    when 'technology' then p_role in ('invented', 'adopted', 'declined')
    when 'software' then p_role in ('released', 'adopted', 'declined', 'retired')
    when 'discovery' then p_role in ('discovered', 'published')
    when 'topic' then p_role = 'emerged'
    else false
  end;
$$;

create or replace function graph.edge_factoid_role_fits(p_edge_kind text, p_role text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_edge_kind in ('performs', 'uses', 'automates', 'enables', 'replaces', 'descends_from', 'influences', 'part_of', 'maps_to')
    and p_role in ('began', 'ended', 'measured');
$$;

create or replace function graph.factoids_attachment()
returns trigger
language plpgsql
set search_path = graph, pg_temp
as $$
declare
  v_kind text;
begin
  if new.edge_id is not null then
    select kind into v_kind from graph.edges where id = new.edge_id;
    if not graph.edge_factoid_role_fits(v_kind, new.role) then
      raise exception 'factoids: a % edge takes no % factoid', coalesce(v_kind, '(missing)'), new.role using errcode = '23514';
    end if;
    return new;
  end if;
  select kind into v_kind from graph.nodes where id = new.subject_id;
  if not graph.factoid_role_fits(v_kind, new.role) then
    raise exception 'factoids: a % node takes no % factoid', coalesce(v_kind, '(missing)'), new.role using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists factoids_attachment on graph.factoids;
create trigger factoids_attachment
  before insert or update of subject_id, edge_id, role on graph.factoids
  for each row execute function graph.factoids_attachment();

alter table graph.node_external_ids drop constraint if exists node_external_ids_authority;
alter table graph.node_external_ids add constraint node_external_ids_authority check (authority in (
  'wikidata', 'pleiades', 'tgn', 'geonames', 'periodo',
  'onet', 'onet_task', 'onet_dwa', 'isco08', 'hisco', 'cpc', 'patent_us', 'openalex', 'swh', 'purl', 'eol'
));
alter table graph.node_external_ids drop constraint if exists node_external_ids_shape;
alter table graph.node_external_ids add constraint node_external_ids_shape check (
  (authority = 'wikidata' and external_id ~ '^Q[0-9]+$')
  or (authority in ('pleiades', 'tgn', 'geonames') and external_id ~ '^[0-9]+$')
  or (authority = 'periodo' and external_id ~ '^[A-Za-z0-9_-]+$')
  or (authority = 'onet' and external_id ~ '^[0-9]{2}-[0-9]{4}\.[0-9]{2}$')
  or (authority = 'onet_task' and external_id ~ '^[0-9]{1,6}$')
  or (authority = 'onet_dwa' and external_id ~ '^4\.A\.[0-9A-Za-z.]+$')
  or (authority = 'isco08' and external_id ~ '^[0-9]{1,4}$')
  or (authority = 'hisco' and external_id ~ '^[0-9]{5}$')
  or (authority = 'cpc' and external_id ~ '^[A-HY][0-9]{2}[A-Z]$')
  or (authority = 'patent_us' and external_id ~ '^(D|PP|RE|H|T)?[0-9]{1,8}$')
  or (authority = 'openalex' and external_id ~ '^[WT][0-9]+$')
  or (authority = 'swh' and external_id ~ '^swh:1:(ori|snp|rel|rev|dir|cnt):[0-9a-f]{40}$')
  or (authority = 'purl' and external_id ~ '^pkg:[a-z0-9.+-]+/.+$' and length(external_id) - strpos(external_id, '/') between 1 and 400)
  or (authority = 'eol' and external_id ~ '^[a-z0-9][a-z0-9._+-]{0,99}$')
);

create table if not exists graph.evolution_batch_reviews (
  id              uuid        primary key default gen_random_uuid(),
  source_id       text        not null,
  source_revision text        not null,
  parser          text        not null,
  role            text        not null,
  sample_size     integer     not null,
  status          text        not null default 'pending',
  reviewer_id     uuid        references auth.users (id) on delete set null,
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  constraint evolution_batch_reviews_admission foreign key (source_id, source_revision)
    references graph.evidence_source_admissions (source_id, source_revision) on delete cascade,
  constraint evolution_batch_reviews_status check (status in ('pending', 'approved', 'rejected')),
  constraint evolution_batch_reviews_sample check (sample_size between 1 and 100000),
  constraint evolution_batch_reviews_decided check ((status = 'pending') = (reviewer_id is null and decided_at is null)),
  constraint evolution_batch_reviews_key unique (source_id, source_revision, parser, role)
);
alter table graph.evolution_batch_reviews enable row level security;
revoke all on graph.evolution_batch_reviews from anon, authenticated;

alter table graph.gold_lineage add column if not exists batch_review_id uuid references graph.evolution_batch_reviews (id) on delete restrict;
alter table graph.gold_lineage drop constraint if exists gold_lineage_promoted_by;
alter table graph.gold_lineage add constraint gold_lineage_promoted_by check (promoted_by in ('reviewer', 'importer', 'backfill', 'batch'));
alter table graph.gold_lineage drop constraint if exists gold_lineage_importer;
alter table graph.gold_lineage add constraint gold_lineage_importer check (
  (promoted_by = 'importer' and importer in ('academy-import', 'canon-import', 'history-import', 'evolution-import'))
  or (promoted_by <> 'importer' and importer is null)
);
alter table graph.gold_lineage drop constraint if exists gold_lineage_batch;
alter table graph.gold_lineage add constraint gold_lineage_batch check (
  (promoted_by = 'batch') = (batch_review_id is not null)
  and (promoted_by <> 'batch' or reviewer_id is not null)
);

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
      select rights_rule into v_rule from graph.evidence_source_admissions
        where source_id = v_item.source_id and source_revision = v_item.source_revision;
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

create or replace function graph.promote_history_factoid(
  p_silver    uuid,
  p_reviewer  uuid,
  p_preferred boolean
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_item     graph.silver_items;
  v_subject  graph.nodes;
  v_role     text;
  v_f        jsonb;
  v_place    uuid;
  v_source   uuid;
  v_id       uuid;
  v_ids      jsonb := '[]'::jsonb;
  v_inserted integer := 0;
begin
  if p_silver is null or p_preferred is null then
    raise exception 'promote_history_factoid: a silver item and a preferred flag are required' using errcode = '22023';
  end if;

  select * into v_item from graph.silver_items where id = p_silver for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'silver_not_found');
  end if;
  if v_item.kind <> 'claim' then
    return jsonb_build_object('ok', false, 'error', 'not_a_claim');
  end if;
  if v_item.subject like 'edge:%' then
    return jsonb_build_object('ok', false, 'error', 'edge_subject');
  end if;
  if jsonb_typeof(v_item.proposal->'roles') <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'no_roles');
  end if;

  select * into v_subject from graph.nodes where slug = v_item.subject;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'subject_not_found');
  end if;

  for v_role, v_f in select key, value from jsonb_each(v_item.proposal->'roles') order by key loop
    perform pg_advisory_xact_lock(hashtext('graph.factoids'), hashtext(v_subject.id::text || ' ' || v_role));
    perform 1 from graph.factoids where subject_id = v_subject.id and role = v_role for update;

    v_place := null;
    if v_f ? 'place_slug' then
      select id into v_place from graph.places where slug = v_f->>'place_slug' and status = 'active';
      if v_place is null then
        raise exception 'promote_history_factoid: no active place %', v_f->>'place_slug' using errcode = '23503';
      end if;
    end if;
    v_source := null;
    if v_f ? 'source_slug' then
      select id into v_source from graph.nodes where slug = v_f->>'source_slug' and kind = 'primary_source';
      if v_source is null then
        raise exception 'promote_history_factoid: no primary source %', v_f->>'source_slug' using errcode = '23503';
      end if;
    end if;

    if p_preferred then
      update graph.factoids set preferred = false
        where subject_id = v_subject.id and role = v_role and preferred and status = 'active' and silver_item_id <> p_silver;
    end if;

    insert into graph.factoids (
      subject_id, role, place_id, period_id, edtf, start_year, end_year, start_min, start_max, end_min, end_max,
      precision, calendar, qualifier, as_recorded, uncertainty, confidence, source_node_id, locator,
      silver_item_id, preferred, reviewed_by
    ) values (
      v_subject.id, v_role, v_place, v_f->>'period_id', v_f->>'edtf',
      (v_f->>'start_year')::integer, (v_f->>'end_year')::integer,
      (v_f->>'start_min')::integer, (v_f->>'start_max')::integer, (v_f->>'end_min')::integer, (v_f->>'end_max')::integer,
      v_f->>'precision', v_f->>'calendar', v_f->>'qualifier', v_f->>'as_recorded', v_f->'uncertainty',
      least(v_item.confidence, coalesce((v_f->>'confidence')::real, v_item.confidence)),
      v_source, coalesce(v_f->>'locator', v_item.locator), p_silver, p_preferred, p_reviewer
    )
    on conflict (silver_item_id, role) do nothing
    returning id into v_id;

    if v_id is null then
      select id into v_id from graph.factoids where silver_item_id = p_silver and role = v_role;
      if p_preferred then
        update graph.factoids set preferred = true where id = v_id and status = 'active' and not preferred;
      end if;
    else
      v_inserted := v_inserted + 1;
    end if;

    insert into graph.gold_lineage (factoid_id, silver_item_id, promoted_by, importer, reviewer_id)
      values (
        v_id, p_silver,
        case when p_reviewer is null then 'importer' else 'reviewer' end,
        case when p_reviewer is null then 'history-import' end,
        p_reviewer
      )
      on conflict (factoid_id, silver_item_id) where factoid_id is not null do nothing;

    v_ids := v_ids || to_jsonb(v_id);
  end loop;

  return jsonb_build_object('ok', true, 'factoids', v_ids, 'inserted', v_inserted);
end;
$$;

create or replace function graph.evolution_promote_core(
  p_silver    uuid,
  p_reviewer  uuid,
  p_preferred boolean,
  p_batch     uuid,
  p_only_role text
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_item     graph.silver_items;
  v_node     uuid;
  v_edge     uuid;
  v_target   text;
  v_role     text;
  v_f        jsonb;
  v_place    uuid;
  v_source   uuid;
  v_id       uuid;
  v_ids      jsonb := '[]'::jsonb;
  v_inserted integer := 0;
  v_by       text;
  v_via      text;
begin
  select * into v_item from graph.silver_items where id = p_silver for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'silver_not_found');
  end if;
  if v_item.kind <> 'claim' then
    return jsonb_build_object('ok', false, 'error', 'not_a_claim');
  end if;
  if v_item.parser <> 'evolution-import' then
    return jsonb_build_object('ok', false, 'error', 'not_evolution');
  end if;
  if jsonb_typeof(v_item.proposal->'roles') <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'no_roles');
  end if;

  if v_item.subject ~ '^edge:[0-9a-f-]{36}$' then
    select id into v_edge from graph.edges where id = substr(v_item.subject, 6)::uuid;
    if v_edge is null then
      return jsonb_build_object('ok', false, 'error', 'subject_not_found');
    end if;
    v_target := v_edge::text;
  else
    select id into v_node from graph.nodes where slug = v_item.subject;
    if v_node is null then
      return jsonb_build_object('ok', false, 'error', 'subject_not_found');
    end if;
    v_target := v_node::text;
  end if;

  v_by := case when p_batch is not null then 'batch' when p_reviewer is null then 'importer' else 'reviewer' end;
  v_via := case v_by when 'batch' then 'batch' when 'importer' then 'evolution-import' else 'reviewer' end;

  for v_role, v_f in select key, value from jsonb_each(v_item.proposal->'roles') where p_only_role is null or key = p_only_role order by key loop
    perform pg_advisory_xact_lock(hashtext('graph.factoids'), hashtext(v_target || ' ' || v_role));
    if v_edge is not null then
      perform 1 from graph.factoids where edge_id = v_edge and role = v_role for update;
    else
      perform 1 from graph.factoids where subject_id = v_node and role = v_role for update;
    end if;

    v_place := null;
    if v_f ? 'place_slug' then
      select id into v_place from graph.places where slug = v_f->>'place_slug' and status = 'active';
      if v_place is null then
        raise exception 'promote_evolution_factoid: no active place %', v_f->>'place_slug' using errcode = '23503';
      end if;
    end if;
    v_source := null;
    if v_f ? 'source_slug' then
      select id into v_source from graph.nodes where slug = v_f->>'source_slug' and kind = 'primary_source';
      if v_source is null then
        raise exception 'promote_evolution_factoid: no primary source %', v_f->>'source_slug' using errcode = '23503';
      end if;
    end if;

    if p_preferred then
      update graph.factoids set preferred = false
        where ((v_edge is not null and edge_id = v_edge) or (v_node is not null and subject_id = v_node))
          and role = v_role and preferred and status = 'active' and silver_item_id <> p_silver;
    end if;

    insert into graph.factoids (
      subject_id, edge_id, role, place_id, period_id, edtf, start_year, end_year, start_min, start_max, end_min, end_max,
      precision, calendar, qualifier, as_recorded, uncertainty, confidence, source_node_id, locator,
      silver_item_id, preferred, reviewed_by, measure, preferred_via, preferred_by, preferred_at
    ) values (
      v_node, v_edge, v_role, v_place, v_f->>'period_id', v_f->>'edtf',
      (v_f->>'start_year')::integer, (v_f->>'end_year')::integer,
      (v_f->>'start_min')::integer, (v_f->>'start_max')::integer, (v_f->>'end_min')::integer, (v_f->>'end_max')::integer,
      v_f->>'precision', v_f->>'calendar', v_f->>'qualifier', v_f->>'as_recorded', v_f->'uncertainty',
      least(v_item.confidence, coalesce((v_f->>'confidence')::real, v_item.confidence)),
      v_source, coalesce(v_f->>'locator', v_item.locator), p_silver, p_preferred,
      case when v_by = 'reviewer' then p_reviewer end,
      v_f->'measure',
      case when p_preferred then v_via end,
      case when p_preferred and v_by = 'reviewer' then p_reviewer end,
      case when p_preferred then now() end
    )
    on conflict (silver_item_id, role) do nothing
    returning id into v_id;

    if v_id is null then
      select id into v_id from graph.factoids where silver_item_id = p_silver and role = v_role;
      if p_preferred then
        update graph.factoids set preferred = true, preferred_via = v_via, preferred_at = now(),
            preferred_by = case when v_by = 'reviewer' then p_reviewer end
          where id = v_id and status = 'active' and not preferred;
      end if;
    else
      v_inserted := v_inserted + 1;
    end if;

    insert into graph.gold_lineage (factoid_id, silver_item_id, promoted_by, importer, reviewer_id, batch_review_id)
      values (
        v_id, p_silver, v_by,
        case when v_by = 'importer' then 'evolution-import' end,
        p_reviewer,
        p_batch
      )
      on conflict (factoid_id, silver_item_id) where factoid_id is not null do nothing;

    v_ids := v_ids || to_jsonb(v_id);
  end loop;

  if v_edge is not null then
    update graph.edges e set confidence = f.confidence
      from graph.factoids f
      where e.id = v_edge and f.edge_id = v_edge and f.preferred and f.status = 'active'
        and e.confidence is distinct from f.confidence;
  end if;

  return jsonb_build_object('ok', true, 'factoids', v_ids, 'inserted', v_inserted);
end;
$$;

create or replace function graph.promote_evolution_factoid(
  p_silver    uuid,
  p_reviewer  uuid,
  p_preferred boolean
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
begin
  if p_silver is null or p_preferred is null then
    raise exception 'promote_evolution_factoid: a silver item and a preferred flag are required' using errcode = '22023';
  end if;
  return graph.evolution_promote_core(p_silver, p_reviewer, p_preferred, null, null);
end;
$$;

create or replace function graph.promote_evolution_batch(p_review uuid)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_r        graph.evolution_batch_reviews;
  v_id       uuid;
  v_res      jsonb;
  v_promoted integer := 0;
  v_skipped  integer := 0;
  v_seen     integer;
begin
  if p_review is null then
    raise exception 'promote_evolution_batch: a batch review is required' using errcode = '22023';
  end if;
  select * into v_r from graph.evolution_batch_reviews where id = p_review;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'review_not_found');
  end if;
  if v_r.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'review_not_approved');
  end if;
  loop
    v_seen := 0;
    for v_id in
      select s.id from graph.silver_items s
      where s.source_id = v_r.source_id and s.source_revision = v_r.source_revision and s.parser = v_r.parser
        and s.kind = 'claim' and s.status = 'candidate'
        and s.proposal->'roles' ? v_r.role
        and not exists (select 1 from graph.factoids f where f.silver_item_id = s.id and f.role = v_r.role)
      order by s.id
      limit 10000
      for update skip locked
    loop
      v_seen := v_seen + 1;
      v_res := graph.evolution_promote_core(v_id, v_r.reviewer_id, false, v_r.id, v_r.role);
      if coalesce((v_res->>'ok')::boolean, false) then
        v_promoted := v_promoted + coalesce((v_res->>'inserted')::integer, 0);
      else
        v_skipped := v_skipped + 1;
        update graph.silver_items set status = 'proposed' where id = v_id and status = 'candidate';
      end if;
    end loop;
    exit when v_seen < 10000;
  end loop;
  return jsonb_build_object('ok', true, 'promoted', v_promoted, 'skipped', v_skipped);
end;
$$;

drop function if exists graph.prefer_history_factoid(uuid, text, uuid, text);

create or replace function graph.prefer_history_factoid(
  p_silver   uuid,
  p_role     text,
  p_reviewer uuid,
  p_importer text default null
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_f      graph.factoids;
  v_target uuid;
begin
  if p_silver is null or p_role is null then
    raise exception 'prefer_history_factoid: a silver item and a role are required' using errcode = '22023';
  end if;
  if p_reviewer is null and p_importer is distinct from 'history-import' and p_importer is distinct from 'evolution-import' then
    raise exception 'prefer_history_factoid: a reviewer is required' using errcode = '22023';
  end if;
  if p_reviewer is not null and p_importer is not null then
    raise exception 'prefer_history_factoid: a reviewer or an importer, never both' using errcode = '22023';
  end if;
  select * into v_f from graph.factoids where silver_item_id = p_silver and role = p_role for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'factoid_not_found');
  end if;
  if v_f.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;
  if p_importer is not null and not exists (
    select 1 from graph.gold_lineage l
    where l.factoid_id = v_f.id and l.promoted_by = 'importer' and l.importer = p_importer
  ) then
    raise exception 'prefer_history_factoid: % may prefer only a factoid it promoted', p_importer using errcode = '23514';
  end if;
  if v_f.preferred then
    return jsonb_build_object('ok', true, 'changed', false, 'factoid', v_f.id);
  end if;
  v_target := coalesce(v_f.subject_id, v_f.edge_id);
  perform pg_advisory_xact_lock(hashtext('graph.factoids'), hashtext(v_target::text || ' ' || p_role));
  update graph.factoids set preferred = false
    where coalesce(subject_id, edge_id) = v_target
      and (subject_id is null) = (v_f.subject_id is null)
      and role = p_role and preferred and status = 'active' and id <> v_f.id;
  update graph.factoids
    set preferred = true, preferred_by = p_reviewer, preferred_at = now(), preferred_via = case when p_reviewer is null then p_importer else 'reviewer' end
    where id = v_f.id;
  if v_f.edge_id is not null then
    update graph.edges set confidence = v_f.confidence where id = v_f.edge_id and confidence is distinct from v_f.confidence;
  end if;
  return jsonb_build_object('ok', true, 'changed', true, 'factoid', v_f.id);
end;
$$;

create or replace function graph.revive_history_factoids(p_silver uuid[])
returns integer
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  f       graph.factoids;
  revived integer := 0;
begin
  for f in
    select * from graph.factoids
    where silver_item_id = any (p_silver) and status = 'withdrawn'
      and not exists (select 1 from graph.withdrawn_factoids w where w.factoid_id = factoids.id and w.reviewed_at is null)
    order by created_at, id
    for update
  loop
    update graph.factoids set
      status = 'active',
      preferred = f.preferred and not exists (
        select 1 from graph.factoids o
        where o.role = f.role and o.preferred and o.status = 'active' and o.id <> f.id
          and ((f.subject_id is not null and o.subject_id = f.subject_id) or (f.edge_id is not null and o.edge_id = f.edge_id))
      )
    where id = f.id;
    revived := revived + 1;
  end loop;
  update graph.silver_items s set status = 'withdrawn'
    where s.id = any (p_silver)
      and exists (select 1 from graph.factoids fq join graph.withdrawn_factoids w on w.factoid_id = fq.id where fq.silver_item_id = s.id and w.reviewed_at is null);
  return revived;
end;
$$;

create or replace function graph.restore_withdrawn_node(
  p_node     uuid,
  p_reviewer uuid
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_q        graph.medallion_withdrawn_nodes;
  v_active   boolean;
  v_silver   uuid[];
  v_factoids integer;
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
        and s.id in (
          select l.silver_item_id from graph.gold_lineage l where l.node_id = p_node
          union
          select f.silver_item_id from graph.factoids f where f.subject_id = p_node
          union
          select f.silver_item_id from graph.factoids f
            join graph.edges e on e.id = f.edge_id
            where (e.from_id = p_node or e.to_id = p_node)
              and not exists (
                select 1 from graph.medallion_withdrawn_nodes q
                where q.node_id in (e.from_id, e.to_id) and q.node_id <> p_node and q.reviewed_at is null
              )
        )
      returning s.id
  )
  select coalesce(array_agg(id), '{}') into v_silver from revived;

  v_factoids := graph.revive_history_factoids(v_silver);

  update graph.nodes set visibility = v_q.prior_visibility where id = p_node;
  update graph.medallion_withdrawn_nodes set reviewed_at = now(), reviewer_id = p_reviewer where node_id = p_node;

  return jsonb_build_object('ok', true, 'visibility', v_q.prior_visibility, 'silver_revived', cardinality(v_silver), 'factoids_revived', v_factoids);
end;
$$;

create or replace function graph.restore_withdrawn_history(
  p_source   text,
  p_reviewer uuid
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_revision text;
  v_silver   uuid[];
  v_factoids integer;
  v_places   integer;
  v_periods  integer;
  v_series   integer;
begin
  if p_source is null or p_reviewer is null then
    raise exception 'restore_withdrawn_history: a source and a reviewer are required' using errcode = '22023';
  end if;

  select source_revision into v_revision from graph.evidence_source_admissions
    where source_id = p_source and status = 'active'
    for update;
  if v_revision is null then
    return jsonb_build_object('ok', false, 'error', 'source_not_active');
  end if;

  update graph.places set status = 'active'
    where source_id = p_source and source_revision = v_revision and status = 'withdrawn';
  get diagnostics v_places = row_count;

  update graph.periods set status = 'active'
    where source_id = p_source and source_revision = v_revision and status = 'withdrawn';
  get diagnostics v_periods = row_count;

  update graph.evolution_series set status = 'active'
    where source_id = p_source and source_revision = v_revision and status = 'withdrawn';
  get diagnostics v_series = row_count;

  with revived as (
    update graph.silver_items s
      set status = 'promoted'
      where s.status = 'withdrawn' and s.source_id = p_source and s.source_revision = v_revision
        and exists (
          select 1 from graph.factoids f
          left join graph.edges e on e.id = f.edge_id
          where f.silver_item_id = s.id
            and not exists (
              select 1 from graph.medallion_withdrawn_nodes q
              where q.node_id = f.subject_id or q.node_id = e.from_id or q.node_id = e.to_id
            )
        )
      returning s.id
  )
  select coalesce(array_agg(id), '{}') into v_silver from revived;

  v_factoids := graph.revive_history_factoids(v_silver);

  return jsonb_build_object('ok', true, 'places', v_places, 'periods', v_periods, 'series', v_series, 'silver_revived', cardinality(v_silver), 'factoids_revived', v_factoids);
end;
$$;

create or replace function graph.withdraw_identity_dependents(
  p_node   uuid,
  p_qids   text[],
  p_reason text,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_slug     text;
  v_silver   uuid[];
  v_queued   integer;
  v_factoids integer;
begin
  if p_status not in ('withdrawn', 'rejected') then
    raise exception 'withdraw_identity_dependents: status is withdrawn or rejected' using errcode = '22023';
  end if;
  select slug into v_slug from graph.nodes where id = p_node;
  if v_slug is null or coalesce(cardinality(p_qids), 0) = 0 then
    return jsonb_build_object('silver', 0, 'factoids', 0, 'queued', 0);
  end if;
  select coalesce(array_agg(s.id), '{}') into v_silver
    from graph.silver_items s
    where s.parser in ('history-import', 'evolution-import')
      and (
        s.subject = v_slug
        or (s.parser = 'evolution-import' and s.subject ~ '^edge:[0-9a-f-]{36}$' and exists (
          select 1 from graph.edges e
          where e.id = substr(s.subject, 6)::uuid and p_node in (e.from_id, e.to_id)
        ))
      )
      and s.proposal->>'qid' = any (p_qids)
      and s.status not in ('withdrawn', 'rejected');

  insert into graph.withdrawn_factoids (factoid_id, reason)
    select f.id, left(p_reason, 500) from graph.factoids f
    where f.silver_item_id = any (v_silver) and f.status = 'active'
    on conflict (factoid_id) do nothing;
  get diagnostics v_queued = row_count;

  update graph.factoids set status = 'withdrawn', preferred = false
    where silver_item_id = any (v_silver) and status = 'active';
  get diagnostics v_factoids = row_count;

  update graph.silver_items s
    set status = case when exists (select 1 from graph.factoids f where f.silver_item_id = s.id) then 'withdrawn' else p_status end,
        review_reason = coalesce(s.review_reason, left(p_reason, 500)),
        reviewed_at = coalesce(s.reviewed_at, now())
    where s.id = any (v_silver);

  return jsonb_build_object('silver', cardinality(v_silver), 'factoids', v_factoids, 'queued', v_queued);
end;
$$;

create or replace function graph.tag_identity_silver()
returns integer
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_tagged integer;
begin
  update graph.silver_items s
    set proposal = s.proposal || jsonb_build_object('identity_proposal_id', p.id)
    from graph.external_id_proposals p
    join graph.nodes n on n.id = p.node_id
    where s.parser in ('history-import', 'evolution-import') and p.authority = 'wikidata'
      and (
        s.subject = n.slug
        or (s.parser = 'evolution-import' and s.subject ~ '^edge:[0-9a-f-]{36}$' and exists (
          select 1 from graph.edges e
          where e.id = substr(s.subject, 6)::uuid and n.id in (e.from_id, e.to_id)
        ))
      )
      and s.proposal ? 'qid'
      and exists (select 1 from jsonb_array_elements(p.candidates) c where c->>'qid' = s.proposal->>'qid')
      and s.proposal->>'identity_proposal_id' is distinct from p.id::text;
  get diagnostics v_tagged = row_count;
  return v_tagged;
end;
$$;

create or replace function graph.reject_evolution_silver(
  p_silver   uuid,
  p_reviewer uuid,
  p_reason   text
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_item graph.silver_items;
begin
  if p_silver is null or p_reviewer is null or coalesce(btrim(p_reason), '') = '' then
    raise exception 'reject_evolution_silver: a silver item, a reviewer and a reason are required' using errcode = '22023';
  end if;
  select * into v_item from graph.silver_items where id = p_silver for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'silver_not_found');
  end if;
  if v_item.parser <> 'evolution-import' then
    return jsonb_build_object('ok', false, 'error', 'not_evolution');
  end if;
  if v_item.status = 'rejected' then
    return jsonb_build_object('ok', true, 'changed', false);
  end if;
  if v_item.status not in ('candidate', 'proposed', 'promoted') or exists (select 1 from graph.factoids f where f.silver_item_id = p_silver) then
    return jsonb_build_object('ok', false, 'error', 'already_decided', 'status', v_item.status);
  end if;
  update graph.silver_items
    set status = 'rejected', reviewed_by = p_reviewer, reviewed_at = now(), review_reason = left(btrim(p_reason), 500)
    where id = p_silver;
  return jsonb_build_object('ok', true, 'changed', true);
end;
$$;

create or replace view graph.factoid_conflicts
with (security_invoker = true)
as
select
  a.subject_id,
  a.role,
  a.id as factoid_a,
  b.id as factoid_b,
  not (a.span && b.span) as disjoint_spans,
  (a.place_id is not null and b.place_id is not null and a.place_id <> b.place_id) as different_places
from graph.factoids a
join graph.factoids b
  on b.subject_id = a.subject_id and b.role = a.role and a.id < b.id
where a.status = 'active' and b.status = 'active'
  and a.subject_id is not null
  and (
    not (a.span && b.span)
    or (a.place_id is not null and b.place_id is not null and a.place_id <> b.place_id)
  );

create or replace view graph.edge_factoid_conflicts
with (security_invoker = true)
as
select
  a.edge_id,
  a.role,
  a.id as factoid_a,
  b.id as factoid_b,
  not (a.span && b.span) as disjoint_spans,
  (a.measure is not null and b.measure is not null and a.measure->>'metric' = b.measure->>'metric'
    and a.measure->'value' <> b.measure->'value') as different_measures
from graph.factoids a
join graph.factoids b
  on b.edge_id = a.edge_id and b.role = a.role and a.id < b.id
where a.status = 'active' and b.status = 'active'
  and a.edge_id is not null
  and (
    not (a.span && b.span)
    or (a.measure is not null and b.measure is not null and a.measure->>'metric' = b.measure->>'metric' and a.measure->'value' <> b.measure->'value')
  );

create or replace view graph.node_when_where
with (security_invoker = true)
as
select
  f.subject_id,
  f.role,
  f.id as factoid_id,
  f.edtf,
  f.start_year,
  f.end_year,
  f.start_min,
  f.start_max,
  f.end_min,
  f.end_max,
  f.span,
  f.precision,
  f.qualifier,
  f.confidence,
  f.preferred,
  case when p.status = 'active' then p.id end as place_id,
  case when p.status = 'active' then p.lat end as lat,
  case when p.status = 'active' then p.lng end as lng,
  exists (
    select 1 from graph.factoid_conflicts c
    where c.subject_id = f.subject_id and c.role = f.role
  ) as disputed
from graph.factoids f
left join graph.places p on p.id = f.place_id
where f.status = 'active'
  and f.subject_id is not null
  and (
    f.preferred
    or not exists (
      select 1 from graph.factoids o
      where o.subject_id = f.subject_id and o.role = f.role and o.preferred and o.status = 'active'
    )
  );

create table if not exists graph.evolution_series (
  id              uuid        primary key default gen_random_uuid(),
  subject_id      uuid        not null references graph.nodes (id) on delete cascade,
  metric          text        not null,
  place_id        uuid        references graph.places (id) on delete restrict,
  year            integer     not null,
  value           double precision not null,
  unit            text        not null,
  source_id       text        not null,
  source_revision text        not null,
  run_hash        text        not null,
  status          text        not null default 'active',
  created_at      timestamptz not null default now(),
  constraint evolution_series_admission foreign key (source_id, source_revision)
    references graph.evidence_source_admissions (source_id, source_revision) on delete cascade,
  constraint evolution_series_metric check (metric ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint evolution_series_unit check (length(unit) between 1 and 40),
  constraint evolution_series_value check (value = value and value not in ('Infinity'::double precision, '-Infinity'::double precision)),
  constraint evolution_series_run_hash check (run_hash ~ '^[0-9a-f]{64}$'),
  constraint evolution_series_status check (status in ('active', 'withdrawn')),
  constraint evolution_series_key unique nulls not distinct (subject_id, metric, place_id, year, source_id, source_revision)
);
create index if not exists evolution_series_subject_idx on graph.evolution_series (subject_id, metric, year);
alter table graph.evolution_series enable row level security;
revoke all on graph.evolution_series from anon, authenticated;

create or replace function graph.medallion_withdrawal_cascade()
returns trigger
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
begin
  update graph.silver_items
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  update graph.factoids f
    set status = 'withdrawn'
    from graph.silver_items s
    where s.id = f.silver_item_id and s.source_id = new.source_id and s.source_revision = new.source_revision
      and f.status <> 'withdrawn';

  update graph.places
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  update graph.periods
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  update graph.evolution_series
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  delete from graph.node_external_ids
    where source_id = new.source_id and source_revision = new.source_revision;

  update graph.external_id_proposals
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  with orphaned as (
    select distinct l.node_id
    from graph.gold_lineage l
    join graph.silver_items s on s.id = l.silver_item_id
    where l.node_id is not null
      and s.source_id = new.source_id and s.source_revision = new.source_revision
      and not exists (
        select 1 from graph.gold_lineage l2
        join graph.silver_items s2 on s2.id = l2.silver_item_id
        where l2.node_id = l.node_id and s2.status <> 'withdrawn'
      )
  ), queued as (
    insert into graph.medallion_withdrawn_nodes (node_id, prior_visibility, source_id)
    select n.id, n.visibility, new.source_id
    from graph.nodes n join orphaned o on o.node_id = n.id
    on conflict (node_id) do nothing
    returning node_id
  )
  update graph.nodes set visibility = 'private'
    where id in (select node_id from orphaned) and visibility <> 'private';
  return new;
end;
$$;

create or replace function graph.move_edge_factoids(p_old uuid, p_new uuid)
returns integer
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_moved integer;
begin
  if p_old is null or p_new is null or p_old = p_new then
    raise exception 'move_edge_factoids: two different edges are required' using errcode = '22023';
  end if;
  perform 1 from graph.edges where id in (p_old, p_new) for update;
  update graph.factoids set preferred = false
    where edge_id = p_old and preferred and exists (
      select 1 from graph.factoids o where o.edge_id = p_new and o.role = factoids.role and o.preferred and o.status = 'active'
    );
  update graph.factoids set edge_id = p_new where edge_id = p_old;
  get diagnostics v_moved = row_count;
  return v_moved;
end;
$$;

create table if not exists graph.purged_factoids (
  id         uuid        primary key default gen_random_uuid(),
  factoid_id uuid        not null,
  edge_id    uuid        not null,
  row_data   jsonb       not null,
  withdrawal jsonb,
  purged_by  uuid        not null,
  purged_at  timestamptz not null default now(),
  constraint purged_factoids_row check (jsonb_typeof(row_data) = 'object')
);
create index if not exists purged_factoids_edge_idx on graph.purged_factoids (edge_id);
alter table graph.purged_factoids enable row level security;
revoke all on graph.purged_factoids from public, anon, authenticated;

create table if not exists graph.purged_gold_lineage (
  id         uuid        primary key default gen_random_uuid(),
  lineage_id uuid        not null,
  factoid_id uuid        not null,
  edge_id    uuid        not null,
  row_data   jsonb       not null,
  purged_by  uuid        not null,
  purged_at  timestamptz not null default now(),
  constraint purged_gold_lineage_row check (jsonb_typeof(row_data) = 'object')
);
create index if not exists purged_gold_lineage_factoid_idx on graph.purged_gold_lineage (factoid_id);
alter table graph.purged_gold_lineage enable row level security;
revoke all on graph.purged_gold_lineage from public, anon, authenticated;

create or replace function graph.purge_edge_factoids(p_edge uuid, p_reviewer uuid)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_live     integer;
  v_lineage  integer;
  v_factoids integer;
begin
  if p_edge is null or p_reviewer is null then
    raise exception 'purge_edge_factoids: an edge and a reviewer are required' using errcode = '22023';
  end if;
  perform 1 from graph.edges where id = p_edge for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'edge_not_found');
  end if;
  perform 1 from graph.factoids where edge_id = p_edge for update;
  select count(*) into v_live from graph.factoids where edge_id = p_edge and status <> 'withdrawn';
  if v_live > 0 then
    raise exception 'purge_edge_factoids: % factoid(s) on edge % are not withdrawn', v_live, p_edge using errcode = '23514';
  end if;

  insert into graph.purged_gold_lineage (lineage_id, factoid_id, edge_id, row_data, purged_by)
    select l.id, l.factoid_id, p_edge, to_jsonb(l), p_reviewer
    from graph.gold_lineage l join graph.factoids f on f.id = l.factoid_id
    where f.edge_id = p_edge;
  get diagnostics v_lineage = row_count;

  insert into graph.purged_factoids (factoid_id, edge_id, row_data, withdrawal, purged_by)
    select f.id, p_edge, to_jsonb(f) - 'span', (select to_jsonb(w) from graph.withdrawn_factoids w where w.factoid_id = f.id), p_reviewer
    from graph.factoids f where f.edge_id = p_edge;

  delete from graph.gold_lineage l using graph.factoids f where f.id = l.factoid_id and f.edge_id = p_edge;
  delete from graph.factoids where edge_id = p_edge;
  get diagnostics v_factoids = row_count;

  return jsonb_build_object('ok', true, 'factoids', v_factoids, 'lineage', v_lineage);
end;
$$;

revoke all on function graph.evolution_edge_fits(text, text, text) from public, anon, authenticated;
revoke all on function graph.edges_evolution_endpoints() from public, anon, authenticated;
revoke all on function graph.factoid_role_fits(text, text) from public, anon, authenticated;
revoke all on function graph.edge_factoid_role_fits(text, text) from public, anon, authenticated;
revoke all on function graph.factoids_attachment() from public, anon, authenticated;
revoke all on function graph.gold_lineage_rules() from public, anon, authenticated;
revoke all on function graph.promote_history_factoid(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function graph.evolution_promote_core(uuid, uuid, boolean, uuid, text) from public, anon, authenticated, service_role;
revoke all on function graph.promote_evolution_factoid(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function graph.promote_evolution_batch(uuid) from public, anon, authenticated;
revoke all on function graph.prefer_history_factoid(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function graph.revive_history_factoids(uuid[]) from public, anon, authenticated, service_role;
revoke all on function graph.restore_withdrawn_node(uuid, uuid) from public, anon, authenticated;
revoke all on function graph.restore_withdrawn_history(text, uuid) from public, anon, authenticated;
revoke all on function graph.withdraw_identity_dependents(uuid, text[], text, text) from public, anon, authenticated, service_role;
revoke all on function graph.tag_identity_silver() from public, anon, authenticated;
revoke all on function graph.reject_evolution_silver(uuid, uuid, text) from public, anon, authenticated;
revoke all on function graph.medallion_withdrawal_cascade() from public, anon, authenticated;
revoke all on function graph.move_edge_factoids(uuid, uuid) from public, anon, authenticated;
revoke all on function graph.purge_edge_factoids(uuid, uuid) from public, anon, authenticated;
revoke all on graph.factoid_conflicts from anon, authenticated;
revoke all on graph.edge_factoid_conflicts from anon, authenticated;
revoke all on graph.node_when_where from anon, authenticated;

grant execute on function graph.factoid_role_fits(text, text) to service_role;
grant execute on function graph.edge_factoid_role_fits(text, text) to service_role;
grant execute on function graph.promote_history_factoid(uuid, uuid, boolean) to service_role;
grant execute on function graph.promote_evolution_factoid(uuid, uuid, boolean) to service_role;
grant execute on function graph.promote_evolution_batch(uuid) to service_role;
grant execute on function graph.prefer_history_factoid(uuid, text, uuid, text) to service_role;
grant execute on function graph.restore_withdrawn_node(uuid, uuid) to service_role;
grant execute on function graph.restore_withdrawn_history(text, uuid) to service_role;
grant execute on function graph.tag_identity_silver() to service_role;
grant execute on function graph.reject_evolution_silver(uuid, uuid, text) to service_role;
grant execute on function graph.move_edge_factoids(uuid, uuid) to service_role;
grant execute on function graph.purge_edge_factoids(uuid, uuid) to service_role;
grant select on graph.factoid_conflicts to service_role;
grant select on graph.edge_factoid_conflicts to service_role;
grant select on graph.node_when_where to service_role;
grant select, insert, update, delete on graph.evolution_series to service_role;
grant select, insert, update on graph.evolution_batch_reviews to service_role;
grant select on graph.purged_factoids to service_role;
grant select on graph.purged_gold_lineage to service_role;
