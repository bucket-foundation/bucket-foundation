create or replace function bucket.auth_user_by_email(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', u.id, 'email', u.email, 'app_metadata', coalesce(u.raw_app_meta_data, '{}'::jsonb))
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  order by u.created_at
  limit 1
$$;

revoke all on function bucket.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function bucket.auth_user_by_email(text) to service_role;

create or replace function bucket.bind_google_sub(p_user uuid, p_sub text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_sub text;
begin
  select u.raw_app_meta_data ->> 'google_sub' into v_sub from auth.users u where u.id = p_user for update;
  if not found then return null; end if;
  if v_sub is null or v_sub = '' then
    update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('google_sub', p_sub) where id = p_user;
    v_sub := p_sub;
  end if;
  return v_sub;
end $$;

revoke all on function bucket.bind_google_sub(uuid, text) from public, anon, authenticated;
grant execute on function bucket.bind_google_sub(uuid, text) to service_role;
