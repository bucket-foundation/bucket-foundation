-- Bucket Academy — verifiable credentials (bkt-52p)
--
-- One row per issued Open Badges 3.0 / W3C Verifiable Credential. The signed
-- VC-JWT (`jwt`) is the verifiable artifact; `credential` mirrors the unsigned
-- VC JSON for cheap reads. Each row is a STABLE, point-in-time artifact a
-- recruiter can rely on (the credential's hosted id == this row's `id`).
--
-- SCHEMA CHOICE (same as academy_progress / academy_profiles, bkt-aja/bkt-coh):
-- this table lives in the PRIVATE `bucket` schema, which the shared multi-tenant
-- PostgREST does NOT expose. The browser cannot reach it directly; all access is
-- through the same-origin Next.js API routes
--   POST   /api/academy/credential/issue          (auth: issue own)
--   GET    /api/academy/credential/[id]           (public: fetch signed VC-JWT)
--   GET    /api/academy/credential/[id]/status    (public: revocation status)
--   DELETE /api/academy/credential/[id]           (auth: revoke own)
--   POST   /api/academy/credential/verify         (public: verify)
-- which verify the user's access token and use a service-role client to touch
-- only that user's rows.
--
-- REVOCATION: `revoked_at` IS NULL == live; setting it == revoked. Verification
-- re-checks this live, so a revoked credential reads as invalid even though its
-- EdDSA signature is still mathematically valid.
--
-- COMPLIANCE (bkt-rdg): the only PII stored is `handle` (already public) +
-- user_id (the FK owner). No email, no score/rating (bkt-4at gate). `credential`
-- holds exactly what the learner already made public on their profile.
--
-- Idempotent: safe to re-run.

create schema if not exists bucket;

create table if not exists bucket.academy_credentials (
  id                uuid        primary key,
  user_id           uuid        not null references auth.users (id) on delete cascade,
  handle            text        not null,
  jwt               text        not null,            -- the signed VC-JWT (EdDSA)
  credential        jsonb       not null,            -- the unsigned OB3 VC JSON
  issued_at         timestamptz not null default now(),
  revoked_at        timestamptz,                     -- null = live; set = revoked
  revocation_reason text
);

-- Fast "all my credentials" reads, newest first.
create index if not exists academy_credentials_user_idx
  on bucket.academy_credentials (user_id, issued_at desc);

-- Fast handle lookups (verify cross-check, profile surfacing).
create index if not exists academy_credentials_handle_idx
  on bucket.academy_credentials (handle);

-- RLS: a signed-in user only ever touches their own rows. The API route also
-- enforces this in application code (service-role bypasses RLS) — defense in
-- depth. Public reads of a single credential go through the route, not RLS.
alter table bucket.academy_credentials enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'bucket' and tablename = 'academy_credentials'
      and policyname = 'own_select'
  ) then
    create policy own_select on bucket.academy_credentials
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'bucket' and tablename = 'academy_credentials'
      and policyname = 'own_insert'
  ) then
    create policy own_insert on bucket.academy_credentials
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'bucket' and tablename = 'academy_credentials'
      and policyname = 'own_update'
  ) then
    create policy own_update on bucket.academy_credentials
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'bucket' and tablename = 'academy_credentials'
      and policyname = 'own_delete'
  ) then
    create policy own_delete on bucket.academy_credentials
      for delete using (auth.uid() = user_id);
  end if;
end $$;
