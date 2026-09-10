-- Research OS for K-12, edge confidence (bkt-ros ros-03 item 1). PLAN-
-- REVISION-1.md section 2b, "Frontier routing under Gasparetti 2017": "Every
-- `prerequisite` edge in the route API's target-backward walk carries a
-- confidence weight." Two columns on graph.edges:
--
-- `confidence` (real, default 1.0): how sure the graph is that this edge is
--   a real prerequisite relationship. Read through src/lib/research-os/
--   types.ts's edgeConfidence() rather than the raw column, which also
--   clamps a bad value into (0, 1].
-- `confidence_source` (text, nullable): which pipeline set the confidence.
--   Five values in use across this codebase's importers and reviewer
--   workflow: 'seed' (scripts/seed-research-os.mjs, 1.0), 'academy_requires'
--   (src/lib/research-os/ingest/academy.ts, 1.0), 'canon_map'
--   (.../ingest/canon.ts, 0.9), 'inferred' (scripts/research-os/ingest/
--   infer-edges.ts's own offline proposals, never applied by that script;
--   src/lib/research-os/ingest/types.ts's CONFIDENCE_DEFAULTS.inferred is
--   0.5 as the systemwide fallback for the source name alone), 'teacher' (a
--   reviewer's own confirmation of a flagged edge, ros-06 territory,
--   learning/research-os/ROUTING.md). Nullable rather than a fifth
--   'unknown' value: a non-prerequisite edge (cites/generalizes/example_of/
--   contradicts) never gets a source tag from today's importers, and the
--   default `confidence` of 1.0 already covers it (see ROUTING.md,
--   "confidence sources").
--
-- graph.prereq_ancestor also gains `min_confidence` (bkt-ros ros-03 item
-- 1's "prereq_ancestor rebuild carries min-confidence along the path"): the
-- minimum single-edge confidence along the same shortest-hop path
-- `min_hops` already records (src/lib/research-os/closure.ts's
-- `ancestorsOf`), a cheap summary statistic; frontier.ts's computeFrontier
-- walks the confidence-optimal chain itself at request time.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

alter table graph.edges add column if not exists confidence real not null default 1.0;
alter table graph.edges add column if not exists confidence_source text;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'graph' and table_name = 'edges' and constraint_name = 'graph_edges_confidence_range'
  ) then
    alter table graph.edges add constraint graph_edges_confidence_range check (confidence > 0 and confidence <= 1);
  end if;
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'graph' and table_name = 'edges' and constraint_name = 'graph_edges_confidence_source_check'
  ) then
    alter table graph.edges add constraint graph_edges_confidence_source_check
      check (confidence_source is null or confidence_source in ('seed', 'academy_requires', 'canon_map', 'inferred', 'teacher'));
  end if;
end $$;

alter table graph.prereq_ancestor add column if not exists min_confidence real not null default 1.0;
