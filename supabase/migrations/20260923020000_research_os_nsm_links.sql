create table if not exists graph.nsm_links (
  id               uuid        primary key default gen_random_uuid(),
  node_id          uuid        not null references graph.nodes (id) on delete cascade,
  prime_id         text        not null references graph.nsm_primes (id) on delete cascade,
  source           text        not null check (source in ('cosine', 'model', 'both', 'random')),
  status           text        not null default 'proposed' check (status in ('proposed', 'approved', 'rejected')),
  cosine           real        check (cosine is null or (cosine >= -1 and cosine <= 1)),
  rank             smallint    check (rank is null or rank between 1 and 65),
  rationale        text        check (rationale is null or length(rationale) <= 600),
  model            text,
  prompt_hash      text,
  run_id           text        not null,
  reviewer_id      uuid        references auth.users (id) on delete set null,
  decision_reason  text        check (decision_reason is null or length(decision_reason) <= 600),
  decided_at       timestamptz,
  created_at       timestamptz not null default now(),
  check ((status = 'proposed') = (decided_at is null))
);

create unique index if not exists nsm_links_node_prime_uq on graph.nsm_links (node_id, prime_id);
create index if not exists nsm_links_status_idx on graph.nsm_links (status);

alter table graph.nsm_links enable row level security;

create or replace function graph.nsm_link_node_readable(p_node uuid)
returns boolean
language sql
stable
security definer
set search_path = graph, pg_temp
as $$
  select exists (
    select 1 from graph.nodes n
    where n.id = p_node
      and n.superseded_by is null
      and (n.visibility = 'public' or n.owner_id = auth.uid())
  );
$$;

revoke all on function graph.nsm_link_node_readable(uuid) from public;
grant execute on function graph.nsm_link_node_readable(uuid) to anon, authenticated, service_role;

drop policy if exists public_nsm_links_select on graph.nsm_links;
create policy public_nsm_links_select on graph.nsm_links for select to anon, authenticated using (
  status = 'approved' and graph.nsm_link_node_readable(node_id)
);

grant all on graph.nsm_links to service_role;
revoke all on graph.nsm_links from anon, authenticated;
grant select on graph.nsm_links to anon, authenticated;
