create table if not exists graph.factoids (
  id             uuid        primary key default gen_random_uuid(),
  subject_id     uuid        not null references graph.nodes (id) on delete cascade,
  role           text        not null,
  place_id       uuid        references graph.places (id) on delete restrict,
  period_id      text        references graph.periods (id),
  edtf           text        not null,
  start_year     integer     not null,
  end_year       integer     not null,
  start_min      integer     not null,
  start_max      integer     not null,
  end_min        integer     not null,
  end_max        integer     not null,
  span           int4range   generated always as (int4range(least(start_min, end_max), greatest(start_min, end_max), '[]')) stored,
  precision      text        not null,
  calendar       text        not null,
  qualifier      text        not null,
  as_recorded    text,
  uncertainty    jsonb       not null,
  confidence     real        not null,
  source_node_id uuid        references graph.nodes (id) on delete set null,
  locator        text,
  silver_item_id uuid        not null references graph.silver_items (id) on delete restrict,
  preferred      boolean     not null default false,
  status         text        not null default 'active',
  reviewed_by    uuid        references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint factoids_silver_role_key unique (silver_item_id, role),
  constraint factoids_role check (role in ('born', 'died', 'flourished', 'occurred', 'founded', 'occupied', 'composed', 'published', 'arose')),
  constraint factoids_edtf check (edtf ~ '^(Y-?[1-9][0-9]{4,8}|-?[0-9]{4}(-[0-9]{2}){0,2}|-?[0-9]{2}([0-9]X|XX))[?~%]?(/(Y-?[1-9][0-9]{4,8}|-?[0-9]{4}(-[0-9]{2}){0,2}|-?[0-9]{2}([0-9]X|XX))[?~%]?)?$'),
  constraint factoids_start check (start_min <= start_year and start_year <= start_max),
  constraint factoids_end check (end_min <= end_year and end_year <= end_max),
  constraint factoids_extent check (start_year <= end_year and start_min <= end_min and start_max <= end_max),
  constraint factoids_precision check (precision in ('day', 'month', 'year', 'decade', 'century', 'millennium', 'ka', '10ka', '100ka')),
  constraint factoids_calendar check (calendar in ('gregorian', 'julian', 'julian-os', 'hebrew', 'islamic', 'chinese', 'other')),
  constraint factoids_qualifier check (qualifier in ('none', 'approximate', 'uncertain', 'both')),
  constraint factoids_uncertainty check (jsonb_typeof(uncertainty) = 'object'),
  constraint factoids_confidence check (confidence >= 0 and confidence <= 1),
  constraint factoids_status check (status in ('active', 'withdrawn'))
);
create unique index if not exists factoids_preferred_uidx on graph.factoids (subject_id, role) where preferred and status = 'active';
create index if not exists factoids_subject_role_idx on graph.factoids (subject_id, role);
create index if not exists factoids_span_idx on graph.factoids using gist (span);
create index if not exists factoids_place_idx on graph.factoids (place_id);
alter table graph.factoids enable row level security;
revoke all on graph.factoids from anon, authenticated;

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
    else false
  end;
$$;

create or replace function graph.factoids_attachment()
returns trigger
language plpgsql
set search_path = graph, pg_temp
as $$
declare
  v_kind text;
begin
  select kind into v_kind from graph.nodes where id = new.subject_id;
  if not graph.factoid_role_fits(v_kind, new.role) then
    raise exception 'factoids: a % node takes no % factoid', coalesce(v_kind, '(missing)'), new.role using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists factoids_attachment on graph.factoids;
create trigger factoids_attachment
  before insert or update of subject_id, role on graph.factoids
  for each row execute function graph.factoids_attachment();

alter table graph.gold_lineage add column if not exists factoid_id uuid references graph.factoids (id) on delete cascade;
alter table graph.gold_lineage drop constraint if exists gold_lineage_one_target;
alter table graph.gold_lineage add constraint gold_lineage_one_target check (num_nonnulls(node_id, edge_id, factoid_id) = 1);
alter table graph.gold_lineage drop constraint if exists gold_lineage_importer;
alter table graph.gold_lineage add constraint gold_lineage_importer check (
  (promoted_by = 'importer' and importer in ('academy-import', 'canon-import', 'history-import'))
  or (promoted_by <> 'importer' and importer is null)
);
create unique index if not exists gold_lineage_factoid_uidx on graph.gold_lineage (factoid_id, silver_item_id) where factoid_id is not null;

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

  if new.factoid_id is not null then
    if new.promoted_by = 'importer' then
      select rights_rule into v_rule from graph.evidence_source_admissions
        where source_id = v_item.source_id and source_revision = v_item.source_revision;
      if new.importer <> 'history-import' or coalesce(v_rule, '') not in ('canon-site', 'canon-figure', 'canon-timeline') then
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
    order by created_at, id
    for update
  loop
    update graph.factoids set
      status = 'active',
      preferred = f.preferred and not exists (
        select 1 from graph.factoids o
        where o.subject_id = f.subject_id and o.role = f.role and o.preferred and o.status = 'active' and o.id <> f.id
      )
    where id = f.id;
    revived := revived + 1;
  end loop;
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

  with revived as (
    update graph.silver_items s
      set status = 'promoted'
      where s.status = 'withdrawn' and s.source_id = p_source and s.source_revision = v_revision
        and exists (
          select 1 from graph.factoids f
          where f.silver_item_id = s.id
            and not exists (select 1 from graph.medallion_withdrawn_nodes q where q.node_id = f.subject_id)
        )
      returning s.id
  )
  select coalesce(array_agg(id), '{}') into v_silver from revived;

  v_factoids := graph.revive_history_factoids(v_silver);

  return jsonb_build_object('ok', true, 'places', v_places, 'periods', v_periods, 'silver_revived', cardinality(v_silver), 'factoids_revived', v_factoids);
end;
$$;

revoke all on function graph.factoid_role_fits(text, text) from public, anon, authenticated;
revoke all on function graph.factoids_attachment() from public, anon, authenticated;
revoke all on function graph.gold_lineage_rules() from public, anon, authenticated;
revoke all on function graph.medallion_withdrawal_cascade() from public, anon, authenticated;
revoke all on function graph.revive_history_factoids(uuid[]) from public, anon, authenticated, service_role;
revoke all on function graph.promote_history_factoid(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function graph.restore_withdrawn_node(uuid, uuid) from public, anon, authenticated;
revoke all on function graph.restore_withdrawn_history(text, uuid) from public, anon, authenticated;
grant execute on function graph.factoid_role_fits(text, text) to service_role;
grant execute on function graph.promote_history_factoid(uuid, uuid, boolean) to service_role;
grant execute on function graph.restore_withdrawn_node(uuid, uuid) to service_role;
grant execute on function graph.restore_withdrawn_history(text, uuid) to service_role;
