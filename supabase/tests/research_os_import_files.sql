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

-- The policies themselves, under the authenticated role with a JWT.
--
-- Every case above runs as superuser and proves a constraint. The first
-- version of this block called graph.can_read_import_object directly and
-- announced that it was testing the insert policy while comparing a
-- regex literal against itself, so reverting all three policies to
-- storage.foldername passed it. These go through storage.objects.
do $$
declare
  o uuid; i uuid; other uuid; n uuid; h text := repeat('a', 64); p text;
  seen int; refused boolean;
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

  -- The object the policies are judged on.
  insert into storage.objects (bucket_id, name, owner, owner_id)
  values ('research-os-imports', p, o, o::text)
  on conflict do nothing;

  -- The owner reads their own object.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', o::text, 'role', 'authenticated')::text, true);
  select count(*) into seen from storage.objects where bucket_id = 'research-os-imports' and name = p;
  assert seen = 1, 'the owner reads their object through the policy, got ' || seen;
  reset role;

  -- A stranger does not, while the node is private.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  select count(*) into seen from storage.objects where bucket_id = 'research-os-imports' and name = p;
  assert seen = 0, 'a stranger reads nothing, got ' || seen;
  reset role;

  -- A live grant admits them.
  insert into graph.node_grants (node_id, grantee_id, role, granted_by)
  values (n, other, 'view', o);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  select count(*) into seen from storage.objects where bucket_id = 'research-os-imports' and name = p;
  assert seen = 1, 'a live grant admits the grantee, got ' || seen;
  reset role;

  -- An expired one does not.
  update graph.node_grants set expires_at = now() - interval '1 minute' where node_id = n and grantee_id = other;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  select count(*) into seen from storage.objects where bucket_id = 'research-os-imports' and name = p;
  assert seen = 0, 'an expired grant admits nobody, got ' || seen;
  reset role;

  -- A public node admits any signed-in reader.
  update graph.node_grants set expires_at = null where node_id = n and grantee_id = other;
  update graph.nodes set visibility = 'public' where id = n;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  select count(*) into seen from storage.objects where bucket_id = 'research-os-imports' and name = p;
  assert seen = 1, 'a public node is readable, got ' || seen;
  reset role;
  update graph.nodes set visibility = 'private' where id = n;

  -- No claim at all: auth.uid() is null, the regex is null, nothing matches.
  set local role authenticated;
  perform set_config('request.jwt.claims', '', true);
  select count(*) into seen from storage.objects where bucket_id = 'research-os-imports';
  assert seen = 0, 'a caller with no subject reads nothing, got ' || seen;
  reset role;
end $$;

-- The insert policy, through the API the policy governs.
do $$
declare
  o uuid; other uuid; h text := repeat('7', 64); refused int := 0;
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    return;
  end if;
  select owner into o from t_ids;
  select id into other from auth.users where email like 'import-stranger-%' limit 1;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', o::text, 'role', 'authenticated')::text, true);

  -- The shape the rule accepts.
  insert into storage.objects (bucket_id, name) values ('research-os-imports', o::text || '/' || h);

  -- The three it refuses: a nested key, a second segment that is not a
  -- hash, and another owner's prefix. storage.foldername checks only the
  -- first segment, so the first two passed before the rule was anchored.
  begin
    insert into storage.objects (bucket_id, name) values ('research-os-imports', o::text || '/sub/' || h);
  exception when others then refused := refused + 1;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('research-os-imports', o::text || '/NOTAHASH');
  exception when others then refused := refused + 1;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('research-os-imports', other::text || '/' || h);
  exception when others then refused := refused + 1;
  end;
  reset role;

  assert refused = 3, 'only <owner>/<sha256> is accepted, refused ' || refused || ' of 3';
end $$;

-- The quota, which replaced a cap that failed three ways. Each case is
-- the reproduction of one of them.
do $$
declare
  o uuid; i uuid; n bigint; b bigint; refused boolean; before_n bigint; before_b bigint;
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    return;
  end if;
  select owner, imp into o, i from t_ids;
  -- Earlier blocks in this file already wrote objects for this owner, so
  -- every count below is relative to where they left it.
  select count(*) into before_n from storage.objects
   where bucket_id = 'research-os-imports' and name like o::text || '/%';
  select coalesce(bytes, 0) into before_b from graph.import_quota where owner_id = o;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', o::text, 'role', 'authenticated')::text, true);

  -- One statement wrote 500 against a cap of 50, because a stable
  -- function reads the statement snapshot and cannot see the rows that
  -- statement is inserting. The trigger fires per row and locks.
  refused := false;
  begin
    insert into storage.objects (bucket_id, name)
    select 'research-os-imports', o::text || '/' || lpad(to_hex(g), 64, '0') from generate_series(1, 600) g;
  exception when check_violation then refused := true;
  end;
  reset role;
  assert refused, 'a multi-row insert past the object limit is refused';
  select count(*) into n from storage.objects
   where bucket_id = 'research-os-imports' and name like o::text || '/%';
  assert n = before_n, 'and none of its rows landed, got ' || n || ' against ' || before_n;

  -- The old cap counted objects and never bytes, so recording bought
  -- unlimited headroom.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', o::text, 'role', 'authenticated')::text, true);
  refused := false;
  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('research-os-imports', o::text || '/' || repeat('c', 64), jsonb_build_object('size', 3221225472::bigint));
  exception when check_violation then refused := true;
  end;
  reset role;
  assert refused, 'one object past the byte limit is refused';

  -- Sixty recorded objects, then the import deleted the way the import
  -- page tells a blocked owner to. The old cap counted only unrecorded
  -- objects, so this turned sixty accounted objects into sixty orphans
  -- and locked the owner out for good.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', o::text, 'role', 'authenticated')::text, true);
  insert into storage.objects (bucket_id, name, metadata)
  select 'research-os-imports', o::text || '/' || lpad(to_hex(g), 64, '0'), jsonb_build_object('size', 1048576)
  from generate_series(1, 60) g;
  reset role;
  select objects, bytes into n, b from graph.import_quota where owner_id = o;
  assert n = before_n + 60, 'sixty more objects are held, got ' || n || ' against ' || before_n;
  assert b = before_b + 62914560, 'and their bytes, got ' || b;

  insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type)
  select i, o, lpad(to_hex(g), 64, '0'), 1048576, 'text/csv' from generate_series(1, 60) g;
  delete from graph.imports where id = i;
  select objects, bytes into n, b from graph.import_quota where owner_id = o;
  assert n = before_n + 60 and b = before_b + 62914560, 'deleting the import moves no allowance, got ' || n || '/' || b;

  -- And deleting the objects returns it, which is what makes the remedy
  -- real. storage.protect_delete refuses a direct delete, so this is the
  -- path the Storage API takes.
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects where bucket_id = 'research-os-imports' and name like o::text || '/%';
  select objects, bytes into n, b from graph.import_quota where owner_id = o;
  assert n = 0 and b = 0, 'deleting the objects returns the allowance, got ' || n || '/' || b;
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
