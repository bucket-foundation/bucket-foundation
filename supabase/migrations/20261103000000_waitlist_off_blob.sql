-- Waitlist signups and site marks move from Vercel Blob to the private `bucket` schema.
--
-- /api/capture, /api/waitlist, the download routes and the admin views read and write
-- these tables through a service-role client. `prefix` keeps the Blob folder layout
-- (waitlist/, waitlist/downloads/, waitlist-preview/...) and `key` is the sha256 of the
-- email or mark name. No policies: only the service role touches these rows.
--
-- Idempotent: safe to re-run.

create schema if not exists bucket;

create table if not exists bucket.waitlist_signups (
  prefix     text        not null,
  key        text        not null,
  entry      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (prefix, key)
);

create table if not exists bucket.site_marks (
  prefix     text             not null,
  key        text             not null,
  value      double precision not null,
  updated_at timestamptz      not null default now(),
  primary key (prefix, key)
);

create index if not exists site_marks_age_idx
  on bucket.site_marks (prefix, updated_at);

alter table bucket.waitlist_signups enable row level security;
alter table bucket.site_marks enable row level security;

revoke all on bucket.waitlist_signups from anon, authenticated;
revoke all on bucket.site_marks from anon, authenticated;

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
