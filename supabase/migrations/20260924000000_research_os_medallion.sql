alter table graph.evidence_source_admissions add column if not exists origin text not null default 'corpus';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evidence_source_admissions_origin') then
    alter table graph.evidence_source_admissions
      add constraint evidence_source_admissions_origin check (origin in ('corpus', 'medallion'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'evidence_source_admissions_medallion_scope') then
    alter table graph.evidence_source_admissions
      add constraint evidence_source_admissions_medallion_scope check (origin <> 'medallion' or scope = 'index');
  end if;
end $$;

alter table graph.evidence_source_admissions drop constraint if exists evidence_source_admissions_source_id;
alter table graph.evidence_source_admissions add constraint evidence_source_admissions_source_id check (
  source_id ~ '^graph:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or source_id ~ '^doi:10\.[0-9]{4,9}/\S+$'
  or source_id ~ '^url:https?://\S+@[0-9a-f]{64}$'
  or source_id ~ '^file:[0-9a-f]{64}$'
);

create or replace function graph.admit_evidence_corpus(
  p_corpus_revision text,
  p_policy_sha256   text,
  p_policy_status   text,
  p_rows            jsonb
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  r          jsonb;
  v_source   text;
  v_revision text;
  v_scope    text;
  v_rights   integer;
  v_existing text;
  v_active   text;
  v_inserted boolean;
  staged     integer := 0;
  activated  integer := 0;
  unchanged  integer := 0;
  retired    integer := 0;
  refused    jsonb := '[]'::jsonb;
  kept       text[] := '{}';
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'admit_evidence_corpus: p_rows must be a json array' using errcode = '22023';
  end if;
  if p_policy_status not in ('draft', 'approved') then
    raise exception 'admit_evidence_corpus: policy status % is neither draft nor approved', p_policy_status using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('graph.admit_evidence_corpus'));

  for r in select value from jsonb_array_elements(p_rows) loop
    v_source   := r->>'source_id';
    v_revision := r->>'source_revision';
    v_scope    := r->>'scope';
    v_rights   := (r->>'rights_revision')::integer;

    perform 1 from graph.evidence_source_admissions where source_id = v_source for update;

    if exists (
      select 1 from graph.evidence_source_admissions
      where source_id = v_source and origin = 'medallion'
    ) then
      refused := refused || jsonb_build_object('source_id', v_source, 'scope', v_scope, 'reason', 'held by the medallion bronze layer');
      continue;
    end if;

    if exists (
      select 1 from graph.evidence_source_admissions
      where source_id = v_source and status = 'withdrawn' and rights_revision >= v_rights
    ) then
      refused := refused || jsonb_build_object('source_id', v_source, 'scope', v_scope, 'reason', 'withdrawn under a rights revision at or above this one');
      continue;
    end if;

    select scope into v_existing from graph.evidence_source_admissions
      where source_id = v_source and source_revision = v_revision;
    if found and v_existing <> v_scope then
      raise exception 'admit_evidence_corpus: % % is held under scope %', v_source, v_revision, v_existing using errcode = '23505';
    end if;

    insert into graph.evidence_source_admissions as a (
      source_id, source_revision, scope, node_id, body_hash, original_hash, extraction_revision,
      corpus_revision, rights_rule, rights_revision, rights_policy_sha256, rights_policy_status,
      allow_index, allow_quote, permission_evidence
    ) values (
      v_source, v_revision, v_scope, nullif(r->>'node_id', '')::uuid, r->>'body_hash', r->>'original_hash',
      r->>'extraction_revision', p_corpus_revision, r->>'rights_rule', v_rights, p_policy_sha256, p_policy_status,
      coalesce((r->>'allow_index')::boolean, false), coalesce((r->>'allow_quote')::boolean, false),
      coalesce(r->'permission_evidence', '{}'::jsonb)
    )
    on conflict (source_id, source_revision) do update set
      node_id              = excluded.node_id,
      rights_rule          = excluded.rights_rule,
      rights_revision      = excluded.rights_revision,
      rights_policy_sha256 = excluded.rights_policy_sha256,
      rights_policy_status = excluded.rights_policy_status,
      permission_evidence  = excluded.permission_evidence,
      status               = case when a.status = 'withdrawn' then 'staging' else a.status end
    returning (xmax = 0) into v_inserted;
    if v_inserted then
      staged := staged + 1;
    end if;

    kept := kept || (v_source || ' ' || v_scope);
    select source_revision into v_active from graph.evidence_source_admissions
      where source_id = v_source and scope = v_scope and status = 'active';
    if v_active = v_revision then
      unchanged := unchanged + 1;
      continue;
    end if;
    if v_active is not null then
      update graph.evidence_source_admissions set status = 'superseded', retired_at = now()
        where source_id = v_source and source_revision = v_active;
    end if;
    update graph.evidence_source_admissions
      set status = 'active', activated_at = now(), retired_at = null, corpus_revision = p_corpus_revision
      where source_id = v_source and source_revision = v_revision;
    activated := activated + 1;
  end loop;

  update graph.evidence_source_admissions a
    set status = 'superseded', retired_at = now()
    where a.status = 'active' and a.origin = 'corpus' and not ((a.source_id || ' ' || a.scope) = any (kept));
  get diagnostics retired = row_count;

  return jsonb_build_object(
    'corpus_revision', p_corpus_revision,
    'staged', staged,
    'activated', activated,
    'unchanged', unchanged,
    'retired', retired,
    'refused', refused
  );
end;
$$;

create or replace function graph.eligible_evidence_sources()
returns table (source_id text, source_revision text, node_id uuid)
language sql
stable
security definer
set search_path = graph, pg_temp
as $$
  select a.source_id, a.source_revision, a.node_id
  from graph.evidence_source_admissions a
  left join graph.nodes n on n.id = a.node_id
  where a.scope = 'index' and a.status = 'active' and a.allow_index and a.origin = 'corpus'
    and (a.node_id is null or (n.visibility = 'public' and n.superseded_by is null))
  order by a.source_id;
$$;

create table if not exists graph.bronze_file_paths (
  source_id       text        not null,
  source_revision text        not null,
  repo_path       text        not null,
  recorded_at     timestamptz not null default now(),
  constraint bronze_file_paths_pkey primary key (source_id, source_revision, repo_path),
  constraint bronze_file_paths_admission foreign key (source_id, source_revision)
    references graph.evidence_source_admissions (source_id, source_revision) on delete cascade,
  constraint bronze_file_paths_file_id check (source_id ~ '^file:[0-9a-f]{64}$'),
  constraint bronze_file_paths_relative check (
    length(repo_path) between 1 and 512
    and repo_path !~ '^/'
    and repo_path !~ '^~'
    and repo_path !~ '\\'
    and repo_path !~ '(^|/)\.\.?(/|$)'
    and repo_path !~ '//'
    and repo_path !~ '[[:cntrl:]]'
    and repo_path ~ '^(_intake|bucket-canon|learning/app/corpus|supabase/seed|canon-figures|src/data)/'
  )
);
create index if not exists bronze_file_paths_path_idx on graph.bronze_file_paths (repo_path);
alter table graph.bronze_file_paths enable row level security;
revoke all on graph.bronze_file_paths from anon, authenticated;
grant select on graph.bronze_file_paths to service_role;
revoke insert, update, delete, truncate, trigger, references on graph.bronze_file_paths from service_role;

create table if not exists graph.silver_items (
  id               uuid        primary key default gen_random_uuid(),
  source_id        text        not null,
  source_revision  text        not null,
  import_file_id   uuid        references graph.import_files (id) on delete set null,
  kind             text        not null,
  span_start       integer     not null,
  span_end         integer     not null,
  locator          text,
  text_hash        text        not null,
  text             text,
  parser           text        not null,
  parser_revision  text        not null,
  confidence       real        not null,
  confidence_parts jsonb       not null default '{}'::jsonb,
  proposal         jsonb       not null default '{}'::jsonb,
  status           text        not null default 'candidate',
  created_at       timestamptz not null default now(),
  constraint silver_items_admission foreign key (source_id, source_revision)
    references graph.evidence_source_admissions (source_id, source_revision) on delete cascade,
  constraint silver_items_kind check (kind in ('claim', 'term', 'edge_candidate')),
  constraint silver_items_span check (span_start >= 0 and span_end >= span_start),
  constraint silver_items_text_hash check (text_hash ~ '^[0-9a-f]{64}$'),
  constraint silver_items_confidence check (confidence >= 0 and confidence <= 1),
  constraint silver_items_status check (status in ('candidate', 'proposed', 'promoted', 'rejected', 'withdrawn')),
  constraint silver_items_parser check (length(parser) between 1 and 80 and length(parser_revision) between 1 and 80),
  constraint silver_items_unique unique (source_id, source_revision, parser, parser_revision, kind, span_start, span_end)
);
create index if not exists silver_items_status_idx on graph.silver_items (status);
alter table graph.silver_items enable row level security;
revoke all on graph.silver_items from anon, authenticated;

create or replace function graph.silver_items_rights()
returns trigger
language plpgsql
set search_path = graph, pg_temp
as $$
declare
  v_allow  boolean;
  v_status text;
begin
  select allow_index, status into v_allow, v_status
    from graph.evidence_source_admissions
    where source_id = new.source_id and source_revision = new.source_revision;
  if tg_op = 'INSERT' and v_status = 'withdrawn' then
    raise exception 'silver_items: % is withdrawn', new.source_id using errcode = '23514';
  end if;
  if new.text is not null and not coalesce(v_allow, false) then
    raise exception 'silver_items: the rights rule for % refuses stored text', new.source_id using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists silver_items_rights on graph.silver_items;
create trigger silver_items_rights
  before insert or update on graph.silver_items
  for each row execute function graph.silver_items_rights();

create table if not exists graph.gold_lineage (
  id             uuid        primary key default gen_random_uuid(),
  node_id        uuid        references graph.nodes (id) on delete cascade,
  edge_id        uuid        references graph.edges (id) on delete cascade,
  silver_item_id uuid        not null references graph.silver_items (id) on delete restrict,
  promoted_by    text        not null,
  importer       text,
  reviewer_id    uuid        references auth.users (id) on delete set null,
  promoted_at    timestamptz not null default now(),
  constraint gold_lineage_one_target check ((node_id is null) <> (edge_id is null)),
  constraint gold_lineage_promoted_by check (promoted_by in ('reviewer', 'importer', 'backfill')),
  constraint gold_lineage_importer check (
    (promoted_by = 'importer' and importer in ('academy-import', 'canon-import'))
    or (promoted_by <> 'importer' and importer is null)
  )
);
create unique index if not exists gold_lineage_node_uidx on graph.gold_lineage (node_id, silver_item_id) where node_id is not null;
create unique index if not exists gold_lineage_edge_uidx on graph.gold_lineage (edge_id, silver_item_id) where edge_id is not null;
create index if not exists gold_lineage_silver_idx on graph.gold_lineage (silver_item_id);
alter table graph.gold_lineage enable row level security;
revoke all on graph.gold_lineage from anon, authenticated;

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

drop trigger if exists gold_lineage_rules on graph.gold_lineage;
create trigger gold_lineage_rules
  before insert on graph.gold_lineage
  for each row execute function graph.gold_lineage_rules();

alter table graph.edge_proposals add column if not exists silver_item_id uuid references graph.silver_items (id) on delete set null;
alter table graph.node_proposals add column if not exists silver_item_id uuid references graph.silver_items (id) on delete set null;

create table if not exists graph.medallion_withdrawn_nodes (
  node_id           uuid        primary key references graph.nodes (id) on delete cascade,
  prior_visibility  text        not null,
  source_id         text        not null,
  withdrawn_at      timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewer_id       uuid        references auth.users (id) on delete set null
);
alter table graph.medallion_withdrawn_nodes enable row level security;
revoke all on graph.medallion_withdrawn_nodes from anon, authenticated;

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

drop trigger if exists medallion_withdrawal_cascade on graph.evidence_source_admissions;
create trigger medallion_withdrawal_cascade
  after update of status on graph.evidence_source_admissions
  for each row
  when (new.status = 'withdrawn' and old.status is distinct from 'withdrawn')
  execute function graph.medallion_withdrawal_cascade();

create or replace function graph.admit_bronze_sources(
  p_run_revision  text,
  p_policy_sha256 text,
  p_policy_status text,
  p_rows          jsonb
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  r           jsonb;
  v_source    text;
  v_revision  text;
  v_path      text;
  v_rights    integer;
  v_active    text;
  v_origin    text;
  v_inserted  boolean;
  staged      integer := 0;
  activated   integer := 0;
  unchanged   integer := 0;
  superseded  integer := 0;
  n           integer;
  refused     jsonb := '[]'::jsonb;
  kept        text[] := '{}';
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'admit_bronze_sources: p_rows must be a json array' using errcode = '22023';
  end if;
  if p_policy_status not in ('draft', 'approved') then
    raise exception 'admit_bronze_sources: policy status % is neither draft nor approved', p_policy_status using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('graph.admit_evidence_corpus'));

  for r in select value from jsonb_array_elements(p_rows) loop
    kept := kept || (r->>'source_id');
  end loop;

  for r in select value from jsonb_array_elements(p_rows) loop
    v_source   := r->>'source_id';
    v_revision := r->>'source_revision';
    v_path     := r->>'repo_path';
    v_rights   := (r->>'rights_revision')::integer;

    if v_source !~ '^file:[0-9a-f]{64}$' or v_path is null then
      raise exception 'admit_bronze_sources: % needs a file: id and a repo path', v_source using errcode = '22023';
    end if;

    perform 1 from graph.evidence_source_admissions where source_id = v_source for update;

    select origin into v_origin from graph.evidence_source_admissions where source_id = v_source limit 1;
    if v_origin = 'corpus' then
      refused := refused || jsonb_build_object('source_id', v_source, 'reason', 'held by the evidence corpus');
      continue;
    end if;
    if exists (
      select 1 from graph.evidence_source_admissions
      where source_id = v_source and status = 'withdrawn' and rights_revision >= v_rights
    ) then
      refused := refused || jsonb_build_object('source_id', v_source, 'reason', 'withdrawn under a rights revision at or above this one');
      continue;
    end if;

    insert into graph.evidence_source_admissions as a (
      source_id, source_revision, scope, origin, body_hash, original_hash, extraction_revision,
      corpus_revision, rights_rule, rights_revision, rights_policy_sha256, rights_policy_status,
      allow_index, allow_quote, permission_evidence
    ) values (
      v_source, v_revision, 'index', 'medallion', r->>'body_hash', r->>'original_hash',
      r->>'extraction_revision', p_run_revision, r->>'rights_rule', v_rights, p_policy_sha256, p_policy_status,
      coalesce((r->>'allow_index')::boolean, false), false,
      coalesce(r->'permission_evidence', '{}'::jsonb)
    )
    on conflict (source_id, source_revision) do update set
      rights_rule          = excluded.rights_rule,
      rights_revision      = excluded.rights_revision,
      rights_policy_sha256 = excluded.rights_policy_sha256,
      rights_policy_status = excluded.rights_policy_status,
      allow_index          = excluded.allow_index,
      permission_evidence  = excluded.permission_evidence,
      status               = case when a.status = 'withdrawn' then 'staging' else a.status end
    where (a.rights_rule, a.rights_revision, a.rights_policy_sha256, a.allow_index, a.status)
      is distinct from (excluded.rights_rule, excluded.rights_revision, excluded.rights_policy_sha256, excluded.allow_index, 'active')
    returning (xmax = 0) into v_inserted;
    if v_inserted then
      staged := staged + 1;
    end if;

    if not coalesce((r->>'allow_index')::boolean, false) then
      update graph.silver_items set text = null
        where source_id = v_source and source_revision = v_revision and text is not null;
    end if;

    insert into graph.bronze_file_paths (source_id, source_revision, repo_path)
      values (v_source, v_revision, v_path)
      on conflict do nothing;

    update graph.evidence_source_admissions a
      set status = 'superseded', retired_at = now()
      where a.origin = 'medallion' and a.status = 'active' and a.source_id <> v_source
        and not (a.source_id = any (kept))
        and exists (select 1 from graph.bronze_file_paths p where p.source_id = a.source_id and p.source_revision = a.source_revision and p.repo_path = v_path)
        and not exists (
          select 1 from graph.bronze_file_paths p
          where p.source_id = a.source_id and p.source_revision = a.source_revision and p.repo_path <> v_path
        );
    get diagnostics n = row_count;
    superseded := superseded + n;

    v_active := null;
    select source_revision into v_active from graph.evidence_source_admissions
      where source_id = v_source and scope = 'index' and status = 'active';
    if v_active = v_revision then
      unchanged := unchanged + 1;
      continue;
    end if;
    if v_active is not null then
      update graph.evidence_source_admissions set status = 'superseded', retired_at = now()
        where source_id = v_source and source_revision = v_active;
      superseded := superseded + 1;
    end if;
    update graph.evidence_source_admissions
      set status = 'active', activated_at = now(), retired_at = null, corpus_revision = p_run_revision
      where source_id = v_source and source_revision = v_revision;
    activated := activated + 1;
  end loop;

  return jsonb_build_object(
    'run_revision', p_run_revision,
    'staged', staged,
    'activated', activated,
    'unchanged', unchanged,
    'superseded', superseded,
    'refused', refused
  );
end;
$$;

revoke all on function graph.admit_bronze_sources(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function graph.admit_bronze_sources(text, text, text, jsonb) to service_role;
revoke all on function graph.medallion_withdrawal_cascade() from public, anon, authenticated;
revoke all on function graph.silver_items_rights() from public, anon, authenticated;
revoke all on function graph.gold_lineage_rules() from public, anon, authenticated;
