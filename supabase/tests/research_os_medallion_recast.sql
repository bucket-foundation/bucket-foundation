begin;

create temporary table t_ids (k text primary key, v text) on commit drop;

do $$
declare
  tag  uuid := gen_random_uuid();
  atom uuid := gen_random_uuid();
  tag2 uuid := gen_random_uuid();
  u    uuid := gen_random_uuid();
  e1   uuid;
  e2   uuid;
  p1   uuid;
  p2   uuid;
  p3   uuid;
  p4   uuid;
begin
  insert into graph.nodes (id, slug, title, kind, branch, visibility, provenance) values
    (tag, 'recast-tag-' || tag, 'Recast tag', 'concept', '02-physics', 'public', '{"type":"canon_concept"}'),
    (tag2, 'recast-tag2-' || tag2, 'Recast tag two', 'concept', '02-physics', 'public', '{"type":"canon_concept"}'),
    (atom, 'recast-atom-' || atom, 'Recast atom', 'concept', '02-physics', 'public', '{"type":"academy_atom"}');
  insert into auth.users (id, email) values (u, 'recast-' || u || '@test.example');
  insert into graph.edges (from_id, to_id, kind, confidence, confidence_source, provenance)
    values (tag, atom, 'derives_from', 0.7, 'canon_map', '{"rule":"concept_lexical"}') returning id into e1;
  insert into graph.edges (from_id, to_id, kind, confidence, confidence_source, provenance)
    values (tag2, atom, 'derives_from', 0.6, 'canon_map', '{"rule":"concept_lexical"}') returning id into e2;
  insert into graph.edges (from_id, to_id, kind, confidence, provenance) values (tag2, atom, 'cites', 0.9, '{"rule":"lexical"}');
  insert into graph.edge_flags (edge_id, learner_id, target_node_id) values (e1, u, tag);
  insert into graph.edge_proposals (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, model, prompt_hash, action, proposed_kind)
    values ('recast-atom-' || atom, 'recast-tag-' || tag, '02-physics', 0.7, 'medallion_lexical', false, 'word match', 'none', repeat('0', 64), 'demote', 'derives_from')
    returning id into p1;
  insert into graph.edge_proposals (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, model, prompt_hash, action, proposed_kind)
    values ('recast-atom-' || atom, 'recast-tag2-' || tag2, '02-physics', 0.6, 'medallion_lexical', false, 'word match', 'none', repeat('0', 64), 'demote', 'derives_from')
    returning id into p2;
  insert into graph.edge_proposals (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, model, prompt_hash, action, proposed_kind)
    values ('recast-tag-' || tag, 'recast-atom-' || atom, '02-physics', 0.6, 'medallion_lexical', false, 'word match', 'none', repeat('0', 64), 'add', 'derives_from')
    returning id into p3;
  insert into graph.edge_proposals (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, model, prompt_hash, action, proposed_kind)
    values ('recast-tag2-' || tag2, 'recast-tag-' || tag, '02-physics', 0.6, 'medallion_lexical', false, 'word match', 'none', repeat('0', 64), 'demote', 'derives_from')
    returning id into p4;
  insert into t_ids values ('tag', tag::text), ('atom', atom::text), ('tag2', tag2::text), ('user', u::text), ('e1', e1::text), ('e2', e2::text),
    ('p1', p1::text), ('p2', p2::text), ('p3', p3::text), ('p4', p4::text);
end $$;

create or replace function pg_temp.id(k text) returns uuid language sql as $$ select v::uuid from t_ids where t_ids.k = id.k $$;

do $$
begin
  set local role anon;
  begin
    perform graph.recast_edge_to_cites(pg_temp.id('p1'), pg_temp.id('user'), null);
    raise exception 'anon recast an edge';
  exception when insufficient_privilege then null;
  end;
  begin
    perform graph.restore_recast_edge(pg_temp.id('p1'));
    raise exception 'anon restored an edge';
  exception when insufficient_privilege then null;
  end;
  reset role;
  set local role authenticated;
  begin
    perform graph.recast_edge_to_cites(pg_temp.id('p1'), pg_temp.id('user'), null);
    raise exception 'authenticated recast an edge';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

do $$
declare
  res jsonb;
  p   graph.edge_proposals;
  c   graph.edges;
begin
  begin
    perform graph.recast_edge_to_cites(pg_temp.id('p1'), null, null);
    raise exception 'a recast ran without a reviewer';
  exception when invalid_parameter_value then null;
  end;

  if (graph.recast_edge_to_cites(pg_temp.id('p3'), pg_temp.id('user'), null))->>'error' <> 'not_a_demotion' then
    raise exception 'an add proposal was recast';
  end if;
  if (graph.recast_edge_to_cites(pg_temp.id('p4'), pg_temp.id('user'), null))->>'error' <> 'edge_gone' then
    raise exception 'a demotion with no edge did not report edge_gone';
  end if;
  if (select status from graph.edge_proposals where id = pg_temp.id('p4')) <> 'pending' then
    raise exception 'edge_gone changed the proposal';
  end if;

  res := graph.recast_edge_to_cites(pg_temp.id('p1'), pg_temp.id('user'), 'word match');
  if not (res->>'ok')::boolean or not (res->>'cites_inserted')::boolean or (res->>'moved_flags')::int <> 1 then
    raise exception 'recast: %', res;
  end if;
  if exists (select 1 from graph.edges where id = pg_temp.id('e1')) then raise exception 'the derives_from edge survived the recast'; end if;
  select * into c from graph.edges where from_id = pg_temp.id('tag') and to_id = pg_temp.id('atom') and kind = 'cites';
  if c.id is null or c.provenance->>'recast_proposal_id' <> pg_temp.id('p1')::text or c.provenance->>'rule' <> 'concept_lexical' or c.confidence <> 0.7::real then
    raise exception 'the cites edge is wrong: %', to_jsonb(c);
  end if;
  if (select edge_id from graph.edge_flags where learner_id = pg_temp.id('user')) <> c.id then raise exception 'the learner flag did not follow the edge'; end if;
  select * into p from graph.edge_proposals where id = pg_temp.id('p1');
  if p.status <> 'rejected' or p.decided_kind <> 'cites' or p.reviewer_id <> pg_temp.id('user') or p.prior_edge->>'id' <> pg_temp.id('e1')::text then
    raise exception 'the proposal did not record the recast: %', to_jsonb(p);
  end if;
  if (graph.recast_edge_to_cites(pg_temp.id('p1'), pg_temp.id('user'), null))->>'error' <> 'already_decided' then
    raise exception 'a decided demotion was recast twice';
  end if;

  res := graph.restore_recast_edge(pg_temp.id('p1'));
  if not (res->>'ok')::boolean then raise exception 'restore: %', res; end if;
  if not exists (select 1 from graph.edges where id = pg_temp.id('e1') and kind = 'derives_from' and confidence = 0.7::real) then
    raise exception 'restore did not bring back the edge with its id';
  end if;
  if exists (select 1 from graph.edges where from_id = pg_temp.id('tag') and to_id = pg_temp.id('atom') and kind = 'cites') then
    raise exception 'restore left the cites edge the recast added';
  end if;
  if (select edge_id from graph.edge_flags where learner_id = pg_temp.id('user')) <> pg_temp.id('e1') then raise exception 'the flag did not return'; end if;
  if (select status from graph.edge_proposals where id = pg_temp.id('p1')) <> 'pending' then raise exception 'restore did not reopen the proposal'; end if;
  if (graph.restore_recast_edge(pg_temp.id('p1')))->>'error' <> 'not_recast' then raise exception 'a pending proposal was restored'; end if;

  res := graph.recast_edge_to_cites(pg_temp.id('p2'), pg_temp.id('user'), null);
  if (res->>'cites_inserted')::boolean then raise exception 'a second cites edge was inserted beside an existing one'; end if;
  perform graph.restore_recast_edge(pg_temp.id('p2'));
  if not exists (select 1 from graph.edges where from_id = pg_temp.id('tag2') and to_id = pg_temp.id('atom') and kind = 'cites' and provenance->>'rule' = 'lexical') then
    raise exception 'restore removed a cites edge the recast did not add';
  end if;
  if not exists (select 1 from graph.edges where id = pg_temp.id('e2')) then raise exception 'the second edge did not return'; end if;
end $$;

rollback;
