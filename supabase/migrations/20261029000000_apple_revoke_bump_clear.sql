create or replace function bucket.apple_revoke_pending_bump(p_id bigint, p_reason text, p_failed boolean)
returns void
language sql
security invoker
set search_path = ''
as $$
  update bucket.apple_revoke_pending
     set attempts = attempts + 1,
         last_error = left(p_reason, 200),
         status = case when p_failed then 'failed' else status end,
         first_credential_error_at = case when p_reason like '%invalid_client' then first_credential_error_at else null end,
         updated_at = now()
   where id = p_id;
$$;
