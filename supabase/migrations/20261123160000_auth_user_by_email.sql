create or replace function bucket.auth_user_by_email(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', u.id, 'email', u.email, 'app_metadata', coalesce(u.raw_app_meta_data, '{}'::jsonb))
  from auth.users u
  where u.email = lower(trim(p_email))
  order by u.created_at
  limit 1
$$;

revoke all on function bucket.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function bucket.auth_user_by_email(text) to service_role;
