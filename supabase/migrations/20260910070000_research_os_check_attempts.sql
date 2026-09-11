-- Research OS for K-12, persisted held-attempt store for Check cognitive
-- forcing (bkt-ros, learning/research-os/PLAN-REVISION-2.md section 2a;
-- src/lib/research-os/forcing.ts's module header, "the store is NOT what
-- production runs on"). The prior implementation held a graded-but-not-
-- yet-revealed Check attempt in a plain in-memory Map inside the route's
-- module scope. On Vercel that Map is per-instance: a phase-1 "check" call
-- and its phase-2 reveal can land on two different warm instances, so the
-- held verdict silently vanishes and the learner sees the Check form again
-- with no explanation. This migration moves the held attempt into Postgres
-- so it survives across instances, matching every other piece of Check
-- state (graph.learner_node_state, graph.productions).
--
-- Two objects:
--
-- 1. graph.check_attempts: one row per ungraded-to-the-learner Check call,
-- the durable twin of forcing.ts's PendingCheckAttempt. `grade` carries the
-- full GradeResult (result/confidence/abstained/feedback/citations) as
-- jsonb, computed once at phase 1 and never recomputed; revealing it is a
-- read plus a delete (single-use, matching forcing.ts's consumePendingAttempt),
-- never an update, so a second reveal attempt on the same id finds nothing,
-- the same "not_found on replay" contract the in-memory store already
-- guaranteed. `learner_confidence`/`source_prediction`/`prediction_correct`/
-- `revealed_at` are written by the reveal itself in the simulated/export
-- read path only; the real reveal deletes the row rather than filling
-- these in, so they exist for a future audit-trail change (e.g. tombstone
-- rather than hard-delete on reveal) but are not read by any code path
-- today. RLS: own_select only, matching graph.learner_node_state's
-- defense-in-depth posture; there is no own_insert/own_update/own_delete
-- policy, this table is written exclusively by the service-role client
-- (src/lib/research-os/check-attempts-db.ts), never directly by a signed-in
-- learner's own session.
--
-- 2. graph.purge_expired_check_attempts(): deletes every check_attempts row
-- older than 24 hours, across every learner, and returns the count removed.
-- This is the "held attempts older than 24 hours are purged" rule: the
-- 30-minute ATTEMPT_TTL_MS in forcing.ts already makes a held attempt
-- unrevealable past 30 minutes (checkAttemptAccess's TTL check, run by
-- both stores), so this 24-hour function is a second, outer bound, actual
-- row deletion rather than "reads as expired." This repo has no cron
-- infrastructure (no pg_cron extension enabled, no scheduled job runner
-- for Supabase-side hygiene, verified by grep across supabase/migrations/),
-- so rather than add one for a single low-volume table, this function is
-- called from the one path this repo already invokes on every
-- learner-initiated privacy action: graph.privacy_delete_learner below,
-- amended by this migration to purge check_attempts globally as a side
-- effect of any delete request, on top of deleting the requesting
-- learner's own rows regardless of age (a delete request removes
-- everything belonging to that learner now, not only what has expired).
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

-- ---------------------------------------------------------------------------
-- graph.check_attempts
-- ---------------------------------------------------------------------------
create table if not exists graph.check_attempts (
  id                  uuid        primary key default gen_random_uuid(),
  learner_id          uuid        not null references auth.users (id) on delete cascade,
  node_id             uuid        not null references graph.nodes (id) on delete cascade,
  session_id          text,
  explanation         text        not null,
  -- The node's own single allowed citation label (grounding.ts's
  -- citationLabel), the correct answer computePredictionCorrect checks a
  -- source prediction against. Stored rather than re-derived on reveal, so
  -- a later provenance edit to the node can never change what a held
  -- attempt's own reveal grades against.
  allow_label         text        not null,
  -- The full GradeResult computed at phase 1 (result/confidence/abstained/
  -- feedback/citations), see src/lib/research-os/grounding.ts. Never
  -- recomputed; the whole point of holding it is that phase 2 reveals the
  -- SAME verdict phase 1 already computed, never a fresh model call.
  grade               jsonb       not null,
  current_stage       text        not null check (current_stage in ('access','awareness','understanding','internalization','production')),
  forcing_enabled     boolean     not null default true,
  -- Filled only on a reveal path that chooses to tombstone rather than
  -- delete; the real reveal (check-attempts-db.ts's dbRevealPendingAttempt)
  -- deletes the row instead, see this migration's header.
  learner_confidence  text        check (learner_confidence in ('not_sure','a_little','fairly','certain')),
  source_prediction   text,
  prediction_correct  boolean,
  revealed_at         timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists graph_check_attempts_learner_idx    on graph.check_attempts (learner_id);
create index if not exists graph_check_attempts_created_at_idx on graph.check_attempts (created_at);

alter table graph.check_attempts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'check_attempts' and policyname = 'own_select'
  ) then
    create policy own_select on graph.check_attempts for select using (auth.uid() = learner_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- graph.purge_expired_check_attempts(): 24-hour hard expiry sweep.
-- ---------------------------------------------------------------------------
create or replace function graph.purge_expired_check_attempts()
returns int
language plpgsql
security definer
set search_path = graph, public
as $$
declare
  v_deleted int;
begin
  delete from graph.check_attempts where created_at < now() - interval '24 hours';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- ---------------------------------------------------------------------------
-- graph.privacy_delete_learner: amended to also delete this learner's own
-- check_attempts rows (any age) and to purge every learner's expired rows
-- as a side effect (this migration's header explains why this path carries
-- that hygiene sweep). `create or replace` keeps the same signature
-- 20260910040000_research_os_privacy_consent.sql defined; re-declaring a
-- plpgsql function body in a later migration is the standard, safe way to
-- extend it, the table it now also touches did not exist when that earlier
-- migration ran, so this could never have been folded into it.
-- ---------------------------------------------------------------------------
create or replace function graph.privacy_delete_learner(
  p_learner_id uuid,
  p_actor_id uuid default null,
  p_acting_as_reviewer boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = graph, bucket, public
as $$
declare
  v_learner_node_state int;
  v_productions         int;
  v_teacher_reviews     int;
  v_edge_flags          int;
  v_class_members       int;
  v_learner_profiles    int;
  v_check_attempts      int;
  v_academy_progress    int;
  v_academy_profiles    int;
  v_academy_credentials int;
begin
  delete from graph.learner_node_state where learner_id = p_learner_id;
  get diagnostics v_learner_node_state = row_count;

  -- Cascades to public.research_os_productions_outbox via that table's own
  -- `id` foreign key (on delete cascade), see this migration's header.
  delete from graph.productions where learner_id = p_learner_id;
  get diagnostics v_productions = row_count;

  -- Only rows where THIS learner is the subject. A reviewer's own
  -- decisions about other learners are untouched, even when the reviewer
  -- and the learner being deleted happen to share the same account.
  delete from graph.teacher_reviews where learner_id = p_learner_id;
  get diagnostics v_teacher_reviews = row_count;

  delete from graph.edge_flags where learner_id = p_learner_id;
  get diagnostics v_edge_flags = row_count;

  -- Only the learner's own membership row. The class object itself
  -- (graph.classes: name, reviewer_email) belongs to the reviewer and
  -- stays untouched (see 20260910030000_research_os_classes.sql).
  delete from graph.class_members where learner_id = p_learner_id;
  get diagnostics v_class_members = row_count;

  delete from graph.learner_profiles where learner_id = p_learner_id;
  get diagnostics v_learner_profiles = row_count;

  -- Every held-attempt row for this learner, regardless of age: a delete
  -- request removes all of this learner's data now, not only what has
  -- already crossed the 24-hour hard expiry.
  delete from graph.check_attempts where learner_id = p_learner_id;
  get diagnostics v_check_attempts = row_count;

  delete from bucket.academy_progress where user_id = p_learner_id;
  get diagnostics v_academy_progress = row_count;

  delete from bucket.academy_profiles where user_id = p_learner_id;
  get diagnostics v_academy_profiles = row_count;

  delete from bucket.academy_credentials where user_id = p_learner_id;
  get diagnostics v_academy_credentials = row_count;

  insert into graph.privacy_events (learner_id_hash, action, actor_id_hash, acting_as_reviewer)
  values (
    encode(digest(p_learner_id::text, 'sha256'), 'hex'),
    'delete',
    case when p_actor_id is not null then encode(digest(p_actor_id::text, 'sha256'), 'hex') else null end,
    coalesce(p_acting_as_reviewer, false)
  );

  -- Hygiene: any OTHER learner's check_attempts rows past the 24-hour hard
  -- expiry are swept here too, see this migration's header for why this
  -- path carries that sweep. Best-effort within the same transaction; a
  -- failure here would roll back the whole delete, which is acceptable,
  -- purge_expired_check_attempts only deletes rows, it cannot fail on
  -- data it does not touch.
  perform graph.purge_expired_check_attempts();

  return jsonb_build_object(
    'learner_node_state', v_learner_node_state,
    'productions', v_productions,
    'teacher_reviews', v_teacher_reviews,
    'edge_flags', v_edge_flags,
    'class_members', v_class_members,
    'learner_profiles', v_learner_profiles,
    'check_attempts', v_check_attempts,
    'academy_progress', v_academy_progress,
    'academy_profiles', v_academy_profiles,
    'academy_credentials', v_academy_credentials
  );
end;
$$;
