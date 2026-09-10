-- Research OS for K-12, minors compliance pack part A (bkt-ros ros-07).
-- _intake/research-os-k12/04-compliance-distribution.md sections 1-2 name
-- two obligations this migration builds the skeleton for: COPPA verifiable
-- parental consent before collecting personal information from a known
-- under-13 user, and a named deletion/export path a parent, district, or
-- learner can invoke. PLAN-REVISION-1.md section 3 item 8 scopes ros-07 to
-- the decision-independent part only: the age/consent gate's SHAPE (roles,
-- age buckets, consent source) does not depend on which verified-parental-
-- consent vendor gets picked once the Phase 0 front-door decision (sky-blue
-- vs quantum-history) resolves, so this migration is safe to ship now.
--
-- Three objects:
--
-- 1. graph.learner_profiles: one row per learner, the age/role/consent
-- record src/lib/research-os/consent.ts's requireConsent() reads. See that
-- file for the gating rule. A missing row means "age not yet asked," which
-- requireConsent() treats as the strictest case (see that file's header),
-- so a fresh account defaults to blocked rather than defaults to open.
--
-- 2. graph.privacy_events: an audit log for the export/delete API route
-- (src/app/api/research-os/privacy/route.ts). Deliberately holds NO raw
-- learner id, only a one-way sha256 hash of it (`digest`, pgcrypto),
-- matching this migration's own privacy-minimization principle: an audit
-- trail proving an export or delete happened, and roughly when, without
-- itself becoming a second place a learner's identity is stored longer
-- than the data it is logging the deletion of. Also carries a hashed
-- actor id and an acting_as_reviewer flag, so a reviewer invoking export
-- or delete on a learner's behalf leaves an audit row distinguishable
-- from the learner's own self-request; a self-request's actor_id_hash
-- equals its own learner_id_hash, no new information beyond what was
-- already stored.
--
-- 3. graph.privacy_delete_learner(uuid): the one-transaction hard-delete
-- the compliance pack's task item 2 calls for. A single plpgsql function
-- body is one Postgres transaction by construction (Postgres has no
-- interactive multi-statement transaction over plain PostgREST across
-- more than one table), so this is the correct place for the atomicity
-- guarantee rather than a sequence of separate REST calls from the API
-- route. Touches every learner-keyed table this repo has today: graph.*
-- (learner_node_state, productions, teacher_reviews, edge_flags,
-- class_members, learner_profiles) and bucket.* (academy_progress,
-- academy_profiles, academy_credentials), see learning/research-os/compliance/
-- DATA-INVENTORY.md for why each one is in scope. Deleting a graph.
-- productions row cascades to its public.research_os_productions_outbox
-- mirror automatically (that table's own `id` foreign key is `on delete
-- cascade`, see 20260910010000_research_os_engine_bridge.sql), so no
-- explicit statement for it is needed here.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.
-- See 20260910000000_research_os_graph.sql's header for why `graph` is a
-- private schema outside PostgREST's exposed-schema list.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- graph.learner_profiles
-- ---------------------------------------------------------------------------
create table if not exists graph.learner_profiles (
  learner_id         uuid        primary key references auth.users (id) on delete cascade,
  role               text        not null default 'independent' check (role in ('student', 'teacher', 'independent')),
  -- Deliberately a bucket, never a birth date or age in years: the product
  -- has no verified-age input at Phase 0 (that is the Phase B vendor
  -- decision _intake/research-os-k12/04-compliance-distribution.md section
  -- 13 names), so this column stores the coarsest fact the gate needs and
  -- nothing more precise than that, a deliberate data-minimization choice.
  -- Null means "not yet asked."
  birth_year_bucket  text        check (birth_year_bucket in ('under13', '13to17', '18plus')),
  consent_status     text        not null default 'none' check (consent_status in ('none', 'school', 'parent', 'self')),
  -- Free-text-ish but short and operator-authored, never learner-authored:
  -- e.g. "district NDPA on file, exhibit E signed 2026-09-01" or "parent
  -- VPC vendor confirmation id 8f2c". Not a source of PII on its own; kept
  -- short by convention (see DATA-INVENTORY.md); no length check enforces
  -- it here.
  consent_source     text,
  updated_at         timestamptz not null default now()
);

alter table graph.learner_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'learner_profiles' and policyname = 'own_select'
  ) then
    create policy own_select on graph.learner_profiles for select using (auth.uid() = learner_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'learner_profiles' and policyname = 'own_insert'
  ) then
    create policy own_insert on graph.learner_profiles for insert with check (auth.uid() = learner_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'learner_profiles' and policyname = 'own_update'
  ) then
    create policy own_update on graph.learner_profiles for update using (auth.uid() = learner_id) with check (auth.uid() = learner_id);
  end if;
end $$;

drop trigger if exists graph_learner_profiles_touch on graph.learner_profiles;
create trigger graph_learner_profiles_touch
  before insert or update on graph.learner_profiles
  for each row execute function bucket.touch_updated_at();

-- ---------------------------------------------------------------------------
-- graph.privacy_events
-- ---------------------------------------------------------------------------
create table if not exists graph.privacy_events (
  id                uuid        primary key default gen_random_uuid(),
  learner_id_hash    text        not null,
  action             text        not null check (action in ('export', 'delete')),
  created_at         timestamptz not null default now()
);

-- A reviewer acting on a learner's behalf (the resolvePrivacyActor "reviewer-
-- gated" path in src/lib/research-os/privacy.ts) must leave a trace that
-- distinguishes it from a learner's own self-request; without these two
-- columns the audit row for both cases was identical, so a reviewer-invoked
-- export or delete carried no record of who invoked it. `add column if not
-- exists` rather than folding into the `create table` above, matching this
-- migration's own idempotent, safe-to-re-run convention: a re-run against an
-- environment that already created the table with the original three columns
-- still converges to the full shape.
alter table graph.privacy_events add column if not exists actor_id_hash text;
alter table graph.privacy_events add column if not exists acting_as_reviewer boolean not null default false;

create index if not exists graph_privacy_events_hash_idx on graph.privacy_events (learner_id_hash);

alter table graph.privacy_events enable row level security;
-- No policy for anon/authenticated on purpose, same posture as
-- public.research_os_productions_outbox: RLS enabled with zero permissive
-- policies denies every row to every role but service-role. This table is
-- an audit log the privacy route writes to and nothing else reads through
-- a signed-in session, by design.

-- ---------------------------------------------------------------------------
-- graph.privacy_delete_learner: the one-transaction hard delete.
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

  return jsonb_build_object(
    'learner_node_state', v_learner_node_state,
    'productions', v_productions,
    'teacher_reviews', v_teacher_reviews,
    'edge_flags', v_edge_flags,
    'class_members', v_class_members,
    'learner_profiles', v_learner_profiles,
    'academy_progress', v_academy_progress,
    'academy_profiles', v_academy_profiles,
    'academy_credentials', v_academy_credentials
  );
end;
$$;
