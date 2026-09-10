-- Research OS for K-12, low-confidence edge flags (bkt-ros ros-03 item 3).
-- "Low-confidence edges on a returned chain are written to a
-- graph.edge_flags table (edge, learner, chain, created_at) so ros-06's
-- class view can surface them."
--
-- `target_node_id` is this row's "chain": the routing target whose computed
-- chain (src/lib/research-os/frontier.ts's computeFrontier, walked from
-- GET /api/research-os/route) surfaced the flagged edge. A flag is written
-- only for a signed-in learner (route/route.ts skips the write for an
-- anonymous request, which has no learner_id to attach a flag to).
--
-- One row per (edge, learner): `graph_edge_flags_edge_learner_uidx` backs
-- an upsert with `ignoreDuplicates: true` (db.ts's writeEdgeFlags), so
-- routing through the same weak edge on a later request never grows a
-- second row; `created_at` records when the flag was first raised.
--
-- RESOLUTION, deliberately out of this migration's scope (no `resolved`
-- column): this PR ships no teacher-facing UI beyond routing/flag write.
-- Resolving a flag today means a reviewer edits the underlying
-- graph.edges row directly (confidence, confidence_source = 'teacher'),
-- which stops it from re-triggering low_confidence flags on a later route
-- call; the edge_flags row itself stays as a historical log. See
-- learning/research-os/ROUTING.md, "how a teacher resolves a flag."
--
-- Idempotent: safe to re-run, matching every other migration in this repo.
-- See 20260910000000_research_os_graph.sql's header for why `graph` is a
-- private schema outside PostgREST's exposed-schema list.

create table if not exists graph.edge_flags (
  id              uuid        primary key default gen_random_uuid(),
  edge_id         uuid        not null references graph.edges (id) on delete cascade,
  learner_id      uuid        not null references auth.users (id) on delete cascade,
  target_node_id  uuid        not null references graph.nodes (id) on delete cascade,
  created_at      timestamptz not null default now()
);

create unique index if not exists graph_edge_flags_edge_learner_uidx on graph.edge_flags (edge_id, learner_id);
create index if not exists graph_edge_flags_learner_idx on graph.edge_flags (learner_id);
create index if not exists graph_edge_flags_target_idx on graph.edge_flags (target_node_id);

alter table graph.edge_flags enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'edge_flags' and policyname = 'own_select'
  ) then
    create policy own_select on graph.edge_flags for select using (auth.uid() = learner_id);
  end if;
end $$;
