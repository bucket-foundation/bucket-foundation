\o /dev/null
begin;

create temporary table t_ids (k text primary key, v text) on commit drop;
grant all on t_ids to anon, authenticated, service_role;

create or replace function pg_temp.id(k text) returns text language sql as $$ select v from t_ids where t_ids.k = id.k $$;
create or replace function pg_temp.uid(k text) returns uuid language sql as $$ select v::uuid from t_ids where t_ids.k = uid.k $$;

create or replace function pg_temp.admit(p_key text, p_path text, p_rule text)
returns text language plpgsql as $$
declare
  h   text := encode(gen_random_bytes(32), 'hex');
  res jsonb;
begin
  res := graph.admit_bronze_sources(repeat('e', 64), repeat('f', 64), 'draft', jsonb_build_array(jsonb_build_object(
    'source_id', 'file:' || h, 'source_revision', md5(h) || md5(h), 'repo_path', p_path,
    'body_hash', h, 'original_hash', h, 'extraction_revision', 'medallion-file/1 nfc-lf/1',
    'rights_rule', p_rule, 'rights_revision', 1, 'allow_index', true, 'permission_evidence', '{}'::jsonb)));
  if (res->>'activated')::int <> 1 then
    raise exception 'admission of % failed: %', p_path, res;
  end if;
  insert into t_ids values (p_key, 'file:' || h), (p_key || '-rev', md5(h) || md5(h));
  return 'file:' || h;
end $$;

create or replace function pg_temp.span(p_start int, p_end int, p_extra jsonb default '{}'::jsonb)
returns jsonb language sql as $$
  select jsonb_build_object(
    'edtf', lpad(p_start::text, 4, '0') || '/' || lpad(p_end::text, 4, '0'), 'start_year', p_start, 'end_year', p_end,
    'start_min', p_start, 'start_max', p_start, 'end_min', p_end, 'end_max', p_end,
    'precision', 'year', 'calendar', 'gregorian', 'qualifier', 'none', 'as_recorded', p_start::text,
    'uncertainty', jsonb_build_object('kind', 'uniform')) || p_extra
$$;

create or replace function pg_temp.silver(p_key text, p_source text, p_parser text, p_subject text, p_roles jsonb, p_span int, p_extra jsonb default '{}'::jsonb)
returns uuid language plpgsql as $$
declare
  s uuid;
begin
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence, subject, proposal)
    values (pg_temp.id(p_source), pg_temp.id(p_source || '-rev'), 'claim', p_span, p_span + 10, repeat('1', 64),
            p_parser, p_parser || '/1', 0.9, p_subject, jsonb_build_object('roles', p_roles) || p_extra)
    returning id into s;
  insert into t_ids values (p_key, s::text);
  return s;
end $$;

create or replace function pg_temp.refused(p_sql text, p_state text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'accepted: %', p_sql;
exception when others then
  if sqlstate <> p_state then
    raise exception 'expected % for %, got % %', p_state, p_sql, sqlstate, sqlerrm;
  end if;
end $$;

do $$
declare
  occ  uuid := gen_random_uuid();
  occ2 uuid := gen_random_uuid();
  tsk  uuid := gen_random_uuid();
  sw   uuid := gen_random_uuid();
  sw2  uuid := gen_random_uuid();
  fig  uuid := gen_random_uuid();
  con  uuid := gen_random_uuid();
  law  uuid := gen_random_uuid();
  u    uuid := gen_random_uuid();
  u2   uuid := gen_random_uuid();
begin
  insert into graph.nodes (id, slug, title, kind, branch, visibility, provenance) values
    (occ, 'evo-test-occupation-' || substr(occ::text, 1, 8), 'Software developers', 'occupation', '11-work', 'public', '{"type": "onet_occupation", "level": "onet"}'),
    (occ2, 'evo-test-occupation-b-' || substr(occ2::text, 1, 8), 'Programmers', 'occupation', '11-work', 'public', '{"type": "onet_occupation", "level": "onet"}'),
    (tsk, 'evo-test-task-' || substr(tsk::text, 1, 8), 'Write code', 'task', '11-work', 'public', '{"type": "onet_task", "level": "dwa"}'),
    (sw, 'evo-test-software-' || substr(sw::text, 1, 8), 'Linux kernel', 'software', '04-information', 'public', '{"type": "wikidata", "level": "os"}'),
    (sw2, 'evo-test-software-b-' || substr(sw2::text, 1, 8), 'Minix', 'software', '04-information', 'public', '{"type": "wikidata", "level": "os"}'),
    (fig, 'evo-test-figure-' || fig, 'History figure', 'figure', '02-physics', 'public', '{"type": "canon_figure"}'),
    (con, 'evo-test-concept-' || con, 'A concept', 'concept', '02-physics', 'public', '{"type": "canon_entry"}'),
    (law, 'evo-test-law-' || law, 'A law', 'law', '02-physics', 'public', '{"type": "canon_entry"}');
  insert into auth.users (id, email) values (u, 'evo-' || u || '@test.example'), (u2, 'evo-' || u2 || '@test.example');
  insert into t_ids values ('occ', occ::text), ('occ2', occ2::text), ('task', tsk::text), ('sw', sw::text), ('sw2', sw2::text),
    ('fig', fig::text), ('con', con::text), ('law', law::text), ('u', u::text), ('u2', u2::text);
  insert into t_ids select 'slug-' || k, slug from graph.nodes join t_ids on t_ids.v = graph.nodes.id::text where k in ('occ', 'occ2', 'task', 'sw', 'sw2', 'fig');
end $$;

select pg_temp.admit('onet', '_intake/evolution/onet/28.3/tasks.tsv', 'onet-cc-by');
select pg_temp.admit('onet2', '_intake/evolution/onet/28.3/tasks-b.tsv', 'onet-cc-by');
select pg_temp.admit('wd', '_intake/evolution/wikidata/software.jsonl', 'wikidata-cc0');
select pg_temp.admit('canon', 'canon-figures/evo-figures.json', 'canon-figure');

do $$
declare
  e uuid;
  e2 uuid;
  eb uuid;
begin
  insert into graph.edges (from_id, to_id, kind) values (pg_temp.uid('occ'), pg_temp.uid('task'), 'performs') returning id into e;
  insert into graph.edges (from_id, to_id, kind) values (pg_temp.uid('sw'), pg_temp.uid('sw2'), 'descends_from') returning id into e2;
  insert into graph.edges (from_id, to_id, kind) values (pg_temp.uid('con'), pg_temp.uid('law'), 'prerequisite') returning id into eb;
  insert into t_ids values ('edge', e::text), ('edge2', e2::text), ('edge-old', eb::text);
end $$;

do $$
begin
  if graph.factoid_role_fits('occupation', 'emerged') is not true or graph.factoid_role_fits('occupation', 'invented') then raise exception 'occupation roles'; end if;
  if graph.factoid_role_fits('task', 'declined') is not true or graph.factoid_role_fits('task', 'released') then raise exception 'task roles'; end if;
  if not (graph.factoid_role_fits('technology', 'invented') and graph.factoid_role_fits('technology', 'adopted') and graph.factoid_role_fits('technology', 'declined')) then raise exception 'technology roles'; end if;
  if graph.factoid_role_fits('technology', 'retired') then raise exception 'technology took retired'; end if;
  if not (graph.factoid_role_fits('software', 'released') and graph.factoid_role_fits('software', 'retired')) then raise exception 'software roles'; end if;
  if not (graph.factoid_role_fits('discovery', 'discovered') and graph.factoid_role_fits('discovery', 'published')) then raise exception 'discovery roles'; end if;
  if graph.factoid_role_fits('topic', 'emerged') is not true or graph.factoid_role_fits('topic', 'declined') then raise exception 'topic roles'; end if;
  if graph.factoid_role_fits('figure', 'began') or graph.factoid_role_fits('occupation', 'began') then raise exception 'an edge role fits a node'; end if;
  if not graph.factoid_role_fits('figure', 'born') then raise exception 'history roles moved'; end if;
  if not (graph.edge_factoid_role_fits('performs', 'began') and graph.edge_factoid_role_fits('maps_to', 'measured') and graph.edge_factoid_role_fits('influences', 'ended')) then raise exception 'edge roles'; end if;
  if graph.edge_factoid_role_fits('prerequisite', 'began') or graph.edge_factoid_role_fits('performs', 'emerged') then raise exception 'edge roles leak'; end if;
end $$;

do $$
begin
  perform pg_temp.refused($q$insert into graph.nodes (slug, title, kind, branch, provenance) values ('evo-bad-level', 'x', 'task', '11-work', '{"level": "onet"}')$q$, '23514');
  perform pg_temp.refused($q$insert into graph.nodes (slug, title, kind, branch, provenance) values ('evo-no-level', 'x', 'software', '04-information', '{}')$q$, '23514');
  perform pg_temp.refused($q$insert into graph.nodes (slug, title, kind, branch, provenance) values ('Evo:Bad|Slug', 'x', 'topic', '11-work', '{"level": "openalex_topic"}')$q$, '23514');
  perform pg_temp.refused($q$insert into graph.nodes (slug, title, kind, branch, provenance) values ('evo-bad-kind', 'x', 'patent', '11-work', '{}')$q$, '23514');
  insert into graph.nodes (slug, title, kind, branch, provenance) values ('evo-test-topic-ok-' || substr(md5(random()::text), 1, 8), 'Topic', 'topic', '11-work', '{"level": "openalex_topic"}');
  perform pg_temp.refused(format($q$insert into graph.edges (from_id, to_id, kind) values (%L, %L, 'performs')$q$, pg_temp.id('task'), pg_temp.id('occ')), '23514');
  perform pg_temp.refused(format($q$insert into graph.edges (from_id, to_id, kind) values (%L, %L, 'influences')$q$, pg_temp.id('sw'), pg_temp.id('occ')), '23514');
  perform pg_temp.refused(format($q$insert into graph.edges (from_id, to_id, kind) values (%L, %L, 'replaces')$q$, pg_temp.id('sw'), pg_temp.id('task')), '23514');
  perform pg_temp.refused(format($q$update graph.edges set kind = 'part_of' where id = %L$q$, pg_temp.id('edge')), '23514');
  perform pg_temp.refused(format($q$insert into graph.edges (from_id, to_id, kind) values (%L, %L, 'invents')$q$, pg_temp.id('sw'), pg_temp.id('sw2')), '23514');
end $$;

do $$
declare
  good text[][] := array[
    ['onet', '15-1252.00'], ['onet_task', '12345'], ['onet_dwa', '4.A.3.b.1.I09.D01'], ['isco08', '2512'], ['hisco', '83110'],
    ['cpc', 'G06F'], ['patent_us', 'RE12345'], ['patent_us', '7654321'], ['openalex', 'W2741809807'], ['openalex', 'T10001'],
    ['swh', 'swh:1:rev:' || repeat('a', 40)], ['purl', 'pkg:npm/left-pad@1.3.0'], ['eol', 'python'], ['wikidata', 'Q11354']
  ];
  bad text[][] := array[
    ['onet', '15-1252'], ['onet_task', 'x1'], ['onet_dwa', '4.B.1'], ['isco08', '25123'], ['hisco', '8311'],
    ['cpc', 'G06F3'], ['cpc', 'Z06F'], ['patent_us', 'XX123'], ['openalex', 'A123'], ['swh', 'swh:1:rev:' || repeat('g', 40)],
    ['purl', 'npm/left-pad'], ['eol', 'Python'], ['orcid', '0000-0001'], ['wikidata', 'P31']
  ];
  i int;
begin
  for i in 1 .. array_length(good, 1) loop
    insert into graph.node_external_ids (authority, external_id, node_id) values (good[i][1], good[i][2] || case when good[i][1] = 'wikidata' then '0000' else '' end, pg_temp.uid('sw'));
  end loop;
  for i in 1 .. array_length(bad, 1) loop
    perform pg_temp.refused(format($q$insert into graph.node_external_ids (authority, external_id, node_id) values (%L, %L, %L)$q$, bad[i][1], bad[i][2], pg_temp.id('sw')), '23514');
  end loop;
  delete from graph.node_external_ids where node_id = pg_temp.uid('sw');
end $$;

do $$
declare
  hs uuid;
  res jsonb;
begin
  hs := pg_temp.silver('hist', 'canon', 'history-import', pg_temp.id('slug-fig'), jsonb_build_object('born', pg_temp.span(1856, 1856)), 100);
  res := graph.promote_history_factoid(hs, null, true);
  if (res->>'ok')::boolean is not true then raise exception 'history promotion failed: %', res; end if;
  insert into t_ids values ('hist-factoid', (res->'factoids'->>0));
  insert into t_ids select 'hist-row', (to_jsonb(f) - 'span')::text from graph.factoids f where f.id = pg_temp.uid('hist-factoid');
  insert into t_ids select 'hist-lineage', coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]')::text from graph.gold_lineage l where l.factoid_id = pg_temp.uid('hist-factoid');
end $$;

do $$
declare
  s_node uuid;
  s_edge uuid;
  s_edge2 uuid;
  s_edge_other uuid;
  res jsonb;
begin
  s_node := pg_temp.silver('s-node', 'onet', 'evolution-import', pg_temp.id('slug-occ'), jsonb_build_object('emerged', pg_temp.span(1957, 1957)), 200);
  s_edge := pg_temp.silver('s-edge', 'onet', 'evolution-import', 'edge:' || pg_temp.id('edge'), jsonb_build_object('began', pg_temp.span(1960, 1960)), 210);
  s_edge2 := pg_temp.silver('s-edge2', 'onet', 'evolution-import', 'edge:' || pg_temp.id('edge'), jsonb_build_object('began', pg_temp.span(1962, 1962)), 220);
  s_edge_other := pg_temp.silver('s-edge-other', 'onet2', 'evolution-import', 'edge:' || pg_temp.id('edge'), jsonb_build_object('began', pg_temp.span(1965, 1965)), 230);

  res := graph.promote_evolution_factoid(s_node, null, true);
  if (res->>'ok')::boolean is not true then raise exception 'node promotion failed: %', res; end if;
  insert into t_ids values ('f-node', res->'factoids'->>0);
  if (select importer from graph.gold_lineage where factoid_id = pg_temp.uid('f-node')) <> 'evolution-import' then raise exception 'the importer was not recorded'; end if;
  if (select preferred_via from graph.factoids where id = pg_temp.uid('f-node')) <> 'evolution-import' then raise exception 'preferred_via was not evolution-import'; end if;

  res := graph.promote_evolution_factoid(s_edge, pg_temp.uid('u'), true);
  if (res->>'ok')::boolean is not true then raise exception 'edge promotion failed: %', res; end if;
  insert into t_ids values ('f-edge', res->'factoids'->>0);
  res := graph.promote_evolution_factoid(s_edge2, pg_temp.uid('u'), false);
  insert into t_ids values ('f-edge2', res->'factoids'->>0);
  res := graph.promote_evolution_factoid(s_edge, pg_temp.uid('u'), true);
  if (res->>'inserted')::int <> 0 then raise exception 'a second promotion inserted again'; end if;

  if (select subject_id from graph.factoids where id = pg_temp.uid('f-edge')) is not null then raise exception 'an edge factoid carries a subject'; end if;
  if (select edge_id from graph.factoids where id = pg_temp.uid('f-edge')) <> pg_temp.uid('edge') then raise exception 'the edge factoid missed its edge'; end if;
  if (select confidence from graph.edges where id = pg_temp.uid('edge')) is distinct from (select confidence from graph.factoids where id = pg_temp.uid('f-edge')) then
    raise exception 'the edge did not copy the preferred factoid confidence';
  end if;

  res := graph.promote_history_factoid(s_edge, null, true);
  if res->>'error' is distinct from 'edge_subject' then raise exception 'the history promoter took an edge subject: %', res; end if;
  res := graph.promote_evolution_factoid(pg_temp.uid('hist'), pg_temp.uid('u'), false);
  if res->>'error' is distinct from 'not_evolution' then raise exception 'the evolution promoter took a history item: %', res; end if;
end $$;

do $$
begin
  perform pg_temp.refused(format($q$insert into graph.factoids (subject_id, edge_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
    values (%L, %L, 'began', '1960', 1960, 1960, 1960, 1960, 1960, 1960, 'year', 'gregorian', 'none', '{}', 0.9, %L)$q$, pg_temp.id('occ'), pg_temp.id('edge'), pg_temp.id('s-edge2')), '23514');
  perform pg_temp.refused(format($q$insert into graph.factoids (role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
    values ('began', '1960', 1960, 1960, 1960, 1960, 1960, 1960, 'year', 'gregorian', 'none', '{}', 0.9, %L)$q$, pg_temp.id('s-edge2')), '23514');
  perform pg_temp.refused(format($q$insert into graph.factoids (edge_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
    values (%L, 'emerged', '1960', 1960, 1960, 1960, 1960, 1960, 1960, 'year', 'gregorian', 'none', '{}', 0.9, %L)$q$, pg_temp.id('edge'), pg_temp.id('s-edge2')), '23514');
  perform pg_temp.refused(format($q$insert into graph.factoids (edge_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
    values (%L, 'began', '1960', 1960, 1960, 1960, 1960, 1960, 1960, 'year', 'gregorian', 'none', '{}', 0.9, %L)$q$, pg_temp.id('edge-old'), pg_temp.id('s-edge2')), '23514');
  perform pg_temp.refused(format($q$update graph.factoids set edge_id = %L where id = %L$q$, pg_temp.id('edge-old'), pg_temp.id('f-edge2')), '23514');
  perform pg_temp.refused(format($q$update graph.factoids set subject_id = %L, edge_id = null where id = %L$q$, pg_temp.id('occ'), pg_temp.id('f-edge2')), '23514');
  perform pg_temp.refused(format($q$update graph.factoids set measure = '{"metric": "exposure", "value": "high", "unit": "share"}' where id = %L$q$, pg_temp.id('f-edge2')), '23514');
  perform pg_temp.refused(format($q$update graph.factoids set measure = '{"metric": "exposure", "value": 0.4, "unit": "share", "extra": 1}' where id = %L$q$, pg_temp.id('f-edge2')), '23514');
  perform pg_temp.refused(format($q$update graph.factoids set measure = '{"metric": "exposure", "value": 0.4}' where id = %L$q$, pg_temp.id('f-edge2')), '23514');
  update graph.factoids set measure = '{"metric": "exposure", "value": 0.4, "unit": "share", "threshold": 0.1}' where id = pg_temp.uid('f-edge2');
  update graph.factoids set measure = null where id = pg_temp.uid('f-edge2');
  perform pg_temp.refused(format($q$update graph.factoids set preferred = true where id = %L$q$, pg_temp.id('f-edge2')), '23505');
end $$;

do $$
declare
  res jsonb;
begin
  res := graph.prefer_history_factoid(pg_temp.uid('s-edge2'), 'began', pg_temp.uid('u'));
  if (res->>'changed')::boolean is not true then raise exception 'prefer on an edge factoid failed: %', res; end if;
  if (select preferred from graph.factoids where id = pg_temp.uid('f-edge')) then raise exception 'prefer left two preferred edge factoids'; end if;
  if (select confidence from graph.edges where id = pg_temp.uid('edge')) is distinct from (select confidence from graph.factoids where id = pg_temp.uid('f-edge2')) then
    raise exception 'prefer did not update the edge confidence';
  end if;
  if not (select preferred from graph.factoids where id = pg_temp.uid('f-node')) then raise exception 'preferring an edge factoid unset the node factoid'; end if;
  begin
    perform graph.prefer_history_factoid(pg_temp.uid('s-edge'), 'began', null, 'evolution-import');
    raise exception 'the importer preferred a factoid a reviewer promoted';
  exception when check_violation then null;
  end;

  if exists (select 1 from graph.node_when_where where subject_id is null) then raise exception 'node_when_where returned an edge row'; end if;
  if exists (select 1 from graph.node_when_where where factoid_id in (pg_temp.uid('f-edge'), pg_temp.uid('f-edge2'))) then raise exception 'node_when_where returned an edge factoid'; end if;
  if not exists (select 1 from graph.node_when_where where factoid_id = pg_temp.uid('f-node')) then raise exception 'node_when_where lost the node factoid'; end if;
  if exists (select 1 from graph.factoid_conflicts where subject_id is null) then raise exception 'factoid_conflicts returned an edge row'; end if;
  if not exists (select 1 from graph.edge_factoid_conflicts where edge_id = pg_temp.uid('edge')) then raise exception 'edge_factoid_conflicts missed two disjoint began factoids'; end if;
  if exists (select 1 from graph.history_anchors where factoid_id in (pg_temp.uid('f-edge'), pg_temp.uid('f-edge2'))) then raise exception 'an edge factoid anchored history'; end if;
end $$;

insert into graph.evolution_series (subject_id, metric, year, value, unit, source_id, source_revision, run_hash)
  values (pg_temp.uid('sw'), 'adoption_share', 1995, 0.12, 'share', pg_temp.id('onet'), pg_temp.id('onet-rev'), repeat('a', 64));

do $$
begin
  perform pg_temp.refused(format($q$insert into graph.evolution_series (subject_id, metric, year, value, unit, source_id, source_revision, run_hash)
    values (%L, 'adoption_share', 1995, 0.2, 'share', %L, %L, %L)$q$, pg_temp.id('sw'), pg_temp.id('onet'), pg_temp.id('onet-rev'), repeat('a', 64)), '23505');
  perform pg_temp.refused(format($q$insert into graph.evolution_series (subject_id, metric, year, value, unit, source_id, source_revision, run_hash)
    values (%L, 'Adoption Share', 1996, 0.2, 'share', %L, %L, %L)$q$, pg_temp.id('sw'), pg_temp.id('onet'), pg_temp.id('onet-rev'), repeat('a', 64)), '23514');
end $$;

insert into graph.medallion_withdrawn_nodes (node_id, prior_visibility, source_id) values (pg_temp.uid('task'), 'public', pg_temp.id('onet'));
update graph.evidence_source_admissions set status = 'withdrawn', withdrawn_at = now() where source_id = pg_temp.id('onet');

do $$
begin
  if exists (select 1 from graph.factoids where id in (pg_temp.uid('f-node'), pg_temp.uid('f-edge'), pg_temp.uid('f-edge2')) and status <> 'withdrawn') then
    raise exception 'source withdrawal left an evolution factoid active';
  end if;
  if (select status from graph.evolution_series where subject_id = pg_temp.uid('sw')) <> 'withdrawn' then raise exception 'source withdrawal left a series row active'; end if;
  if (select (to_jsonb(f) - 'span')::text from graph.factoids f where f.id = pg_temp.uid('hist-factoid')) is distinct from pg_temp.id('hist-row') then
    raise exception 'withdrawal touched the history factoid';
  end if;
end $$;

do $$
declare
  res jsonb;
begin
  perform graph.promote_evolution_factoid(pg_temp.uid('s-edge-other'), pg_temp.uid('u'), true);
  insert into t_ids values ('f-edge-other', (select id::text from graph.factoids where silver_item_id = pg_temp.uid('s-edge-other')));
end $$;

update graph.evidence_source_admissions set status = 'active', withdrawn_at = null where source_id = pg_temp.id('onet');

do $$
declare
  res jsonb;
begin
  res := graph.restore_withdrawn_history(pg_temp.id('onet'), pg_temp.uid('u'));
  if (res->>'ok')::boolean is not true then raise exception 'history restore failed: %', res; end if;
  if (select status from graph.factoids where id = pg_temp.uid('f-node')) <> 'active' then raise exception 'restore left the node factoid withdrawn'; end if;
  if exists (select 1 from graph.factoids where id in (pg_temp.uid('f-edge'), pg_temp.uid('f-edge2')) and status = 'active') then
    raise exception 'restore revived an edge factoid whose endpoint is queued';
  end if;
  if (select status from graph.evolution_series where subject_id = pg_temp.uid('sw')) <> 'active' then raise exception 'restore left the series row withdrawn'; end if;

  res := graph.restore_withdrawn_node(pg_temp.uid('task'), pg_temp.uid('u'));
  if (res->>'ok')::boolean is not true then raise exception 'node restore failed: %', res; end if;
  if exists (select 1 from graph.factoids where id in (pg_temp.uid('f-edge'), pg_temp.uid('f-edge2')) and status <> 'active') then
    raise exception 'node restore left an incident edge factoid withdrawn';
  end if;
  if (select count(*) from graph.factoids where edge_id = pg_temp.uid('edge') and role = 'began' and preferred and status = 'active') <> 1 then
    raise exception 'revive left the edge with other than one preferred began factoid';
  end if;
  if not (select preferred from graph.factoids where id = pg_temp.uid('f-edge-other')) then raise exception 'revive displaced the live preferred factoid'; end if;
  if (select preferred from graph.factoids where id = pg_temp.uid('f-edge2')) then raise exception 'revive restored a preference that a live factoid holds'; end if;
end $$;

do $$
declare
  si uuid;
  res jsonb;
begin
  si := pg_temp.silver('s-ident', 'onet', 'evolution-import', 'edge:' || pg_temp.id('edge2'), jsonb_build_object('began', pg_temp.span(1991, 1991)), 400, '{"qid": "Q900000077"}');
  res := graph.promote_evolution_factoid(si, pg_temp.uid('u'), true);
  insert into t_ids values ('f-ident', res->'factoids'->>0);
  res := graph.withdraw_identity_dependents(pg_temp.uid('sw2'), array['Q900000077'], 'the Wikidata link was withdrawn', 'withdrawn');
  if (res->>'factoids')::int <> 1 then raise exception 'identity withdrawal missed the edge factoid through its endpoint: %', res; end if;
  if (select status from graph.factoids where id = pg_temp.uid('f-ident')) <> 'withdrawn' then raise exception 'the edge factoid stayed active'; end if;
end $$;

do $$
declare
  sr uuid;
  res jsonb;
begin
  sr := pg_temp.silver('s-reject', 'onet', 'evolution-import', pg_temp.id('slug-occ2'), jsonb_build_object('emerged', pg_temp.span(1970, 1970)), 500);
  res := graph.reject_evolution_silver(sr, pg_temp.uid('u'), 'the date is a revision date');
  if (res->>'changed')::boolean is not true then raise exception 'reject failed: %', res; end if;
  res := graph.reject_evolution_silver(pg_temp.uid('hist'), pg_temp.uid('u'), 'no');
  if res->>'error' is distinct from 'not_evolution' then raise exception 'the evolution reject took a history item: %', res; end if;
  res := graph.reject_evolution_silver(pg_temp.uid('s-edge'), pg_temp.uid('u'), 'too late');
  if res->>'error' is distinct from 'already_decided' then raise exception 'a promoted item was rejected: %', res; end if;
end $$;

do $$
declare
  sw  uuid;
  si  uuid;
  f   uuid;
  br  uuid;
  res jsonb;
begin
  si := pg_temp.silver('s-wd', 'wd', 'evolution-import', pg_temp.id('slug-sw'), jsonb_build_object('released', pg_temp.span(1991, 1991)), 600);
  begin
    perform graph.promote_evolution_factoid(si, null, false);
    raise exception 'the importer promoted a factoid under an unapproved rule';
  exception when check_violation then null;
  end;
  if exists (select 1 from graph.factoids where silver_item_id = si) then raise exception 'a refused promotion left a factoid'; end if;

  begin
    insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, importer) values (pg_temp.uid('sw'), si, 'importer', 'evolution-import');
    raise exception 'the importer promoted a node of a provenance type outside its list';
  exception when check_violation then null;
  end;
  insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, importer) values (pg_temp.uid('occ2'), pg_temp.uid('s-node'), 'importer', 'evolution-import');

  insert into graph.factoids (subject_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
    values (pg_temp.uid('sw'), 'released', '1991', 1991, 1991, 1991, 1991, 1991, 1991, 'year', 'gregorian', 'none', '{}', 0.9, si) returning id into f;

  insert into graph.evolution_batch_reviews (source_id, source_revision, parser, role, sample_size)
    values (pg_temp.id('wd'), pg_temp.id('wd-rev'), 'evolution-import', 'released', 200) returning id into br;
  insert into t_ids values ('batch', br::text);
  begin
    insert into graph.gold_lineage (factoid_id, silver_item_id, promoted_by, reviewer_id, batch_review_id) values (f, si, 'batch', pg_temp.uid('u'), br);
    raise exception 'a pending batch promoted';
  exception when check_violation then null;
  end;
  res := graph.promote_evolution_batch(br);
  if res->>'error' is distinct from 'review_not_approved' then raise exception 'a pending batch ran: %', res; end if;

  begin
    insert into graph.gold_lineage (factoid_id, silver_item_id, promoted_by, reviewer_id) values (f, si, 'batch', pg_temp.uid('u'));
    raise exception 'a batch row with no review was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into graph.gold_lineage (factoid_id, silver_item_id, promoted_by, reviewer_id, batch_review_id) values (f, si, 'reviewer', pg_temp.uid('u'), br);
    raise exception 'a reviewer row carried a batch review';
  exception when check_violation then null;
  end;

  update graph.evolution_batch_reviews set status = 'approved', reviewer_id = pg_temp.uid('u'), decided_at = now() where id = br;
  begin
    insert into graph.gold_lineage (factoid_id, silver_item_id, promoted_by, reviewer_id, batch_review_id) values (f, si, 'batch', pg_temp.uid('u2'), br);
    raise exception 'a batch row credited someone other than the approver';
  exception when check_violation then null;
  end;
  begin
    insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, reviewer_id, batch_review_id) values (pg_temp.uid('sw'), si, 'batch', pg_temp.uid('u'), br);
    raise exception 'a batch promoted a node';
  exception when check_violation then null;
  end;
  delete from graph.factoids where id = f;
end $$;

do $$
declare
  si1 uuid;
  si2 uuid;
  si3 uuid;
  res jsonb;
begin
  si1 := pg_temp.silver('b1', 'wd', 'evolution-import', pg_temp.id('slug-sw2'), jsonb_build_object('released', pg_temp.span(1987, 1987)), 700);
  si2 := pg_temp.silver('b2', 'wd', 'evolution-import', 'edge:' || pg_temp.id('edge2'), jsonb_build_object('began', pg_temp.span(1991, 1991)), 710);
  si3 := pg_temp.silver('b3', 'wd', 'evolution-import', 'no-such-slug', jsonb_build_object('released', pg_temp.span(1990, 1990)), 720);
  res := graph.promote_evolution_batch(pg_temp.uid('batch'));
  if (res->>'promoted')::int <> 2 then raise exception 'the batch promoted % items: %', res->>'promoted', res; end if;
  if (res->>'skipped')::int <> 1 then raise exception 'the batch skipped % items: %', res->>'skipped', res; end if;
  if exists (select 1 from graph.factoids where silver_item_id = si2) then raise exception 'the batch promoted a role it was not approved for'; end if;
  if (select promoted_by || '/' || reviewer_id::text from graph.gold_lineage l join graph.factoids f on f.id = l.factoid_id where f.silver_item_id = si1)
     <> 'batch/' || pg_temp.id('u') then raise exception 'the batch row did not credit the approver'; end if;
  if (select preferred from graph.factoids where silver_item_id = si1) then raise exception 'a batch preferred a factoid'; end if;
  res := graph.promote_evolution_batch(pg_temp.uid('batch'));
  if (res->>'promoted')::int <> 0 then raise exception 'a rerun promoted again: %', res; end if;
end $$;

do $$
declare
  res jsonb;
begin
  perform pg_temp.refused(format('delete from graph.nodes where id = %L', pg_temp.id('task')), '23503');
  perform pg_temp.refused(format('delete from graph.edges where id = %L', pg_temp.id('edge')), '23503');

  begin
    perform graph.purge_edge_factoids(pg_temp.uid('edge'), pg_temp.uid('u'));
    raise exception 'purge removed an edge with active factoids';
  exception when check_violation then null;
  end;
  if (select count(*) from graph.factoids where edge_id = pg_temp.uid('edge')) <> 3 then raise exception 'a refused purge deleted rows'; end if;
  begin
    perform graph.purge_edge_factoids(pg_temp.uid('edge'), null);
    raise exception 'purge ran with no reviewer';
  exception when invalid_parameter_value then null;
  end;
  res := graph.purge_edge_factoids(gen_random_uuid(), pg_temp.uid('u'));
  if res->>'error' is distinct from 'edge_not_found' then raise exception 'purge of a missing edge: %', res; end if;

  update graph.factoids set status = 'withdrawn', preferred = false where edge_id = pg_temp.uid('edge') and id <> pg_temp.uid('f-edge');
  begin
    perform graph.purge_edge_factoids(pg_temp.uid('edge'), pg_temp.uid('u'));
    raise exception 'purge ran with one active factoid left';
  exception when check_violation then null;
  end;

  update graph.factoids set status = 'withdrawn', preferred = false where edge_id = pg_temp.uid('edge');
  insert into graph.withdrawn_factoids (factoid_id, reason) values (pg_temp.uid('f-edge2'), 'withdrawn for the purge test');
  insert into t_ids select 'lineage-before', jsonb_agg(to_jsonb(l) order by l.id)::text
    from graph.gold_lineage l join graph.factoids f on f.id = l.factoid_id where f.edge_id = pg_temp.uid('edge');
  insert into t_ids select 'factoids-before', jsonb_agg(to_jsonb(f) - 'span' order by f.id)::text from graph.factoids f where f.edge_id = pg_temp.uid('edge');

  res := graph.purge_edge_factoids(pg_temp.uid('edge'), pg_temp.uid('u'));
  if (res->>'factoids')::int <> 3 or (res->>'lineage')::int <> 3 then raise exception 'purge counts: %', res; end if;
  if exists (select 1 from graph.factoids where edge_id = pg_temp.uid('edge')) then raise exception 'purge left factoids'; end if;
  if (select jsonb_agg(row_data order by (row_data->>'id'))::text from graph.purged_gold_lineage where edge_id = pg_temp.uid('edge'))
     is distinct from pg_temp.id('lineage-before') then raise exception 'the archived lineage rows differ from the originals'; end if;
  if (select jsonb_agg(row_data order by factoid_id)::text from graph.purged_factoids where edge_id = pg_temp.uid('edge'))
     is distinct from pg_temp.id('factoids-before') then raise exception 'the archived factoid rows differ from the originals'; end if;
  if (select withdrawal->>'reason' from graph.purged_factoids where factoid_id = pg_temp.uid('f-edge2')) <> 'withdrawn for the purge test' then
    raise exception 'the withdrawal record was not archived';
  end if;
  if exists (select 1 from graph.purged_factoids where edge_id = pg_temp.uid('edge') and purged_by <> pg_temp.uid('u')) then raise exception 'purge did not record the reviewer'; end if;
  if not exists (select 1 from graph.silver_items where id = pg_temp.uid('s-edge')) then raise exception 'purge removed silver'; end if;

  delete from graph.nodes where id = pg_temp.uid('task');
  if exists (select 1 from graph.edges where id = pg_temp.uid('edge')) then raise exception 'the node delete left its edge'; end if;
end $$;

do $$
declare
  e3 uuid;
  n integer;
begin
  insert into graph.edges (from_id, to_id, kind) values (pg_temp.uid('sw2'), pg_temp.uid('sw'), 'influences') returning id into e3;
  n := graph.move_edge_factoids(pg_temp.uid('edge2'), e3);
  if n < 1 then raise exception 'move_edge_factoids moved nothing'; end if;
  if exists (select 1 from graph.factoids where edge_id = pg_temp.uid('edge2')) then raise exception 'move left factoids on the old edge'; end if;
  delete from graph.edges where id = pg_temp.uid('edge2');
  begin
    perform graph.move_edge_factoids(e3, e3);
    raise exception 'move to the same edge was accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;

do $$
begin
  if (select to_jsonb(f) - 'span' from graph.factoids f where f.id = pg_temp.uid('hist-factoid'))::text is distinct from pg_temp.id('hist-row') then
    raise exception 'the history factoid changed';
  end if;
  if (select coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]') from graph.gold_lineage l where l.factoid_id = pg_temp.uid('hist-factoid'))::text is distinct from pg_temp.id('hist-lineage') then
    raise exception 'the history lineage changed';
  end if;
end $$;

grant usage on schema graph to anon, authenticated;

do $$
declare
  r text;
  stmt text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach stmt in array array[
      'select count(*) from graph.factoids',
      'select count(*) from graph.purged_factoids',
      'select count(*) from graph.purged_gold_lineage',
      'select count(*) from graph.evolution_series',
      'select count(*) from graph.evolution_batch_reviews',
      'select count(*) from graph.edge_factoid_conflicts',
      'select count(*) from graph.node_when_where',
      format('select graph.purge_edge_factoids(%L, %L)', gen_random_uuid(), pg_temp.id('u')),
      format('select graph.promote_evolution_factoid(%L, %L, false)', pg_temp.id('s-edge'), pg_temp.id('u')),
      format('select graph.promote_evolution_batch(%L)', pg_temp.id('batch')),
      format('select graph.move_edge_factoids(%L, %L)', gen_random_uuid(), gen_random_uuid()),
      format('select graph.reject_evolution_silver(%L, %L, %L)', pg_temp.id('s-edge'), pg_temp.id('u'), 'x')
    ] loop
      begin
        execute format('set local role %I', r);
        execute stmt;
        reset role;
        raise exception '% ran: %', r, stmt;
      exception when insufficient_privilege then
        reset role;
      end;
    end loop;
  end loop;
end $$;

do $$
declare
  res jsonb;
begin
  set local role service_role;
  res := graph.purge_edge_factoids(gen_random_uuid(), pg_temp.uid('u'));
  reset role;
  if res->>'error' is distinct from 'edge_not_found' then raise exception 'service_role could not call the purge: %', res; end if;
  if exists (select 1 from information_schema.role_routine_grants where routine_schema = 'graph' and routine_name = 'purge_edge_factoids' and grantee not in ('service_role', 'postgres', 'supabase_admin')) then
    raise exception 'purge_edge_factoids is granted beyond service_role';
  end if;
  if not (select prosecdef from pg_proc where oid = 'graph.purge_edge_factoids(uuid, uuid)'::regprocedure) then raise exception 'purge is not security definer'; end if;
  if not (select relrowsecurity from pg_class where oid = 'graph.purged_factoids'::regclass) or not (select relrowsecurity from pg_class where oid = 'graph.purged_gold_lineage'::regclass) then
    raise exception 'an archive table has row level security off';
  end if;
end $$;

rollback;
