-- ros-ai-corpus, the admission registry (learning/research-os/ai/IMPLEMENTATION.md,
-- "Source identities"): which source revisions evidence search may index
-- and Quote may quote, decided by a server-owned job and checked under a
-- row lock.
--
-- A file manifest cannot be withdrawn inside a Quote transaction; a row
-- can. The corpus build (scripts/research-os/evidence/build-corpus.ts)
-- writes the artifacts, and its `admit` step records every revision here
-- and makes that corpus the active set in one transaction.
--
-- Two scopes share one identity scheme with graph.source_quote_receipts.
-- An `index` row carries a source's sourceRevision: its body may be
-- indexed. A `quote` row carries the revision a receipt records for one
-- curated passage: that passage may be quoted. A receipt and its admission
-- join on (source_id, source_revision) with no translation.

create table if not exists graph.evidence_source_admissions (
  source_id              text        not null,
  source_revision        text        not null,
  scope                  text        not null,
  -- The graph node the source maps to, when it has one.
  node_id                uuid        references graph.nodes (id) on delete set null,
  -- Normalized-text hash, and the hash of the text as it came.
  body_hash              text        not null,
  original_hash          text        not null,
  extraction_revision    text        not null,
  corpus_revision        text        not null,
  rights_rule            text        not null,
  rights_revision        integer     not null,
  rights_policy_sha256   text        not null,
  rights_policy_status   text        not null,
  allow_index            boolean     not null,
  allow_quote            boolean     not null,
  permission_evidence    jsonb       not null default '{}'::jsonb,
  status                 text        not null default 'staging',
  staged_at              timestamptz not null default now(),
  activated_at           timestamptz,
  retired_at             timestamptz,
  withdrawn_at           timestamptz,
  withdrawal_reason      text,
  constraint evidence_source_admissions_pkey primary key (source_id, source_revision),
  constraint evidence_source_admissions_scope check (scope in ('index', 'quote')),
  constraint evidence_source_admissions_status check (status in ('staging', 'active', 'superseded', 'withdrawn')),
  constraint evidence_source_admissions_policy_status check (rights_policy_status in ('draft', 'approved')),
  -- An index row permits indexing and a quote row permits quoting, and neither permits the other.
  constraint evidence_source_admissions_scope_permission check (
    (scope = 'index' and allow_quote = false) or (scope = 'quote' and allow_index = false)
  ),
  constraint evidence_source_admissions_source_id check (
    source_id ~ '^graph:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or source_id ~ '^doi:10\.[0-9]{4,9}/\S+$'
    or source_id ~ '^url:https?://\S+@[0-9a-f]{64}$'
  ),
  constraint evidence_source_admissions_hashes check (
    source_revision ~ '^[0-9a-f]{64}$' and body_hash ~ '^[0-9a-f]{64}$'
    and original_hash ~ '^[0-9a-f]{64}$' and corpus_revision ~ '^[0-9a-f]{64}$'
    and rights_policy_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint evidence_source_admissions_rights_revision check (rights_revision >= 1),
  -- A withdrawn row carries its date. A row re-admitted under a newer rights
  -- review keeps the date as history.
  constraint evidence_source_admissions_withdrawal check (status <> 'withdrawn' or withdrawn_at is not null)
);

-- One active revision per source and scope.
create unique index if not exists evidence_source_admissions_one_active
  on graph.evidence_source_admissions (source_id, scope) where status = 'active';
create index if not exists evidence_source_admissions_node_idx on graph.evidence_source_admissions (node_id);

alter table graph.evidence_source_admissions enable row level security;
-- No policy: no browser role reads or writes this table. The API reads it
-- as the service role, and every write goes through the functions below.
revoke all on graph.evidence_source_admissions from anon, authenticated;
-- 20260916010000 grants service_role everything on a new table in this
-- schema. Admissions move only through admit_evidence_corpus and
-- withdraw_evidence_source, so a direct write is refused.
grant select on graph.evidence_source_admissions to service_role;
revoke insert, update, delete, truncate, trigger, references on graph.evidence_source_admissions from service_role;

-- Records a built corpus and makes it the active set, in one transaction.
--
-- p_rows is the list the admit step builds from sources.jsonl and
-- passages.jsonl. Each row is staged; then, per source and scope, the
-- staged revision becomes active and the one it replaces becomes
-- superseded. A source withdrawn under a rights revision at or above the
-- incoming one stays out: an older rights review cannot undo a
-- withdrawal. Active rows whose source is absent from this corpus become
-- superseded, so the active set is the corpus.
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

  -- Serialize admissions, so two jobs cannot interleave their activations.
  perform pg_advisory_xact_lock(hashtext('graph.admit_evidence_corpus'));

  for r in select value from jsonb_array_elements(p_rows) loop
    v_source   := r->>'source_id';
    v_revision := r->>'source_revision';
    v_scope    := r->>'scope';
    v_rights   := (r->>'rights_revision')::integer;

    -- Every row of this source, locked, so a concurrent withdrawal or Quote
    -- check waits for this decision.
    perform 1 from graph.evidence_source_admissions where source_id = v_source for update;

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

    -- A revision seen before keeps its content, which its hash fixes, and
    -- takes the rights of this admission; a withdrawn one returns to staging.
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
    where a.status = 'active' and not ((a.source_id || ' ' || a.scope) = any (kept));
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

-- Withdraws every revision of a source, in both scopes. The rights
-- revision recorded on each row becomes the fence a later admission must
-- exceed. Returns the number of rows withdrawn.
create or replace function graph.withdraw_evidence_source(
  p_source_id text,
  p_reason    text
) returns integer
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  n integer;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'withdraw_evidence_source: a reason is required' using errcode = '22023';
  end if;
  perform 1 from graph.evidence_source_admissions where source_id = p_source_id for update;
  update graph.evidence_source_admissions
    set status = 'withdrawn', withdrawn_at = now(), withdrawal_reason = p_reason
    where source_id = p_source_id and status <> 'withdrawn';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- The Quote transaction's check: may this curated revision be quoted now?
-- The row is read FOR SHARE, so a withdrawal of this source waits until
-- the calling transaction ends, and the quotation it records was admitted
-- when it was written.
create or replace function graph.quote_admission(
  p_source_id       text,
  p_source_revision text
) returns table (allowed boolean, status text, rights_revision integer)
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
begin
  return query
    select (a.scope = 'quote' and a.status = 'active' and a.allow_quote), a.status, a.rights_revision
    from graph.evidence_source_admissions a
    where a.source_id = p_source_id and a.source_revision = p_source_revision
    for share;
  if not found then
    return query select false, 'unknown'::text, null::integer;
  end if;
end;
$$;

-- What search may score right now: active index revisions whose graph node
-- is still public and not merged away. The request's eligibility set.
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
  where a.scope = 'index' and a.status = 'active' and a.allow_index
    and (a.node_id is null or (n.visibility = 'public' and n.superseded_by is null))
  order by a.source_id;
$$;

revoke all on function graph.admit_evidence_corpus(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function graph.withdraw_evidence_source(text, text) from public, anon, authenticated;
revoke all on function graph.quote_admission(text, text) from public, anon, authenticated;
revoke all on function graph.eligible_evidence_sources() from public, anon, authenticated;
grant execute on function graph.admit_evidence_corpus(text, text, text, jsonb) to service_role;
grant execute on function graph.withdraw_evidence_source(text, text) to service_role;
grant execute on function graph.quote_admission(text, text) to service_role;
grant execute on function graph.eligible_evidence_sources() to service_role;
