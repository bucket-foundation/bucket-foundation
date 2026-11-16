create schema if not exists polingual;

create table if not exists polingual.founding_codes (
  code text primary key,
  email text unique,
  claimed_at timestamptz,
  sent_at timestamptz
);

create table if not exists polingual.founding_attempts (
  ip_hash text not null,
  at timestamptz not null default now()
);

create index if not exists founding_attempts_ip_at on polingual.founding_attempts (ip_hash, at);

alter table polingual.founding_codes enable row level security;
alter table polingual.founding_attempts enable row level security;

drop function if exists polingual.claim_founding_code(text);

create or replace function polingual.claim_founding_code(p_email text, p_ip_hash text, p_ip_limit int default 3)
returns table (code text, outcome text, spots_left bigint)
language plpgsql
security definer
set search_path = polingual
as $$
declare
  v_code text;
  v_sent timestamptz;
  v_outcome text;
begin
  perform pg_advisory_xact_lock(hashtext('founding:' || p_email));
  select f.code, f.sent_at into v_code, v_sent from founding_codes f where f.email = p_email;
  if v_code is not null then
    if v_sent is null or v_sent < now() - interval '10 minutes' then
      update founding_codes f set sent_at = now() where f.code = v_code;
      v_outcome := 'resend';
    else
      v_code := null;
      v_outcome := 'recent';
    end if;
  else
    perform pg_advisory_xact_lock(hashtext('founding-ip:' || p_ip_hash));
    delete from founding_attempts a where a.at < now() - interval '1 day';
    if (select count(*) from founding_attempts a where a.ip_hash = p_ip_hash and a.at > now() - interval '1 day') >= p_ip_limit then
      v_outcome := 'ip-limit';
    else
      update founding_codes f set email = p_email, claimed_at = now(), sent_at = now()
      where f.code = (select c.code from founding_codes c where c.email is null order by c.code limit 1 for update skip locked)
      returning f.code into v_code;
      if v_code is null then
        v_outcome := 'full';
      else
        insert into founding_attempts (ip_hash) values (p_ip_hash);
        v_outcome := 'claimed';
      end if;
    end if;
  end if;
  return query select v_code, v_outcome, (select count(*) from founding_codes c where c.email is null);
end;
$$;

create or replace function polingual.founding_spots()
returns table (total bigint, spots_left bigint)
language sql
security definer
set search_path = polingual
as $$
  select count(*), count(*) filter (where email is null) from founding_codes;
$$;

create table if not exists polingual.founding_families (
  email text primary key,
  address text not null,
  token_hash text not null unique,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  confirmed_at timestamptz
);

alter table polingual.founding_families enable row level security;

create or replace function polingual.purge_founding_pending(p_days int default 7)
returns bigint
language sql
security definer
set search_path = polingual
as $$
  with gone as (
    delete from founding_families f
    where f.confirmed_at is null and coalesce(f.sent_at, f.claimed_at) < now() - make_interval(days => p_days)
    returning 1
  )
  select count(*) from gone;
$$;

create or replace function polingual.claim_founding_family(p_email text, p_address text, p_token_hash text, p_ip_hash text, p_ip_limit int default 3, p_cap int default 500)
returns table (outcome text, spots_left bigint)
language plpgsql
security definer
set search_path = polingual
as $$
declare
  v_sent timestamptz;
  v_confirmed timestamptz;
  v_found boolean;
  v_outcome text;
begin
  perform pg_advisory_xact_lock(hashtext('founding-family-cap'));
  perform purge_founding_pending();
  select true, f.sent_at, f.confirmed_at into v_found, v_sent, v_confirmed from founding_families f where f.email = p_email;
  if (select count(*) from founding_families f where f.confirmed_at is not null) >= p_cap then
    v_outcome := 'full';
  elsif v_found and v_sent is not null and v_sent >= now() - interval '10 minutes' then
    v_outcome := 'recent';
  elsif v_confirmed is not null then
    update founding_families f set sent_at = now() where f.email = p_email;
    v_outcome := 'confirmed';
  elsif v_found then
    update founding_families f set sent_at = now(), token_hash = p_token_hash, address = p_address where f.email = p_email;
    v_outcome := 'resend';
  else
    delete from founding_attempts a where a.at < now() - interval '1 day';
    if (select count(*) from founding_attempts a where a.ip_hash = p_ip_hash and a.at > now() - interval '1 day') >= p_ip_limit then
      v_outcome := 'ip-limit';
    else
      insert into founding_families (email, address, token_hash, sent_at) values (p_email, p_address, p_token_hash, now());
      insert into founding_attempts (ip_hash) values (p_ip_hash);
      v_outcome := 'pending';
    end if;
  end if;
  return query select v_outcome, greatest(p_cap - (select count(*) from founding_families f where f.confirmed_at is not null), 0);
end;
$$;

create or replace function polingual.confirm_founding_family(p_token_hash text, p_cap int default 500)
returns table (outcome text, address text, spots_left bigint)
language plpgsql
security definer
set search_path = polingual
as $$
declare
  v_email text;
  v_address text;
  v_confirmed timestamptz;
  v_outcome text;
begin
  perform pg_advisory_xact_lock(hashtext('founding-family-cap'));
  perform purge_founding_pending();
  select f.email, f.address, f.confirmed_at into v_email, v_address, v_confirmed from founding_families f where f.token_hash = p_token_hash;
  if v_email is null then
    v_outcome := 'invalid';
  elsif v_confirmed is not null then
    v_outcome := 'already';
  elsif (select count(*) from founding_families f where f.confirmed_at is not null) >= p_cap then
    v_outcome := 'full';
  else
    update founding_families f set confirmed_at = now() where f.email = v_email;
    v_outcome := 'confirmed';
  end if;
  return query select v_outcome, v_address, greatest(p_cap - (select count(*) from founding_families f where f.confirmed_at is not null), 0);
end;
$$;

create or replace function polingual.founding_family_spots(p_cap int default 500)
returns table (total bigint, spots_left bigint)
language sql
security definer
set search_path = polingual
as $$
  select p_cap::bigint, greatest(p_cap - count(*) filter (where confirmed_at is not null), 0) from founding_families;
$$;

create or replace function polingual.forget_founding_email(p_email text)
returns void
language sql
security definer
set search_path = polingual
as $$
  update founding_codes set email = 'forgotten:' || md5(email), sent_at = null where email = p_email;
  delete from founding_families where email = p_email or address = p_email;
$$;

revoke all on polingual.founding_codes, polingual.founding_attempts, polingual.founding_families from public, anon, authenticated;
revoke all on function polingual.claim_founding_code(text, text, int) from public, anon, authenticated;
revoke all on function polingual.founding_spots() from public, anon, authenticated;
revoke all on function polingual.forget_founding_email(text) from public, anon, authenticated;
grant execute on function polingual.claim_founding_code(text, text, int) to service_role;
grant execute on function polingual.founding_spots() to service_role;
grant execute on function polingual.forget_founding_email(text) to service_role;
revoke all on function polingual.claim_founding_family(text, text, text, text, int, int) from public, anon, authenticated;
revoke all on function polingual.confirm_founding_family(text, int) from public, anon, authenticated;
revoke all on function polingual.purge_founding_pending(int) from public, anon, authenticated;
revoke all on function polingual.founding_family_spots(int) from public, anon, authenticated;
grant execute on function polingual.claim_founding_family(text, text, text, text, int, int) to service_role;
grant execute on function polingual.confirm_founding_family(text, int) to service_role;
grant execute on function polingual.purge_founding_pending(int) to service_role;
grant execute on function polingual.founding_family_spots(int) to service_role;
