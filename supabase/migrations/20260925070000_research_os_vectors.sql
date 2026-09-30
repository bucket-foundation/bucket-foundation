create extension if not exists vector with schema extensions;

create index if not exists node_embeddings_bge_hnsw
  on graph.node_embeddings
  using hnsw (((vector::extensions.vector(384))::extensions.halfvec(384)) extensions.halfvec_cosine_ops)
  where model = 'BAAI/bge-small-en-v1.5';

create or replace function graph.nearest_nodes(p_node uuid, p_kinds text[] default null, p_k int default 20)
returns table (node_id uuid, distance double precision)
language plpgsql
stable
security invoker
set search_path = ''
set hnsw.iterative_scan = 'relaxed_order'
set hnsw.ef_search = '40'
as $$
declare
  q extensions.halfvec(384);
  k int := least(greatest(coalesce(p_k, 20), 1), 200);
begin
  select (e.vector::extensions.vector(384))::extensions.halfvec(384) into q
  from graph.node_embeddings e
  where e.node_id = p_node and e.model = 'BAAI/bge-small-en-v1.5';
  if q is null then
    return;
  end if;
  return query
    select e.node_id, (((e.vector::extensions.vector(384))::extensions.halfvec(384)) operator(extensions.<=>) q)::double precision
    from graph.node_embeddings e
    join graph.nodes n on n.id = e.node_id
    where e.model = 'BAAI/bge-small-en-v1.5'
      and e.node_id <> p_node
      and (p_kinds is null or n.kind = any (p_kinds))
    order by ((e.vector::extensions.vector(384))::extensions.halfvec(384)) operator(extensions.<=>) q
    limit k;
end;
$$;

revoke all on function graph.nearest_nodes(uuid, text[], int) from public, anon, authenticated;
grant execute on function graph.nearest_nodes(uuid, text[], int) to service_role;
