-- ros-prime 2 review functions against the real schema. Runs in one
-- transaction and rolls back, so the local graph is untouched. Each
-- assertion raises on failure; scripts/test-research-os-proposal-sql.ts runs
-- this file with psql and fails on any error.
begin;

insert into graph.nodes (id, slug, title, kind, tier, branch) values
  ('00000000-0000-4000-8000-000000000001', 'zz-test-a', 'A', 'concept', 13, 'zz-test'),
  ('00000000-0000-4000-8000-000000000002', 'zz-test-b', 'B', 'concept', 13, 'zz-test'),
  ('00000000-0000-4000-8000-000000000003', 'zz-test-c', 'C', 'concept', 13, 'zz-test'),
  ('00000000-0000-4000-8000-000000000004', 'zz-test-d', 'D', 'concept', 13, 'zz-test');

-- C rests on B (prerequisite B -> C); B rests on A (B derives_from A).
insert into graph.edges (from_id, to_id, kind) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'prerequisite'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'derives_from');

do $$
begin
  -- rests_on follows both link kinds, never answers true for a node and itself.
  assert graph.rests_on('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001'), 'C rests on A through B';
  assert not graph.rests_on('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'), 'A does not rest on C';
  assert not graph.rests_on('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'), 'a node never rests on itself';
  assert not graph.rests_on('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001'), 'D is unconnected';
end $$;

do $$
declare
  res record;
  row graph.edge_proposals%rowtype;
  rows jsonb := jsonb_build_array(jsonb_build_object(
    'from_slug', 'zz-test-a', 'to_slug', 'zz-test-d', 'branch', 'zz-test', 'confidence', 0.65,
    'confidence_source', 'prime_decompose_llm', 'agreement', true, 'justification', 'first',
    'secondary_justification', 'opus: yes', 'model', 'm1', 'prompt_hash', 'h1', 'verification', 'confirmed',
    'origin', 'proposer', 'refd', 0.2, 'in_cycle', false));
begin
  -- A new pair is written.
  select * into res from graph.merge_edge_proposals(rows);
  assert res.written, 'new pair written';

  -- An unchecked rerun keeps the verdict, confidence, and agreement, and takes the new model.
  select * into res from graph.merge_edge_proposals(jsonb_build_array(rows -> 0
    || jsonb_build_object('verification', 'unchecked', 'confidence', 0.3, 'agreement', false, 'model', 'm2', 'refd', null, 'justification', 'second')));
  assert res.written, 'rerun written';
  select * into row from graph.edge_proposals where from_slug = 'zz-test-a' and to_slug = 'zz-test-d';
  assert row.verification = 'confirmed' and row.confidence = 0.65::real and row.agreement, 'unchecked rerun keeps the verdict';
  assert row.model = 'm2' and row.justification = 'second', 'rerun records the new model and reason';
  assert row.refd = 0.2::real, 'a null score keeps the old one';

  -- A decided row is left alone and reported as held.
  update graph.edge_proposals set status = 'approved' where id = row.id;
  select * into res from graph.merge_edge_proposals(jsonb_build_array(rows -> 0 || jsonb_build_object('verification', 'refuted', 'confidence', 0.4)));
  assert not res.written and res.held_status = 'approved' and res.held_source = 'prime_decompose_llm', 'decided row held';
  select * into row from graph.edge_proposals where from_slug = 'zz-test-a' and to_slug = 'zz-test-d';
  assert row.verification = 'confirmed', 'decided row unchanged';

  -- A pending row from lexical inference keeps the pair, and the merge says so.
  insert into graph.edge_proposals (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, model, prompt_hash, status)
  values ('zz-test-b', 'zz-test-d', 'zz-test', 0.5, 'inferred_llm', false, 'lexical', 'x', 'y', 'pending');
  select * into res from graph.merge_edge_proposals(jsonb_build_array(rows -> 0 || jsonb_build_object('from_slug', 'zz-test-b')));
  assert not res.written and res.held_status = 'pending' and res.held_source = 'inferred_llm', 'other source holds the pair';
end $$;

do $$
declare
  r record;
  np graph.node_proposals%rowtype;
begin
  select * into r from graph.merge_node_proposals(jsonb_build_array(jsonb_build_object(
    'key', 'zz-test-equality', 'title', 'Equality', 'branch', 'zz-test', 'justification', 'why', 'summary', '',
    'named_by', jsonb_build_array('zz-test-c'), 'aliases', jsonb_build_array('Sameness'), 'reasons', jsonb_build_object('zz-test-c', 'c needs it'),
    'possible_duplicates', '[]'::jsonb, 'base_match', null, 'model', 'm1')));
  select * into np from graph.node_proposals where key = 'zz-test-equality';
  assert np.summary is null, 'an empty definition is stored as none';

  perform graph.merge_node_proposals(jsonb_build_array(jsonb_build_object(
    'key', 'zz-test-equality', 'title', 'Equality', 'branch', 'zz-test', 'justification', 'why', 'summary', 'Two things are the same.',
    'named_by', jsonb_build_array('zz-test-d'), 'aliases', jsonb_build_array('Identity'), 'reasons', jsonb_build_object('zz-test-d', 'd needs it'),
    'possible_duplicates', '[]'::jsonb, 'base_match', null, 'model', 'm1')));
  select * into np from graph.node_proposals where key = 'zz-test-equality';
  assert np.named_by = array['zz-test-c', 'zz-test-d'], 'naming targets merge';
  assert np.aliases = array['Identity', 'Sameness'], 'aliases merge';
  assert np.reasons ? 'zz-test-c' and np.reasons ? 'zz-test-d', 'reasons merge';
  assert np.summary = 'Two things are the same.', 'a missing definition fills in';

  update graph.node_proposals set status = 'rejected' where id = np.id;
  perform graph.merge_node_proposals(jsonb_build_array(jsonb_build_object(
    'key', 'zz-test-equality', 'title', 'Equality', 'branch', 'zz-test', 'justification', 'why', 'summary', 'Other.',
    'named_by', jsonb_build_array('zz-test-a'), 'aliases', '[]'::jsonb, 'reasons', '{}'::jsonb,
    'possible_duplicates', '[]'::jsonb, 'base_match', null, 'model', 'm1')));
  select * into np from graph.node_proposals where key = 'zz-test-equality';
  assert np.named_by = array['zz-test-c', 'zz-test-d'] and np.summary = 'Two things are the same.', 'a decided proposal stays as reviewed';
end $$;

do $$
declare
  n integer;
begin
  insert into graph.prereq_ancestor (node_id, ancestor_id, min_hops, min_confidence)
  values ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 1, 1.0);
  n := graph.replace_prereq_ancestor('zz-test',
    array['00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004']::uuid[],
    jsonb_build_array(jsonb_build_object('node_id', '00000000-0000-4000-8000-000000000003', 'ancestor_id', '00000000-0000-4000-8000-000000000002', 'min_hops', 1, 'min_confidence', 1.0)));
  assert n = 1, 'one row written';
  assert not exists (select 1 from graph.prereq_ancestor where node_id = '00000000-0000-4000-8000-000000000004'), 'rows for listed nodes are replaced';
  assert exists (select 1 from graph.prereq_ancestor where node_id = '00000000-0000-4000-8000-000000000003' and ancestor_id = '00000000-0000-4000-8000-000000000002'), 'new row present';
end $$;

rollback;
