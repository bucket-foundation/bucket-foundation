-- Waitlist signups, invites, What's new documents and site marks move from Vercel Blob
-- to the private `bucket` schema.
--
-- /api/capture, /api/waitlist, invites, What's new, the download routes and the admin
-- views read and write these tables through a service-role client. `prefix` keeps the Blob folder layout
-- (waitlist/, waitlist/downloads/, waitlist-preview/...) and `key` is the sha256 of the
-- email or mark name. No policies: only the service role touches these rows.
--
-- Idempotent: safe to re-run.

create schema if not exists bucket;

create table if not exists bucket.waitlist_signups (
  prefix     text        not null,
  key        text        not null,
  entry      jsonb       not null,
  version    bigint      not null default 1,
  updated_at timestamptz not null default now(),
  primary key (prefix, key)
);

alter table bucket.waitlist_signups add column if not exists version bigint not null default 1;

create table if not exists bucket.site_marks (
  prefix     text             not null,
  key        text             not null,
  value      double precision not null,
  updated_at timestamptz      not null default now(),
  primary key (prefix, key)
);

create table if not exists bucket.site_docs (
  prefix     text        not null,
  name       text        not null,
  body       text        not null,
  updated_at timestamptz not null default now(),
  primary key (prefix, name)
);

create index if not exists site_docs_name_idx
  on bucket.site_docs (prefix, name text_pattern_ops);

create index if not exists site_marks_age_idx
  on bucket.site_marks (prefix, updated_at);

alter table bucket.waitlist_signups enable row level security;
alter table bucket.site_marks enable row level security;
alter table bucket.site_docs enable row level security;

revoke all on bucket.waitlist_signups from anon, authenticated;
revoke all on bucket.site_marks from anon, authenticated;
revoke all on bucket.site_docs from anon, authenticated;

create or replace function bucket.waitlist_cas(p_prefix text, p_key text, p_entry jsonb, p_version bigint)
returns boolean language plpgsql security definer set search_path = bucket as $$
begin
  if p_version is null then
    insert into bucket.waitlist_signups (prefix, key, entry, version, updated_at)
    values (p_prefix, p_key, p_entry, 1, now())
    on conflict (prefix, key) do nothing;
    return found;
  end if;
  update bucket.waitlist_signups
    set entry = p_entry, version = version + 1, updated_at = now()
    where prefix = p_prefix and key = p_key and version = p_version;
  return found;
end $$;

revoke execute on function bucket.waitlist_cas(text, text, jsonb, bigint) from public, anon, authenticated;
grant execute on function bucket.waitlist_cas(text, text, jsonb, bigint) to service_role;

create or replace function bucket.site_mark_bump(p_prefix text, p_key text)
returns double precision language sql security definer set search_path = bucket as $$
  insert into bucket.site_marks (prefix, key, value, updated_at)
  values (p_prefix, p_key, 1, now())
  on conflict (prefix, key) do update
    set value = bucket.site_marks.value + 1, updated_at = now()
  returning value;
$$;

revoke execute on function bucket.site_mark_bump(text, text) from public, anon, authenticated;
grant execute on function bucket.site_mark_bump(text, text) to service_role;
