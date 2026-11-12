create or replace function bucket.beta_display_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(coalesce(
    nullif(btrim(i.display_name), ''),
    nullif(btrim(i.handle), ''),
    case when u.email is null or u.email ilike '%privaterelay.appleid.com' then null
         else nullif(initcap(regexp_replace(split_part(split_part(u.email, '@', 1), '.', 1), '[^A-Za-z]', '', 'g')), '') end,
    'Tester ' || (select count(*) from auth.users o where o.created_at <= u.created_at)),
    40)
  from auth.users u
  left join bucket.identities i on i.user_id = u.id
  where u.id = p_user;
$$;

revoke all on function bucket.beta_display_name(uuid) from public, anon, authenticated;

update bucket.group_members m
set display_name = bucket.beta_display_name(m.user_id)
where m.group_id = bucket.beta_group_id() and m.display_name = 'Learner';
