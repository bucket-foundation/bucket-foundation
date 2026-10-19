alter table bucket.academy_progress add column if not exists fold_key text;
alter table bucket.academy_review_log add column if not exists fold_note text check (fold_note is null or length(fold_note) <= 200);

drop function if exists bucket.write_progress_fold(uuid, text, jsonb, bigint);

create or replace function bucket.write_progress_fold(p_user uuid, p_branch text, p_data jsonb, p_seq bigint, p_fold_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  insert into bucket.academy_progress as p (user_id, branch, data, log_seq, fold_key)
  values (p_user, p_branch, p_data, p_seq, p_fold_key)
  on conflict (user_id, branch) do update
    set data = excluded.data, log_seq = excluded.log_seq, fold_key = excluded.fold_key
    where p.log_seq is null or p.log_seq <= excluded.log_seq;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function bucket.note_fold_skips(p_user uuid, p_branch text, p_ids uuid[], p_note text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  update bucket.academy_review_log set fold_note = left(p_note, 200)
   where user_id = p_user and branch = p_branch and review_id = any(p_ids) and fold_note is distinct from left(p_note, 200);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function bucket.write_progress_fold(uuid, text, jsonb, bigint, text) from public, anon, authenticated;
revoke all on function bucket.note_fold_skips(uuid, text, uuid[], text) from public, anon, authenticated;
grant execute on function bucket.write_progress_fold(uuid, text, jsonb, bigint, text) to service_role;
grant execute on function bucket.note_fold_skips(uuid, text, uuid[], text) to service_role;
