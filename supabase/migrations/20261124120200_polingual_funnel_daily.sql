create index if not exists polingual_web_events_at on public.polingual_web_events (at);

create or replace function public.polingual_funnel_daily(p_since timestamptz)
returns table (day date, source text, visits bigint, signup bigint, trial bigint, paid bigint)
language sql
stable
security definer
set search_path = public
as $$
  with first_touch as (
    select distinct on (visitor) visitor, coalesce(nullif(trim(utm_source), ''), 'direct') as source
    from public.polingual_web_events
    where at >= p_since
    order by visitor, at
  ),
  steps as (
    select e.visitor,
           (e.at at time zone 'utc')::date as day,
           f.source,
           case e.name
             when 'page_view' then 'visits'
             when 'landing_view' then 'visits'
             when 'signup' then 'signup'
             when 'trial_start' then 'trial'
             when 'paid' then 'paid'
           end as step
    from public.polingual_web_events e
    join first_touch f on f.visitor = e.visitor
    where e.at >= p_since
      and e.name in ('page_view', 'landing_view', 'signup', 'trial_start', 'paid')
  )
  select day, source,
         count(distinct visitor) filter (where step = 'visits'),
         count(distinct visitor) filter (where step = 'signup'),
         count(distinct visitor) filter (where step = 'trial'),
         count(distinct visitor) filter (where step = 'paid')
  from steps
  group by grouping sets ((day), (source), ())
  order by day desc nulls last, source nulls last;
$$;

revoke all on function public.polingual_funnel_daily(timestamptz) from public, anon, authenticated;
grant execute on function public.polingual_funnel_daily(timestamptz) to service_role;
