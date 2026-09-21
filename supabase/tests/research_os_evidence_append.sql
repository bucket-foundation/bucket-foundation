-- graph.append_evidence in real Postgres. One transaction, rolled back.
-- Run: psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/research_os_evidence_append.sql
begin;

create temporary table t_ids (learner uuid, node uuid) on commit drop;

with u as (
  insert into auth.users (id, instance_id, aud, role, email)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'append-evidence-' || gen_random_uuid() || '@bucket.test')
  returning id
), n as (
  insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
  values (gen_random_uuid(), 'append-evidence-' || gen_random_uuid(), 'Append evidence fixture',
          'concept', 10, '01-mathematics', 'fixture')
  returning id
)
insert into t_ids (learner, node) select u.id, n.id from u, n;

-- The first append creates the row and keeps the stage it was given.
do $$
declare
  l uuid; n uuid; r jsonb;
begin
  select learner, node into l, n from t_ids;

  r := graph.append_evidence(l, n, 'awareness', '{"kind":"open","at":"1"}'::jsonb);
  -- A row this call created has no prior stage. The game layer counts a
  -- first touch differently from a learner who was already at access.
  assert r->'prior_stage' = 'null'::jsonb, 'a created row reports no prior stage: ' || r::text;
  assert (r->>'created')::boolean, 'the first append says it created the row: ' || r::text;
  assert r->>'stage' = 'awareness', 'first append raises the stage: ' || r::text;
  assert (r->>'event_count')::int = 1, 'first append writes one event: ' || r::text;

  -- A second append keeps the first event.
  r := graph.append_evidence(l, n, 'understanding', '{"kind":"check","at":"2"}'::jsonb);
  assert (r->>'event_count')::int = 2, 'the second append keeps the first event: ' || r::text;
  assert r->>'prior_stage' = 'awareness', 'the second append reports the stage it found: ' || r::text;
  assert not (r->>'created')::boolean, 'a second append does not claim to create: ' || r::text;

  -- A lower stage cannot pull a learner backward, and the event still lands.
  r := graph.append_evidence(l, n, 'access', '{"kind":"quote","at":"3"}'::jsonb);
  assert r->>'stage' = 'understanding', 'a lower stage leaves the row where it was: ' || r::text;
  assert (r->>'event_count')::int = 3, 'a lower stage still appends: ' || r::text;

  -- A caller that means it can lower the stage.
  r := graph.append_evidence(l, n, 'awareness', '{"kind":"teacher_review","at":"4"}'::jsonb, false);
  assert r->>'stage' = 'awareness', 'p_monotone false lowers the stage: ' || r::text;

  -- A teacher override lowers a stage on purpose, which is the one caller
  -- that passes p_monotone false (src/lib/research-os/class-db.ts).
  r := graph.append_evidence(l, n, 'production', '{"kind":"check","at":"3b"}'::jsonb);
  assert r->>'stage' = 'production', 'the fixture reaches production: ' || r::text;
  r := graph.append_evidence(l, n, 'awareness', '{"kind":"teacher_review","at":"3c"}'::jsonb, false);
  assert r->>'stage' = 'awareness', 'an override lowers the stage: ' || r::text;
  assert r->>'prior_stage' = 'production', 'the override reports what it locked: ' || r::text;
  r := graph.append_evidence(l, n, 'production', '{"kind":"check","at":"3d"}'::jsonb);
  assert r->>'stage' = 'production', 'a raise after an override holds: ' || r::text;

  -- An empty stage keeps the current one.
  r := graph.append_evidence(l, n, '', '{"kind":"open","at":"5"}'::jsonb);
  assert r->>'stage' = 'production', 'an empty stage keeps the current one: ' || r::text;

  -- Every event is in order, none lost.
  assert (select jsonb_array_length(evidence) from graph.learner_node_state where learner_id = l and node_id = n) = 8,
    'eight appends leave eight events';
  assert (select evidence->0->>'at' from graph.learner_node_state where learner_id = l and node_id = n) = '1',
    'the first event stays first';
  assert (select evidence->7->>'at' from graph.learner_node_state where learner_id = l and node_id = n) = '5',
    'the last event is last';
end $$;

-- The award mark: what a node has already been credited for.
do $$
declare
  l uuid; n uuid; r jsonb;
begin
  select learner, node into l, n from t_ids;
  delete from graph.learner_node_state where learner_id = l and node_id = n;

  -- A first touch that lands on access is still a first award.
  r := graph.append_evidence(l, n, 'access', '{"kind":"open","at":"a1"}'::jsonb);
  assert r->'award_from' = 'null'::jsonb, 'a first touch awards from nothing: ' || r::text;
  assert (r->>'awards')::boolean, 'a first touch at access awards: ' || r::text;
  assert (select awarded_stage from graph.learner_node_state where learner_id = l and node_id = n) = 'access',
    'the mark moves to access';

  -- A climb awards the step above the mark.
  r := graph.append_evidence(l, n, 'understanding', '{"kind":"check","at":"a2"}'::jsonb);
  assert r->>'award_from' = 'access', 'a climb awards from the mark: ' || r::text;
  assert (r->>'awards')::boolean, 'a climb awards: ' || r::text;

  -- An event at or below the mark awards nothing.
  r := graph.append_evidence(l, n, 'awareness', '{"kind":"quote","at":"a3"}'::jsonb);
  assert not (r->>'awards')::boolean, 'a stage below the mark awards nothing: ' || r::text;
  r := graph.append_evidence(l, n, 'understanding', '{"kind":"check","at":"a4"}'::jsonb);
  assert not (r->>'awards')::boolean, 'a stage already credited awards nothing: ' || r::text;

  -- A demotion by any caller leaves the mark where it was, so the re-climb
  -- to that stage awards nothing.
  r := graph.append_evidence(l, n, 'access', '{"kind":"override","at":"a5"}'::jsonb, false);
  assert r->>'stage' = 'access', 'the demotion lands: ' || r::text;
  assert (select awarded_stage from graph.learner_node_state where learner_id = l and node_id = n) = 'understanding',
    'the mark survives a demotion';
  r := graph.append_evidence(l, n, 'understanding', '{"kind":"check","at":"a6"}'::jsonb);
  assert not (r->>'awards')::boolean, 'the re-climb awards nothing: ' || r::text;

  -- A row the migration backfilled carries its own stage as the mark, so
  -- the next event at that stage awards nothing.
  update graph.learner_node_state set stage = 'awareness', awarded_stage = 'awareness'
   where learner_id = l and node_id = n;
  r := graph.append_evidence(l, n, 'awareness', '{"kind":"open","at":"a7"}'::jsonb);
  assert not (r->>'awards')::boolean, 'a backfilled row awards nothing at its own stage: ' || r::text;

  -- A mark that is absent at runtime means nothing has been credited, which
  -- is what a row created after this migration starts with.
  update graph.learner_node_state set awarded_stage = null where learner_id = l and node_id = n;
  r := graph.append_evidence(l, n, 'awareness', '{"kind":"open","at":"a8"}'::jsonb);
  assert (r->>'awards')::boolean, 'an uncredited row awards: ' || r::text;
end $$;

-- An override writes its three artifacts together, or none of them.
do $$
declare
  l uuid; n uuid; t uuid; c uuid; r jsonb; caught boolean;
begin
  select learner, node into l, n from t_ids;
  insert into auth.users (id, instance_id, aud, role, email)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'override-sql-' || gen_random_uuid() || '@bucket.test')
  returning id into t;
  insert into graph.classes (id, name, reviewer_email, created_by)
  values (gen_random_uuid(), 'Override SQL fixture', 'override-sql@bucket.test', t)
  returning id into c;

  delete from graph.learner_node_state where learner_id = l and node_id = n;
  perform graph.append_evidence(l, n, 'production', '{"kind":"production_submitted"}'::jsonb);

  r := graph.override_level(l, n, t, c, 'awareness', 'returned for revision');
  assert (r->>'ok')::boolean, 'the override succeeds: ' || r::text;
  assert r->>'prior_stage' = 'production', 'the override reports the stage it locked: ' || r::text;
  assert (select stage from graph.learner_node_state where learner_id = l and node_id = n) = 'awareness',
    'the override lands on the state row';
  assert (select count(*) from graph.level_overrides where learner_id = l and node_id = n) = 1,
    'the override writes one audit row';

  -- The same level twice writes nothing.
  r := graph.override_level(l, n, t, c, 'awareness', 'again');
  assert not (r->>'ok')::boolean and r->>'error' = 'same_level', 'a no-op override is refused: ' || r::text;
  assert (select count(*) from graph.level_overrides where learner_id = l and node_id = n) = 1,
    'the refusal writes no audit row';

  -- An unknown class takes the whole transaction with it.
  caught := false;
  begin
    perform graph.override_level(l, n, t, gen_random_uuid(), 'understanding', 'no such class');
  exception when others then caught := true;
  end;
  assert caught, 'an unknown class refuses the override';
end $$;

-- A production review writes three rows together, or none of them.
do $$
declare
  l uuid; n uuid; t uuid; c uuid; pr uuid; rv uuid; r jsonb; caught boolean;
  v_reviews integer; v_events integer;
begin
  select learner, node into l, n from t_ids;
  insert into auth.users (id, instance_id, aud, role, email)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'review-sql-' || gen_random_uuid() || '@bucket.test')
  returning id into t;
  insert into graph.classes (id, name, reviewer_email, created_by)
  values (gen_random_uuid(), 'Review SQL fixture', 'review-sql@bucket.test', t)
  returning id into c;
  insert into graph.productions (learner_id, target_node_id, kind, claim, status)
  values (l, n, 'production', 'a claim under review', 'submitted')
  returning id into pr;

  delete from graph.learner_node_state where learner_id = l and node_id = n;
  perform graph.append_evidence(l, n, 'production', '{"kind":"production_submitted"}'::jsonb);

  rv := gen_random_uuid();
  r := graph.review_production(
    pr, rv, t, 'approved', 'accepted', '[]'::jsonb, false, 'clear', '{"at":"now"}'::jsonb,
    l, n, 'production', jsonb_build_object('kind', 'teacher_review', 'reviewId', rv)
  );
  assert (r->>'ok')::boolean, 'the review commits: ' || r::text;
  assert r->>'review_id' = rv::text, 'the review row takes the id the event names: ' || r::text;
  assert (select status from graph.productions where id = pr) = 'accepted', 'the production is accepted';
  assert (select count(*) from graph.teacher_reviews where production_id = pr) = 1, 'one audit row';
  assert (select count(*) from graph.learner_node_state, jsonb_array_elements(evidence) e
           where learner_id = l and node_id = n and e->>'reviewId' = rv::text) = 1,
    'one evidence event naming the review';

  -- A production that is no longer submitted is refused, and writes nothing.
  select count(*) into v_reviews from graph.teacher_reviews where production_id = pr;
  r := graph.review_production(
    pr, gen_random_uuid(), t, 'approved', 'accepted', '[]'::jsonb, false, 'again', '{"at":"now"}'::jsonb,
    l, n, 'production', '{"kind":"teacher_review"}'::jsonb
  );
  assert not (r->>'ok')::boolean and r->>'error' = 'not_pending', 'a settled production is refused: ' || r::text;
  assert r->>'status' = 'accepted', 'the refusal names the status it found: ' || r::text;
  assert (select count(*) from graph.teacher_reviews where production_id = pr) = v_reviews,
    'the refusal writes no audit row';

  -- A production that does not exist answers, rather than raising.
  r := graph.review_production(
    gen_random_uuid(), gen_random_uuid(), t, 'approved', 'accepted', '[]'::jsonb, false, 'ghost', '{}'::jsonb,
    l, n, 'production', '{"kind":"teacher_review"}'::jsonb
  );
  assert not (r->>'ok')::boolean and r->>'error' = 'production_not_found', 'an unknown production answers: ' || r::text;

  -- A failure inside the transaction takes every write with it: an unknown
  -- reviewer breaks the audit row's foreign key after the status update.
  insert into graph.productions (learner_id, target_node_id, kind, claim, status)
  values (l, n, 'production', 'a second claim', 'submitted')
  returning id into pr;
  select count(*) into v_events from graph.learner_node_state, jsonb_array_elements(evidence) e
   where learner_id = l and node_id = n;
  caught := false;
  begin
    perform graph.review_production(
      pr, gen_random_uuid(), gen_random_uuid(), 'approved', 'accepted', '[]'::jsonb, false, 'no such reviewer',
      '{}'::jsonb, l, n, 'production', '{"kind":"teacher_review"}'::jsonb
    );
  exception when others then caught := true;
  end;
  assert caught, 'an unknown reviewer refuses the review';
  assert (select status from graph.productions where id = pr) = 'submitted',
    'the production stays submitted when the audit row fails';
  assert (select count(*) from graph.teacher_reviews where production_id = pr) = 0,
    'no audit row survives the failure';
  assert (select count(*) from graph.learner_node_state, jsonb_array_elements(evidence) e
           where learner_id = l and node_id = n) = v_events,
    'no evidence event survives the failure';
end $$;

-- Bad input is refused rather than written.
do $$
declare
  l uuid; n uuid; caught boolean; v_before integer;
begin
  select learner, node into l, n from t_ids;
  select jsonb_array_length(evidence) into v_before
    from graph.learner_node_state where learner_id = l and node_id = n;
  assert v_before > 0, 'the fixture has events before the refusals';

  caught := false;
  begin
    perform graph.append_evidence(l, n, 'awareness', '"not an object"'::jsonb);
  exception when others then caught := true;
  end;
  assert caught, 'a non-object event is refused';

  caught := false;
  begin
    perform graph.append_evidence(l, n, 'mastery', '{"kind":"open"}'::jsonb);
  exception when others then caught := true;
  end;
  assert caught, 'an unknown stage is refused';

  caught := false;
  begin
    perform graph.append_evidence(null, n, 'awareness', '{"kind":"open"}'::jsonb);
  exception when others then caught := true;
  end;
  assert caught, 'a missing learner is refused';

  assert (select jsonb_array_length(evidence) from graph.learner_node_state where learner_id = l and node_id = n) = v_before,
    'a refused call writes nothing: the log grew from ' || v_before::text;
end $$;

rollback;
