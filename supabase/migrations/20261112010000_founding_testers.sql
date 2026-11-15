create table if not exists bucket.app_config (
  key   text primary key,
  value text
);

alter table bucket.app_config enable row level security;
alter table bucket.app_config force row level security;

revoke all on bucket.app_config from public, anon, authenticated;
grant select, insert, update, delete on bucket.app_config to service_role;

insert into bucket.app_config (key, value) values ('founding_cutoff', null)
on conflict (key) do nothing;

create table if not exists bucket.founding_exclude (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table bucket.founding_exclude enable row level security;
alter table bucket.founding_exclude force row level security;

revoke all on bucket.founding_exclude from public, anon, authenticated;
grant select, insert, update, delete on bucket.founding_exclude to service_role;

insert into bucket.founding_exclude (user_id)
select u.id from auth.users u where u.email ilike 'appreview%@bucket.foundation'
on conflict (user_id) do nothing;

create or replace function bucket.is_founding_tester(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from bucket.beta_testers t
    join auth.users u on u.id = t.user_id
    join bucket.app_config c on c.key = 'founding_cutoff'
    where t.user_id = p_user
      and nullif(btrim(c.value), '') is not null
      and u.created_at < nullif(btrim(c.value), '')::timestamptz
      and not exists (select 1 from bucket.founding_exclude x where x.user_id = p_user)
  );
$$;

revoke all on function bucket.is_founding_tester(uuid) from public, anon, authenticated;
grant execute on function bucket.is_founding_tester(uuid) to service_role;
