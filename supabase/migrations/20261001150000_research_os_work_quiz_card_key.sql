create or replace function graph.work_quiz_card_key(p_fact_id text, p_form text)
returns text
language sql
immutable
strict
as $$
  select p_fact_id || '|' || p_form
$$;

alter table graph.work_quiz_cards add column if not exists fact_id text;
alter table graph.work_quiz_cards add column if not exists form text;
alter table graph.work_quiz_cards add column if not exists card_key text
  generated always as (graph.work_quiz_card_key(fact_id, form)) stored;

create unique index if not exists graph_work_quiz_cards_card_key_idx on graph.work_quiz_cards (learner_id, card_key)
  where card_key is not null;

revoke all on function graph.work_quiz_card_key(text, text) from public, anon, authenticated;
grant execute on function graph.work_quiz_card_key(text, text) to service_role;
