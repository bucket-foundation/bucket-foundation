-- graph.evidence_source_admissions and its functions, in one transaction
-- that rolls back. Run by scripts/test-research-os-evidence-admissions-db.ts.
-- Every block raises on a broken rule; silence means the contract holds.

begin;

create temporary table t_ids (k text primary key, v text) on commit drop;

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
begin
  insert into graph.nodes (id, slug, title, kind, branch, visibility)
    values (a, 'admissions-test-a-' || a, 'Admissions test A', 'concept', '02-physics', 'public'),
           (b, 'admissions-test-b-' || b, 'Admissions test B', 'concept', '02-physics', 'public');
  insert into t_ids values ('a', a::text), ('b', b::text);
end $$;

-- A row as the admit step sends it.
create or replace function pg_temp.row_for(p_node text, p_scope text, p_revision text, p_rights integer default 1)
returns jsonb language sql as $$
  select jsonb_build_object(
    'source_id', 'graph:' || p_node, 'source_revision', p_revision, 'scope', p_scope, 'node_id', p_node,
    'body_hash', repeat('b', 64), 'original_hash', repeat('c', 64), 'extraction_revision', 'graph-node/1 nfc-lf/1',
    'rights_rule', 'academy-atom', 'rights_revision', p_rights,
    'allow_index', p_scope = 'index', 'allow_quote', p_scope = 'quote',
    'permission_evidence', '{"permission":"project-authored"}'::jsonb)
$$;

create or replace function pg_temp.admit(p_rows jsonb, p_corpus text default repeat('e', 64))
returns jsonb language sql as $$
  select graph.admit_evidence_corpus(p_corpus, repeat('f', 64), 'draft', p_rows)
$$;

create or replace function pg_temp.id(k text) returns text language sql as $$ select v from t_ids where t_ids.k = id.k $$;

-- Browser roles see nothing and call nothing; the service role reads and never writes directly.
do $$
begin
  set local role anon;
  begin
    perform 1 from graph.evidence_source_admissions limit 1;
    raise exception 'anon read the admissions table';
  exception when insufficient_privilege then null;
  end;
  begin
    perform graph.eligible_evidence_sources();
    raise exception 'anon called eligible_evidence_sources';
  exception when insufficient_privilege then null;
  end;
  reset role;

  set local role authenticated;
  begin
    perform graph.admit_evidence_corpus(repeat('e', 64), repeat('f', 64), 'draft', '[]'::jsonb);
    raise exception 'authenticated called admit_evidence_corpus';
  exception when insufficient_privilege then null;
  end;
  reset role;

  set local role service_role;
  perform 1 from graph.evidence_source_admissions limit 1;
  begin
    insert into graph.evidence_source_admissions (source_id, source_revision, scope, body_hash, original_hash, extraction_revision,
      corpus_revision, rights_rule, rights_revision, rights_policy_sha256, rights_policy_status, allow_index, allow_quote)
      values ('graph:' || gen_random_uuid(), repeat('a', 64), 'index', repeat('b', 64), repeat('c', 64), 'x',
              repeat('e', 64), 'r', 1, repeat('f', 64), 'draft', true, false);
    raise exception 'service_role inserted directly';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

-- A first admission stages and activates every row.
do $$
declare res jsonb;
begin
  res := pg_temp.admit(jsonb_build_array(
    pg_temp.row_for(pg_temp.id('a'), 'index', repeat('1', 64)),
    pg_temp.row_for(pg_temp.id('a'), 'quote', repeat('2', 64)),
    pg_temp.row_for(pg_temp.id('b'), 'index', repeat('3', 64))));
  if (res->>'staged')::int <> 3 or (res->>'activated')::int <> 3 then
    raise exception 'first admission: %', res;
  end if;
end $$;

-- The same corpus again changes nothing.
do $$
declare res jsonb;
begin
  res := pg_temp.admit(jsonb_build_array(
    pg_temp.row_for(pg_temp.id('a'), 'index', repeat('1', 64)),
    pg_temp.row_for(pg_temp.id('a'), 'quote', repeat('2', 64)),
    pg_temp.row_for(pg_temp.id('b'), 'index', repeat('3', 64))));
  if (res->>'staged')::int <> 0 or (res->>'activated')::int <> 0 or (res->>'unchanged')::int <> 3 or (res->>'retired')::int <> 0 then
    raise exception 'repeat admission: %', res;
  end if;
end $$;

-- A new revision supersedes the old one, and a source left out of the corpus is retired.
do $$
declare res jsonb; st text;
begin
  res := pg_temp.admit(jsonb_build_array(
    pg_temp.row_for(pg_temp.id('a'), 'index', repeat('4', 64)),
    pg_temp.row_for(pg_temp.id('a'), 'quote', repeat('2', 64))));
  if (res->>'activated')::int <> 1 or (res->>'unchanged')::int <> 1 or (res->>'retired')::int <> 1 then
    raise exception 'second corpus: %', res;
  end if;
  select status into st from graph.evidence_source_admissions where source_revision = repeat('1', 64);
  if st <> 'superseded' then raise exception 'old index revision is %', st; end if;
  select status into st from graph.evidence_source_admissions where source_revision = repeat('3', 64);
  if st <> 'superseded' then raise exception 'source b is %, after leaving the corpus', st; end if;
  if (select count(*) from graph.evidence_source_admissions
      where source_id = 'graph:' || pg_temp.id('a') and status = 'active') <> 2 then
    raise exception 'source a should hold one active row per scope';
  end if;
end $$;

-- One active row per source and scope, even for a superuser's direct write.
do $$
begin
  begin
    update graph.evidence_source_admissions set status = 'active'
      where source_revision = repeat('1', 64);
    raise exception 'two active index rows for one source';
  exception when unique_violation then null;
  end;
end $$;

-- The scope and the permission agree, and ids and hashes keep their forms.
do $$
begin
  begin
    insert into graph.evidence_source_admissions (source_id, source_revision, scope, body_hash, original_hash, extraction_revision,
      corpus_revision, rights_rule, rights_revision, rights_policy_sha256, rights_policy_status, allow_index, allow_quote)
      values ('graph:' || gen_random_uuid(), repeat('9', 64), 'quote', repeat('b', 64), repeat('c', 64), 'x',
              repeat('e', 64), 'r', 1, repeat('f', 64), 'draft', true, true);
    raise exception 'a quote row permitted indexing';
  exception when check_violation then null;
  end;
  begin
    insert into graph.evidence_source_admissions (source_id, source_revision, scope, body_hash, original_hash, extraction_revision,
      corpus_revision, rights_rule, rights_revision, rights_policy_sha256, rights_policy_status, allow_index, allow_quote)
      values ('graph:not-a-uuid', repeat('9', 64), 'index', repeat('b', 64), repeat('c', 64), 'x',
              repeat('e', 64), 'r', 1, repeat('f', 64), 'draft', true, false);
    raise exception 'a malformed source id was stored';
  exception when check_violation then null;
  end;
  begin
    perform pg_temp.admit(jsonb_build_array(pg_temp.row_for(pg_temp.id('a'), 'index', 'short')));
    raise exception 'a malformed revision was stored';
  exception when check_violation then null;
  end;
  begin
    perform pg_temp.admit(jsonb_build_array(pg_temp.row_for(pg_temp.id('a'), 'index', repeat('2', 64))));
    raise exception 'one revision was admitted under two scopes';
  exception when unique_violation then null;
  end;
end $$;

-- Quote's check: an active quote revision is allowed; an index revision and an unknown one are not.
do $$
declare q record;
begin
  select * into q from graph.quote_admission('graph:' || pg_temp.id('a'), repeat('2', 64));
  if not q.allowed or q.status <> 'active' then raise exception 'active quote: %', q; end if;
  select * into q from graph.quote_admission('graph:' || pg_temp.id('a'), repeat('4', 64));
  if q.allowed then raise exception 'an index revision passed the quote check'; end if;
  select * into q from graph.quote_admission('graph:' || pg_temp.id('a'), repeat('0', 64));
  if q.allowed or q.status <> 'unknown' then raise exception 'unknown revision: %', q; end if;
end $$;

-- Eligibility follows the live graph: a node made private drops out.
do $$
begin
  if not exists (select 1 from graph.eligible_evidence_sources() where source_id = 'graph:' || pg_temp.id('a')) then
    raise exception 'source a should be eligible';
  end if;
  update graph.nodes set visibility = 'private' where id = pg_temp.id('a')::uuid;
  if exists (select 1 from graph.eligible_evidence_sources() where source_id = 'graph:' || pg_temp.id('a')) then
    raise exception 'a private node stayed eligible';
  end if;
  update graph.nodes set visibility = 'public' where id = pg_temp.id('a')::uuid;
end $$;

-- Withdrawal reaches every revision, needs a reason, and fences re-admission.
do $$
declare n integer; res jsonb; q record; st text; w timestamptz;
begin
  begin
    perform graph.withdraw_evidence_source('graph:' || pg_temp.id('a'), '  ');
    raise exception 'a withdrawal without a reason';
  exception when invalid_parameter_value then null;
  end;
  n := graph.withdraw_evidence_source('graph:' || pg_temp.id('a'), 'rights revoked in test');
  if n <> 3 then raise exception 'withdrew % rows of source a, expected 3', n; end if;
  select * into q from graph.quote_admission('graph:' || pg_temp.id('a'), repeat('2', 64));
  if q.allowed or q.status <> 'withdrawn' then raise exception 'withdrawn quote: %', q; end if;
  if exists (select 1 from graph.eligible_evidence_sources() where source_id = 'graph:' || pg_temp.id('a')) then
    raise exception 'a withdrawn source stayed eligible';
  end if;

  res := pg_temp.admit(jsonb_build_array(pg_temp.row_for(pg_temp.id('a'), 'index', repeat('4', 64), 1)));
  if jsonb_array_length(res->'refused') <> 1 or (res->>'activated')::int <> 0 then
    raise exception 'the same rights revision re-admitted a withdrawn source: %', res;
  end if;

  res := pg_temp.admit(jsonb_build_array(pg_temp.row_for(pg_temp.id('a'), 'index', repeat('4', 64), 2)));
  if jsonb_array_length(res->'refused') <> 0 or (res->>'activated')::int <> 1 then
    raise exception 'a newer rights review did not re-admit: %', res;
  end if;
  select status, withdrawn_at into st, w from graph.evidence_source_admissions where source_revision = repeat('4', 64);
  if st <> 'active' or w is null then raise exception 're-admitted row: status %, withdrawn_at %', st, w; end if;
end $$;

rollback;
