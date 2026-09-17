-- Classes a teacher can create and learners can join (docs/RESEARCH-OS-APP.md,
-- Class). Until now a class row existed only through SQL and staff came from
-- the RESEARCH_OS_REVIEWER_EMAILS allowlist. A join code lets a learner (or a
-- parent, peer, librarian) enter a class from the home page; created_by
-- records the teacher who made it. Idempotent.

alter table graph.classes add column if not exists join_code text;
alter table graph.classes add column if not exists created_by uuid references auth.users (id) on delete set null;
create unique index if not exists graph_classes_join_code_uq on graph.classes (join_code) where join_code is not null;

-- Backfill: every existing class gets a code so it can be joined.
update graph.classes
   set join_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
 where join_code is null;
