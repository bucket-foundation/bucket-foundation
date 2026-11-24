alter table public.polingual_web_events drop constraint if exists polingual_web_events_name_check;
alter table public.polingual_web_events add constraint polingual_web_events_name_check check (name in (
  'page_view', 'beta_open', 'beta_signup', 'founding_claim', 'testflight_open', 'share',
  'landing_view', 'signup', 'first_lesson', 'paywall_view', 'trial_start', 'paid'
));

create index if not exists polingual_web_events_visitor_name on public.polingual_web_events (visitor, name);

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
    and e.name in ('page_view', 'beta_open', 'beta_signup', 'founding_claim', 'testflight_open', 'share',
                   'landing_view', 'signup', 'first_lesson', 'paywall_view', 'trial_start', 'paid');
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.polingual_funnel_report(p_since timestamptz)
returns table (source text, landing bigint, signup bigint, first_lesson bigint, paywall_view bigint, trial_start bigint, paid bigint)
language sql
stable
security definer
set search_path = public
as $$
  with first_touch as (
    select distinct on (visitor) visitor, coalesce(utm_source, 'direct') as source
    from public.polingual_web_events
    where at >= p_since
    order by visitor, at
  )
  select f.source,
         count(distinct e.visitor) filter (where e.name = 'landing_view'),
         count(distinct e.visitor) filter (where e.name = 'signup'),
         count(distinct e.visitor) filter (where e.name = 'first_lesson'),
         count(distinct e.visitor) filter (where e.name = 'paywall_view'),
         count(distinct e.visitor) filter (where e.name = 'trial_start'),
         count(distinct e.visitor) filter (where e.name = 'paid')
  from first_touch f
  join public.polingual_web_events e on e.visitor = f.visitor and e.at >= p_since
  group by 1
  order by 2 desc;
$$;

revoke all on function public.record_polingual_web_events(jsonb, text) from public, anon, authenticated;
revoke all on function public.polingual_funnel_report(timestamptz) from public, anon, authenticated;
grant execute on function public.record_polingual_web_events(jsonb, text) to service_role;
grant execute on function public.polingual_funnel_report(timestamptz) to service_role;
