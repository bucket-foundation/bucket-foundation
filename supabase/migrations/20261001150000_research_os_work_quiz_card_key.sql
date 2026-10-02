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

update graph.work_quiz_cards
set
  fact_id = case
    when question -> 'sources' -> 0 is null then 'count:' || replace(question_id, '|', '/')
    when question -> 'sources' -> 0 ->> 'kind' = 'pr' then 'pr:' || ltrim(question -> 'sources' -> 0 ->> 'ref', '#')
    else (question -> 'sources' -> 0 ->> 'kind') || ':' || replace(question -> 'sources' -> 0 ->> 'ref', '|', '/')
  end,
  form = coalesce(question ->> 'form', case question ->> 'type' when 'which_first' then 'compare' else question ->> 'type' end)
where fact_id is null;
