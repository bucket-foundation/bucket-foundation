-- The site reaches the private `graph` and `bucket` schemas through a
-- service-role client (src/lib/research-os/db.ts, src/lib/auth/identity.ts,
-- the Academy routes). On hosted and local Supabase the service_role role
-- needs schema usage and table privileges on custom schemas; RLS is
-- bypassed by that role, and the per-user boundary is enforced in code.
-- anon and authenticated get nothing here, so PostgREST exposes the
-- schemas to the service role alone. Idempotent.

do $$
declare s text;
begin
  foreach s in array array['graph', 'bucket'] loop
    execute format('create schema if not exists %I', s);
    execute format('grant usage on schema %I to service_role', s);
    execute format('grant all on all tables in schema %I to service_role', s);
    execute format('grant all on all sequences in schema %I to service_role', s);
    execute format('grant all on all functions in schema %I to service_role', s);
    execute format('alter default privileges in schema %I grant all on tables to service_role', s);
    execute format('alter default privileges in schema %I grant all on sequences to service_role', s);
    execute format('alter default privileges in schema %I grant all on functions to service_role', s);
  end loop;
end $$;
