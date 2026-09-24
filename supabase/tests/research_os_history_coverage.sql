\o /dev/null
begin;

do $$
declare
  y integer;
  expected text[] := array['before -3000', '-3000 to -1001', '-3000 to -1001', '-1000 to -1', '-1000 to -1', '0 to 999', '0 to 999', '1000 to 1499', '1000 to 1499', '1500 to 2100', '1500 to 2100'];
  years integer[] := array[-3001, -3000, -1001, -1000, -1, 0, 999, 1000, 1499, 1500, 2100];
begin
  for i in 1 .. array_length(years, 1) loop
    if graph.history_period(years[i]) is distinct from expected[i] then
      raise exception 'history_period(%) is %, expected %', years[i], graph.history_period(years[i]), expected[i];
    end if;
  end loop;
  if graph.history_period(2101) is not null or graph.history_period(null) is not null then raise exception 'out-of-range years got a period'; end if;
end $$;

create temporary table t_ids (k text primary key, v text) on commit drop;

do $$
declare
  h text := encode(gen_random_bytes(32), 'hex');
  res jsonb;
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  s uuid := gen_random_uuid();
  e uuid := gen_random_uuid();
  sil uuid;
  sil2 uuid;
  pl uuid;
begin
  res := graph.admit_bronze_sources(repeat('e', 64), repeat('f', 64), 'draft', jsonb_build_array(jsonb_build_object(
    'source_id', 'file:' || h, 'source_revision', md5(h) || md5(h), 'repo_path', 'src/data/coverage-fixture.json',
    'body_hash', h, 'original_hash', h, 'extraction_revision', 'medallion-file/1 nfc-lf/1',
    'rights_rule', 'canon-timeline', 'rights_revision', 1, 'allow_index', true, 'permission_evidence', '{}'::jsonb)));
  insert into graph.nodes (id, slug, title, kind, branch, visibility) values
    (a, 'coverage-a-' || a, 'Wide birth', 'figure', '02-physics', 'public'),
    (b, 'coverage-b-' || b, 'Placed birth', 'figure', '02-physics', 'public'),
    (s, 'coverage-s-' || s, 'Occupied site', 'site', '00-history', 'public'),
    (e, 'coverage-e-' || e, 'Unpreferred event', 'event', '00-history', 'public');
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence, subject)
    values ('file:' || h, md5(h) || md5(h), 'claim', 0, 1, repeat('1', 64), 'history-import', 'history-import/1', 0.9, 'coverage')
    returning id into sil;
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence, subject)
    values ('file:' || h, md5(h) || md5(h), 'claim', 1, 2, repeat('2', 64), 'history-import', 'history-import/1', 0.9, 'coverage-2')
    returning id into sil2;
  insert into graph.places (slug, title, lat, lng, source_id, source_revision, region, site_node_id) values
    ('coverage-paris-' || substr(h, 1, 8), 'Paris', 48.85, 2.35, 'file:' || h, md5(h) || md5(h), 'Europe', null)
    returning id into pl;
  insert into graph.places (slug, title, lat, lng, source_id, source_revision, region, site_node_id) values
    ('coverage-ur-' || substr(h, 1, 8), 'Ur', 30.96, 46.1, 'file:' || h, md5(h) || md5(h), 'Western Asia and Northern Africa', s);
  insert into graph.factoids (subject_id, role, place_id, edtf, start_year, end_year, start_min, start_max, end_min, end_max, precision, calendar, qualifier, uncertainty, confidence, silver_item_id, preferred) values
    (a, 'born', null, '1500~', 1500, 1500, 1499, 1501, 1499, 1501, 'year', 'gregorian', 'approximate', '{}', 0.9, sil, true),
    (b, 'born', pl, '1600', 1600, 1600, 1600, 1600, 1600, 1600, 'year', 'gregorian', 'none', '{}', 0.9, sil2, true),
    (s, 'founded', null, '1000', 1000, 1000, 1000, 1000, 1000, 1000, 'year', 'gregorian', 'none', '{}', 0.9, sil, true),
    (s, 'occupied', null, '05XX', 500, 599, 500, 500, 599, 599, 'century', 'gregorian', 'none', '{}', 0.9, sil, true),
    (e, 'occurred', null, '1700', 1700, 1700, 1700, 1700, 1700, 1700, 'year', 'gregorian', 'none', '{}', 0.9, sil, false);
  insert into t_ids values ('a', a::text), ('b', b::text), ('s', s::text), ('e', e::text);
end $$;

do $$
declare
  r record;
begin
  select * into r from graph.history_anchors where subject_id = (select v::uuid from t_ids where k = 'a');
  if r.period <> 'unresolved' or r.kind <> 'human' then raise exception 'a span across 1499 and 1500 was binned: %', r.period; end if;
  select * into r from graph.history_anchors where subject_id = (select v::uuid from t_ids where k = 'b');
  if r.period <> '1500 to 2100' or r.region <> 'Europe' or r.midpoint <> 1600 then raise exception 'the placed birth anchored at %, %, %', r.period, r.region, r.midpoint; end if;
  select * into r from graph.history_anchors where subject_id = (select v::uuid from t_ids where k = 's');
  if r.role <> 'occupied' or r.period <> '0 to 999' or r.region <> 'Western Asia and Northern Africa' or r.midpoint <> 549 then
    raise exception 'the site anchored on % at %, %, midpoint %', r.role, r.period, r.region, r.midpoint;
  end if;
  if exists (select 1 from graph.history_anchors where subject_id = (select v::uuid from t_ids where k = 'e')) then
    raise exception 'an event with no preferred factoid was anchored';
  end if;
end $$;

refresh materialized view graph.history_coverage;

do $$
begin
  if (select subjects from graph.history_coverage where kind = 'site' and region = 'Western Asia and Northern Africa' and period = '0 to 999') < 1 then
    raise exception 'the coverage view missed the site';
  end if;
  if (select subjects from graph.history_coverage where kind = 'human' and region = 'unplaced' and period = 'unresolved') < 1 then
    raise exception 'the coverage view missed the unresolved birth';
  end if;
end $$;

rollback;
