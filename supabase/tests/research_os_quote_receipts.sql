-- graph.record_quote_receipt in real Postgres. One transaction, rolled back.
-- Run: psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/research_os_quote_receipts.sql
begin;

create temporary table t_ids (learner uuid, source uuid, target uuid) on commit drop;

with u as (
  insert into auth.users (id, instance_id, aud, role, email)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'quote-receipt-' || gen_random_uuid() || '@bucket.test')
  returning id
), s as (
  insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
  values (gen_random_uuid(), 'quote-receipt-src-' || gen_random_uuid(), 'Quote receipt source',
          'concept', 10, '01-mathematics', 'fixture')
  returning id
), t as (
  insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
  values (gen_random_uuid(), 'quote-receipt-tgt-' || gen_random_uuid(), 'Quote receipt target',
          'concept', 10, '01-mathematics', 'fixture')
  returning id
)
insert into t_ids (learner, source, target) select u.id, s.id, t.id from u, s, t;

insert into graph.evidence_source_admissions (
  source_id, source_revision, scope, node_id, body_hash, original_hash,
  extraction_revision, corpus_revision, rights_rule, rights_revision,
  rights_policy_sha256, rights_policy_status, allow_index, allow_quote, status
)
select 'graph:' || source, rev, 'quote', source, repeat('b', 64), repeat('b', 64),
       'curated-passage/1 nfc-lf/1', repeat('c', 64), 'fixture', 1,
       repeat('d', 64), 'draft', false, true, 'active'
from t_ids, (values (repeat('a', 64))) as r(rev);

-- A quotation writes the receipt and the evidence event together.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb; v_events int; v_receipt uuid;
begin
  select learner, source, target into l, s, t from t_ids;

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('a', 64), s, 'graph:' || s || '#p1', 'p. 1', 'hash-one',
    'session-a', 'key-one', 'payload-one', 'understanding',
    '{"kind":"quote","locator":"p. 1"}'::jsonb);

  assert (r->>'ok')::boolean, 'the first quotation is recorded: ' || r::text;
  assert (r->>'replayed')::boolean is false, 'and it is not a replay: ' || r::text;
  v_receipt := (r->>'receipt_id')::uuid;
  assert v_receipt is not null, 'it answers with a receipt id';

  assert (select count(*) from graph.source_quote_receipts where id = v_receipt) = 1,
    'the receipt row exists';
  assert (select source_revision from graph.source_quote_receipts where id = v_receipt) = repeat('a', 64),
    'and it records the revision that was quoted';

  -- The evidence event names the receipt, which is what a production's
  -- cited source is verified against later.
  select jsonb_array_length(evidence) into v_events
  from graph.learner_node_state where learner_id = l and node_id = t;
  assert v_events = 1, 'the evidence event landed with it: ' || coalesce(v_events::text, 'null');
  assert (select evidence->-1->>'receiptId' from graph.learner_node_state where learner_id = l and node_id = t)
         = v_receipt::text,
    'and the event names the receipt';
end $$;

-- A retry of the same quotation returns the receipt already written.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb; v_first uuid; v_events int;
begin
  select learner, source, target into l, s, t from t_ids;
  select id into v_first from graph.source_quote_receipts where learner_id = l and idempotency_key = 'key-one';

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('a', 64), s, 'graph:' || s || '#p1', 'p. 1', 'hash-one',
    'session-a', 'key-one', 'payload-one', 'understanding',
    '{"kind":"quote","locator":"p. 1"}'::jsonb);

  assert (r->>'ok')::boolean, 'a retry answers ok: ' || r::text;
  assert (r->>'replayed')::boolean, 'and says it is a replay: ' || r::text;
  assert (r->>'receipt_id')::uuid = v_first, 'with the receipt it wrote the first time';

  assert (select count(*) from graph.source_quote_receipts where learner_id = l and idempotency_key = 'key-one') = 1,
    'a retry writes no second receipt';
  select jsonb_array_length(evidence) into v_events
  from graph.learner_node_state where learner_id = l and node_id = t;
  assert v_events = 1, 'and no second evidence event: ' || v_events::text;
end $$;

-- The same key carrying different content is a conflict, never an overwrite.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb;
begin
  select learner, source, target into l, s, t from t_ids;

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('e', 64), s, 'graph:' || s || '#p2', 'p. 2', 'hash-two',
    'session-a', 'key-one', 'payload-DIFFERENT', 'understanding',
    '{"kind":"quote","locator":"p. 2"}'::jsonb);

  assert (r->>'ok')::boolean is false, 'a reused key with new content is refused: ' || r::text;
  assert r->>'error' = 'idempotency_conflict', 'and says why: ' || r::text;
  assert (select source_revision from graph.source_quote_receipts where learner_id = l and idempotency_key = 'key-one')
         = repeat('a', 64),
    'the stored receipt was not overwritten';
end $$;

-- A different session quoting the same span is its own receipt.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb;
begin
  select learner, source, target into l, s, t from t_ids;

  r := graph.record_quote_receipt(
    l, t, 'graph:' || s, repeat('a', 64), s, 'graph:' || s || '#p1', 'p. 1', 'hash-one',
    'session-b', 'key-two', 'payload-one', 'understanding',
    '{"kind":"quote","locator":"p. 1"}'::jsonb);

  assert (r->>'ok')::boolean, 'a second sitting records its own quotation: ' || r::text;
  assert (r->>'replayed')::boolean is false, 'and it is not a replay';
  assert (select count(*) from graph.source_quote_receipts where learner_id = l) = 2,
    'so the learner has two receipts';
end $$;

-- A source or a target deleted mid-request writes nothing.
do $$
declare
  l uuid; s uuid; t uuid; r jsonb; v_before int; v_gone uuid := gen_random_uuid();
begin
  select learner, source, target into l, s, t from t_ids;
  select count(*) into v_before from graph.source_quote_receipts where learner_id = l;

  r := graph.record_quote_receipt(
    l, t, 'graph:' || v_gone, 'rev-x', v_gone, null, 'p. 9', 'hash-x',
    'session-c', 'key-source-gone', 'payload-x', 'understanding', '{"kind":"quote"}'::jsonb);
  assert (r->>'ok')::boolean is false and r->>'error' = 'source_gone',
    'a source that no longer exists is refused: ' || r::text;

  r := graph.record_quote_receipt(
    l, v_gone, 'graph:' || s, 'rev-x', s, null, 'p. 9', 'hash-x',
    'session-c', 'key-target-gone', 'payload-x', 'understanding', '{"kind":"quote"}'::jsonb);
  assert (r->>'ok')::boolean is false and r->>'error' = 'target_gone',
    'a target that no longer exists is refused: ' || r::text;

  assert (select count(*) from graph.source_quote_receipts where learner_id = l) = v_before,
    'and neither refusal wrote a receipt';
end $$;

-- An empty idempotency key is a programming error, so it raises.
do $$
declare
  l uuid; s uuid; t uuid; v_raised boolean := false;
begin
  select learner, source, target into l, s, t from t_ids;
  begin
    perform graph.record_quote_receipt(
      l, t, 'graph:' || s, repeat('a', 64), s, null, 'p. 1', 'hash-one',
      'session-a', '   ', 'payload-one', 'understanding', '{"kind":"quote"}'::jsonb);
  exception when others then
    v_raised := true;
  end;
  assert v_raised, 'a blank idempotency key is refused';
end $$;

-- The API role cannot write this table around the function.
do $$
declare
  v_write text[];
begin
  select array_agg(privilege_type order by privilege_type) into v_write
  from information_schema.role_table_grants
  where table_schema = 'graph' and table_name = 'source_quote_receipts'
    and grantee = 'service_role' and privilege_type <> 'SELECT';
  assert v_write is null,
    'service_role holds only select on receipts, found: ' || coalesce(array_to_string(v_write, ','), 'none');
end $$;

-- And the refusal is real, not only a row in the catalog.
do $$
declare
  l uuid; s uuid; t uuid; v_denied boolean := false;
begin
  select learner, source, target into l, s, t from t_ids;
  begin
    set local role service_role;
    insert into graph.source_quote_receipts
      (learner_id, target_node_id, source_id, source_revision, text_hash, idempotency_key, payload_hash)
    values (l, t, 'graph:' || s, 'rev-direct', 'hash-direct', 'key-direct', 'payload-direct');
  exception when insufficient_privilege then
    v_denied := true;
  end;
  assert v_denied, 'the API role is refused a direct insert into receipts';
end $$;
reset role;

-- graph.privacy_delete_learner deletes from bucket.academy_profiles, a
-- table no migration creates: it was made by hand on the hosted database,
-- so the privacy delete raises on any fresh one. Recorded as PR-075 for
-- the founder. This stand-in keeps the test below about receipts, and it
-- rolls back with the rest of the transaction.
do $$
begin
  if to_regclass('bucket.academy_profiles') is null then
    execute 'create table bucket.academy_profiles (user_id uuid)';
  end if;
end $$;

-- A privacy delete takes the receipts with everything else.
do $$
declare
  l uuid; r jsonb;
begin
  select learner into l from t_ids;
  assert (select count(*) from graph.source_quote_receipts where learner_id = l) = 2,
    'the learner still has their receipts before the delete';

  r := graph.privacy_delete_learner(l);
  assert (r->>'source_quote_receipts')::int = 2,
    'the delete counts the receipts it removed: ' || r::text;
  assert (select count(*) from graph.source_quote_receipts where learner_id = l) = 0,
    'and none survive it';
end $$;

rollback;
