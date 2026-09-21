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

-- The highest stage this learner has ever been awarded for on this node.
-- XP rises once per stage per node: a teacher demotion followed by a
-- re-promotion moves the stage and awards nothing, because the high-water
-- mark did not move. Existing rows start at the stage they hold, so no past
-- award repeats.
alter table graph.learner_node_state add column if not exists awarded_stage text;
update graph.learner_node_state set awarded_stage = stage where awarded_stage is null;

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
  v_awarded text;
  v_award_from text;
  v_attempt integer;
  v_created boolean := false;
  v_count integer;
begin
  -- A stuck row returns a retryable error instead of holding the request.
  -- lock_timeout is read when a lock is requested, so setting it here binds
  -- the waits below. A statement timeout is armed when the statement
  -- starts, so setting it inside the running statement would do nothing;
  -- that bound belongs to the calling role's default.
  set local lock_timeout = '1s';

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

  -- A row this call creates has no prior stage. Reporting 'access' for it
  -- would tell a caller the learner had already been at access, which the
  -- game layer counts differently from a first touch. A privacy delete can
  -- remove the row between the insert and the lock, so the pair runs twice
  -- before giving up.
  for v_attempt in 1..2 loop
    insert into graph.learner_node_state (learner_id, node_id, stage, evidence, awarded_stage)
    values (p_learner, p_node, 'access', '[]'::jsonb, 'access')
    on conflict (learner_id, node_id) do nothing;
    if found then v_created := true; end if;

    select stage, coalesce(awarded_stage, stage) into v_prior, v_awarded
    from graph.learner_node_state
    where learner_id = p_learner and node_id = p_node
    for update;

    exit when v_prior is not null;
  end loop;

  if v_prior is null then
    raise exception 'append_evidence: no state row for learner % node %', p_learner, p_node;
  end if;

  v_stage := coalesce(v_asked, v_prior);
  if p_monotone and graph.stage_rank(v_stage) < graph.stage_rank(v_prior) then
    v_stage := v_prior;
  end if;

  -- XP is awarded on the high-water mark, so the award runs from the
  -- highest stage already credited. A stage at or below it awards nothing.
  if graph.stage_rank(v_stage) > graph.stage_rank(v_awarded) then
    v_award_from := case when v_created and v_awarded = 'access' then null else v_awarded end;
    v_awarded := v_stage;
  else
    v_award_from := v_stage;
  end if;

  update graph.learner_node_state
     set evidence = evidence || jsonb_build_array(p_event),
         stage = v_stage,
         awarded_stage = v_awarded,
         updated_at = now()
   where learner_id = p_learner and node_id = p_node
   returning jsonb_array_length(evidence) into v_count;

  return jsonb_build_object(
    'prior_stage', case when v_created then null else to_jsonb(v_prior) end,
    'stage', v_stage,
    'created', v_created,
    'award_from', case when v_award_from is null then null else to_jsonb(v_award_from) end,
    'awards', graph.stage_rank(v_stage) > graph.stage_rank(coalesce(v_award_from, '')),
    'event_count', v_count
  );
end;
$$;

revoke all on function graph.append_evidence(uuid, uuid, text, jsonb, boolean) from public;
grant execute on function graph.append_evidence(uuid, uuid, text, jsonb, boolean) to service_role;
revoke all on function graph.stage_rank(text) from public;
grant execute on function graph.stage_rank(text) to service_role;


-- A teacher override moves a stage and records why. Both writes belong to
-- one transaction: before this function the append committed first, so an
-- audit insert that failed left a demotion nobody could account for
-- (Bucket critic ROS194-12). The function locks the state row, refuses an
-- override that would leave the stage where it is, builds the evidence
-- event from the stage it locked, and writes the audit row beside it.
create or replace function graph.override_level(
  p_learner uuid,
  p_node uuid,
  p_set_by uuid,
  p_class uuid,
  p_to_stage text,
  p_reason text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
as $$
declare
  v_append jsonb;
  v_prior text;
  v_event jsonb;
  v_override uuid;
begin
  set local lock_timeout = '1s';

  if graph.stage_rank(p_to_stage) < 0 then
    raise exception 'override_level: unknown stage %', p_to_stage;
  end if;

  select stage into v_prior
  from graph.learner_node_state
  where learner_id = p_learner and node_id = p_node
  for update;

  if v_prior is not null and v_prior = p_to_stage then
    return jsonb_build_object('ok', false, 'error', 'same_level', 'prior_stage', v_prior);
  end if;

  v_event := jsonb_build_object(
    'kind', 'override',
    'at', to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'from', case when v_prior is null then null else to_jsonb(v_prior) end,
    'to', p_to_stage,
    'reason', btrim(p_reason),
    'setBy', p_set_by,
    'classId', case when p_class is null then null else to_jsonb(p_class) end
  );

  v_append := graph.append_evidence(p_learner, p_node, p_to_stage, v_event, false);

  insert into graph.level_overrides (learner_id, node_id, set_by, class_id, from_stage, to_stage, reason)
  values (p_learner, p_node, p_set_by, p_class, v_prior, p_to_stage, btrim(p_reason))
  returning id into v_override;

  return jsonb_build_object(
    'ok', true,
    'override_id', v_override,
    'prior_stage', case when v_prior is null then null else to_jsonb(v_prior) end,
    'stage', v_append->>'stage',
    'award_from', v_append->'award_from',
    'awards', v_append->'awards',
    'event_count', (v_append->>'event_count')::int
  );
end;
$$;

revoke all on function graph.override_level(uuid, uuid, uuid, uuid, text, text, timestamptz) from public;
grant execute on function graph.override_level(uuid, uuid, uuid, uuid, text, text, timestamptz) to service_role;
