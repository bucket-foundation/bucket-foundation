create or replace function bucket.beta_group_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.id
  from bucket.learning_groups g
  join auth.users u on u.id = g.owner_id
  where g.name = 'Beta Testers' and lower(u.email) = 'gianyrox@gmail.com'
  order by g.created_at
  limit 1;
$$;

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
    'Learner'), 40)
  from auth.users u
  left join bucket.identities i on i.user_id = u.id
  where u.id = p_user;
$$;

revoke all on function bucket.beta_group_id() from public, anon, authenticated;
revoke all on function bucket.beta_display_name(uuid) from public, anon, authenticated;

insert into bucket.group_members (group_id, user_id, role, display_name)
select bucket.beta_group_id(), u.id, 'member', bucket.beta_display_name(u.id)
from auth.users u
where bucket.beta_group_id() is not null
order by u.created_at
on conflict (group_id, user_id) do nothing;

create or replace function bucket.enroll_beta_tester()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
begin
  begin
    insert into bucket.beta_testers (user_id, first_app) values (new.id, 'polingual')
    on conflict (user_id) do nothing;
  exception when others then
    raise warning 'beta enroll failed for %: %', new.id, sqlerrm;
  end;
  begin
    v_group := bucket.beta_group_id();
    if v_group is not null then
      insert into bucket.group_members (group_id, user_id, role, display_name)
      values (v_group, new.id, 'member', bucket.beta_display_name(new.id))
      on conflict (group_id, user_id) do nothing;
    end if;
  exception when others then
    raise warning 'beta group join failed for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
