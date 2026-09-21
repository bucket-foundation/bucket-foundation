-- ros-prime 2, the decompose-further queue (learning/research-os/PRIMES.md,
-- "Slice 2"). A model proposes the factors of every prime and unfactored
-- concept, a second model verifies each pair, and a reviewer decides at
-- /research-os/edges. Proposals never write graph.edges or graph.nodes on
-- their own. Idempotent, matching every other migration in this repo.

-- Edge proposals from the decomposition carry their own source, the number
-- of nodes resting on the target (the review order), and whether the factor
-- sits in another branch.
alter table graph.edge_proposals drop constraint if exists edge_proposals_confidence_source_check;
alter table graph.edge_proposals
  add constraint edge_proposals_confidence_source_check
  check (confidence_source in ('inferred_llm', 'prime_decompose_llm'));
alter table graph.edge_proposals add column if not exists impact integer not null default 0;
alter table graph.edge_proposals add column if not exists cross_branch boolean not null default false;
create index if not exists graph_edge_proposals_queue_idx on graph.edge_proposals (status, impact desc, created_at);

-- Base ideas the graph lacks, named by the proposer while decomposing a
-- target. One row per normalized title; `named_by` holds the target slugs.
-- Approving a row creates a concept node at the lowest grade tier among
-- its naming targets and queues an unchecked factor proposal from it to
-- every target in `named_by` (later migrations and decide-node.ts).
create table if not exists graph.node_proposals (
  id               uuid        primary key default gen_random_uuid(),
  key              text        not null,
  title            text        not null,
  branch           text        not null,
  justification    text        not null,
  named_by         text[]      not null default '{}',
  -- The semantic prime or mathematical foundation the title matches, if any
  -- (src/lib/research-os/decompose-further.ts, BASE_IDEAS).
  base_match       text,
  model            text        not null,
  status           text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_node_id  uuid        references graph.nodes (id) on delete set null,
  reviewer_id      uuid        references auth.users (id) on delete set null,
  decision_reason  text,
  decided_at       timestamptz,
  created_at       timestamptz not null default now(),
  constraint graph_node_proposals_key_uidx unique (key)
);

create index if not exists graph_node_proposals_status_idx on graph.node_proposals (status);

alter table graph.node_proposals enable row level security;
grant all on graph.node_proposals to service_role;
