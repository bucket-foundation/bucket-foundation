-- Research OS, frontier kinds and open questions (ros-31, ros-24).
-- INTEGRATION-PLAN.md section 3: the frontier itself, extensions of the
-- frontier, replications, peer reviews, each a node or edge kind with its
-- own provenance; canon claims flagged as open questions are a frontier
-- target source beside engine hypotheses, teacher picks, and learner picks.

-- 1. Node kinds: hypothesis (engine or human), extension, replication,
--    peer_review, beside the six the graph started with.
alter table graph.nodes drop constraint if exists nodes_kind_check;
alter table graph.nodes add constraint nodes_kind_check check (kind in (
  'fact','concept','law','derivation','primary_source','artifact',
  'hypothesis','extension','replication','peer_review'
));

-- 2. Edge kinds: extends (an extension of a claim), replicates (a
--    replication of a study), reviews (a peer review of a production),
--    answers (a production that answers an open question).
alter table graph.edges drop constraint if exists edges_kind_check;
alter table graph.edges add constraint edges_kind_check check (kind in (
  'prerequisite','derives_from','cites','generalizes','example_of','contradicts',
  'extends','replicates','reviews','answers'
));

-- 3. A frontier flag on any node: 'open_question' marks a claim whose
--    answer is not in the graph; 'frontier' marks the current edge of a
--    branch. Set by staff or a reviewer through /api/research-os/frontier.
alter table graph.nodes add column if not exists frontier_flag text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'nodes_frontier_flag_check') then
    alter table graph.nodes add constraint nodes_frontier_flag_check check (frontier_flag is null or frontier_flag in ('open_question','frontier'));
  end if;
end $$;
create index if not exists nodes_frontier_flag_idx on graph.nodes (branch, frontier_flag) where frontier_flag is not null;
