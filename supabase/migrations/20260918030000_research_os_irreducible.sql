-- ros-prime 2 (learning/research-os/PRIMES.md, "Slice 2"): the nodes the
-- model calls irreducible, reviewable like any other proposal; a flag on
-- edge proposals that form a cycle with other pending proposals; and a
-- merging upsert for edge proposals. Idempotent.

-- A node the proposer says rests on nothing more basic. A reviewer confirms
-- or rejects; a confirmed node is a prime by review and leaves the
-- decompose-further targets.
create table if not exists graph.irreducible_proposals (
  id               uuid        primary key default gen_random_uuid(),
  node_slug        text        not null,
  justification    text        not null,
  model            text        not null,
  prompt_hash      text        not null,
  status           text        not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  reviewer_id      uuid        references auth.users (id) on delete set null,
  decision_reason  text,
  decided_at       timestamptz,
  created_at       timestamptz not null default now(),
  constraint graph_irreducible_proposals_node_uidx unique (node_slug)
);
alter table graph.irreducible_proposals enable row level security;
grant all on graph.irreducible_proposals to service_role;

-- True when the pair sits in a cycle with other pending proposals (a
-- strongly connected component over existing factor edges plus every
-- pending proposal): approving all of them would close it.
alter table graph.edge_proposals add column if not exists in_cycle boolean not null default false;

-- Merge decomposition proposals by pair. A pending row from the same
-- source takes the newer verdict, confidence, justification, impact, and
-- cycle flag; a decided row stays as the reviewer left it, and a pending
-- row from another source (lexical inference) keeps the pair. One result
-- row per input says whether it was written and, when it was not, what
-- holds the pair, so the runner reports every skip.
drop function if exists graph.merge_edge_proposals(jsonb);
create function graph.merge_edge_proposals(p_rows jsonb)
returns table (pair_from text, pair_to text, written boolean, held_status text, held_source text)
language plpgsql
as $$
declare
  r jsonb;
  rc integer;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into graph.edge_proposals as ep
      (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, secondary_justification,
       model, prompt_hash, secondary_prompt_hash, status, impact, cross_branch, verification, origin, refd, in_cycle)
    values (
      r ->> 'from_slug', r ->> 'to_slug', r ->> 'branch', (r ->> 'confidence')::real, r ->> 'confidence_source',
      coalesce((r ->> 'agreement')::boolean, false), r ->> 'justification', r ->> 'secondary_justification',
      r ->> 'model', r ->> 'prompt_hash', r ->> 'secondary_prompt_hash', 'pending',
      coalesce((r ->> 'impact')::integer, 0), coalesce((r ->> 'cross_branch')::boolean, false),
      r ->> 'verification', r ->> 'origin', (r ->> 'refd')::real, coalesce((r ->> 'in_cycle')::boolean, false)
    )
    on conflict on constraint graph_edge_proposals_pair_uidx do update set
      -- An unchecked rerun keeps the verdict it already had, with its
      -- confidence and agreement; a new verdict replaces all three.
      confidence = case when excluded.verification = 'unchecked' and ep.verification in ('confirmed', 'refuted') then ep.confidence else excluded.confidence end,
      agreement = case when excluded.verification = 'unchecked' and ep.verification in ('confirmed', 'refuted') then ep.agreement else excluded.agreement end,
      justification = excluded.justification,
      secondary_justification = coalesce(excluded.secondary_justification, ep.secondary_justification),
      secondary_prompt_hash = coalesce(excluded.secondary_prompt_hash, ep.secondary_prompt_hash),
      model = excluded.model,
      prompt_hash = excluded.prompt_hash,
      impact = excluded.impact,
      cross_branch = excluded.cross_branch,
      verification = case when excluded.verification = 'unchecked' and ep.verification in ('confirmed', 'refuted') then ep.verification else excluded.verification end,
      refd = coalesce(excluded.refd, ep.refd),
      in_cycle = excluded.in_cycle
    where ep.status = 'pending' and ep.confidence_source = excluded.confidence_source;
    get diagnostics rc = row_count;
    pair_from := r ->> 'from_slug';
    pair_to := r ->> 'to_slug';
    written := rc > 0;
    held_status := null;
    held_source := null;
    if rc = 0 then
      select ep.status, ep.confidence_source into held_status, held_source
      from graph.edge_proposals ep
      where ep.from_slug = pair_from and ep.to_slug = pair_to;
    end if;
    return next;
  end loop;
end;
$$;

grant execute on function graph.merge_edge_proposals(jsonb) to service_role;

-- A missing prime's one-sentence definition, written by the consolidation
-- pass. Approval uses it as the new node's summary unless the reviewer
-- writes another; the proposer's reason says why a target needs the idea
-- and stays out of the summary.
alter table graph.node_proposals add column if not exists summary text;

-- Merge missing ideas by key. A pending row gathers the new naming nodes,
-- aliases, and reasons, takes the newer duplicate list and base-idea hint,
-- and keeps its definition unless it had none; a decided row stays as the
-- reviewer left it.
create or replace function graph.merge_node_proposals(p_rows jsonb)
returns table (key text, status text, created_node_id uuid)
language plpgsql
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into graph.node_proposals as np
      (key, title, branch, justification, summary, named_by, aliases, reasons, possible_duplicates, base_match, model)
    values (
      r ->> 'key',
      r ->> 'title',
      r ->> 'branch',
      r ->> 'justification',
      nullif(r ->> 'summary', ''),
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
      possible_duplicates = excluded.possible_duplicates,
      base_match = excluded.base_match,
      summary = coalesce(np.summary, excluded.summary)
    where np.status = 'pending';
  end loop;
  return query
    select np.key, np.status, np.created_node_id
    from graph.node_proposals np
    where np.key in (select e ->> 'key' from jsonb_array_elements(p_rows) e);
end;
$$;

grant execute on function graph.merge_node_proposals(jsonb) to service_role;

-- These functions write or read proposal and closure rows for the review
-- tooling only; PUBLIC loses the default execute grant, and service_role
-- keeps its explicit one.
revoke execute on function graph.merge_edge_proposals(jsonb) from public;
revoke execute on function graph.merge_node_proposals(jsonb) from public;
revoke execute on function graph.rests_on(uuid, uuid) from public;
revoke execute on function graph.idea_dependents(text[]) from public;
revoke execute on function graph.replace_prereq_ancestor(text, uuid[], jsonb) from public;
