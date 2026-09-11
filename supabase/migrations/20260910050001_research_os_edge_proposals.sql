-- Research OS for K-12, LLM-assisted edge proposal queue (bkt-ros ros-13,
-- task item 3: "Human review UI ... lists proposals with justification and
-- confidence"). scripts/research-os/ingest/infer-edges-llm.ts (task item 1)
-- writes a `prerequisite` edge candidate here as `status = 'pending'` when
-- Supabase is configured -- a queued proposal, never an applied edge; that
-- script writes no row to graph.edges itself, the same "never apply" rule
-- infer-edges.ts already keeps for its own lexical proposals. Only the
-- /research-os/edges review route's approve action
-- (src/lib/research-os/inference/decide.ts's `decideEdgeProposal`) ever
-- writes to graph.edges, at confidence 0.95 and confidence_source
-- 'teacher'.
--
-- Deliberately a separate table from graph.edges rather than a fifth
-- 'inferred_llm' confidence_source value on that table: an
-- 'inferred_llm'-sourced row would need to exist on graph.edges before a
-- reviewer ever sees it for this UI to have anything to show, which is
-- exactly the "queues for human review before it can affect routing" step
-- learning/research-os/INGESTION.md's own architecture-review citation
-- warns against skipping. This table is that queue; graph.edges only ever
-- gains a row once a reviewer decides.
--
-- IDEMPOTENCY: `graph_edge_proposals_pair_uidx` (from_slug, to_slug) plus
-- the ingestion script's own `ignoreDuplicates` upsert means a re-run
-- never resets an already-decided proposal back to pending, and never
-- duplicates a still-pending one -- a human decision, once recorded, is
-- never silently overwritten by a later pipeline run.
--
-- RLS: enabled with no policies, denying every anon/authenticated read or
-- write. There is no learner-owned row here to scope a policy to (unlike
-- graph.teacher_reviews' learner_id/reviewer_id own_select); every access
-- goes through the API route's service-role client
-- (src/lib/research-os/db.ts's graphService()), gated in application code
-- by src/lib/research-os/reviewer.ts's verifyReviewer, matching this
-- table's own role as a review queue behind that gate.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

create table if not exists graph.edge_proposals (
  id                       uuid        primary key default gen_random_uuid(),
  from_slug                text        not null,
  to_slug                  text        not null,
  branch                   text        not null,
  confidence               real        not null check (confidence > 0 and confidence <= 1),
  confidence_source        text        not null default 'inferred_llm' check (confidence_source = 'inferred_llm'),
  -- Whether the two independently-phrased prompts agreed (task item 2's
  -- agreement check); false means this row surfaced despite a split
  -- verdict, learning/research-os/ROUTING.md's same-section-conflation
  -- risk made concrete for this one pair.
  agreement                boolean     not null,
  justification            text        not null,
  secondary_justification  text,
  model                    text        not null,
  prompt_hash              text        not null,
  secondary_prompt_hash    text,
  status                   text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id              uuid        references auth.users (id) on delete set null,
  decision_reason          text,
  decided_at               timestamptz,
  created_at               timestamptz not null default now(),
  constraint graph_edge_proposals_pair_uidx unique (from_slug, to_slug)
);

create index if not exists graph_edge_proposals_status_idx on graph.edge_proposals (status);

alter table graph.edge_proposals enable row level security;
