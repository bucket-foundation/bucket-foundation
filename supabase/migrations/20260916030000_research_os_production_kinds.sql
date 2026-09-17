-- Productions come in four kinds (INTEGRATION-PLAN.md section 3 and 10;
-- FRONTIER.md): a production of a new claim, an extension of a claim, a
-- replication of a study, and a peer review of a production. kind names
-- which; related_node_id names the node acted on for the last three. An
-- accepted production of any kind becomes a node of the matching kind with
-- an edge to that node (src/lib/research-os/production-node.ts). Idempotent.

alter table graph.productions add column if not exists kind text not null default 'production';
alter table graph.productions add column if not exists related_node_id uuid references graph.nodes (id) on delete set null;
alter table graph.productions add column if not exists node_id uuid references graph.nodes (id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'productions_kind_check') then
    alter table graph.productions add constraint productions_kind_check check (kind in ('production','extension','replication','peer_review'));
  end if;
end $$;
create index if not exists graph_productions_related_idx on graph.productions (related_node_id) where related_node_id is not null;
