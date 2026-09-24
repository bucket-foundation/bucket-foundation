create or replace function graph.history_period(p_year integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_year is null then null
    when p_year < -3000 then 'before -3000'
    when p_year <= -1001 then '-3000 to -1001'
    when p_year <= -1 then '-1000 to -1'
    when p_year <= 999 then '0 to 999'
    when p_year <= 1499 then '1000 to 1499'
    when p_year <= 2100 then '1500 to 2100'
    else null
  end;
$$;

drop materialized view if exists graph.history_coverage;
drop view if exists graph.history_anchors;

create view graph.history_anchors
with (security_invoker = true)
as
with ranked as (
  select
    n.id as subject_id,
    case n.kind when 'figure' then 'human' when 'site' then 'site' else 'event' end as kind,
    f.id as factoid_id,
    f.role,
    f.start_min,
    f.end_max,
    f.precision,
    f.place_id,
    s.source_id,
    row_number() over (
      partition by n.id
      order by case f.role when 'born' then 1 when 'occupied' then 1 when 'founded' then 2 when 'occurred' then 1 else 9 end, f.id
    ) as rank
  from graph.nodes n
  join graph.factoids f on f.subject_id = n.id and f.status = 'active' and f.preferred
  join graph.silver_items s on s.id = f.silver_item_id
  where n.superseded_by is null
    and ((n.kind = 'figure' and f.role = 'born')
      or (n.kind = 'site' and f.role in ('occupied', 'founded'))
      or (n.kind = 'event' and f.role = 'occurred'))
)
select
  r.subject_id,
  r.kind,
  r.factoid_id,
  r.role,
  r.start_min,
  r.end_max,
  r.precision,
  r.source_id,
  floor((r.start_min::numeric + r.end_max::numeric) / 2)::integer as midpoint,
  case
    when graph.history_period(r.start_min) is not null and graph.history_period(r.start_min) = graph.history_period(r.end_max)
      then graph.history_period(r.start_min)
    else 'unresolved'
  end as period,
  coalesce(
    case when p.status = 'active' then p.region end,
    (select sp.region from graph.places sp where sp.site_node_id = r.subject_id and sp.status = 'active' limit 1),
    'unplaced'
  ) as region,
  exists (
    select 1 from graph.factoid_conflicts c where c.subject_id = r.subject_id and c.role = r.role
  ) as conflicted
from ranked r
left join graph.places p on p.id = r.place_id
where r.rank = 1;

create materialized view graph.history_coverage as
select
  kind,
  region,
  period,
  count(*)::bigint as subjects,
  count(distinct source_id)::bigint as sources,
  count(*) filter (where conflicted)::bigint as conflicted,
  count(*) filter (where precision in ('day', 'month', 'year'))::bigint as year_or_finer
from graph.history_anchors
group by kind, region, period;

create unique index history_coverage_cell_uidx on graph.history_coverage (kind, region, period);

revoke all on graph.history_anchors from anon, authenticated;
revoke all on graph.history_coverage from anon, authenticated;
grant select on graph.history_anchors to service_role;
grant select on graph.history_coverage to service_role;

create or replace function graph.refresh_history_coverage()
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
begin
  refresh materialized view concurrently graph.history_coverage;
  return jsonb_build_object('cells', (select count(*) from graph.history_coverage), 'subjects', (select coalesce(sum(subjects), 0) from graph.history_coverage));
end;
$$;

revoke all on function graph.refresh_history_coverage() from public, anon, authenticated;
grant execute on function graph.refresh_history_coverage() to service_role;
revoke all on function graph.history_period(integer) from public, anon, authenticated;
grant execute on function graph.history_period(integer) to service_role;
