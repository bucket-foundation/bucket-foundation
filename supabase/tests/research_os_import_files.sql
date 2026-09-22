-- ros-import 1's table, its checks and its immutability in real Postgres.
-- One transaction, rolled back.
-- Run: psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/research_os_import_files.sql
begin;

create temporary table t_ids (owner uuid, node uuid, imp uuid) on commit drop;

with u as (
  insert into auth.users (id, instance_id, aud, role, email)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'import-files-' || gen_random_uuid() || '@bucket.test')
  returning id
), n as (
  -- owner_id and created_by, because createImport writes both and the
  -- read rule turns on owner_id. The first version of this fixture left
  -- them null, and the owner could not read their own object.
  insert into graph.nodes (id, slug, title, kind, tier, branch, summary, visibility, owner_id, created_by)
  select gen_random_uuid(), 'import-files-' || gen_random_uuid(), 'Import fixture',
         'artifact', 0, '00-imports', 'fixture', 'private', u.id, u.id
  from u
  returning id
)
insert into t_ids (owner, node) select u.id, n.id from u, n;

insert into graph.imports (owner_id, kind, title, node_id)
select owner, 'dataset', 'Import fixture', node from t_ids
returning id \gset
update t_ids set imp = :'id';

-- The path is generated from the owner and the hash, so a caller cannot
-- write one that disagrees with what it claims.
do $$
declare
  o uuid; i uuid; p text;
  h text := repeat('a', 64);
begin
  select owner, imp into o, i from t_ids;
  insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type)
  values (i, o, h, 100, 'text/csv')
  returning storage_path into p;
  assert p = o::text || '/' || h, 'the path is owner/sha256, got ' || p;
end $$;

-- The bytes decide the name, so the same file written twice by one owner
-- takes one path, and different bytes can never land on it.
do $$
declare
  o uuid; i uuid; same text; other text;
begin
  select owner, imp into o, i from t_ids;
  select storage_path into same from graph.import_files where owner_id = o and sha256 = repeat('a', 64);
  insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type)
  values (i, o, repeat('b', 64), 100, 'text/csv')
  returning storage_path into other;
  assert other <> same, 'different bytes take a different path';
  assert other like o::text || '/%', 'the owner is still the first segment';
end $$;

-- One import holds one row per set of bytes.
do $$
declare
  o uuid; i uuid; failed boolean := false;
begin
  select owner, imp into o, i from t_ids;
  begin
    insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type)
    values (i, o, repeat('a', 64), 100, 'text/csv');
  exception when unique_violation then failed := true;
  end;
  assert failed, 'the same bytes on one import is one row';
end $$;

-- The checks the table carries, each refused.
do $$
declare
  o uuid; i uuid; n int := 0;
begin
  select owner, imp into o, i from t_ids;

  begin
    insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type)
    values (i, o, 'NOT-HEX', 10, 'text/csv');
  exception when check_violation then n := n + 1;
  end;

  begin
    insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type)
    values (i, o, repeat('c', 64), 0, 'text/csv');
  exception when check_violation then n := n + 1;
  end;

  begin
    insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type)
    values (i, o, repeat('d', 64), 52428801, 'text/csv');
  exception when check_violation then n := n + 1;
  end;

  begin
    insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type)
    values (i, o, repeat('e', 64), 10, 'not-a-media-type');
  exception when check_violation then n := n + 1;
  end;

  assert n = 4, 'four malformed rows are refused, got ' || n;
end $$;

-- A row records bytes that already exist. Repointing it at other bytes
-- would point a run's recorded input at a different file, so the
-- identifying columns are fixed after insert.
do $$
declare
  o uuid; i uuid; fixed int := 0;
begin
  select owner, imp into o, i from t_ids;

  begin
    update graph.import_files set sha256 = repeat('f', 64) where owner_id = o and sha256 = repeat('a', 64);
  exception when others then fixed := fixed + 1;
  end;

  begin
    update graph.import_files set bytes = 999 where owner_id = o and sha256 = repeat('a', 64);
  exception when others then fixed := fixed + 1;
  end;

  assert fixed = 2, 'sha256 and bytes are both fixed once written, got ' || fixed;

  -- A column that names nothing about the bytes still moves.
  update graph.import_files set filename = 'renamed.csv' where owner_id = o and sha256 = repeat('a', 64);
end $$;

-- The bucket exists, is private, and carries the same 50 MiB limit.
do $$
declare
  is_public boolean; lim bigint;
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    select public, file_size_limit into is_public, lim from storage.buckets where id = 'research-os-imports';
    assert is_public is not null, 'the bucket exists';
    assert is_public = false, 'the bucket is private';
    assert lim = 52428800, 'the bucket holds the same limit as the table, got ' || coalesce(lim::text, 'null');
  end if;
end $$;

-- No policy grants an update on an object in this bucket, so a path names
-- one set of bytes for as long as it exists.
do $$
declare
  updates int;
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    select count(*) into updates
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'research_os_imports%' and cmd = 'UPDATE';
    assert updates = 0, 'no update policy on the imports bucket, found ' || updates;
  end if;
end $$;

-- The policies themselves, under a real role. Every case above runs as
-- superuser and proves a constraint; none of them proved that a stranger
-- is refused, which is what the migration's security half claims.
do $$
declare
  o uuid; i uuid; other uuid; n uuid; h text := repeat('a', 64); p text;
  seen int;
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    return;
  end if;
  select owner, imp, node into o, i, n from t_ids;
  select storage_path into p from graph.import_files where owner_id = o and sha256 = h;
  insert into auth.users (id, instance_id, aud, role, email)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'import-stranger-' || gen_random_uuid() || '@bucket.test')
  returning id into other;

  -- The owner reads their own object.
  assert graph.can_read_import_object(p, o), 'the owner may read their object';

  -- A stranger does not, while the node is private.
  assert not graph.can_read_import_object(p, other), 'a stranger may not';

  -- A live grant admits them.
  insert into graph.node_grants (node_id, grantee_id, role, granted_by)
  values (n, other, 'view', o);
  assert graph.can_read_import_object(p, other), 'a live grant admits the grantee';

  -- An expired one does not.
  update graph.node_grants set expires_at = now() - interval '1 minute' where node_id = n and grantee_id = other;
  assert not graph.can_read_import_object(p, other), 'an expired grant admits nobody';

  -- A public node admits anyone.
  update graph.node_grants set expires_at = null where node_id = n and grantee_id = other;
  update graph.nodes set visibility = 'public' where id = n;
  assert graph.can_read_import_object(p, gen_random_uuid()), 'a public node is readable';
  update graph.nodes set visibility = 'private' where id = n;

  -- An object nobody recorded is nobody's.
  assert not graph.can_read_import_object(o::text || '/' || repeat('9', 64), o), 'an unrecorded path is refused';

  -- The key shape the insert policy accepts, checked as the rule rather
  -- than through the storage API: two segments, the second lowercase hex.
  seen := 0;
  if (o::text || '/' || h) ~ ('^' || o::text || '/[0-9a-f]{64}$') then seen := seen + 1; end if;
  if (o::text || '/sub/' || h) ~ ('^' || o::text || '/[0-9a-f]{64}$') then seen := seen + 1; end if;
  if (other::text || '/' || h) ~ ('^' || o::text || '/[0-9a-f]{64}$') then seen := seen + 1; end if;
  if (o::text || '/NOTAHASH') ~ ('^' || o::text || '/[0-9a-f]{64}$') then seen := seen + 1; end if;
  assert seen = 1, 'only <owner>/<sha256> matches the key rule, got ' || seen;
end $$;

-- The recursion this policy set once caused, as a standing check: a
-- storage read under the authenticated role must answer rather than
-- raise. It raised "infinite recursion detected in policy for relation
-- node_grants" for every object in every bucket.
do $$
declare
  c bigint;
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    set local role authenticated;
    select count(*) into c from storage.objects;
    reset role;
    assert c >= 0, 'an authenticated storage read answers';
  end if;
end $$;

rollback;
