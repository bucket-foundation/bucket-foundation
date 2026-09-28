\o /dev/null
begin;

create temporary table t_ids (k text primary key, v text) on commit drop;

create or replace function pg_temp.id(k text) returns text language sql as $$ select v from t_ids where t_ids.k = id.k $$;

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

create or replace function pg_temp.span(p_edtf text, p_start int, p_end int, p_widen int default 0, p_extra jsonb default '{}'::jsonb)
returns jsonb language sql as $$
  select jsonb_build_object(
    'edtf', p_edtf, 'start_year', p_start, 'end_year', p_end,
    'start_min', p_start - p_widen, 'start_max', p_start + p_widen, 'end_min', p_end - p_widen, 'end_max', p_end + p_widen,
    'precision', 'year', 'calendar', 'gregorian', 'qualifier', case when p_widen > 0 then 'approximate' else 'none' end,
    'as_recorded', p_edtf,
    'uncertainty', jsonb_build_object('kind', 'uniform', 'params', jsonb_build_object('min', p_start - p_widen, 'max', p_end + p_widen)))
    || p_extra
$$;

create or replace function pg_temp.silver(p_key text, p_source text, p_subject text, p_roles jsonb, p_span int)
returns uuid language plpgsql as $$
declare
  s uuid;
begin
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence, subject, proposal)
    values (pg_temp.id(p_source), pg_temp.id(p_source || '-rev'), 'claim', p_span, p_span + 10, repeat('1', 64),
            'history-span', 'history-span/1', 0.9, p_subject, jsonb_build_object('roles', p_roles))
    returning id into s;
  insert into t_ids values (p_key, s::text);
  return s;
end $$;

do $$
declare
  f uuid := gen_random_uuid();
  g uuid := gen_random_uuid();
  e uuid := gen_random_uuid();
  s uuid := gen_random_uuid();
  u uuid := gen_random_uuid();
begin
  insert into graph.nodes (id, slug, title, kind, branch, visibility, provenance)
    values (f, 'history-test-figure-' || f, 'History figure', 'figure', '02-physics', 'public', jsonb_build_object('type', 'canon_figure')),
           (g, 'history-test-queued-' || g, 'History queued figure', 'figure', '02-physics', 'public', jsonb_build_object('type', 'canon_figure')),
           (e, 'history-test-event-' || e, 'History event', 'event', '00-history', 'public', jsonb_build_object('type', 'canon_timeline')),
           (s, 'history-test-site-' || s, 'History site', 'site', '00-history', 'public', jsonb_build_object('type', 'canon_site'));
  insert into auth.users (id, email) values (u, 'history-' || u || '@test.example');
  insert into t_ids values ('figure', f::text), ('queued', g::text), ('event', e::text), ('site', s::text), ('user', u::text),
    ('figure-slug', 'history-test-figure-' || f), ('queued-slug', 'history-test-queued-' || g), ('event-slug', 'history-test-event-' || e);
end $$;

select pg_temp.admit('canon', 'canon-figures/figures.json', 'canon-figure');
select pg_temp.admit('canon2', 'canon-figures/figures-2.json', 'canon-figure');
select pg_temp.admit('timeline', 'src/data/canon-timeline.json', 'canon-timeline');
select pg_temp.admit('wikidata', '_intake/history/wikidata-sacred/2026-09-23/timeline-events.jsonl', 'wikidata-cc0');
select pg_temp.admit('queued-src', 'canon-figures/queued.json', 'canon-figure');
select pg_temp.admit('pleiades', 'archaeology/pleiades/579885/place.json', 'canon-site');

do $$
begin
  if not exists (select 1 from graph.bronze_file_paths where repo_path = 'archaeology/pleiades/579885/place.json') then
    raise exception 'an archaeology path was not recorded';
  end if;
end $$;

insert into graph.places (slug, title, pleiades_id, wikidata_qid, lat, lng, source_id, source_revision)
  values ('pleiades-579885', 'Athenae', '579885', 'Q1524', 37.97, 23.72, pg_temp.id('pleiades'), pg_temp.id('pleiades-rev'));
insert into graph.periods (id, label, spatial_qids, start_min, start_max, end_min, end_max, source_id, source_revision)
  values ('periodo:p0archaic', 'Archaic', '{Q41}', -800, -750, -500, -480, pg_temp.id('pleiades'), pg_temp.id('pleiades-rev'));

do $$
begin
  begin
    insert into graph.places (slug, title, pleiades_id, lat, lng, source_id, source_revision)
      values ('pleiades-bad', 'Bad', 'abc', 0, 0, pg_temp.id('pleiades'), pg_temp.id('pleiades-rev'));
    raise exception 'a non-numeric pleiades id was stored';
  exception when check_violation then null;
  end;
  begin
    insert into graph.places (slug, title, wikidata_qid, lat, lng, source_id, source_revision)
      values ('wikidata-bad', 'Bad', 'X1', 0, 0, pg_temp.id('pleiades'), pg_temp.id('pleiades-rev'));
    raise exception 'a malformed QID was stored';
  exception when check_violation then null;
  end;
  begin
    insert into graph.periods (id, label, start_min, start_max, end_min, end_max, source_id, source_revision)
      values ('periodo:p0bad', 'Bad', -500, -600, -400, -300, pg_temp.id('pleiades'), pg_temp.id('pleiades-rev'));
    raise exception 'a period with start_min above start_max was stored';
  exception when check_violation then null;
  end;
end $$;

select pg_temp.silver('s-canon', 'canon', pg_temp.id('figure-slug'),
  jsonb_build_object('born', pg_temp.span('-0324~', -324, -324, 10, '{"place_slug": "pleiades-579885"}'), 'died', pg_temp.span('-0264~', -264, -264, 10)), 0);
select pg_temp.silver('s-wikidata', 'wikidata', pg_temp.id('figure-slug'),
  jsonb_build_object('born', pg_temp.span('-0399', -399, -399)), 0);
select pg_temp.silver('s-event', 'timeline', pg_temp.id('event-slug'),
  jsonb_build_object('occurred', pg_temp.span('-5400', -5400, -5400)), 0);
select pg_temp.silver('s-canon2', 'canon2', pg_temp.id('figure-slug'),
  jsonb_build_object('born', pg_temp.span('-0330', -330, -330)), 0);
select pg_temp.silver('s-queued', 'queued-src', pg_temp.id('queued-slug'),
  jsonb_build_object('born', pg_temp.span('1642', 1642, 1643)), 0);
select pg_temp.silver('s-queued-node', 'queued-src', pg_temp.id('queued-slug'), '{}'::jsonb, 20);

do $$
declare
  res jsonb;
  n   integer;
begin
  res := graph.promote_history_factoid(pg_temp.id('s-canon')::uuid, null, true);
  if not (res->>'ok')::boolean or (res->>'inserted')::int <> 2 then raise exception 'the importer promotion failed: %', res; end if;
  res := graph.promote_history_factoid(pg_temp.id('s-canon')::uuid, null, true);
  if (res->>'inserted')::int <> 0 then raise exception 'a rerun inserted rows: %', res; end if;
  select count(*) into n from graph.factoids where silver_item_id = pg_temp.id('s-canon')::uuid;
  if n <> 2 then raise exception 'one lifespan string gave % factoids', n; end if;
  select count(*) into n from graph.gold_lineage where silver_item_id = pg_temp.id('s-canon')::uuid and factoid_id is not null and importer = 'history-import';
  if n <> 2 then raise exception 'the importer promotion wrote % lineage rows', n; end if;
  if (select status from graph.silver_items where id = pg_temp.id('s-canon')::uuid) <> 'promoted' then raise exception 'the silver item was not promoted'; end if;

  res := graph.promote_history_factoid(pg_temp.id('s-event')::uuid, null, true);
  if not (res->>'ok')::boolean then raise exception 'the timeline promotion failed: %', res; end if;
  if (select start_min from graph.factoids where silver_item_id = pg_temp.id('s-event')::uuid) <> -5400 then
    raise exception 'the year -5400 did not survive';
  end if;
end $$;

do $$
begin
  perform graph.promote_history_factoid(pg_temp.id('s-wikidata')::uuid, null, false);
  raise exception 'the history importer promoted a wikidata-cc0 factoid';
exception when check_violation then null;
end $$;

do $$
declare
  res jsonb;
begin
  if exists (select 1 from graph.factoids where silver_item_id = pg_temp.id('s-wikidata')::uuid) then
    raise exception 'the refused promotion left a factoid';
  end if;
  res := graph.promote_history_factoid(pg_temp.id('s-wikidata')::uuid, pg_temp.id('user')::uuid, false);
  if not (res->>'ok')::boolean then raise exception 'the reviewer promotion failed: %', res; end if;
  if (select reviewer_id from graph.gold_lineage where silver_item_id = pg_temp.id('s-wikidata')::uuid) <> pg_temp.id('user')::uuid then
    raise exception 'the reviewer promotion did not name its reviewer';
  end if;
end $$;

do $$
declare
  n integer;
begin
  select count(*) into n from graph.factoid_conflicts
    where subject_id = pg_temp.id('figure')::uuid and role = 'born' and disjoint_spans;
  if n <> 1 then raise exception 'expected one disjoint born conflict, found %', n; end if;
  select count(*) into n from graph.node_when_where where subject_id = pg_temp.id('figure')::uuid and role = 'born';
  if n <> 1 then raise exception 'a preferred born factoid should hide the others, found %', n; end if;
  if not (select disputed and preferred and lat = 37.97 from graph.node_when_where where subject_id = pg_temp.id('figure')::uuid and role = 'born') then
    raise exception 'the preferred born row is not marked disputed with its point';
  end if;
  if (select count(*) from graph.node_when_where where subject_id = pg_temp.id('figure')::uuid and role = 'died') <> 1 then
    raise exception 'the died row is missing';
  end if;
end $$;

do $$
declare
  s uuid := pg_temp.id('s-canon')::uuid;
  f uuid := pg_temp.id('figure')::uuid;
  u jsonb := '{"kind": "point", "params": {}}';
begin
  begin
    insert into graph.factoids (subject_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
      values (f, 'flourished', '0500', 500, 500, 501, 501, 500, 500, 'year', 'gregorian', 'none', u, 0.9, s);
    raise exception 'start_min above start_year was stored';
  exception when check_violation then null;
  end;
  begin
    insert into graph.factoids (subject_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
      values (f, 'flourished', '0500/0400', 500, 400, 500, 500, 400, 400, 'year', 'gregorian', 'none', u, 0.9, s);
    raise exception 'start_year above end_year was stored';
  exception when check_violation then null;
  end;
  begin
    insert into graph.factoids (subject_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
      values (f, 'flourished', 'c.325 BCE', -324, -324, -324, -324, -324, -324, 'year', 'gregorian', 'none', u, 0.9, s);
    raise exception 'free text was stored as edtf';
  exception when check_violation then null;
  end;
  begin
    insert into graph.factoids (subject_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
      values (pg_temp.id('event')::uuid, 'born', '0500', 500, 500, 500, 500, 500, 500, 'year', 'gregorian', 'none', u, 0.9, s);
    raise exception 'an event took a born factoid';
  exception when check_violation then null;
  end;
  begin
    insert into graph.factoids (subject_id, role, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id)
      values (f, 'born', 'Y-16999', -16999, -16999, -16999, -16999, -16999, -16999, 'year', 'gregorian', 'none', u, 0.9, s);
    raise exception 'a second born row from one silver item was stored';
  exception when unique_violation then null;
  end;
end $$;

update graph.evidence_source_admissions set status = 'withdrawn', withdrawn_at = now()
  where source_id = pg_temp.id('canon');

do $$
declare
  res jsonb;
begin
  if exists (select 1 from graph.factoids where silver_item_id = pg_temp.id('s-canon')::uuid and status <> 'withdrawn') then
    raise exception 'withdrawing the source left its factoids active';
  end if;
  if exists (select 1 from graph.medallion_withdrawn_nodes where node_id = pg_temp.id('figure')::uuid) then
    raise exception 'a factoid withdrawal queued its subject node';
  end if;
  res := graph.promote_history_factoid(pg_temp.id('s-canon2')::uuid, pg_temp.id('user')::uuid, true);
  if not (res->>'ok')::boolean then raise exception 'a withdrawn preferred row blocked its replacement: %', res; end if;
  if (select factoid_id from graph.node_when_where where subject_id = pg_temp.id('figure')::uuid and role = 'born')
     <> (select id from graph.factoids where silver_item_id = pg_temp.id('s-canon2')::uuid) then
    raise exception 'the replacement is not the preferred born row';
  end if;
end $$;

update graph.evidence_source_admissions set status = 'withdrawn', withdrawn_at = now()
  where source_id = pg_temp.id('pleiades');

do $$
begin
  if (select status from graph.places where slug = 'pleiades-579885') <> 'withdrawn' then raise exception 'the place was not withdrawn'; end if;
  if (select status from graph.periods where id = 'periodo:p0archaic') <> 'withdrawn' then raise exception 'the period was not withdrawn'; end if;
end $$;

update graph.evidence_source_admissions set status = 'active', withdrawn_at = null
  where source_id in (pg_temp.id('canon'), pg_temp.id('pleiades'));

do $$
declare
  res jsonb;
begin
  res := graph.restore_withdrawn_history(pg_temp.id('canon'), pg_temp.id('user')::uuid);
  if not (res->>'ok')::boolean or (res->>'factoids_revived')::int <> 2 then raise exception 'restoring the canon source: %', res; end if;
  if (select preferred from graph.factoids where silver_item_id = pg_temp.id('s-canon')::uuid and role = 'born') then
    raise exception 'a revived born row took preferred from its replacement';
  end if;
  if not (select preferred from graph.factoids where silver_item_id = pg_temp.id('s-canon')::uuid and role = 'died') then
    raise exception 'the revived died row lost preferred with no rival';
  end if;
  if exists (
    select 1 from graph.node_when_where
    where factoid_id = (select id from graph.factoids where silver_item_id = pg_temp.id('s-canon')::uuid and role = 'born')
  ) then
    raise exception 'a non-preferred row shows beside the preferred one';
  end if;

  res := graph.restore_withdrawn_history(pg_temp.id('pleiades'), pg_temp.id('user')::uuid);
  if (res->>'places')::int <> 1 or (res->>'periods')::int <> 1 then raise exception 'restoring the place source: %', res; end if;
end $$;

do $$
declare
  res jsonb;
begin
  insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, reviewer_id)
    values (pg_temp.id('queued')::uuid, pg_temp.id('s-queued-node')::uuid, 'reviewer', pg_temp.id('user')::uuid);
  res := graph.promote_history_factoid(pg_temp.id('s-queued')::uuid, pg_temp.id('user')::uuid, true);
  if not (res->>'ok')::boolean then raise exception 'the queued figure promotion failed: %', res; end if;

  update graph.evidence_source_admissions set status = 'withdrawn', withdrawn_at = now() where source_id = pg_temp.id('queued-src');
  if not exists (select 1 from graph.medallion_withdrawn_nodes where node_id = pg_temp.id('queued')::uuid) then
    raise exception 'the orphaned node was not queued';
  end if;
  update graph.evidence_source_admissions set status = 'active', withdrawn_at = null where source_id = pg_temp.id('queued-src');

  res := graph.restore_withdrawn_history(pg_temp.id('queued-src'), pg_temp.id('user')::uuid);
  if (res->>'factoids_revived')::int <> 0 then raise exception 'the source restore revived a queued subject: %', res; end if;

  res := graph.restore_withdrawn_node(pg_temp.id('queued')::uuid, pg_temp.id('user')::uuid);
  if not (res->>'ok')::boolean or (res->>'factoids_revived')::int <> 1 then raise exception 'the node restore: %', res; end if;
  if (select status from graph.factoids where silver_item_id = pg_temp.id('s-queued')::uuid) <> 'active' then
    raise exception 'the node restore left its factoid withdrawn';
  end if;
end $$;

do $$
declare
  r text;
  t text;
  denied boolean;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach t in array array['factoids', 'places', 'periods', 'node_external_ids', 'node_when_where', 'factoid_conflicts'] loop
      execute format('set local role %I', r);
      denied := false;
      begin
        execute format('select count(*) from graph.%I', t);
      exception when insufficient_privilege then
        denied := true;
      end;
      reset role;
      if not denied then raise exception '% read graph.%', r, t; end if;
    end loop;
    execute format('set local role %I', r);
    denied := false;
    begin
      perform graph.promote_history_factoid(pg_temp.id('s-canon')::uuid, null, true);
    exception when insufficient_privilege then
      denied := true;
    end;
    reset role;
    if not denied then raise exception '% called promote_history_factoid', r; end if;
  end loop;
end $$;

rollback;
