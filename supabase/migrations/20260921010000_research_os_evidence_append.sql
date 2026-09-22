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

-- The highest stage this learner has ever been awarded for on this node.
-- XP rises once per stage per node: a teacher demotion followed by a
-- re-promotion moves the stage and awards nothing, because the high-water
-- mark did not move. Existing rows start at the stage they hold, so no past
-- award repeats.
alter table graph.learner_node_state add column if not exists awarded_stage text;

-- A row demoted by a teacher before this migration sits below the stage it
-- was credited for, so the mark takes the higher of the current stage and
-- the highest stage any override moved it down from.
update graph.learner_node_state s
   set awarded_stage = (
     select stage_by_rank.stage
     from (
       select st as stage, graph.stage_rank(st) as rank
       from unnest(array[
         s.stage,
         coalesce((select o.from_stage from graph.level_overrides o
                    where o.learner_id = s.learner_id and o.node_id = s.node_id
                      and o.from_stage is not null
                    order by graph.stage_rank(o.from_stage) desc limit 1), s.stage)
       ]) as st
     ) stage_by_rank
     order by stage_by_rank.rank desc
     limit 1
   )
 where awarded_stage is null;


create or replace function graph.append_evidence(
  p_learner uuid,
  p_node uuid,
  p_stage text,
  p_event jsonb,
  p_monotone boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_catalog, pg_temp
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
    -- awarded_stage stays null until something is credited, so a first
    -- touch that lands on access is still a first award.
    insert into graph.learner_node_state (learner_id, node_id, stage, evidence, awarded_stage)
    values (p_learner, p_node, 'access', '[]'::jsonb, null)
    on conflict (learner_id, node_id) do nothing;
    if found then v_created := true; end if;

    select stage, awarded_stage into v_prior, v_awarded
    from graph.learner_node_state
    where learner_id = p_learner and node_id = p_node
    for update;

    exit when v_prior is not null;
  end loop;

  if v_prior is null then
    -- A privacy delete removed the learner between the insert and the lock,
    -- twice. The caller is told what happened instead of reading a raise.
    return jsonb_build_object('deleted', true, 'stage', null, 'event_count', 0);
  end if;

  v_stage := coalesce(v_asked, v_prior);
  if p_monotone and graph.stage_rank(v_stage) < graph.stage_rank(v_prior) then
    v_stage := v_prior;
  end if;

  -- XP is awarded on the high-water mark, so the award runs from the
  -- highest stage already credited. A stage at or below it awards nothing.
  -- A null mark means nothing has been credited for this node yet, which
  -- ranks below every stage.
  if graph.stage_rank(v_stage) > graph.stage_rank(coalesce(v_awarded, '')) then
    v_award_from := v_awarded;
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
    'awards', v_award_from is distinct from v_stage,
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
security definer
set search_path = graph, pg_catalog, pg_temp
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

  -- A row that does not exist yet cannot be locked, so two overrides on an
  -- untouched node would both read a null prior stage and both write an
  -- audit row. The advisory lock exists whether the row does or not.
  perform pg_advisory_xact_lock(hashtextextended(p_learner::text || ':' || p_node::text, 0));

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


-- The two functions above own every application write of the state row, and
-- graph.privacy_delete_learner owns the deletion. Both are security
-- definers, so the service role keeps its reads and loses the writes it no
-- longer performs. This is the invariant the receipts in the next slice
-- rest on, enforced where a test cannot be talked out of it.
-- truncate and trigger are writes too: truncate empties the table, and a
-- trigger writes on the definer's behalf.
revoke insert, update, delete, truncate, trigger, references on graph.learner_node_state from service_role;

-- Rollback for this migration, in order:
--   revoke: grant insert, update, delete, truncate, trigger, references on graph.learner_node_state to service_role;
--   drop function if exists graph.review_production(uuid, uuid, uuid, text, text, jsonb, boolean, text, jsonb, uuid, uuid, text, jsonb);
--   drop function if exists graph.review_production(uuid, uuid, uuid, text, text, jsonb, boolean, text, jsonb, uuid, uuid, text, jsonb, timestamptz);
--   drop function if exists graph.override_level(uuid, uuid, uuid, uuid, text, text, timestamptz);
--   drop function if exists graph.append_evidence(uuid, uuid, text, jsonb, boolean);
--   drop function if exists graph.stage_rank(text);
--   alter table graph.learner_node_state drop column if exists awarded_stage;
-- A build carrying src/lib/research-os/db.ts's recordEvidence needs the
-- functions, so the rollback goes with a revert of that build.

-- A production review writes three rows: the production's status and notes,
-- the teacher's audit row, and the learner's evidence event. Before this
-- function the route wrote them in sequence, so a lock wait on the append
-- left the production accepted with no review event and no way forward: a
-- retry read the status as no longer submitted and answered 409 (Bucket
-- critic ROS194-27). The three writes now commit together or not at all.
--
-- The route keeps every decision: it computes the next status, the note,
-- the incentive flag, the audit note and the evidence event, and this
-- function writes them under one lock.
-- A signature change makes create-or-replace create a second overload
-- rather than replace the first, and PostgREST then refuses a named call as
-- ambiguous, so every review would answer 500 (Bucket critic ROS194-44).
-- The earlier shape is dropped by name and arguments before the create.
drop function if exists graph.review_production(uuid, uuid, uuid, text, text, jsonb, boolean, text, jsonb, uuid, uuid, text, jsonb, timestamptz);

create or replace function graph.review_production(
  p_production uuid,
  p_review_id uuid,
  p_reviewer uuid,
  p_decision text,
  p_next_status text,
  p_notes jsonb,
  p_incentive boolean,
  p_reason text,
  p_note jsonb,
  p_learner uuid,
  p_target uuid,
  p_stage text,
  p_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_catalog, pg_temp
as $$
declare
  v_status text;
  v_review uuid;
  v_append jsonb;
  v_row jsonb;
begin
  set local lock_timeout = '1s';

  select status into v_status from graph.productions where id = p_production for update;
  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'production_not_found');
  end if;
  if v_status <> 'submitted' then
    return jsonb_build_object('ok', false, 'error', 'not_pending', 'status', v_status);
  end if;

  -- updated_at belongs to the graph_productions_touch trigger, which
  -- overwrites anything this statement sets.
  update graph.productions
     set status = p_next_status,
         notes = p_notes,
         production_incentive_eligible = p_incentive
   where id = p_production
  returning to_jsonb(graph.productions.*) into v_row;

  -- The caller supplies the id so the evidence event can name the review
  -- it belongs to, which it has to build before this transaction opens.
  insert into graph.teacher_reviews (id, reviewer_id, learner_id, kind, production_id, decision, reason, evidence)
  values (coalesce(p_review_id, gen_random_uuid()), p_reviewer, p_learner, 'production', p_production, p_decision, p_reason, p_note)
  returning id into v_review;

  v_append := graph.append_evidence(p_learner, p_target, p_stage, p_event);
  if coalesce((v_append->>'deleted')::boolean, false) then
    raise exception 'review_production: learner % was deleted', p_learner;
  end if;

  return jsonb_build_object(
    'ok', true,
    'review_id', v_review,
    'production', v_row,
    'award_from', v_append->'award_from',
    'awards', v_append->'awards'
  );
end;
$$;

revoke all on function graph.review_production(uuid, uuid, uuid, text, text, jsonb, boolean, text, jsonb, uuid, uuid, text, jsonb) from public;
grant execute on function graph.review_production(uuid, uuid, uuid, text, text, jsonb, boolean, text, jsonb, uuid, uuid, text, jsonb) to service_role;
