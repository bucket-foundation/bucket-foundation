-- Research OS, ros-import 1: the data model and storage for an imported
-- file. learning/research-os/WORKBENCH.md, "What imports owe the
-- workbench", asks for a SHA-256 on every stored file, storage paths keyed
-- by owner and hash so a new upload is a new version and never replaces
-- bytes a run read, the file's size and media type, and Storage policies by
-- owner and grant.
--
-- The path rule is the whole design. An object lives at
-- <owner_id>/<sha256>, so the bytes decide the name. Two people who upload
-- the same file keep separate objects, because the owner is the first
-- segment. One person who uploads the same file twice writes the same
-- object, because the hash is the second. Different bytes can never land on
-- an existing path, so a run that recorded an input by its hash reads those
-- same bytes forever. Nothing in this migration grants an update.

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

-- 3. Who may read the record. The same rule graph.nodes carries in
-- visible_select, applied through the import's node: public, or the owner,
-- or a live grant. An import with no node yet is the owner's alone.
alter table graph.import_files enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'import_files' and policyname = 'owner_or_grantee_select') then
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
  end if;
end $$;

grant select on graph.import_files to authenticated;
grant all on graph.import_files to service_role;

-- 4. The bucket and its policies. Guarded, because a bare Postgres with the
-- graph schema and no Supabase Storage is a database this migration still
-- has to apply to.
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then

    insert into storage.buckets (id, name, public, file_size_limit)
    values ('research-os-imports', 'research-os-imports', false, 52428800)
    on conflict (id) do nothing;

    -- Writes land in the caller's own prefix and nowhere else.
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'research_os_imports_own_insert') then
      create policy research_os_imports_own_insert on storage.objects for insert to authenticated
        with check (
          bucket_id = 'research-os-imports'
          and (storage.foldername(name))[1] = auth.uid()::text
        );
    end if;

    -- Reads follow the record's own rule, so a grant on the import's node
    -- reaches the bytes and nothing else does. The join is spelled out
    -- rather than left to import_files' own policy: a read rule that
    -- depends on a second table's RLS still being on is a rule that turns
    -- off quietly.
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'research_os_imports_owner_or_grantee_select') then
      create policy research_os_imports_owner_or_grantee_select on storage.objects for select to authenticated
        using (
          bucket_id = 'research-os-imports'
          and (
            (storage.foldername(name))[1] = auth.uid()::text
            or exists (
              select 1
              from graph.import_files f
              join graph.imports i on i.id = f.import_id
              join graph.nodes n on n.id = i.node_id
              where f.storage_path = name
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
          )
        );
    end if;

    -- Only the owner removes an object, and no policy grants an update at
    -- all: a path names one set of bytes for as long as it exists.
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'research_os_imports_own_delete') then
      create policy research_os_imports_own_delete on storage.objects for delete to authenticated
        using (
          bucket_id = 'research-os-imports'
          and (storage.foldername(name))[1] = auth.uid()::text
        );
    end if;

  end if;
end $$;
