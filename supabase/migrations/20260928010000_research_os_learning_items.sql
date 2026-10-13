create table if not exists graph.learning_items (
  id            uuid        primary key default gen_random_uuid(),
  node_id       uuid        not null references graph.nodes (id) on delete cascade,
  kind          text        not null check (kind in ('lesson', 'depth', 'quiz', 'resource', 'equation', 'source', 'note')),
  ordinal       integer     not null check (ordinal >= 0),
  body          jsonb       not null,
  content_hash  text        not null,
  provenance    jsonb       not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  unique (node_id, kind, ordinal)
);

alter table graph.learning_items enable row level security;

revoke all on graph.learning_items from public, anon, authenticated;
grant select, insert, update, delete on graph.learning_items to service_role;

create or replace function graph.replace_learning_items(p_node_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_written int;
  v_deleted int;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'replace_learning_items: items must be an array' using errcode = '22023';
  end if;
  perform 1 from graph.nodes where id = p_node_id for update;
  if not found then
    raise exception 'replace_learning_items: node % not found', p_node_id using errcode = 'P0002';
  end if;

  with incoming as (
    select (i->>'kind') as kind, (i->>'ordinal')::int as ordinal, i->'body' as body, i->>'content_hash' as content_hash, coalesce(i->'provenance', '{}'::jsonb) as provenance
    from jsonb_array_elements(p_items) i
  ), upserted as (
    insert into graph.learning_items as li (node_id, kind, ordinal, body, content_hash, provenance)
    select p_node_id, kind, ordinal, body, content_hash, provenance from incoming
    on conflict (node_id, kind, ordinal) do update
      set body = excluded.body, content_hash = excluded.content_hash, provenance = excluded.provenance, updated_at = now()
      where li.content_hash is distinct from excluded.content_hash
    returning 1
  )
  select count(*) into v_written from upserted;

  delete from graph.learning_items li
  where li.node_id = p_node_id
    and not exists (
      select 1 from jsonb_array_elements(p_items) i
      where i->>'kind' = li.kind and (i->>'ordinal')::int = li.ordinal
    );
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('written', v_written, 'deleted', v_deleted);
end;
$$;

revoke all on function graph.replace_learning_items(uuid, jsonb) from public, anon, authenticated;
grant execute on function graph.replace_learning_items(uuid, jsonb) to service_role;

create or replace view graph.academy_course_counts as
select n.provenance->>'source' as source,
       n.branch,
       count(distinct n.id) as atoms,
       count(li.id) filter (where li.kind = 'lesson') as lessons,
       count(li.id) filter (where li.kind = 'quiz') as quiz_items,
       count(li.id) as items
from graph.nodes n
left join graph.learning_items li on li.node_id = n.id
where n.provenance->>'type' = 'academy_atom'
group by 1, 2;

revoke all on graph.academy_course_counts from public, anon, authenticated;
grant select on graph.academy_course_counts to service_role;

create or replace function graph.replace_learning_items_many(p_nodes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_entry   jsonb;
  v_result  jsonb;
  v_written int := 0;
  v_deleted int := 0;
begin
  if jsonb_typeof(p_nodes) <> 'array' then
    raise exception 'replace_learning_items_many: nodes must be an array' using errcode = '22023';
  end if;
  for v_entry in select e from jsonb_array_elements(p_nodes) e order by e->>'node_id' loop
    v_result := graph.replace_learning_items((v_entry->>'node_id')::uuid, v_entry->'items');
    v_written := v_written + (v_result->>'written')::int;
    v_deleted := v_deleted + (v_result->>'deleted')::int;
  end loop;
  return jsonb_build_object('nodes', jsonb_array_length(p_nodes), 'written', v_written, 'deleted', v_deleted);
end;
$$;

revoke all on function graph.replace_learning_items_many(jsonb) from public, anon, authenticated;
grant execute on function graph.replace_learning_items_many(jsonb) to service_role;
