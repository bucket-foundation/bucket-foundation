\o /dev/null
begin;

create temporary table t_ids (k text primary key, v text) on commit drop;

do $$
declare
  h text := encode(gen_random_bytes(32), 'hex');
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  u uuid := gen_random_uuid();
  p1 uuid;
  p2 uuid;
  res jsonb;
begin
  res := graph.admit_bronze_sources(repeat('e', 64), repeat('f', 64), 'draft', jsonb_build_array(jsonb_build_object(
    'source_id', 'file:' || h, 'source_revision', md5(h) || md5(h), 'repo_path', '_intake/history/wikidata-figures/fixture/match.tsv',
    'body_hash', h, 'original_hash', h, 'extraction_revision', 'medallion-file/1 nfc-lf/1',
    'rights_rule', 'wikidata-figures-cc0', 'rights_revision', 1, 'allow_index', true, 'permission_evidence', '{}'::jsonb)));
  insert into graph.nodes (id, slug, title, kind, branch, visibility) values
    (a, 'wikidata-fixture-a-' || a, 'Figure A', 'figure', '02-physics', 'public'),
    (b, 'wikidata-fixture-b-' || b, 'Figure B', 'figure', '02-physics', 'public');
  insert into auth.users (id, email) values (u, 'wikidata-' || u || '@test.example');
  insert into graph.external_id_proposals (node_id, authority, candidates, reason, source_id, source_revision)
    values (a, 'wikidata', '[{"qid": "Q900000001", "label": "A"}, {"qid": "Q900000002", "label": "A2"}]', 'several_candidates', 'file:' || h, md5(h) || md5(h))
    returning id into p1;
  insert into graph.external_id_proposals (node_id, authority, candidates, reason, source_id, source_revision)
    values (b, 'wikidata', '[{"qid": "Q900000001", "label": "A"}]', 'one_candidate', 'file:' || h, md5(h) || md5(h))
    returning id into p2;
  insert into t_ids values ('a', a::text), ('b', b::text), ('u', u::text), ('p1', p1::text), ('p2', p2::text), ('src', 'file:' || h);
end $$;

do $$
declare
  u uuid := (select v::uuid from t_ids where k = 'u');
  p1 uuid := (select v::uuid from t_ids where k = 'p1');
  p2 uuid := (select v::uuid from t_ids where k = 'p2');
  res jsonb;
begin
  begin
    perform graph.decide_external_id(p1, null, 'Q900000001');
    raise exception 'a link with no reviewer was accepted';
  exception when invalid_parameter_value then null;
  end;
  res := graph.decide_external_id(p1, u, 'Q123');
  if res->>'error' is distinct from 'not_a_candidate' then raise exception 'a QID outside the candidates was linked: %', res; end if;
  res := graph.decide_external_id(p1, u, 'Q900000001');
  if res->>'status' is distinct from 'approved' then raise exception 'the link failed: %', res; end if;
  if (select reviewed_by from graph.node_external_ids where external_id = 'Q900000001') <> u then raise exception 'the link did not record its reviewer'; end if;
  res := graph.decide_external_id(p1, u, 'Q900000001');
  if (res->>'changed')::boolean then raise exception 'a second decision changed the link'; end if;
  res := graph.decide_external_id(p2, u, 'Q900000001');
  if res->>'error' is distinct from 'qid_linked_elsewhere' then raise exception 'one QID reached two nodes: %', res; end if;
  begin
    perform graph.decide_external_id(p2, u, null, '  ');
    raise exception 'a rejection with no reason was accepted';
  exception when invalid_parameter_value then null;
  end;
  res := graph.decide_external_id(p2, u, null, 'a different person');
  if res->>'status' is distinct from 'rejected' then raise exception 'the rejection failed: %', res; end if;
end $$;

update graph.evidence_source_admissions set status = 'withdrawn', withdrawn_at = now() where source_id = (select v from t_ids where k = 'src');

do $$
begin
  if exists (select 1 from graph.node_external_ids where external_id = 'Q900000001') then raise exception 'withdrawal left the identity link'; end if;
  if exists (select 1 from graph.external_id_proposals where source_id = (select v from t_ids where k = 'src') and status <> 'withdrawn') then
    raise exception 'withdrawal left a proposal live';
  end if;
end $$;

rollback;
