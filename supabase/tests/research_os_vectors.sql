\o /dev/null
begin;

do $$
begin
  assert (select extversion from pg_extension where extname = 'vector') = '0.8.2', 'pgvector is not 0.8.2';
  assert not has_function_privilege('anon', 'graph.nearest_nodes(uuid, text[], int)', 'execute'), 'anon can run nearest_nodes';
  assert not has_function_privilege('authenticated', 'graph.nearest_nodes(uuid, text[], int)', 'execute'), 'authenticated can run nearest_nodes';
  assert has_function_privilege('service_role', 'graph.nearest_nodes(uuid, text[], int)', 'execute'), 'service_role cannot run nearest_nodes';
end $$;

select setseed(0.42);

create temporary table t_basis on commit drop as
  select b, array(select (random() * 2 - 1)::real from generate_series(1, 384) g where g + b > 0) as v
  from generate_series(1, 16) b;

create temporary table t_points on commit drop as
  select gen_random_uuid() as id, i, array(select (random() * 2 - 1)::real from generate_series(1, 16) g where g + i > 0) as coef
  from generate_series(1, 4000) i;

insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
select id, 'vec-fixture-' || i, 'Vector fixture ' || i, case when i % 3 = 0 then 'fact' else 'concept' end, 1, 'vec-fixture', 'fixture'
from t_points;

insert into graph.node_embeddings (node_id, model, text_hash, vector)
select p.id, 'BAAI/bge-small-en-v1.5', md5(p.id::text),
  array(
    select (sum(p.coef[b.b] * b.v[d]) + (random() * 2 - 1) * 0.05)::real
    from generate_series(1, 384) d cross join t_basis b
    group by d order by d)
from t_points p;

analyze graph.node_embeddings;
analyze graph.nodes;

create temporary table t_queries on commit drop as
  select id from t_points where i % 200 = 7;

create or replace function pg_temp.exact(p uuid, kinds text[]) returns uuid[] language plpgsql as $$
declare
  q extensions.halfvec(384);
  out uuid[];
begin
  perform set_config('enable_indexscan', 'off', true);
  select (vector::extensions.vector(384))::extensions.halfvec(384) into q from graph.node_embeddings where node_id = p and model = 'BAAI/bge-small-en-v1.5';
  select array_agg(x.node_id) into out from (
    select e.node_id from graph.node_embeddings e join graph.nodes n on n.id = e.node_id
    where e.model = 'BAAI/bge-small-en-v1.5' and e.node_id <> p and (kinds is null or n.kind = any (kinds))
    order by ((e.vector::extensions.vector(384))::extensions.halfvec(384)) operator(extensions.<=>) q
    limit 20) x;
  perform set_config('enable_indexscan', 'on', true);
  return out;
end $$;

do $$
declare
  q extensions.halfvec(384);
  line text;
  plan text := '';
begin
  select (vector::extensions.vector(384))::extensions.halfvec(384) into q
  from graph.node_embeddings where node_id = (select id from t_queries limit 1);
  perform set_config('hnsw.iterative_scan', 'relaxed_order', true);
  for line in execute format(
    'explain select e.node_id from graph.node_embeddings e join graph.nodes n on n.id = e.node_id
     where e.model = %L and (n.kind = any (%L::text[]))
     order by ((e.vector::extensions.vector(384))::extensions.halfvec(384)) operator(extensions.<=>) %L::extensions.halfvec(384) limit 20',
    'BAAI/bge-small-en-v1.5', '{fact}', q::text)
  loop
    plan := plan || line || E'\n';
  end loop;
  assert plan like '%Index Scan using node_embeddings_bge_hnsw%', 'the kNN query does not use the HNSW index: ' || plan;
  assert plan not like '%Sort%', 'the kNN query sorts: ' || plan;
end $$;

do $$
declare
  r record;
  got uuid[];
  want uuid[];
  hits int := 0;
  total int := 0;
  kinds text[];
begin
  for r in select id from t_queries loop
    foreach kinds slice 1 in array array[array['all'], array['fact']] loop
      if kinds[1] = 'all' then kinds := null; end if;
      set local role service_role;
      select array_agg(node_id) into got from graph.nearest_nodes(r.id, kinds, 20);
      reset role;
      want := pg_temp.exact(r.id, kinds);
      total := total + coalesce(array_length(want, 1), 0);
      hits := hits + (select count(*) from unnest(want) w where w = any (got));
      if kinds is not null then
        assert (select bool_and(n.kind = 'fact') from graph.nodes n where n.id = any (got)), 'the kind filter let another kind through';
      end if;
    end loop;
  end loop;
  assert total > 0, 'no exact neighbours';
  assert hits::float8 / total >= 0.95, format('recall@20 is %s, under 0.95', round(hits::numeric / total, 3));
  raise notice 'recall@20 %', round(hits::numeric / total, 3);
end $$;

do $$
begin
  assert (select count(*) from graph.nearest_nodes(gen_random_uuid(), null, 20)) = 0, 'an unknown node returned neighbours';
end $$;

rollback;
