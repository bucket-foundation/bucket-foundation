create schema if not exists polingual;

create table if not exists polingual.testflight_attempts (
  ip_hash text not null,
  email_hash text not null,
  at timestamptz not null default now()
);

create index if not exists testflight_attempts_at on polingual.testflight_attempts (at);
create index if not exists testflight_attempts_ip_at on polingual.testflight_attempts (ip_hash, at);
create index if not exists testflight_attempts_email_at on polingual.testflight_attempts (email_hash, at);

alter table polingual.testflight_attempts enable row level security;

create or replace function polingual.record_testflight_attempt(
  p_ip_hash text,
  p_email_hash text,
  p_ip_limit int default 5,
  p_email_limit int default 2,
  p_global_limit int default 100
)
returns boolean
language plpgsql
security definer
set search_path = polingual, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('testflight-attempts'));
  if (select count(*) from testflight_attempts a where a.at > now() - interval '1 hour') >= p_global_limit
    or (select count(*) from testflight_attempts a where a.ip_hash = p_ip_hash and a.at > now() - interval '1 hour') >= p_ip_limit
    or (select count(*) from testflight_attempts a where a.email_hash = p_email_hash and a.at > now() - interval '1 day') >= p_email_limit then
    return false;
  end if;
  insert into testflight_attempts (ip_hash, email_hash) values (p_ip_hash, p_email_hash);
  return true;
end;
$$;

create or replace function polingual.prune_testflight_attempts()
returns int
language sql
security definer
set search_path = polingual, pg_temp
as $$
  with gone as (delete from testflight_attempts a where a.at < now() - interval '1 day' returning 1)
  select count(*)::int from gone;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('prune-testflight-attempts', '17 * * * *', 'select polingual.prune_testflight_attempts()');
  end if;
end;
$$;

grant usage on schema polingual to service_role;

revoke all on polingual.testflight_attempts from public, anon, authenticated;
revoke all on function polingual.record_testflight_attempt(text, text, int, int, int) from public, anon, authenticated;
grant execute on function polingual.record_testflight_attempt(text, text, int, int, int) to service_role;
revoke all on function polingual.prune_testflight_attempts() from public, anon, authenticated;
grant execute on function polingual.prune_testflight_attempts() to service_role;

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, graph, bucket, polingual';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
