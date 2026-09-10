-- Research OS for K-12, Phase 0 graph schema (bkt-ros, see
-- _intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md §3 "Knowledge
-- graph model" and §8 "Phase 0, prototype slice").
--
-- SCHEMA CHOICE: a new private `graph` schema, named after the review's own
-- proposed schema (§3 "Core schema (Postgres, `graph` schema)"), and kept
-- private the same way `bucket` is: the self-hosted, multi-tenant Supabase's
-- shared PostgREST exposes only public/storage/graphql_public/<tenant
-- schemas> (PGRST_DB_SCHEMAS), `graph` is not on that list, so the browser
-- cannot reach these tables directly. All access goes through same-origin
-- Next.js API routes under /api/research-os/*, which use a service-role
-- client the same way /api/academy/progress does. RLS below is defense in
-- depth (correct even if the schema were ever exposed), matching the
-- academy_progress / academy_credentials pattern.
--
-- POPULATION MODEL: one table serves both the K-12 atom population and the
-- canon population the review calls for (§3 "the graph carries two node
-- populations under one schema"). A handful of seeded rows in this migration's
-- companion seed (supabase/seed/research-os-sky-blue.json) mirror existing
-- learning/app/corpus/02-physics.json canon atoms as bridge nodes, linked by
-- `generalizes` / `example_of` edges, so the K-12 path and the canon are one
-- traversable graph rather than two.
--
-- PHASE 0 SCOPE, deliberately deferred (see the review's gap analysis, §4):
-- - `graph.prereq_ancestor` (the precomputed backward-closure table) is NOT
-- built here. The Phase 0 subgraph is 15-25 nodes; frontier-backward routing
-- (src/lib/research-os/frontier.ts) walks `graph.edges` at request time,
-- which is fast enough at this size. The closure table is real Phase 1 work
-- once the graph grows past a few hundred nodes.
-- - `grade_band int4range` from the review's ideal schema is NOT a column
-- here; Phase 0 approximates grade level with the `tier` smallint (see the
-- column comment below) and keeps the full range type for Phase 1.
-- - No teacher/school role, no roster, no payout ledger, no consent flow.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

create schema if not exists graph;

-- ---------------------------------------------------------------------------
-- graph.nodes
-- ---------------------------------------------------------------------------
create table if not exists graph.nodes (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  title       text        not null,
  kind        text        not null check (kind in ('fact','concept','law','derivation','primary_source','artifact')),
  -- Grade-level proxy; the review's full grade_band int4range is Phase 1 work.
  -- Path nodes carry an approximate US grade level (3-12). Canon-bridge nodes
  -- (rows whose provenance.type = 'mirror', see below) carry 90 as a sentinel
  -- meaning "adult, canon tier, outside any K-12 grade band" -- keeps `tier`
  -- orderable with a single smallint instead of a nullable plus a separate
  -- tier enum.
  tier        smallint    not null default 0,
  branch      text        not null,           -- canon branch slug, e.g. '02-physics'
  summary     text,
  -- i18n labels, keyed by BCP-47 locale: {"en": {"title": "...", "summary": "..."}}.
  -- `title`/`summary` above stay the English fallback so every reader that
  -- doesn't care about locales can ignore this column entirely.
  labels      jsonb       not null default '{}'::jsonb,
  -- Citation/source record. Two shapes seeded here:
  -- primary/textbook source: {"type":"primary_source"|"textbook"|"reference",
  --   "author","year","title","publisher","doi"?,"url"?,"license"?}
  -- canon-bridge mirror: {"type":"mirror","source":"learning/app/corpus/02-physics.json",
  --   "academy_atom_id":"waves","note":"..."}
  provenance  jsonb       not null default '{}'::jsonb,
  created_by  uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  superseded_by uuid      references graph.nodes (id)
);

create index if not exists graph_nodes_branch_idx on graph.nodes (branch);
create index if not exists graph_nodes_kind_idx   on graph.nodes (kind);

alter table graph.nodes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'nodes' and policyname = 'public_select'
  ) then
    create policy public_select on graph.nodes for select using (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- graph.edges
-- ---------------------------------------------------------------------------
create table if not exists graph.edges (
  id          uuid        primary key default gen_random_uuid(),
  from_id     uuid        not null references graph.nodes (id) on delete cascade,
  to_id       uuid        not null references graph.nodes (id) on delete cascade,
  kind        text        not null check (kind in ('prerequisite','derives_from','cites','generalizes','example_of','contradicts')),
  -- FIRe-style credit fraction (review §3), nullable outside 'prerequisite'.
  weight      real,
  provenance  jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint graph_edges_no_self_loop check (from_id <> to_id)
);

create index if not exists graph_edges_from_idx on graph.edges (from_id, kind);
create index if not exists graph_edges_to_idx   on graph.edges (to_id, kind);

alter table graph.edges enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'edges' and policyname = 'public_select'
  ) then
    create policy public_select on graph.edges for select using (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- graph.learner_node_state
-- ---------------------------------------------------------------------------
create table if not exists graph.learner_node_state (
  learner_id  uuid        not null references auth.users (id) on delete cascade,
  node_id     uuid        not null references graph.nodes (id) on delete cascade,
  stage       text        not null default 'access' check (stage in ('access','awareness','understanding','internalization','production')),
  -- Append-only evidence log for this (learner, node): each element is one
  -- evidence event, e.g. {"at":iso,"kind":"open"|"explanation"|"check"|
  -- "transfer_item"|"production","result":...}. Stage advancement rules live
  -- in src/lib/research-os/stages.ts and always append here before raising
  -- `stage` (task item 5, "log evidence").
  evidence    jsonb       not null default '[]'::jsonb,
  confidence  real,
  updated_at  timestamptz not null default now(),
  primary key (learner_id, node_id)
);

create index if not exists graph_lns_learner_idx on graph.learner_node_state (learner_id);

alter table graph.learner_node_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'learner_node_state' and policyname = 'own_select'
  ) then
    create policy own_select on graph.learner_node_state for select using (auth.uid() = learner_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'learner_node_state' and policyname = 'own_insert'
  ) then
    create policy own_insert on graph.learner_node_state for insert with check (auth.uid() = learner_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'learner_node_state' and policyname = 'own_update'
  ) then
    create policy own_update on graph.learner_node_state for update using (auth.uid() = learner_id) with check (auth.uid() = learner_id);
  end if;
end $$;

drop trigger if exists graph_lns_touch on graph.learner_node_state;
create trigger graph_lns_touch
  before insert or update on graph.learner_node_state
  for each row execute function bucket.touch_updated_at();

-- ---------------------------------------------------------------------------
-- graph.productions
-- ---------------------------------------------------------------------------
create table if not exists graph.productions (
  id              uuid        primary key default gen_random_uuid(),
  learner_id      uuid        not null references auth.users (id) on delete cascade,
  target_node_id  uuid        not null references graph.nodes (id),
  claim           text,
  -- [{source_id|node_id, quote, locator?}], the Quote tool's output the
  -- learner attached to their claim.
  evidence        jsonb       not null default '[]'::jsonb,
  -- [{label, url?, license?, doi?}], the closed citation set this production draws on.
  sources         jsonb       not null default '[]'::jsonb,
  -- The Internalization-stage transfer item and the learner's answer, gating
  -- submission per task item 5 ("understanding -> internalization: transfer
  -- prompt answered").
  transfer_proof  jsonb       not null default '{}'::jsonb,
  status          text        not null default 'draft' check (status in ('draft','submitted','accepted','returned')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists graph_productions_learner_idx on graph.productions (learner_id);
create index if not exists graph_productions_target_idx  on graph.productions (target_node_id);

alter table graph.productions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'productions' and policyname = 'own_select'
  ) then
    create policy own_select on graph.productions for select using (auth.uid() = learner_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'productions' and policyname = 'own_insert'
  ) then
    create policy own_insert on graph.productions for insert with check (auth.uid() = learner_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'productions' and policyname = 'own_update'
  ) then
    create policy own_update on graph.productions for update using (auth.uid() = learner_id) with check (auth.uid() = learner_id);
  end if;
end $$;

drop trigger if exists graph_productions_touch on graph.productions;
create trigger graph_productions_touch
  before insert or update on graph.productions
  for each row execute function bucket.touch_updated_at();
