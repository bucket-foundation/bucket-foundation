-- ros-ai-access (learning/research-os/ai/IMPLEMENTATION.md, "Quote contract"):
-- one transactional append for a learner's evidence log.
--
-- src/lib/research-os/db.ts's recordEvidence read the evidence array and
-- then upserted it, so two writers racing on the same (learner, node) row
-- both read the same array and the second upsert erased the first event.
-- Quote, Check, corroboration, probe, production and review all write that
-- row, and the receipt work in this bead depends on an append nobody can
-- overwrite.
--
-- The function locks or creates the row, appends one event, and returns the
-- stage it found and the stage it left, so a caller that awards progress
-- reads the same prior stage the write used. Stage is monotone by default,
-- matching src/lib/research-os/stages.ts, where a transition never moves a
-- learner backward; a caller that has to set a lower stage passes
-- p_monotone false and says why at the call site.

create or replace function graph.stage_rank(p_stage text)
returns integer
language sql
immutable
as $$
  select case p_stage
    when 'access' then 0
    when 'awareness' then 1
    when 'understanding' then 2
    when 'internalization' then 3
    when 'production' then 4
    else -1
  end;
$$;

create or replace function graph.append_evidence(
  p_learner uuid,
  p_node uuid,
  p_stage text,
  p_event jsonb,
  p_monotone boolean default true
)
returns jsonb
language plpgsql
as $$
declare
  v_prior text;
  v_stage text;
  v_asked text;
  v_count integer;
begin
  -- A stuck row returns a retryable error instead of holding the request.
  set local lock_timeout = '1s';
  set local statement_timeout = '3s';

  if p_learner is null or p_node is null then
    raise exception 'append_evidence: learner and node are required';
  end if;
  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'append_evidence: event must be a json object';
  end if;
  -- An empty stage means "keep the row where it is", which is what a
  -- caller with no transition to record passes.
  v_asked := nullif(p_stage, '');
  if v_asked is not null and graph.stage_rank(v_asked) < 0 then
    raise exception 'append_evidence: unknown stage %', v_asked;
  end if;

  insert into graph.learner_node_state (learner_id, node_id, stage, evidence)
  values (p_learner, p_node, 'access', '[]'::jsonb)
  on conflict (learner_id, node_id) do nothing;

  select stage into v_prior
  from graph.learner_node_state
  where learner_id = p_learner and node_id = p_node
  for update;

  if v_prior is null then
    raise exception 'append_evidence: no state row for learner % node %', p_learner, p_node;
  end if;

  v_stage := coalesce(v_asked, v_prior);
  if p_monotone and graph.stage_rank(v_stage) < graph.stage_rank(v_prior) then
    v_stage := v_prior;
  end if;

  update graph.learner_node_state
     set evidence = evidence || jsonb_build_array(p_event),
         stage = v_stage,
         updated_at = now()
   where learner_id = p_learner and node_id = p_node
   returning jsonb_array_length(evidence) into v_count;

  return jsonb_build_object('prior_stage', v_prior, 'stage', v_stage, 'event_count', v_count);
end;
$$;

revoke all on function graph.append_evidence(uuid, uuid, text, jsonb, boolean) from public;
grant execute on function graph.append_evidence(uuid, uuid, text, jsonb, boolean) to service_role;
grant execute on function graph.stage_rank(text) to service_role;
