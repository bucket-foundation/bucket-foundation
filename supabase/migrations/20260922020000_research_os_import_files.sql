-- Research OS, ros-import 1: the data model and storage for an imported
-- file. learning/research-os/WORKBENCH.md, "What imports owe the
-- workbench", asks for a SHA-256 on every stored file, storage paths keyed
-- by owner and hash so a new upload is a new version and never replaces
-- bytes a run read, the file's size and media type, and Storage policies by
-- owner and grant.
--
-- The path rule is the whole design. An object lives at
-- <owner_id>/<sha256>, so the name is content-addressed. Two people who
-- upload the same file keep separate objects, because the owner is the
-- first segment. One person who uploads the same file twice writes the
-- same object, because the hash is the second. Nothing here grants an
-- update, so a key cannot be overwritten in place.
--
-- The name is content-addressed and the object is not. Nothing here hashes
-- a stored object, so a run that recorded an input by its hash reads the
-- same bytes only when the uploader recomputes the digest server-side and
-- refuses a mismatch. That uploader is ros-import 2 and is a separate
-- change; until it lands, this migration makes the guarantee expressible
-- and gives it the key shape to hold to. An owner may delete a key and
-- write different bytes at it, and a service-role caller bypasses every
-- policy below.
--
-- Two gaps this file does not close, both needing a route rather than a
-- constraint. An owner who deletes an object leaves the graph.import_files
-- row naming bytes that are gone, and no foreign key reaches across the
-- boundary to notice. Deleting an account cascades the row away and leaves
-- the bytes, since storage.objects references only storage.buckets. Both
-- belong to the import routes, and both are filed.

-- 1. The file attached to an import. One row per set of bytes per import;
-- the same owner may attach one object to several imports, and the object
-- outlives any single row for that reason.
create table if not exists graph.import_files (
  id           uuid        primary key default gen_random_uuid(),
  import_id    uuid        not null references graph.imports (id) on delete cascade,
  owner_id     uuid        not null references auth.users (id) on delete cascade,
  -- Lowercase hex, checked here rather than trusted from the caller: the
  -- path is derived from this column, so a malformed value would put an
  -- object somewhere no reader looks.
  sha256       text        not null check (sha256 ~ '^[0-9a-f]{64}$'),
  bytes        bigint      not null check (bytes > 0 and bytes <= 52428800),
  media_type   text        not null check (media_type ~ '^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$'),
  filename     text,
  -- Generated, so no caller can write a path that disagrees with the owner
  -- and the hash it claims.
  storage_path text        generated always as (owner_id::text || '/' || sha256) stored,
  created_at   timestamptz not null default now()
);

-- The same bytes attached to one import twice is one row.
create unique index if not exists import_files_import_sha_uq on graph.import_files (import_id, sha256);
create index if not exists import_files_owner_idx on graph.import_files (owner_id);
create index if not exists import_files_path_idx on graph.import_files (storage_path);

-- 2. The row is a record of bytes that already exist. Changing which bytes
-- it names would point a run's recorded input at a different file, so the
-- identifying columns are fixed after insert. storage_path is generated
-- from two of them and needs no clause of its own.
create or replace function graph.import_files_are_immutable() returns trigger
language plpgsql as $$
begin
  if new.sha256 is distinct from old.sha256
     or new.owner_id is distinct from old.owner_id
     or new.bytes is distinct from old.bytes
     or new.import_id is distinct from old.import_id then
    raise exception 'import_files: sha256, owner_id, bytes and import_id are fixed once written';
  end if;
  return new;
end $$;

drop trigger if exists import_files_immutable on graph.import_files;
create trigger import_files_immutable
  before update on graph.import_files
  for each row execute function graph.import_files_are_immutable();

-- 3. Who may read the record: public, or the owner, or a live grant,
-- applied through the import's node. An import with no node yet is the
-- owner's alone.
--
-- This is the rule graph.nodes' visible_select was written to carry and
-- does not. Its grant clause reads `g.node_id = id`, and `id` binds to
-- node_grants.id in that scope, so it compares a grant's own primary key
-- to the node it grants and never matches: no grantee has ever been
-- admitted by that policy. It is latent, because `authenticated` holds no
-- USAGE on schema graph and every read goes through a service-role route.
-- Filed rather than fixed here, since correcting it means a migration of
-- its own against a file that has already been applied.
alter table graph.import_files enable row level security;

-- Dropped and recreated rather than created when absent. A guard that
-- skips an existing policy cannot replace a wrong one, and the first
-- version of this file shipped a wrong one: re-running the corrected
-- file on a database carrying it reported success and left the defect
-- in place. Every policy below is written unconditionally for that
-- reason, so a re-run converges on what the file says.
drop policy if exists owner_or_grantee_select on graph.import_files;
create policy owner_or_grantee_select on graph.import_files for select using (
      owner_id = auth.uid()
      or exists (
        select 1
        from graph.imports i
        join graph.nodes n on n.id = i.node_id
        where i.id = import_id
          and (
            n.visibility = 'public'
            or n.owner_id = auth.uid()
            or exists (
              select 1 from graph.node_grants g
              where g.node_id = n.id and g.grantee_id = auth.uid()
                and (g.expires_at is null or g.expires_at > now())
            )
          )
      )
);

-- Service role only. `authenticated` holds no USAGE on schema graph, so a
-- grant here reaches nothing and the policy above never runs for a
-- client: every read of this table goes through a route. The policy
-- stays because graph.can_read_import_object applies the same rule, and
-- a future grant of schema usage should find the table already governed.
grant all on graph.import_files to service_role;
-- Removing the line that granted this is not enough on a database that
-- ran the earlier version, where the privilege is still held.
revoke all on graph.import_files from authenticated;
revoke all on graph.import_files from anon;

/**
 * Whether the calling user may read the object stored at `object_name`.
 *
 * It takes no viewer. An earlier signature took one, which made it a
 * function that answers an authorization question about whoever the
 * caller names. Nothing could reach it, because `authenticated` holds
 * no USAGE on schema graph, and `graph` is in the PostgREST exposed
 * list in supabase/config.toml, so one `grant usage` would have turned
 * it into an RPC that tells a caller whether a named user imported a
 * named set of bytes. Reading auth.uid() inside bounds the worst answer
 * to a question about yourself.
 *
 * security definer, so the graph join runs as the owner and the caller's
 * plan never contains a graph table. That is the point: graph.nodes'
 * visible_select and graph.node_grants' grantee_or_owner_select select
 * from each other, and a policy that reaches them from storage.objects
 * made every authenticated Storage read in the project fail with
 * "infinite recursion detected in policy for relation node_grants".
 *
 * search_path is empty so every name inside is schema-qualified, and
 * execute is granted to authenticated alone.
 */
-- The policies go first. A storage policy that calls the old
-- two-argument function depends on it, so dropping the function while
-- that policy stands raises "cannot drop function ... because other
-- objects depend on it" and the whole migration stops. They are
-- recreated below.
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    drop policy if exists research_os_imports_own_insert on storage.objects;
    drop policy if exists research_os_imports_owner_or_grantee_select on storage.objects;
    drop policy if exists research_os_imports_own_delete on storage.objects;
  end if;
end $$;

drop function if exists graph.can_read_import_object(text, uuid);

create or replace function graph.can_read_import_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from graph.import_files f
    join graph.imports i on i.id = f.import_id
    join graph.nodes n on n.id = i.node_id
    where f.storage_path = object_name
      and (
        n.visibility = 'public'
        or n.owner_id = auth.uid()
        or exists (
          select 1 from graph.node_grants g
          where g.node_id = n.id and g.grantee_id = auth.uid()
            and (g.expires_at is null or g.expires_at > now())
        )
      )
  );
$$;

revoke execute on function graph.can_read_import_object(text) from public;
grant execute on function graph.can_read_import_object(text) to authenticated;

/**
 * Whether the calling user may write another object that no row records.
 *
 * The key rule bounds where a write lands and says nothing about how
 * many. Signup is open, so without this any account can write 50 MiB
 * objects that no row names, nothing bills and nothing reaps, and the
 * delete policy lets them churn keys.
 *
 * The cap counts only objects with no graph.import_files row, because
 * the uploader writes the bytes and then records them: one unrecorded
 * object at a time is its normal state, and an object that has been
 * recorded is accounted for. Recording is what raises the ceiling.
 *
 * An upload whose record never arrives leaves an orphan, which is the
 * failure this shape creates and which the cap bounds at UNRECORDED_CAP
 * per owner. Reaping them belongs to the import routes; until that
 * exists an owner who fills the cap with orphans cannot upload, and
 * deleting their own objects is the way out.
 */
create or replace function graph.import_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and (
       select count(*)
       from storage.objects o
       where o.bucket_id = 'research-os-imports'
         and o.name like auth.uid()::text || '/%'
         and not exists (
           select 1 from graph.import_files f where f.storage_path = o.name
         )
     ) < 50;
$$;

revoke execute on function graph.import_upload_allowed(text) from public;
grant execute on function graph.import_upload_allowed(text) to authenticated;

-- 4. The bucket and its policies. Guarded, because a bare Postgres with the
-- graph schema and no Supabase Storage is a database this migration still
-- has to apply to.
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then

    -- do update, so a bucket that already exists takes these settings.
    -- `do nothing` left a bucket created public public, and reported
    -- success.
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('research-os-imports', 'research-os-imports', false, 52428800)
    on conflict (id) do update
      set public = false, file_size_limit = excluded.file_size_limit;

    -- Writes land in the caller's own prefix and nowhere else.
    drop policy if exists research_os_imports_own_insert on storage.objects;
      -- Anchored, because storage.foldername returns the first segment of
      -- any depth: <uid>/sub/<hash>, <uid>/<not-a-hash> and a key holding
      -- .. all passed a check on segment one alone, and nothing then
      -- bound a written object to the <owner>/<sha256> rule this whole
      -- migration rests on.
      create policy research_os_imports_own_insert on storage.objects for insert to authenticated
        with check (
          bucket_id = 'research-os-imports'
          and name ~ ('^' || auth.uid()::text || '/[0-9a-f]{64}$')
          and graph.import_upload_allowed(name)
        );

    -- Reads follow the record's own rule, so a grant on the import's node
    -- reaches the bytes and nothing else does. The join runs inside
    -- graph.can_read_import_object rather than in the policy body.
    --
    -- Spelling the join out here took every authenticated Storage read in
    -- the project down. graph.nodes' visible_select selects from
    -- node_grants and node_grants' grantee_or_owner_select selects from
    -- nodes, so the two recurse, and this policy was the first thing in
    -- the project to reach them from a table authenticated can read.
    -- Postgres answered "infinite recursion detected in policy for
    -- relation node_grants" for every object in every bucket. A security
    -- definer function owns that recursion internally and the caller's
    -- plan never contains a graph table.
    drop policy if exists research_os_imports_owner_or_grantee_select on storage.objects;
      create policy research_os_imports_owner_or_grantee_select on storage.objects for select to authenticated
        using (
          bucket_id = 'research-os-imports'
          and (
            name ~ ('^' || auth.uid()::text || '/[0-9a-f]{64}$')
            or graph.can_read_import_object(name)
          )
        );

    -- Only the owner removes an object, and no policy grants an update at
    -- all: a path names one set of bytes for as long as it exists.
    drop policy if exists research_os_imports_own_delete on storage.objects;
      create policy research_os_imports_own_delete on storage.objects for delete to authenticated
        using (
          bucket_id = 'research-os-imports'
          and name ~ ('^' || auth.uid()::text || '/[0-9a-f]{64}$')
        );

  end if;
end $$;
