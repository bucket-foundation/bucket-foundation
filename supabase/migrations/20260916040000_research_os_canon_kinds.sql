-- Everything researched joins one graph (learning/research-os/IDEAL-STATE.md;
-- scripts/research-os/ingest/canon-all.ts): canon claims and concepts,
-- primary papers from every branch, figures, sites, and the cross-branch
-- bridges, beside the Academy atoms. Two node kinds and three edge kinds
-- for the parts that had none. Idempotent.
alter table graph.nodes drop constraint if exists nodes_kind_check;
alter table graph.nodes add constraint nodes_kind_check check (kind in (
  'fact','concept','law','derivation','primary_source','artifact',
  'hypothesis','extension','replication','peer_review','production',
  'figure','site'
));
alter table graph.edges drop constraint if exists edges_kind_check;
alter table graph.edges add constraint edges_kind_check check (kind in (
  'prerequisite','derives_from','cites','generalizes','example_of','contradicts',
  'extends','replicates','reviews','answers',
  'contributes','authored','bridges'
));
