-- The migration applied as a fresh database would apply it: this file drops
-- everything 20260921010000 creates, replays the file in order, and checks
-- that every object is back. It runs in one transaction and rolls back.
--
-- Round 4 of the Bucket critic found the migration calling graph.stage_rank
-- from the awarded_stage backfill above the statement that creates it. The
-- local database hid it, because an incremental apply had created the
-- function in an earlier pass. This replay is what catches that.
--
-- Run from the repository root:
--   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/research_os_evidence_append_fresh.sql
begin;

drop function if exists graph.review_production(uuid, uuid, uuid, text, text, jsonb, boolean, text, jsonb, uuid, uuid, text, jsonb);
drop function if exists graph.override_level(uuid, uuid, uuid, uuid, text, text, timestamptz);
drop function if exists graph.append_evidence(uuid, uuid, text, jsonb, boolean);
drop function if exists graph.stage_rank(text);
alter table graph.learner_node_state drop column if exists awarded_stage;
grant insert, update, delete, truncate, trigger, references on graph.learner_node_state to service_role;

\ir ../migrations/20260921010000_research_os_evidence_append.sql

do $$
begin
  assert to_regprocedure('graph.stage_rank(text)') is not null, 'stage_rank exists after a fresh apply';
  assert to_regprocedure('graph.append_evidence(uuid,uuid,text,jsonb,boolean)') is not null,
    'append_evidence exists after a fresh apply';
  assert to_regprocedure('graph.override_level(uuid,uuid,uuid,uuid,text,text,timestamptz)') is not null,
    'override_level exists after a fresh apply';
  assert (select count(*) from information_schema.columns
           where table_schema = 'graph' and table_name = 'learner_node_state'
             and column_name = 'awarded_stage') = 1,
    'awarded_stage exists after a fresh apply';
  assert (select count(*) from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES']) p
           where has_table_privilege('service_role', 'graph.learner_node_state', p)) = 0,
    'every write privilege is revoked after a fresh apply';
  assert has_table_privilege('service_role', 'graph.learner_node_state', 'SELECT'),
    'the read survives a fresh apply';
  assert to_regprocedure('graph.review_production(uuid,uuid,uuid,text,text,jsonb,boolean,text,jsonb,uuid,uuid,text,jsonb)') is not null,
    'review_production exists after a fresh apply';
end $$;

rollback;
