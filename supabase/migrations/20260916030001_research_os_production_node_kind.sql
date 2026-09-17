-- A plain production (a new claim) becomes a node of kind 'production'
-- (src/lib/research-os/production-node.ts); the kind list gains it.
alter table graph.nodes drop constraint if exists nodes_kind_check;
alter table graph.nodes add constraint nodes_kind_check check (kind in (
  'fact','concept','law','derivation','primary_source','artifact',
  'hypothesis','extension','replication','peer_review','production'
));
