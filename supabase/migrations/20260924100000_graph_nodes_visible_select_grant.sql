create or replace function graph.has_live_grant(node uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from graph.node_grants g
    where g.node_id = node
      and g.grantee_id = auth.uid()
      and (g.expires_at is null or g.expires_at > now())
  );
$$;

revoke execute on function graph.has_live_grant(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function graph.has_live_grant(uuid) to authenticated;
  end if;
end $$;

drop policy if exists visible_select on graph.nodes;
create policy visible_select on graph.nodes for select using (
  visibility = 'public'
  or owner_id = auth.uid()
  or graph.has_live_grant(id)
);
