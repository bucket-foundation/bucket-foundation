-- Research OS, the Access level as a data model (ros-21).
-- learning/research-os/INTEGRATION-PLAN.md section 2 and 3: a node is
-- public, private, or shared with named people or groups, the way a
-- repository or a drive works; access can be requested and granted; learners
-- import data and share access. Every read still goes through the
-- service-role client in src/lib/research-os/db.ts with the rules in
-- src/lib/research-os/access.ts; the policies below are defense in depth.

-- 1. Visibility and ownership on nodes.
alter table graph.nodes add column if not exists visibility text not null default 'public';
alter table graph.nodes add column if not exists owner_id uuid references auth.users (id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'nodes_visibility_check') then
    alter table graph.nodes add constraint nodes_visibility_check check (visibility in ('public','private','shared'));
  end if;
end $$;
create index if not exists nodes_owner_idx on graph.nodes (owner_id) where owner_id is not null;
create index if not exists nodes_visibility_idx on graph.nodes (visibility) where visibility <> 'public';

-- 2. Grants: who may do what on a shared or private node. A grant names a
-- person (grantee_id) or a group (grantee_group, 'class:<uuid>' or
-- 'role:<name>'); one of the two is set. Roles are the verbs the plan
-- names: view, continue, extend, cite, replicate, review.
create table if not exists graph.node_grants (
  id            uuid        primary key default gen_random_uuid(),
  node_id       uuid        not null references graph.nodes (id) on delete cascade,
  grantee_id    uuid        references auth.users (id) on delete cascade,
  grantee_group text,
  role          text        not null check (role in ('view','continue','extend','cite','replicate','review')),
  granted_by    uuid        references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,
  check ((grantee_id is not null) <> (grantee_group is not null))
);
-- Full (not partial) unique indexes: PostgREST upserts name only the
-- conflict columns, and Postgres matches ON CONFLICT to a partial index only
-- when the predicate is repeated. Nulls are distinct, so each index binds
-- the rows of its own grantee kind alone.
create unique index if not exists node_grants_person_role_uq on graph.node_grants (node_id, grantee_id, role);
create unique index if not exists node_grants_group_role_uq on graph.node_grants (node_id, grantee_group, role);
create index if not exists node_grants_grantee_idx on graph.node_grants (grantee_id);
alter table graph.node_grants enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'node_grants' and policyname = 'grantee_or_owner_select') then
    create policy grantee_or_owner_select on graph.node_grants for select
      using (auth.uid() = grantee_id or auth.uid() = (select owner_id from graph.nodes n where n.id = node_id));
  end if;
end $$;

-- 3. Access requests: a person asks the owner for a role on a node; the
-- owner grants or denies. A granted request writes a node_grants row.
create table if not exists graph.access_requests (
  id            uuid        primary key default gen_random_uuid(),
  node_id       uuid        not null references graph.nodes (id) on delete cascade,
  requester_id  uuid        not null references auth.users (id) on delete cascade,
  purpose       text        not null check (purpose in ('continue','extend','cite','replicate','review')),
  message       text,
  status        text        not null default 'pending' check (status in ('pending','granted','denied')),
  decided_by    uuid        references auth.users (id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists access_requests_open_uq on graph.access_requests (node_id, requester_id, purpose) where status = 'pending';
create index if not exists access_requests_node_idx on graph.access_requests (node_id, status);
alter table graph.access_requests enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'access_requests' and policyname = 'requester_or_owner_select') then
    create policy requester_or_owner_select on graph.access_requests for select
      using (auth.uid() = requester_id or auth.uid() = (select owner_id from graph.nodes n where n.id = node_id));
  end if;
end $$;

-- 4. Imports: data a person brings in (a dataset, a paper, notes, a corpus).
-- An import becomes a private node the owner can share or publish.
create table if not exists graph.imports (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  kind        text        not null check (kind in ('dataset','paper','notes','corpus')),
  title       text        not null,
  source      jsonb       not null default '{}'::jsonb,   -- {"url"?, "filename"?, "sha256"?, "license"?}
  node_id     uuid        references graph.nodes (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists imports_owner_idx on graph.imports (owner_id);
alter table graph.imports enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'imports' and policyname = 'own_select') then
    create policy own_select on graph.imports for select using (auth.uid() = owner_id);
  end if;
end $$;

-- 5. Node reads: public rows stay readable by anyone; private and shared
-- rows by the owner or a grantee. Replaces the original public_select.
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'nodes' and policyname = 'public_select') then
    drop policy public_select on graph.nodes;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'nodes' and policyname = 'visible_select') then
    create policy visible_select on graph.nodes for select using (
      visibility = 'public'
      or owner_id = auth.uid()
      or exists (select 1 from graph.node_grants g where g.node_id = id and g.grantee_id = auth.uid() and (g.expires_at is null or g.expires_at > now()))
    );
  end if;
end $$;
