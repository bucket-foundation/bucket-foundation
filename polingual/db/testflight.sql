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
set search_path = polingual
as $$
begin
  perform pg_advisory_xact_lock(hashtext('testflight-attempts'));
  delete from testflight_attempts a where a.at < now() - interval '1 day';
  if (select count(*) from testflight_attempts a where a.at > now() - interval '1 hour') >= p_global_limit
    or (select count(*) from testflight_attempts a where a.ip_hash = p_ip_hash and a.at > now() - interval '1 hour') >= p_ip_limit
    or (select count(*) from testflight_attempts a where a.email_hash = p_email_hash and a.at > now() - interval '1 day') >= p_email_limit then
    return false;
  end if;
  insert into testflight_attempts (ip_hash, email_hash) values (p_ip_hash, p_email_hash);
  return true;
end;
$$;

revoke all on polingual.testflight_attempts from public, anon, authenticated;
revoke all on function polingual.record_testflight_attempt(text, text, int, int, int) from public, anon, authenticated;
grant execute on function polingual.record_testflight_attempt(text, text, int, int, int) to service_role;
