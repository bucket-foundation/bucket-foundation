-- Research OS for K-12, prereq_ancestor closure table (bkt-ros, Phase 1
-- item 1 from the Phase 0 PR's stub list: "prereq_ancestor closure table:
-- migration plus a maintenance function or script that rebuilds it from
-- edges"). Mirrors RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3's
-- `graph.prereq_ancestor (node_id, ancestor_id, min_hops)` shape exactly, so
-- rows computed by src/lib/research-os/closure.ts upsert directly into this
-- table with no reshaping.
--
-- REBUILD MODEL: this table is a derived cache; graph.edges is the source
-- of truth and stays authoritative. This table is rebuilt in full by
-- scripts/rebuild-prereq-ancestor.ts (closure.ts's computeAncestorClosure),
-- which deletes and reinserts every row for the branch it is given. At
-- Phase 0/1 graph sizes (tens to low thousands of nodes) a full rebuild on
-- every edge change is fine; an incrementally-refreshed worker is Phase 2+
-- work per the review's gap analysis row "Prerequisite ancestor closure
-- table."
--
-- src/lib/research-os/frontier.ts's computeFrontier accepts this table's
-- rows as an optional `ancestorRows` argument and prunes the routable
-- subgraph to the target's closure before walking when rows are supplied,
-- falling back to the full request-time walk over graph.edges when the
-- table is empty (e.g. a fresh environment that has not run the rebuild
-- script yet) or the read fails.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.
-- See 20260910000000_research_os_graph.sql's header for why `graph` is a
-- private schema outside PostgREST's exposed-schema list.

create table if not exists graph.prereq_ancestor (
  node_id     uuid        not null references graph.nodes (id) on delete cascade,
  ancestor_id uuid        not null references graph.nodes (id) on delete cascade,
  min_hops    smallint    not null,
  updated_at  timestamptz not null default now(),
  primary key (node_id, ancestor_id)
);

create index if not exists graph_prereq_ancestor_ancestor_idx on graph.prereq_ancestor (ancestor_id);

alter table graph.prereq_ancestor enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'prereq_ancestor' and policyname = 'public_select'
  ) then
    create policy public_select on graph.prereq_ancestor for select using (true);
  end if;
end $$;
