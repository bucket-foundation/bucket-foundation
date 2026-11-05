create table if not exists public.polingual_web_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  visitor uuid not null,
  name text not null check (name in ('page_view', 'beta_open', 'beta_signup', 'founding_claim', 'testflight_open', 'share')),
  path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_host text,
  lang text,
  country text
);

create index if not exists polingual_web_events_at on public.polingual_web_events (at);
create index if not exists polingual_web_events_name_at on public.polingual_web_events (name, at);

alter table public.polingual_web_events enable row level security;
revoke all on public.polingual_web_events from anon, authenticated;

create or replace function public.record_polingual_web_events(p_events jsonb, p_country text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  insert into public.polingual_web_events (visitor, name, path, utm_source, utm_medium, utm_campaign, referrer_host, lang, country)
  select e.visitor, e.name, left(e.path, 200), left(e.utm_source, 80), left(e.utm_medium, 80), left(e.utm_campaign, 80), left(e.referrer_host, 120), left(e.lang, 8), left(p_country, 2)
  from (select * from jsonb_to_recordset(p_events) as x(visitor uuid, name text, path text, utm_source text, utm_medium text, utm_campaign text, referrer_host text, lang text) limit 20) e
  where e.visitor is not null
    and e.name in ('page_view', 'beta_open', 'beta_signup', 'founding_claim', 'testflight_open', 'share');
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.polingual_web_report(p_since timestamptz)
returns table (source text, visitors bigint, page_views bigint, beta_opens bigint, beta_signups bigint, founding_claims bigint, testflight_opens bigint, shares bigint)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(utm_source, 'direct') as source,
         count(distinct visitor),
         count(*) filter (where name = 'page_view'),
         count(*) filter (where name = 'beta_open'),
         count(*) filter (where name = 'beta_signup'),
         count(*) filter (where name = 'founding_claim'),
         count(*) filter (where name = 'testflight_open'),
         count(*) filter (where name = 'share')
  from public.polingual_web_events
  where at >= p_since
  group by 1
  order by 2 desc;
$$;

revoke all on function public.record_polingual_web_events(jsonb, text) from public, anon, authenticated;
revoke all on function public.polingual_web_report(timestamptz) from public, anon, authenticated;
grant execute on function public.record_polingual_web_events(jsonb, text) to service_role;
grant execute on function public.polingual_web_report(timestamptz) to service_role;
