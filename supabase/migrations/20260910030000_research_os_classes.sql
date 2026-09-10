-- Research OS for K-12, teacher class view (bkt-ros, ros-06). Adds the
-- minimal class model the class view page (/research-os/class,
-- src/app/api/research-os/class/route.ts) reads: which learners a reviewer
-- is responsible for, so the grid, the blocked/ready computations, and the
-- review queue can all scope to "this reviewer's own classes" instead of
-- the whole graph (contrast the general /research-os/review queue, which
-- has no roster and reads every pending item).
--
-- SCOPE: this is a roster of exactly two columns' worth of information,
-- deliberately. RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3's own
-- integrations list names the real target: "OneRoster 1.2 via
-- Clever/ClassLink, Google Classroom import." Building against a live
-- roster provider is Phase 1+ work, gated on a district partner this repo
-- does not have yet.
-- TODO(Phase 1, roster sync): replace the manual graph.class_members rows
-- this migration seeds with a sync job against OneRoster/Clever/ClassLink,
-- keyed the same way (class_id, learner_id) so no downstream reader
-- (class-view.ts, the class API route) needs to change when it lands.
--
-- Auth stays exactly what src/lib/research-os/reviewer.ts already gates
-- POST /api/research-os/review on: the RESEARCH_OS_REVIEWER_EMAILS env-var
-- allowlist. `graph.classes.reviewer_email` is matched against that same
-- verified identity (never a client-supplied value) in both the RLS
-- predicate below and, redundantly, in application code
-- (src/lib/research-os/db.ts's loadClassesForReviewer), the same
-- "RLS plus a server check" posture graph.productions' own ownership check
-- already uses. No `class_id`-scoped role table exists yet; a reviewer is
-- whoever the allowlist and this table's own reviewer_email agree on,
-- matching reviewer.ts's own documented Phase-1-defers-a-role-column
-- decision.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

-- ---------------------------------------------------------------------------
-- graph.classes
-- ---------------------------------------------------------------------------
create table if not exists graph.classes (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  reviewer_email text        not null,
  created_at     timestamptz not null default now()
);

create index if not exists graph_classes_reviewer_idx on graph.classes (lower(reviewer_email));

alter table graph.classes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'classes' and policyname = 'reviewer_select'
  ) then
    -- A reviewer sees only the classes their own verified email owns.
    -- Defense in depth: every read today goes through the service-role
    -- client (RLS bypassed), scoped in application code instead; this
    -- policy is what protects the row if the schema is ever exposed to a
    -- direct client the way graph.learner_node_state already is.
    create policy reviewer_select on graph.classes for select
      using (lower(coalesce(auth.jwt() ->> 'email', '')) = lower(reviewer_email));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- graph.class_members
-- ---------------------------------------------------------------------------
create table if not exists graph.class_members (
  class_id   uuid not null references graph.classes (id) on delete cascade,
  learner_id uuid not null references auth.users (id) on delete cascade,
  primary key (class_id, learner_id)
);

create index if not exists graph_class_members_learner_idx on graph.class_members (learner_id);

alter table graph.class_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'class_members' and policyname = 'own_select'
  ) then
    -- A learner sees their own class memberships.
    create policy own_select on graph.class_members for select
      using (auth.uid() = learner_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'class_members' and policyname = 'reviewer_select'
  ) then
    -- A reviewer sees the membership rows of a class their own email owns.
    create policy reviewer_select on graph.class_members for select
      using (exists (
        select 1 from graph.classes c
        where c.id = class_members.class_id
          and lower(coalesce(auth.jwt() ->> 'email', '')) = lower(c.reviewer_email)
      ));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- graph.productions.notes (ros-06 item 3: a teacher note on return)
-- ---------------------------------------------------------------------------
-- Append-only, same shape discipline as learner_node_state.evidence: each
-- element is one teacher note, {"at","reviewerId","decision","reason"}.
-- Written by /api/research-os/review's POST on both "approved" and
-- "returned" production decisions (not only returns), so a production's
-- full review history is readable from its own row, not only from
-- graph.teacher_reviews' separate audit table.
alter table graph.productions add column if not exists notes jsonb not null default '[]'::jsonb;
