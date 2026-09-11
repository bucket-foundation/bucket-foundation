-- Research OS for K-12, roster sync skeleton (bkt-ros, ros-06 follow-on
-- named in TEACHER-LAYER.md's own TODO and PLAN-REVISION-2.md section 3
-- item 4). Standard-first: this migration builds what an OneRoster 1.2
-- CSV import (src/lib/research-os/roster/) needs to write idempotently,
-- so a Clever or ClassLink adapter (both OneRoster-shaped once connected,
-- see _intake/research-os-k12/03-data-services.md section E) can land
-- later with no schema change.
--
-- Two changes:
--
-- 1. graph.classes and graph.learner_profiles each gain source_system and
-- sourced_id, nullable text columns naming which external roster row a
-- given class or learner profile came from. A manually created class or
-- profile (the only kind that existed before this migration) leaves both
-- null. The unique index on each table is a plain (non-partial) composite
-- index: standard SQL null semantics already do the right thing here (two
-- rows where both columns are null are never considered duplicates of
-- each other, only an exact non-null pair collides), so every
-- manually-created row keeps working with no predicate needed, and
-- PostgREST's on_conflict=source_system,sourced_id upsert target
-- (src/lib/research-os/roster/apply.ts) matches this index exactly. A
-- partial index would need the same predicate repeated in the upsert's
-- ON CONFLICT clause, which the PostgREST upsert API has no parameter for.
--
-- 2. graph.reviewer_candidates: a staging list of teachers a roster sync
-- has seen, status 'pending' until a human adds their email to
-- RESEARCH_OS_REVIEWER_EMAILS (src/lib/research-os/reviewer.ts). Syncing a
-- roster never grants review access by itself; the env-var allowlist
-- stays the only real gate (reviewer.ts's own documented Phase-1 floor).
-- This table holds staff contact information, the same "Not learner data"
-- posture DATA-INVENTORY.md already gives graph.classes' reviewer_email:
-- an adult's own contact information, outside a learner's own export or
-- delete rights, so RLS here is enabled with no anon/authenticated
-- policy at all (service-role only), matching graph.privacy_events'
-- posture, an audit-shaped table nobody's own session should read.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

-- ---------------------------------------------------------------------------
-- graph.classes: source_system, sourced_id
-- ---------------------------------------------------------------------------
alter table graph.classes add column if not exists source_system text;
alter table graph.classes add column if not exists sourced_id text;

create unique index if not exists graph_classes_source_idx on graph.classes (source_system, sourced_id);

-- ---------------------------------------------------------------------------
-- graph.learner_profiles: source_system, sourced_id
-- ---------------------------------------------------------------------------
-- Provenance metadata only: learner_id (already the table's primary key)
-- stays the real idempotency key for this table, since a learner_profiles
-- row can only ever exist for an already-real auth.users id (the roster
-- importer never creates one, see ROSTER.md "What is discarded"). These
-- two columns record which roster row last touched role/birth_year_bucket
-- here, so a future audit can tell a roster-derived value from a
-- learner's own self-reported one.
alter table graph.learner_profiles add column if not exists source_system text;
alter table graph.learner_profiles add column if not exists sourced_id text;

create unique index if not exists graph_learner_profiles_source_idx on graph.learner_profiles (source_system, sourced_id);

-- ---------------------------------------------------------------------------
-- graph.reviewer_candidates
-- ---------------------------------------------------------------------------
create table if not exists graph.reviewer_candidates (
  id             uuid        primary key default gen_random_uuid(),
  source_system  text        not null,
  sourced_id     text        not null,
  email          text        not null,
  name           text,
  status         text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists graph_reviewer_candidates_source_idx on graph.reviewer_candidates (source_system, sourced_id);
create index if not exists graph_reviewer_candidates_status_idx on graph.reviewer_candidates (status);

alter table graph.reviewer_candidates enable row level security;
-- No policy for anon/authenticated on purpose, see this migration's header.

drop trigger if exists graph_reviewer_candidates_touch on graph.reviewer_candidates;
create trigger graph_reviewer_candidates_touch
  before insert or update on graph.reviewer_candidates
  for each row execute function bucket.touch_updated_at();
