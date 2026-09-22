-- ros-graph-dedup: one concept listed as nodes in several branches.
--
-- The decompose-further verifier refused cosmology's "Equivalence principle"
-- as resting on physics' "Equivalence principle": the same concept listed
-- twice (learning/research-os/PRIMES.md). scripts/research-os/find-duplicates.ts
-- finds such pairs by title and by the verifier's refusals and queues them
-- here; a reviewer merges or keeps both on /research-os/merges.

create table if not exists graph.merge_proposals (
  id             uuid        primary key default gen_random_uuid(),
  keep_slug      text        not null,
  drop_slug      text        not null,
  reason         text        not null check (reason in ('same_title', 'near_title', 'verifier_duplicate')),
  similarity     real        not null check (similarity > 0 and similarity <= 1),
  evidence       text        not null,
  status         text        not null default 'pending' check (status in ('pending', 'merged', 'rejected')),
  reviewer_id    uuid        references auth.users (id) on delete set null,
  decision_reason text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now(),
  constraint merge_proposals_pair_uidx unique (keep_slug, drop_slug),
  constraint merge_proposals_distinct check (keep_slug <> drop_slug)
);
create index if not exists graph_merge_proposals_status_idx on graph.merge_proposals (status, created_at);
alter table graph.merge_proposals enable row level security;
grant select, insert, update on graph.merge_proposals to service_role;

-- Merges p_drop into p_keep: every edge of p_drop moves to p_keep, an edge
-- p_keep already has (same other end and kind) or one that would join
-- p_keep to itself is dropped, and p_drop is superseded by p_keep. Rows in
-- other tables that point at p_drop keep pointing at it; its
-- superseded_by leads readers to p_keep. Learning order through the moved
-- edges can put a factor above its new target, so grade tiers are enforced
-- again. One transaction; returns what moved.
create or replace function graph.merge_nodes(p_keep uuid, p_drop uuid)
returns jsonb
language plpgsql
set search_path = graph, public
as $$
declare
  moved_out integer;
  moved_in integer;
  dropped integer;
  raised integer;
begin
  if p_keep = p_drop then
    raise exception 'merge_nodes: keep and drop are the same node';
  end if;
  perform 1 from graph.nodes where id = p_drop and superseded_by is null for update;
  if not found then
    raise exception 'merge_nodes: % is missing or already superseded', p_drop;
  end if;
  perform 1 from graph.nodes where id = p_keep and superseded_by is null;
  if not found then
    raise exception 'merge_nodes: % is missing or superseded', p_keep;
  end if;

  delete from graph.edges d
   where (d.from_id = p_drop and (d.to_id = p_keep or exists (
            select 1 from graph.edges k where k.from_id = p_keep and k.to_id = d.to_id and k.kind = d.kind)))
      or (d.to_id = p_drop and (d.from_id = p_keep or exists (
            select 1 from graph.edges k where k.to_id = p_keep and k.from_id = d.from_id and k.kind = d.kind)));
  get diagnostics dropped = row_count;

  update graph.edges set from_id = p_keep where from_id = p_drop;
  get diagnostics moved_out = row_count;
  update graph.edges set to_id = p_keep where to_id = p_drop;
  get diagnostics moved_in = row_count;

  update graph.nodes set superseded_by = p_keep where id = p_drop;
  raised := graph.enforce_prerequisite_tiers();

  return jsonb_build_object('moved_out', moved_out, 'moved_in', moved_in, 'dropped', dropped, 'tiers_raised', raised);
end;
$$;

revoke execute on function graph.merge_nodes(uuid, uuid) from public;
grant execute on function graph.merge_nodes(uuid, uuid) to service_role;
