create table if not exists graph.llm_usage (
  subject text not null check (length(subject) between 1 and 64),
  route   text not null check (route in ('tutor', 'agent', 'all')),
  day     date not null,
  count   int  not null default 0 check (count >= 0),
  primary key (subject, route, day)
);

alter table graph.llm_usage enable row level security;
alter table graph.llm_usage force row level security;

revoke all on graph.llm_usage from public, anon, authenticated;
grant select, insert, update on graph.llm_usage to service_role;

create or replace function graph.llm_usage_hit(p_subject text, p_route text)
returns int
language sql
security invoker
set search_path = ''
as $$
  insert into graph.llm_usage as u (subject, route, day, count)
  values (p_subject, p_route, (pg_catalog.now() at time zone 'utc')::date, 1)
  on conflict (subject, route, day) do update set count = u.count + 1
  returning u.count;
$$;

revoke all on function graph.llm_usage_hit(text, text) from public, anon, authenticated;
grant execute on function graph.llm_usage_hit(text, text) to service_role;
