-- Bucket Academy — cross-device progress sync (bkt-su9, bkt-aja)
--
-- One row per (user, branch). `data` holds the exact localStorage blob the
-- Academy engine persists under key `bucket-academy/v1/<branch>` (FSRS cards,
-- xp, streak, settings, history). The client merges per-card by latest review
-- and uses `updated_at` as the row-level tiebreaker (most-recent wins).
--
-- SCHEMA CHOICE (bkt-aja): this table lives in the PRIVATE `bucket` schema, NOT
-- `public`. On the self-hosted, MULTI-TENANT AGFarms Supabase the shared
-- PostgREST exposes only public/storage/graphql_public/<tenant schemas>; the
-- `bucket` schema is deliberately NOT exposed, so the browser cannot reach this
-- table over PostgREST. The Academy instead writes through the same-origin
-- Next.js API route /api/academy/progress, which verifies the user's access
-- token and uses a service-role client to touch only that user's rows.
--
-- Security model: passwordless email-OTP via Supabase Auth. Row-Level Security
-- below guarantees a signed-in user can only read/write their OWN rows even if
-- the schema were ever exposed; the API route enforces the same boundary in
-- application code (the service-role key bypasses RLS). Defense in depth.
--
-- Idempotent: safe to re-run. On the AGFarms Supabase this object already
-- exists (created out of band); every statement is guarded so re-application is
-- a no-op. Reuse this file verbatim when standing up a fresh Supabase.

create schema if not exists bucket;

create table if not exists bucket.academy_progress (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  branch     text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, branch)
);

-- Fast "all my branches" reads.
create index if not exists academy_progress_user_idx
  on bucket.academy_progress (user_id);

-- RLS: users only ever touch their own rows.
alter table bucket.academy_progress enable row level security;

-- Idempotent policy creation (Postgres has no CREATE POLICY IF NOT EXISTS).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'bucket'
      and tablename  = 'academy_progress'
      and policyname = 'own_select'
  ) then
    create policy own_select
      on bucket.academy_progress for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'bucket'
      and tablename  = 'academy_progress'
      and policyname = 'own_insert'
  ) then
    create policy own_insert
      on bucket.academy_progress for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'bucket'
      and tablename  = 'academy_progress'
      and policyname = 'own_update'
  ) then
    create policy own_update
      on bucket.academy_progress for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'bucket'
      and tablename  = 'academy_progress'
      and policyname = 'own_delete'
  ) then
    create policy own_delete
      on bucket.academy_progress for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- Keep updated_at honest on every write (the API route also sets it, but this
-- is the server-side source of truth used for conflict resolution).
create or replace function bucket.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists academy_progress_touch on bucket.academy_progress;
create trigger academy_progress_touch
  before insert or update on bucket.academy_progress
  for each row execute function bucket.touch_updated_at();
