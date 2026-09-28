begin;

\ir ../migrations/20260924100000_graph_nodes_visible_select_grant.sql
\ir ../migrations/20260924100000_graph_nodes_visible_select_grant.sql

grant usage on schema graph to authenticated;
grant select on graph.nodes, graph.node_grants to authenticated;

create temporary table t_people (who text primary key, id uuid not null) on commit drop;
grant select on t_people to authenticated;

insert into t_people (who, id) select w, gen_random_uuid() from unnest(array['owner', 'grantee', 'expired', 'stranger']) w;

insert into auth.users (id, instance_id, aud, role, email)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'visible-select-' || id || '@bucket.test'
from t_people;

insert into graph.nodes (id, slug, title, kind, tier, branch, summary, visibility, owner_id, created_by)
select gen_random_uuid(), 'visible-select-' || gen_random_uuid(), 'Visible select fixture', 'artifact', 0, '00-imports', 'fixture', 'private', id, id
from t_people where who = 'owner'
returning id \gset node_

insert into graph.node_grants (node_id, grantee_id, role, expires_at)
select :'node_id'::uuid, id, 'view', null from t_people where who = 'grantee'
union all
select :'node_id'::uuid, id, 'view', now() - interval '1 day' from t_people where who = 'expired';

create function pg_temp.sees(who text, node uuid) returns boolean language plpgsql as $$
declare
  seen boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_people p where p.who = sees.who), 'role', 'authenticated')::text, true);
  set local role authenticated;
  select exists (select 1 from graph.nodes n where n.id = node) into seen;
  reset role;
  return seen;
end $$;

do $$
declare
  node uuid := (select n.id from graph.nodes n join t_people p on p.id = n.owner_id where p.who = 'owner' and n.title = 'Visible select fixture');
begin
  assert pg_temp.sees('owner', node), 'the owner reads the node';
  assert pg_temp.sees('grantee', node), 'a live grantee reads the node';
  assert not pg_temp.sees('expired', node), 'an expired grantee is refused';
  assert not pg_temp.sees('stranger', node), 'a non-grantee is refused';
end $$;

rollback;
