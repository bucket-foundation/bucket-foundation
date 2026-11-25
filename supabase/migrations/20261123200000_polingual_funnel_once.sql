delete from public.polingual_web_events e
using public.polingual_web_events k
where e.name in ('signup', 'first_lesson', 'trial_start', 'paid')
  and k.visitor = e.visitor
  and k.name = e.name
  and (k.at, k.id) < (e.at, e.id);

create unique index if not exists polingual_web_events_once
  on public.polingual_web_events (visitor, name)
  where name in ('signup', 'first_lesson', 'trial_start', 'paid');

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
  select distinct on (e.visitor, e.name, case when e.name in ('signup', 'first_lesson', 'trial_start', 'paid') then 0 else e.ord end)
         e.visitor, e.name, left(e.path, 200), left(e.utm_source, 80), left(e.utm_medium, 80), left(e.utm_campaign, 80), left(e.referrer_host, 120), left(e.lang, 8), left(p_country, 2)
  from (select x.*, row_number() over () as ord from jsonb_to_recordset(p_events) as x(visitor uuid, name text, path text, utm_source text, utm_medium text, utm_campaign text, referrer_host text, lang text) limit 20) e
  where e.visitor is not null
    and e.name in ('page_view', 'beta_open', 'beta_signup', 'founding_claim', 'testflight_open', 'share',
                   'landing_view', 'signup', 'first_lesson', 'paywall_view', 'trial_start', 'paid')
  on conflict (visitor, name) where name in ('signup', 'first_lesson', 'trial_start', 'paid') do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.record_polingual_web_events(jsonb, text) from public, anon, authenticated;
grant execute on function public.record_polingual_web_events(jsonb, text) to service_role;
