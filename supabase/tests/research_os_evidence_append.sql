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

-- Bad input is refused rather than written.
do $$
declare
  l uuid; n uuid; caught boolean;
begin
  select learner, node into l, n from t_ids;

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

  assert (select jsonb_array_length(evidence) from graph.learner_node_state where learner_id = l and node_id = n) = 8,
    'a refused call writes nothing';
end $$;

rollback;
