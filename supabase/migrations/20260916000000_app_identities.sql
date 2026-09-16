-- One account per person (docs/ARCHITECTURE.md "Product", docs/PROBLEM-REGISTER.md PR-004 and PR-056).
-- app.identities is keyed on auth.users.id and carries the identity facts the
-- site reads on every request: a public handle, an optional linked wallet, a
-- display name. Roles stay where they live (graph.class_members, the reviewer
-- allowlist); this table is the join point for all of them.

create schema if not exists app;

create table if not exists app.identities (
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

create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'identities_touch_updated_at') then
    create trigger identities_touch_updated_at before update on app.identities
      for each row execute function app.touch_updated_at();
  end if;
end $$;

-- Every new auth user gets an identity row, so the site never has to
-- special-case a missing one.
create or replace function app.handle_new_user() returns trigger language plpgsql security definer set search_path = app as $$
begin
  insert into app.identities (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_identity') then
    create trigger on_auth_user_created_identity after insert on auth.users
      for each row execute function app.handle_new_user();
  end if;
end $$;

-- Backfill for users who signed up before this migration.
insert into app.identities (user_id)
  select id from auth.users
  on conflict (user_id) do nothing;

alter table app.identities enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'app' and tablename = 'identities' and policyname = 'own_select') then
    create policy own_select on app.identities for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'app' and tablename = 'identities' and policyname = 'own_update') then
    create policy own_update on app.identities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- The `app` schema stays out of PostgREST's exposed list; the site reaches it
-- through the service-role client in src/lib/auth/identity.ts.
