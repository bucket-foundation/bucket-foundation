-- graph.record_quote_receipt consults the admission registry.
-- Run: psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/research_os_quote_admission.sql
begin;

create temporary table t_ids (learner uuid, source uuid, target uuid) on commit drop;

with u as (
  insert into auth.users (id, instance_id, aud, role, email)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'quote-admit-' || gen_random_uuid() || '@bucket.test')
  returning id
), s as (
  insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
  values (gen_random_uuid(), 'quote-admit-src-' || gen_random_uuid(), 'Quote admission source',
          'concept', 10, '01-mathematics', 'fixture')
  returning id
), t as (
  insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
  values (gen_random_uuid(), 'quote-admit-tgt-' || gen_random_uuid(), 'Quote admission target',
          'concept', 10, '01-mathematics', 'fixture')
  returning id
)
insert into t_ids (learner, source, target) select u.id, s.id, t.id from u, s, t;

-- A source nobody admitted cannot be quoted.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb; v_before int;
begin
  select learner, source, target into l, s, t from t_ids;
  select count(*) into v_before from graph.source_quote_receipts where learner_id = l;

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('a', 64), s, 'graph:' || s || '#p1', 'p. 1', 'hash-one',
    'session-a', 'key-unadmitted', 'payload-one', 'understanding',
    '{"kind":"quote","locator":"p. 1"}'::jsonb);

  assert (r->>'ok')::boolean is false, 'an unadmitted source is refused: ' || r::text;
  assert r->>'error' = 'source_not_admitted', 'and says why: ' || r::text;
  assert (select count(*) from graph.source_quote_receipts where learner_id = l) = v_before,
    'and no receipt was written';
end $$;

-- Admit it, and the same quotation goes through.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb;
begin
  select learner, source, target into l, s, t from t_ids;
  -- Every hash column carries the check constraint's 64 hex digits, and
  -- the source revision does too, so the fixture uses real-shaped values.
  insert into graph.evidence_source_admissions (
    source_id, source_revision, scope, node_id, body_hash, original_hash,
    extraction_revision, corpus_revision, rights_rule, rights_revision,
    rights_policy_sha256, rights_policy_status, allow_index, allow_quote,
    permission_evidence, status
  ) values (
    'graph:' || s, repeat('a', 64), 'quote', s, repeat('b', 64), repeat('b', 64),
    'curated-passage/1 nfc-lf/1', repeat('c', 64), 'fixture', 3,
    repeat('d', 64), 'draft', false, true,
    '{"permission":"fixture"}'::jsonb, 'active'
  );

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('a', 64), s, 'graph:' || s || '#p1', 'p. 1', 'hash-one',
    'session-a', 'key-admitted', 'payload-one', 'understanding',
    '{"kind":"quote","locator":"p. 1"}'::jsonb);

  assert (r->>'ok')::boolean, 'an admitted source is quotable: ' || r::text;
  assert (r->>'rights_revision')::int = 3, 'and the receipt reports the rights revision it was admitted under: ' || r::text;
end $$;

-- A different revision of the same source is a different admission.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb;
begin
  select learner, source, target into l, s, t from t_ids;

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('e', 64), s, 'graph:' || s || '#p1', 'p. 1', 'hash-two',
    'session-a', 'key-other-revision', 'payload-two', 'understanding',
    '{"kind":"quote"}'::jsonb);

  assert (r->>'ok')::boolean is false,
    'an edit to the source is a revision nobody admitted yet: ' || r::text;
end $$;

-- A withdrawal stops new quotations.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb;
begin
  select learner, source, target into l, s, t from t_ids;
  update graph.evidence_source_admissions
     set status = 'withdrawn', withdrawn_at = now()
   where source_id = 'graph:' || s and source_revision = repeat('a', 64);

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('a', 64), s, 'graph:' || s || '#p1', 'p. 1', 'hash-one',
    'session-a', 'key-after-withdrawal', 'payload-one', 'understanding',
    '{"kind":"quote"}'::jsonb);

  assert (r->>'ok')::boolean is false, 'a withdrawn source is refused: ' || r::text;
  assert r->>'error' = 'withdrawn', 'and the registry''s own status is the reason: ' || r::text;
end $$;

-- A quotation made while the source was admitted still replays after it
-- is withdrawn. A withdrawal stops new quotations, and does not turn a
-- learner's settled Quote into an error on their next keystroke.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb;
begin
  select learner, source, target into l, s, t from t_ids;

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('a', 64), s, 'graph:' || s || '#p1', 'p. 1', 'hash-one',
    'session-a', 'key-admitted', 'payload-one', 'understanding',
    '{"kind":"quote","locator":"p. 1"}'::jsonb);

  assert (r->>'ok')::boolean, 'the earlier receipt still replays: ' || r::text;
  assert (r->>'replayed')::boolean, 'and it is a replay rather than a new write: ' || r::text;
end $$;

rollback;
