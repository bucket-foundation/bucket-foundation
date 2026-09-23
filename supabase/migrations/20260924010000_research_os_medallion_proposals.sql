alter table graph.silver_items add column if not exists subject text not null default '';
alter table graph.silver_items drop constraint if exists silver_items_unique;
alter table graph.silver_items add constraint silver_items_unique
  unique (source_id, source_revision, parser, parser_revision, kind, span_start, span_end, subject);

alter table graph.edge_proposals add column if not exists action text not null default 'add';
alter table graph.edge_proposals add column if not exists proposed_kind text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'edge_proposals_action_check') then
    alter table graph.edge_proposals add constraint edge_proposals_action_check check (action in ('add', 'demote'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'edge_proposals_proposed_kind_check') then
    alter table graph.edge_proposals add constraint edge_proposals_proposed_kind_check
      check (proposed_kind is null or proposed_kind in ('prerequisite', 'derives_from'));
  end if;
end $$;

alter table graph.edge_proposals drop constraint if exists edge_proposals_confidence_source_check;
alter table graph.edge_proposals add constraint edge_proposals_confidence_source_check
  check (confidence_source in ('inferred_llm', 'prime_decompose_llm', 'medallion_lexical'));

alter table graph.node_proposals add column if not exists draft jsonb;
