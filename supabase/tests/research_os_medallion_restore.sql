begin;

create temporary table t_ids (k text primary key, v text) on commit drop;

create or replace function pg_temp.bronze(p_hash text, p_path text, p_rights integer)
returns jsonb language sql as $$
  select jsonb_build_object(
    'source_id', 'file:' || p_hash, 'source_revision', md5(p_hash) || md5(p_hash), 'repo_path', p_path,
    'body_hash', p_hash, 'original_hash', p_hash, 'extraction_revision', 'medallion-file/1 nfc-lf/1',
    'rights_rule', 'academy-atom', 'rights_revision', p_rights, 'allow_index', true, 'permission_evidence', '{}'::jsonb)
$$;

create or replace function pg_temp.id(k text) returns uuid language sql as $$ select v::uuid from t_ids where t_ids.k = id.k $$;

do $$
declare
  n  uuid := gen_random_uuid();
  u  uuid := gen_random_uuid();
  s1 uuid;
  s2 uuid;
begin
  perform graph.admit_bronze_sources(repeat('e', 64), repeat('f', 64), 'draft', jsonb_build_array(
    pg_temp.bronze(repeat('1', 64), '_intake/restore-test.md', 1)));
  perform graph.admit_bronze_sources(repeat('e', 64), repeat('f', 64), 'draft', jsonb_build_array(
    pg_temp.bronze(repeat('2', 64), '_intake/restore-test.md', 1)));
  if (select count(distinct source_id) from graph.bronze_file_paths where repo_path = '_intake/restore-test.md') <> 2 then
    raise exception 'the path does not hold two revisions';
  end if;
  insert into graph.nodes (id, slug, title, kind, branch, visibility, provenance)
    values (n, 'restore-test-' || n, 'Restore test', 'concept', '02-physics', 'public', '{"type":"intake_digest"}');
  insert into auth.users (id, email) values (u, 'restore-' || u || '@test.example');
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence)
    values ('file:' || repeat('1', 64), md5(repeat('1', 64)) || md5(repeat('1', 64)), 'term', 0, 4, repeat('3', 64), 'test', 'test/1', 0.9)
    returning id into s1;
  insert into graph.silver_items (source_id, source_revision, kind, span_start, span_end, text_hash, parser, parser_revision, confidence)
    values ('file:' || repeat('2', 64), md5(repeat('2', 64)) || md5(repeat('2', 64)), 'term', 0, 4, repeat('4', 64), 'test', 'test/1', 0.9)
    returning id into s2;
  insert into graph.gold_lineage (node_id, silver_item_id, promoted_by) values (n, s1, 'backfill'), (n, s2, 'backfill');
  insert into t_ids values ('node', n::text), ('user', u::text), ('s1', s1::text), ('s2', s2::text);
end $$;

do $$
declare
  res jsonb;
begin
  set local role authenticated;
  begin
    perform graph.restore_withdrawn_node(pg_temp.id('node'), pg_temp.id('user'));
    raise exception 'authenticated called restore_withdrawn_node';
  exception when insufficient_privilege then null;
  end;
  reset role;

  if (graph.restore_withdrawn_node(pg_temp.id('node'), pg_temp.id('user')))->>'error' <> 'not_queued' then
    raise exception 'a node that was never withdrawn was restored';
  end if;

  perform graph.withdraw_evidence_source('file:' || repeat('1', 64), 'restore test');
  if (select visibility from graph.nodes where id = pg_temp.id('node')) <> 'public' then
    raise exception 'withdrawing one of two revisions hid the node';
  end if;
  perform graph.withdraw_evidence_source('file:' || repeat('2', 64), 'restore test');
  if (select visibility from graph.nodes where id = pg_temp.id('node')) <> 'private' then
    raise exception 'withdrawing both revisions left the node public';
  end if;

  begin
    perform graph.restore_withdrawn_node(pg_temp.id('node'), null);
    raise exception 'a restore ran without a reviewer';
  exception when invalid_parameter_value then null;
  end;
  if (graph.restore_withdrawn_node(pg_temp.id('node'), pg_temp.id('user')))->>'error' <> 'source_withdrawn' then
    raise exception 'a node was restored while its source is withdrawn';
  end if;

  res := graph.admit_bronze_sources(repeat('e', 64), repeat('f', 64), 'draft', jsonb_build_array(
    pg_temp.bronze(repeat('2', 64), '_intake/restore-test.md', 2)));
  if (res->>'activated')::int <> 1 then raise exception 'readmission under a newer rights revision failed: %', res; end if;

  res := graph.restore_withdrawn_node(pg_temp.id('node'), pg_temp.id('user'));
  if not (res->>'ok')::boolean or res->>'visibility' <> 'public' or (res->>'silver_revived')::int <> 1 then
    raise exception 'restore: %', res;
  end if;
  if (select visibility from graph.nodes where id = pg_temp.id('node')) <> 'public' then raise exception 'the node stayed private'; end if;
  if (select status from graph.silver_items where id = pg_temp.id('s2')) <> 'promoted' then raise exception 'the readmitted silver item stayed withdrawn'; end if;
  if (select status from graph.silver_items where id = pg_temp.id('s1')) <> 'withdrawn' then raise exception 'the still-withdrawn silver item came back'; end if;
  if (select reviewer_id from graph.medallion_withdrawn_nodes where node_id = pg_temp.id('node')) <> pg_temp.id('user') then
    raise exception 'the queue row does not name the reviewer';
  end if;
  if (graph.restore_withdrawn_node(pg_temp.id('node'), pg_temp.id('user')))->>'error' <> 'already_reviewed' then
    raise exception 'a reviewed node was restored twice';
  end if;
end $$;

rollback;
