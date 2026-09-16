-- Research OS, roles as grants, assignments, level overrides (ros-27 and the
-- Class step of INTEGRATION-PLAN.md section 7 and 10).
--
-- 1. A class membership carries a role. Learner is the default; teacher and
--    librarian run the class (assign, override, review); parent sees one
--    learner's work and payments (related_learner_id); peer holds selective
--    access to peers' shared nodes; reviewer reviews productions;
--    researcher reads the class's accepted productions.
alter table graph.class_members add column if not exists role text not null default 'learner';
alter table graph.class_members add column if not exists related_learner_id uuid references auth.users (id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'class_members_role_check') then
    alter table graph.class_members add constraint class_members_role_check
      check (role in ('learner','teacher','librarian','parent','peer','reviewer','researcher'));
  end if;
end $$;
create index if not exists class_members_role_idx on graph.class_members (class_id, role);

-- 2. Assignments: a teacher or librarian assigns a frontier target to a
--    class. The finished paper is the production; requires_production says
--    whether the assignment is complete only when a production on the
--    target exists. Acceptance into the public graph is never required.
create table if not exists graph.assignments (
  id                  uuid        primary key default gen_random_uuid(),
  class_id            uuid        not null references graph.classes (id) on delete cascade,
  target_node_id      uuid        not null references graph.nodes (id) on delete cascade,
  assigned_by         uuid        references auth.users (id) on delete set null,
  title               text        not null,
  instructions        text,
  due_at              timestamptz,
  required            boolean     not null default true,
  requires_production boolean     not null default true,
  closed_at           timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists assignments_class_idx on graph.assignments (class_id, created_at desc);
alter table graph.assignments enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'assignments' and policyname = 'member_select') then
    create policy member_select on graph.assignments for select
      using (exists (select 1 from graph.class_members m where m.class_id = class_id and m.learner_id = auth.uid()));
  end if;
end $$;

-- 3. Level overrides: a teacher or librarian sets a learner's level on a
--    node with a recorded reason. The matching learner_node_state row is
--    updated by the route with an evidence event of kind "override".
create table if not exists graph.level_overrides (
  id          uuid        primary key default gen_random_uuid(),
  learner_id  uuid        not null references auth.users (id) on delete cascade,
  node_id     uuid        not null references graph.nodes (id) on delete cascade,
  set_by      uuid        not null references auth.users (id) on delete cascade,
  class_id    uuid        references graph.classes (id) on delete set null,
  from_stage  text,
  to_stage    text        not null check (to_stage in ('access','awareness','understanding','internalization','production')),
  reason      text        not null,
  created_at  timestamptz not null default now()
);
create index if not exists level_overrides_learner_idx on graph.level_overrides (learner_id, node_id, created_at desc);
alter table graph.level_overrides enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'level_overrides' and policyname = 'own_or_setter_select') then
    create policy own_or_setter_select on graph.level_overrides for select using (auth.uid() = learner_id or auth.uid() = set_by);
  end if;
end $$;
