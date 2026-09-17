-- One account per person (docs/AUTH.md; docs/PROBLEM-REGISTER.md PR-004 and PR-056).
-- bucket.identities is keyed on auth.users.id and carries the identity facts
-- the site reads on every request: a public handle, an optional linked
-- wallet, a display name. Roles stay where they live (graph.class_members,
-- the reviewer allowlist); this table is the join point for all of them.
--
-- The Supabase instance is shared by several AGFarms ventures, so the table
-- lives in Bucket's own private `bucket` schema (beside academy_progress)
-- and there is no trigger on auth.users: the site creates a row on a
-- person's first read (src/lib/auth/identity.ts getIdentity), so only
-- Bucket users ever get one.

create schema if not exists bucket;

create table if not exists bucket.identities (
  user_id       uuid        primary key references auth.users (id) on delete cascade,
  handle        text        unique,
  display_name  text,
  wallet        text        unique,
  wallet_chain  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint identities_handle_format check (handle is null or handle ~ '^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,23}$'),
  constraint identities_wallet_format check (wallet is null or wallet ~ '^0x[0-9a-fA-F]{40}$')
);

create or replace function bucket.identities_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'identities_touch_updated_at') then
    create trigger identities_touch_updated_at before update on bucket.identities
      for each row execute function bucket.identities_touch_updated_at();
  end if;
end $$;

alter table bucket.identities enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'identities' and policyname = 'own_select') then
    create policy own_select on bucket.identities for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'identities' and policyname = 'own_update') then
    create policy own_update on bucket.identities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Reached through the service-role client in src/lib/auth/identity.ts;
-- the `bucket` schema keeps its grants closed to anon and authenticated.
