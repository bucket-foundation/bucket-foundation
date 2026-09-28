create or replace view graph.factoid_conflicts
with (security_invoker = true)
as
select
  a.subject_id,
  a.role,
  a.id as factoid_a,
  b.id as factoid_b,
  not (a.span && b.span) as disjoint_spans,
  (a.place_id is not null and b.place_id is not null and a.place_id <> b.place_id) as different_places
from graph.factoids a
join graph.factoids b
  on b.subject_id = a.subject_id and b.role = a.role and a.id < b.id
where a.status = 'active' and b.status = 'active'
  and (
    not (a.span && b.span)
    or (a.place_id is not null and b.place_id is not null and a.place_id <> b.place_id)
  );

create or replace view graph.node_when_where
with (security_invoker = true)
as
select
  f.subject_id,
  f.role,
  f.id as factoid_id,
  f.edtf,
  f.start_year,
  f.end_year,
  f.start_min,
  f.start_max,
  f.end_min,
  f.end_max,
  f.span,
  f.precision,
  f.qualifier,
  f.confidence,
  f.preferred,
  case when p.status = 'active' then p.id end as place_id,
  case when p.status = 'active' then p.lat end as lat,
  case when p.status = 'active' then p.lng end as lng,
  exists (
    select 1 from graph.factoid_conflicts c
    where c.subject_id = f.subject_id and c.role = f.role
  ) as disputed
from graph.factoids f
left join graph.places p on p.id = f.place_id
where f.status = 'active'
  and (
    f.preferred
    or not exists (
      select 1 from graph.factoids o
      where o.subject_id = f.subject_id and o.role = f.role and o.preferred and o.status = 'active'
    )
  );

revoke all on graph.factoid_conflicts from anon, authenticated;
revoke all on graph.node_when_where from anon, authenticated;
grant select on graph.factoid_conflicts to service_role;
grant select on graph.node_when_where to service_role;
