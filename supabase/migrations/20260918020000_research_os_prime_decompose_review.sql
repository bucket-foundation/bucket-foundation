-- ros-prime 2, fixes from the first critic round (learning/research-os/
-- PRIMES.md, "Slice 2"). Idempotent, matching every other migration here.

-- Decomposition proposals: the second model's verdict, where the row came
-- from, the Wikipedia link evidence (RefD, Liang and colleagues 2015), and
-- the edge kind a reviewer wrote on approval. Lexical-inference rows leave
-- the first three null.
alter table graph.edge_proposals add column if not exists verification text;
alter table graph.edge_proposals drop constraint if exists edge_proposals_verification_check;
alter table graph.edge_proposals
  add constraint edge_proposals_verification_check
  check (verification is null or verification in ('confirmed', 'refuted', 'unchecked'));
alter table graph.edge_proposals add column if not exists origin text;
alter table graph.edge_proposals drop constraint if exists edge_proposals_origin_check;
alter table graph.edge_proposals
  add constraint edge_proposals_origin_check
  check (origin is null or origin in ('proposer', 'missing_matched', 'base_idea'));
alter table graph.edge_proposals add column if not exists refd real;
alter table graph.edge_proposals add column if not exists decided_kind text;
alter table graph.edge_proposals drop constraint if exists edge_proposals_decided_kind_check;
alter table graph.edge_proposals
  add constraint edge_proposals_decided_kind_check
  check (decided_kind is null or decided_kind in ('prerequisite', 'derives_from'));

-- Missing primes keep every title merged into them, each naming node's own
-- reason, and the existing nodes they may duplicate.
alter table graph.node_proposals add column if not exists aliases text[] not null default '{}';
alter table graph.node_proposals add column if not exists reasons jsonb not null default '{}'::jsonb;
alter table graph.node_proposals add column if not exists possible_duplicates jsonb not null default '[]'::jsonb;

-- A node rests on the from end of a prerequisite edge that points at it and
-- on the to end of a derives_from edge that leaves it
-- (src/lib/research-os/primes.ts, FACTOR_EDGES). True when p_node rests on
-- p_factor through any chain of factor links; approving "p_factor is a
-- factor of X" when X rests on p_factor would close a cycle.
create or replace function graph.rests_on(p_node uuid, p_factor uuid)
returns boolean
language sql
stable
as $$
  with recursive factor_link(node, factor) as (
    select to_id, from_id from graph.edges where kind = 'prerequisite'
    union all
    select from_id, to_id from graph.edges where kind = 'derives_from'
  ),
  up(id) as (
    select p_node
    union
    select fl.factor from up join factor_link fl on fl.node = up.id
  )
  select p_node <> p_factor and exists (select 1 from up where id = p_factor);
$$;

-- For each slug, how many idea nodes rest on it through factor links: the
-- decompositions an approved factor would reach. Counts academy atoms,
-- canon entries, references, primary sources, and reviewer-added base
-- ideas of kind concept, law, or derivation.
create or replace function graph.idea_dependents(p_slugs text[])
returns table (slug text, dependents bigint)
language sql
stable
as $$
  with recursive factor_link(node, factor) as (
    select to_id, from_id from graph.edges where kind = 'prerequisite'
    union all
    select from_id, to_id from graph.edges where kind = 'derives_from'
  ),
  targets as (
    select n.id, n.slug from graph.nodes n where n.slug = any (p_slugs)
  ),
  down(root, id) as (
    select t.id, t.id from targets t
    union
    select d.root, fl.node from down d join factor_link fl on fl.factor = d.id
  )
  select t.slug,
         count(distinct n.id) filter (
           where n.id <> t.id
             and n.kind in ('concept', 'law', 'derivation')
             and n.provenance ->> 'type' in ('academy_atom', 'canon_entry', 'reference', 'primary_source', 'node_proposal')
         )
  from targets t
  left join down d on d.root = t.id
  left join graph.nodes n on n.id = d.id
  group by t.slug;
$$;

-- Merge missing-prime rows by key. A pending row gains the new naming
-- nodes, aliases, and reasons; a decided row stays as the reviewer left it.
-- Returns every key's status and created node, so the caller can queue
-- proposals from an approved base idea to the nodes that newly named it.
create or replace function graph.merge_node_proposals(p_rows jsonb)
returns table (key text, status text, created_node_id uuid)
language plpgsql
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into graph.node_proposals as np
      (key, title, branch, justification, named_by, aliases, reasons, possible_duplicates, base_match, model)
    values (
      r ->> 'key',
      r ->> 'title',
      r ->> 'branch',
      r ->> 'justification',
      array(select jsonb_array_elements_text(coalesce(r -> 'named_by', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(r -> 'aliases', '[]'::jsonb))),
      coalesce(r -> 'reasons', '{}'::jsonb),
      coalesce(r -> 'possible_duplicates', '[]'::jsonb),
      r ->> 'base_match',
      r ->> 'model'
    )
    on conflict on constraint graph_node_proposals_key_uidx do update set
      named_by = array(select distinct u from unnest(np.named_by || excluded.named_by) u order by u),
      aliases = array(select distinct u from unnest(np.aliases || excluded.aliases) u order by u),
      reasons = excluded.reasons || np.reasons,
      possible_duplicates = excluded.possible_duplicates
    where np.status = 'pending';
  end loop;
  return query
    select np.key, np.status, np.created_node_id
    from graph.node_proposals np
    where np.key in (select e ->> 'key' from jsonb_array_elements(p_rows) e);
end;
$$;

-- Replace a branch's closure rows in one transaction, serialized per branch,
-- so a concurrent approval never sees the branch half rebuilt and two
-- rebuilds of one branch never collide on the primary key.
create or replace function graph.replace_prereq_ancestor(p_branch text, p_node_ids uuid[], p_rows jsonb)
returns integer
language plpgsql
as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtext('graph.prereq_ancestor:' || p_branch));
  delete from graph.prereq_ancestor where node_id = any (p_node_ids);
  insert into graph.prereq_ancestor (node_id, ancestor_id, min_hops, min_confidence)
  select (x ->> 'node_id')::uuid, (x ->> 'ancestor_id')::uuid, (x ->> 'min_hops')::smallint, (x ->> 'min_confidence')::real
  from jsonb_array_elements(p_rows) x;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function graph.rests_on(uuid, uuid) to service_role;
grant execute on function graph.idea_dependents(text[]) to service_role;
grant execute on function graph.merge_node_proposals(jsonb) to service_role;
grant execute on function graph.replace_prereq_ancestor(text, uuid[], jsonb) to service_role;
