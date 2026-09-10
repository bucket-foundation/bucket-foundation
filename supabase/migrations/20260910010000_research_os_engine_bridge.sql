-- Research OS <-> hypothesis engine bridge (bkt-ros, engine bridge task).
-- Two additions:
--
-- 1. A unique index on `graph.edges (from_id, to_id, kind)`, so
--    `src/lib/research-os/db.ts`'s `writeEngineEdges` can upsert with
--    `onConflict: "from_id,to_id,kind"` and make a repeat write of the
--    same engine-hypothesis edge a no-op rather than a duplicate row
--    (task item 1's own idempotency requirement for the "cites"/
--    "derives_from" edges an accepted engine hypothesis writes alongside
--    its node).
--
-- 2. `public.research_os_productions_outbox` (task item 3): one row per
--    accepted `graph.productions` record, written by
--    `src/lib/research-os/db.ts`'s `writeProductionOutbox` whenever a
--    production's status becomes "accepted". SCHEMA CHOICE, deliberately
--    breaking this repo's usual "keep it in a private schema" convention
--    (see `20260612000000_academy_progress.sql`'s own header comment):
--    `tools/hypothesis-engine/hte/corpus/production.load_supabase` reads a
--    table over plain PostgREST with no `Accept-Profile` header, so only
--    the schema PostgREST serves by DEFAULT (`public` on this Supabase) is
--    reachable from the engine's own Python loader without a code change
--    there. `public` here does not mean publicly readable: RLS is enabled
--    below with NO policy for `anon`/`authenticated` at all, so those
--    roles see zero rows (RLS enabled plus zero permissive policies is
--    deny-all); only a service-role key (this app's own Next.js routes,
--    and the engine's own `SUPABASE_SERVICE_KEY`) bypasses RLS and can
--    reach this table. Full rationale: learning/research-os/ENGINE-
--    BRIDGE.md, "Why the outbox lives in `public`."
--
--    This row's own columns are the raw `graph.productions` columns, not
--    a hand-built `PRODUCTION-SCHEMA.md` envelope: `hte.corpus.production.
--    is_research_os_record` / `normalize_research_os_record` (PR #10,
--    `feat/hte-k12-research-os`, merging concurrently with this migration)
--    already detect and normalize this exact shape server-side, in Python
--    (fingerprint: a `target_node_id` column present, no `claims`
--    column), so a plain `select=*` row from this table is already what
--    `hte.corpus.production.Production.from_dict` reads, with no
--    conversion needed on the write side. `learner_id` and
--    `transfer_proof` are deliberately left off this table: the engine's
--    own normalizer never reads either, and leaving them off keeps a
--    pseudonymous-but-real user id and a learner's own scratch text out
--    of a table a second process reads (see ENGINE-BRIDGE.md).
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

create unique index if not exists graph_edges_from_to_kind_uidx
  on graph.edges (from_id, to_id, kind);

create table if not exists public.research_os_productions_outbox (
  id              uuid        primary key references graph.productions (id) on delete cascade,
  target_node_id  uuid        not null references graph.nodes (id),
  claim           text,
  evidence        jsonb       not null default '[]'::jsonb,
  sources         jsonb       not null default '[]'::jsonb,
  status          text        not null,
  created_at      timestamptz not null,
  updated_at      timestamptz,
  -- {"slug","title","tier","branch"}: the target node's own join,
  -- `hte.corpus.production.normalize_research_os_record`'s optional
  -- `_target_node` enrichment (PR #10). Null resolves to grade_band
  -- "unknown" engine-side rather than raising.
  _target_node    jsonb,
  emitted_at      timestamptz not null default now()
);

alter table public.research_os_productions_outbox enable row level security;
-- No policy for anon/authenticated on purpose: RLS enabled with zero
-- permissive policies denies every row to every role but service-role
-- (which bypasses RLS entirely). See header comment above.
