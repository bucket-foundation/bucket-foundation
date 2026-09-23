begin;

create temporary table t_ids (k text primary key, v text) on commit drop;

do $$
declare
  a uuid := gen_random_uuid();
  x uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  u uuid := gen_random_uuid();
begin
  insert into graph.nodes (id, slug, title, kind, branch, visibility, provenance)
    values (a, 'medallion-test-academy-' || a, 'Medallion academy', 'concept', '02-physics', 'public',
            jsonb_build_object('type', 'academy_atom', 'source', 'learning/app/corpus/02-physics.json')),
           (x, 'medallion-test-excerpt-' || x, 'Medallion excerpt', 'excerpt', '05-biophysics', 'public',
            jsonb_build_object('type', 'source_excerpt')),
           (c, 'medallion-test-concept-' || c, 'Medallion concept', 'concept', '05-biophysics', 'public',
            jsonb_build_object('type', 'canon_concept'));
  insert into auth.users (id, email) values (u, 'medallion-' || u || '@test.example');
  insert into t_ids values ('academy', a::text), ('excerpt', x::text), ('concept', c::text), ('user', u::text);
end $$;

create or replace function pg_temp.id(k text) returns text language sql as $$ select v from t_ids where t_ids.k = id.k $$;

create or replace function pg_temp.bronze(p_hash text, p_path text, p_allow boolean, p_rights integer default 1)
returns jsonb language sql as $$
  select jsonb_build_object(
    'source_id', 'file:' || p_hash, 'source_revision', md5(p_hash) || md5(p_hash), 'repo_path', p_path,
    'body_hash', p_hash, 'original_hash', p_hash, 'extraction_revision', 'medallion-file/1 nfc-lf/1',
    'rights_rule', case when p_allow then 'academy-atom' else 'source-excerpt' end, 'rights_revision', p_rights,
    'allow_index', p_allow, 'permission_evidence', '{}'::jsonb)
$$;

create or replace function pg_temp.admit(p_rows jsonb)
returns jsonb language sql as $$
  select graph.admit_bronze_sources(repeat('e', 64), repeat('f', 64), 'draft', p_rows)
$$;

do $$
begin
  set local role anon;
  begin
    perform 1 from graph.bronze_file_paths limit 1;
    raise exception 'anon read bronze_file_paths';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from graph.silver_items limit 1;
    raise exception 'anon read silver_items';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from graph.gold_lineage limit 1;
    raise exception 'anon read gold_lineage';
  exception when insufficient_privilege then null;
  end;
  begin
    perform graph.admit_bronze_sources(repeat('e', 64), repeat('f', 64), 'draft', '[]'::jsonb);
    raise exception 'anon called admit_bronze_sources';
  exception when insufficient_privilege then null;
  end;
  reset role;
  set local role authenticated;
  begin
    perform 1 from graph.bronze_file_paths limit 1;
    raise exception 'authenticated read bronze_file_paths';
  exception when insufficient_privilege then null;
  end;
  reset role;
  set local role service_role;
  begin
    insert into graph.bronze_file_paths (source_id, source_revision, repo_path) values ('file:' || repeat('0', 64), repeat('0', 64), '_intake/a.md');
    raise exception 'the service role wrote bronze_file_paths directly';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

do $$
declare
  res jsonb;
begin
  begin
    insert into graph.evidence_source_admissions (source_id, source_revision, scope, body_hash, original_hash, extraction_revision,
      corpus_revision, rights_rule, rights_revision, rights_policy_sha256, rights_policy_status, allow_index, allow_quote)
    values ('file:_intake/a.md', repeat('1', 64), 'index', repeat('1', 64), repeat('1', 64), 'x', repeat('1', 64), 'r', 1, repeat('1', 64), 'draft', false, false);
    raise exception 'a path-shaped file: id was admitted';
  exception when check_violation then null;
  end;

  foreach res in array array[
    pg_temp.bronze(repeat('9', 64), '/srv/abs/agfarms/bucket-foundation/_intake/a.md', true),
    pg_temp.bronze(repeat('9', 64), '_intake/../.env.local', true),
    pg_temp.bronze(repeat('9', 64), '_intake/./a.md', true),
    pg_temp.bronze(repeat('9', 64), '~/a.md', true),
    pg_temp.bronze(repeat('9', 64), 'src/app/page.tsx', true),
    pg_temp.bronze(repeat('9', 64), '_intake//a.md', true)
  ] loop
    begin
      perform pg_temp.admit(jsonb_build_array(res));
      raise exception 'admitted the path %', res->>'repo_path';
    exception when check_violation then null;
    end;
  end loop;
end $$;

do $$
declare
  res  jsonb;
  n    integer;
begin
  res := pg_temp.admit(jsonb_build_array(
    pg_temp.bronze(repeat('a', 64), 'learning/app/corpus/02-physics.json', true),
    pg_temp.bronze(repeat('b', 64), 'bucket-canon/05-biophysics/sub-claims/emf/001-x.md', false)));
  if (res->>'staged')::int <> 2 or (res->>'activated')::int <> 2 then raise exception 'first admission: %', res; end if;

  res := pg_temp.admit(jsonb_build_array(
    pg_temp.bronze(repeat('a', 64), 'learning/app/corpus/02-physics.json', true),
    pg_temp.bronze(repeat('b', 64), 'bucket-canon/05-biophysics/sub-claims/emf/001-x.md', false)));
  if (res->>'staged')::int <> 0 or (res->>'activated')::int <> 0 or (res->>'unchanged')::int <> 2 then raise exception 'a rerun changed state: %', res; end if;
  select count(*) into n from graph.evidence_source_admissions where source_id in ('file:' || repeat('a', 64), 'file:' || repeat('b', 64));
  if n <> 2 then raise exception 'rerun left % admission rows', n; end if;
  select count(*) into n from graph.bronze_file_paths where source_id in ('file:' || repeat('a', 64), 'file:' || repeat('b', 64));
  if n <> 2 then raise exception 'rerun left % path rows', n; end if;

  res := pg_temp.admit(jsonb_build_array(pg_temp.bronze(repeat('c', 64), 'learning/app/corpus/02-physics.json', true)));
  if (res->>'superseded')::int <> 1 then raise exception 'new bytes at a path did not supersede the old source: %', res; end if;
  if (select status from graph.evidence_source_admissions where source_id = 'file:' || repeat('a', 64)) <> 'superseded' then
    raise exception 'the old source is still active';
  end if;

  if exists (select 1 from graph.eligible_evidence_sources() where source_id like 'file:%') then
    raise exception 'evidence search saw a medallion source';
  end if;
  res := graph.admit_evidence_corpus(repeat('d', 64), repeat('f', 64), 'draft', '[]'::jsonb);
  if (select status from graph.evidence_source_admissions where source_id = 'file:' || repeat('b', 64)) <> 'active' then
    raise exception 'a corpus admission retired a medallion source';
  end if;
end $$;

do $$
declare
  s_allowed uuid;
  s_refused uuid;
  s_low     uuid;
  e_derives uuid;
  e_cites   uuid;
begin
  begin
    insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, text, parser, parser_revision, confidence)
    values ('file:' || repeat('b', 64), md5(repeat('b', 64)) || md5(repeat('b', 64)), 'claim', 0, 5, repeat('1', 64), 'words', 'test', 'test/1', 0.9);
    raise exception 'stored text for a refused source';
  exception when check_violation then null;
  end;

  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, text, parser, parser_revision, confidence)
    values ('file:' || repeat('b', 64), md5(repeat('b', 64)) || md5(repeat('b', 64)), 'claim', 0, 5, repeat('1', 64), null, 'test', 'test/1', 0.9)
    returning id into s_refused;
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, text, parser, parser_revision, confidence)
    values ('file:' || repeat('c', 64), md5(repeat('c', 64)) || md5(repeat('c', 64)), 'term', 0, 5, repeat('2', 64), 'words', 'test', 'test/1', 0.9)
    returning id into s_allowed;
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, text, parser, parser_revision, confidence)
    values ('file:' || repeat('c', 64), md5(repeat('c', 64)) || md5(repeat('c', 64)), 'term', 0, 6, repeat('3', 64), null, 'test', 'test/1', 0.4)
    returning id into s_low;

  begin
    insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence)
      values ('file:' || repeat('c', 64), md5(repeat('c', 64)) || md5(repeat('c', 64)), 'term', 0, 5, repeat('2', 64), 'test', 'test/1', 0.9);
    raise exception 'a duplicate silver item was written';
  exception when unique_violation then null;
  end;

  begin
    insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, importer) values (pg_temp.id('concept')::uuid, s_allowed, 'importer', 'canon-all');
    raise exception 'canon-all promoted as an importer';
  exception when check_violation then null;
  end;
  begin
    insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, importer) values (pg_temp.id('concept')::uuid, s_allowed, 'importer', 'academy-import');
    raise exception 'academy-import promoted a canon concept';
  exception when check_violation then null;
  end;
  begin
    insert into graph.gold_lineage (node_id, silver_item_id, promoted_by) values (pg_temp.id('concept')::uuid, s_allowed, 'reviewer');
    raise exception 'a reviewer promotion without a reviewer';
  exception when check_violation then null;
  end;
  begin
    insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, reviewer_id) values (pg_temp.id('concept')::uuid, s_low, 'reviewer', pg_temp.id('user')::uuid);
    raise exception 'promoted a hidden silver item';
  exception when check_violation then null;
  end;

  insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, importer) values (pg_temp.id('academy')::uuid, s_allowed, 'importer', 'academy-import');
  if (select status from graph.silver_items where id = s_allowed) <> 'promoted' then raise exception 'promotion left the silver item unmarked'; end if;
  insert into graph.gold_lineage (node_id, silver_item_id, promoted_by, reviewer_id) values (pg_temp.id('excerpt')::uuid, s_refused, 'reviewer', pg_temp.id('user')::uuid);

  insert into graph.edges (from_id, to_id, kind, confidence) values (pg_temp.id('excerpt')::uuid, pg_temp.id('academy')::uuid, 'derives_from', 0.5) returning id into e_derives;
  insert into graph.edges (from_id, to_id, kind, confidence) values (pg_temp.id('excerpt')::uuid, pg_temp.id('academy')::uuid, 'cites', 0.5) returning id into e_cites;
  begin
    insert into graph.gold_lineage (edge_id, silver_item_id, promoted_by, reviewer_id) values (e_derives, s_refused, 'reviewer', pg_temp.id('user')::uuid);
    raise exception 'an excerpt derives_from edge was promoted';
  exception when check_violation then null;
  end;
  insert into graph.gold_lineage (edge_id, silver_item_id, promoted_by, reviewer_id) values (e_cites, s_refused, 'reviewer', pg_temp.id('user')::uuid);
  insert into t_ids values ('s_refused', s_refused::text);

  perform pg_temp.admit(jsonb_build_array(pg_temp.bronze(repeat('c', 64), 'learning/app/corpus/02-physics.json', false, 2)));
  if (select text from graph.silver_items where id = s_allowed) is not null then
    raise exception 'a source whose rights turned to refused kept its stored text';
  end if;
end $$;

do $$
declare
  n integer;
begin
  n := graph.withdraw_evidence_source('file:' || repeat('b', 64), 'medallion test withdrawal');
  if n <> 1 then raise exception 'withdrew % rows', n; end if;
  if (select status from graph.silver_items where id = pg_temp.id('s_refused')::uuid) <> 'withdrawn' then
    raise exception 'withdrawal did not reach silver';
  end if;
  if (select visibility from graph.nodes where id = pg_temp.id('excerpt')::uuid) <> 'private' then
    raise exception 'a node whose only source was withdrawn stayed public';
  end if;
  if (select prior_visibility from graph.medallion_withdrawn_nodes where node_id = pg_temp.id('excerpt')::uuid) <> 'public' then
    raise exception 'the withdrawn node was not queued for a reviewer';
  end if;
  if (select visibility from graph.nodes where id = pg_temp.id('academy')::uuid) <> 'public' then
    raise exception 'a node with a live source was hidden';
  end if;

  begin
    insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence)
      values ('file:' || repeat('b', 64), md5(repeat('b', 64)) || md5(repeat('b', 64)), 'claim', 0, 9, repeat('4', 64), 'test', 'test/1', 0.9);
    raise exception 'silver was written for a withdrawn source';
  exception when check_violation then null;
  end;

  if jsonb_array_length(pg_temp.admit(jsonb_build_array(pg_temp.bronze(repeat('b', 64), 'bucket-canon/05-biophysics/sub-claims/emf/001-x.md', false)))->'refused') <> 1 then
    raise exception 'the same rights revision re-admitted a withdrawn bronze source';
  end if;
end $$;

do $$
declare
  a uuid;
  b uuid;
begin
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence, subject)
    values ('file:' || repeat('c', 64), md5(repeat('c', 64)) || md5(repeat('c', 64)), 'edge_candidate', 0, 5, repeat('5', 64), 'test', 'test/1', 0.7, 'atom->tag-a')
    returning id into a;
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence, subject)
    values ('file:' || repeat('c', 64), md5(repeat('c', 64)) || md5(repeat('c', 64)), 'edge_candidate', 0, 5, repeat('5', 64), 'test', 'test/1', 0.7, 'atom->tag-b')
    returning id into b;
  if a = b then raise exception 'two edge candidates on one span collapsed'; end if;

  insert into graph.edge_proposals (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, model, prompt_hash, action, proposed_kind, silver_item_id)
    values ('medallion-atom', 'medallion-tag', '02-physics', 0.7, 'medallion_lexical', false, 'word match', 'none', repeat('0', 64), 'add', 'derives_from', a);
  begin
    insert into graph.edge_proposals (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, model, prompt_hash, action)
      values ('medallion-atom', 'medallion-tag-2', '02-physics', 0.7, 'medallion_lexical', false, 'word match', 'none', repeat('0', 64), 'remove');
    raise exception 'an unknown proposal action was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into graph.edge_proposals (from_slug, to_slug, branch, confidence, confidence_source, agreement, justification, model, prompt_hash, proposed_kind)
      values ('medallion-atom', 'medallion-tag-3', '02-physics', 0.7, 'medallion_lexical', false, 'word match', 'none', repeat('0', 64), 'cites');
    raise exception 'a proposal proposed a non-factor kind';
  exception when check_violation then null;
  end;
  if (select action from graph.edge_proposals where from_slug = 'medallion-atom' and to_slug = 'medallion-tag') <> 'add' then
    raise exception 'the proposal action did not default to add';
  end if;
  insert into graph.node_proposals (key, title, branch, justification, model, draft)
    values ('medallion:test-draft', 'Draft', '02-physics', 'new', 'none', '{"slug":"test-draft","kind":"excerpt"}'::jsonb);
end $$;

rollback;
