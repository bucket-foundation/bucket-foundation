alter table bucket.apple_revoke_pending add column if not exists first_credential_error_at timestamptz;

create or replace function bucket.apple_revoke_pending_touch(p_id bigint, p_reason text)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  update bucket.apple_revoke_pending
     set last_error = left(p_reason, 200), first_credential_error_at = coalesce(first_credential_error_at, now()), updated_at = now()
   where id = p_id
  returning first_credential_error_at;
$$;

create or replace function bucket.apple_revoke_pending_requeue()
returns integer
language sql
security invoker
set search_path = ''
as $$
  with r as (
    update bucket.apple_revoke_pending
       set status = 'pending', first_credential_error_at = null, updated_at = now()
     where status = 'failed' and last_error like '%invalid_client'
    returning 1
  )
  select count(*)::integer from r;
$$;

revoke all on function bucket.apple_revoke_pending_touch(bigint, text) from public, anon, authenticated;
revoke all on function bucket.apple_revoke_pending_requeue() from public, anon, authenticated;
grant execute on function bucket.apple_revoke_pending_touch(bigint, text) to service_role;
grant execute on function bucket.apple_revoke_pending_requeue() to service_role;
