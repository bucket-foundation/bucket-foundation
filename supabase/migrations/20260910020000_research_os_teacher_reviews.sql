-- Research OS for K-12, internalization hold and teacher review (bkt-ros,
-- Phase 1 item 4 from the Phase 0 PR's stub list). RESEARCH-OS-K12-SYSTEM-
-- REVIEW.md section 3 "Understanding versus Internalization, in practice":
-- "Teacher judgment is a first-class evidence kind from the start: a
-- teacher can advance or hold back a stage directly, with a required
-- one-line reason stored on the evidence record." Phase 0 shipped the hold
-- (src/lib/research-os/stages.ts onTransferItemAnswered, "held pending
-- teacher review") with no judgment path; this migration adds the table
-- that judgment writes to.
--
-- SCOPE: the review's own gap-analysis row "Role system" ("No `role` column
-- anywhere in the schema") is Phase 1 work that this migration leaves
-- alone. The reviewer check that gates writes to this table lives in application code
-- (src/lib/research-os/reviewer.ts, an env-var allowlist) rather than a
-- database role or RLS predicate, with a TODO in that file pointing at the
-- real roster-backed role system the gap analysis calls for. RLS below
-- still restricts every row to service-role writes plus owner/reviewer
-- reads, the same defense-in-depth posture as every other graph.* table.
--
-- Two review subjects, one table: a `graph.productions` row awaiting
-- 'submitted' -> 'accepted'/'returned', or a `graph.learner_node_state` row
-- whose most recent evidence event is a held transfer_item (see the
-- `kind` column). Exactly one of production_id / node_id is set, matching
-- `kind`.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

create table if not exists graph.teacher_reviews (
  id             uuid        primary key default gen_random_uuid(),
  reviewer_id    uuid        not null references auth.users (id) on delete cascade,
  learner_id     uuid        not null references auth.users (id) on delete cascade,
  kind           text        not null check (kind in ('transfer_item', 'production')),
  node_id        uuid        references graph.nodes (id) on delete cascade,
  production_id  uuid        references graph.productions (id) on delete cascade,
  decision       text        not null check (decision in ('approved', 'returned')),
  reason         text,
  -- The evidence event this decision produced on the learner's side (a
  -- 'teacher_review' evidence entry mirrored here for the review page's own
  -- audit trail, independent of learner_node_state.evidence).
  evidence       jsonb       not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  constraint graph_teacher_reviews_kind_target check (
    (kind = 'transfer_item' and node_id is not null and production_id is null) or
    (kind = 'production' and production_id is not null and node_id is null)
  )
);

create index if not exists graph_teacher_reviews_learner_idx on graph.teacher_reviews (learner_id);
create index if not exists graph_teacher_reviews_reviewer_idx on graph.teacher_reviews (reviewer_id);
create index if not exists graph_teacher_reviews_production_idx on graph.teacher_reviews (production_id);
create index if not exists graph_teacher_reviews_node_idx on graph.teacher_reviews (node_id);

alter table graph.teacher_reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'teacher_reviews' and policyname = 'own_select'
  ) then
    -- A learner sees judgments made about their own work; a reviewer sees
    -- the judgments they made. Nobody else reads this table directly (the
    -- review queue's aggregate view is server-only, through the service-role
    -- client, gated by src/lib/research-os/reviewer.ts).
    create policy own_select on graph.teacher_reviews for select
      using (auth.uid() = learner_id or auth.uid() = reviewer_id);
  end if;
end $$;
