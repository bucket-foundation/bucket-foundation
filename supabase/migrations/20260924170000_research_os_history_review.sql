alter table graph.silver_items add column if not exists reviewed_by uuid references auth.users (id) on delete set null;
alter table graph.silver_items add column if not exists reviewed_at timestamptz;
alter table graph.silver_items add column if not exists review_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'silver_items_review_reason') then
    alter table graph.silver_items add constraint silver_items_review_reason check (review_reason is null or length(review_reason) between 1 and 500);
  end if;
end $$;

create or replace function graph.reject_history_silver(
  p_silver   uuid,
  p_reviewer uuid,
  p_reason   text
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_item graph.silver_items;
begin
  if p_silver is null or p_reviewer is null or coalesce(btrim(p_reason), '') = '' then
    raise exception 'reject_history_silver: a silver item, a reviewer and a reason are required' using errcode = '22023';
  end if;
  select * into v_item from graph.silver_items where id = p_silver for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'silver_not_found');
  end if;
  if v_item.parser <> 'history-import' then
    return jsonb_build_object('ok', false, 'error', 'not_history');
  end if;
  if v_item.status = 'rejected' then
    return jsonb_build_object('ok', true, 'changed', false);
  end if;
  if v_item.status not in ('candidate', 'promoted') or exists (select 1 from graph.factoids f where f.silver_item_id = p_silver) then
    return jsonb_build_object('ok', false, 'error', 'already_decided', 'status', v_item.status);
  end if;
  update graph.silver_items
    set status = 'rejected', reviewed_by = p_reviewer, reviewed_at = now(), review_reason = left(btrim(p_reason), 500)
    where id = p_silver;
  return jsonb_build_object('ok', true, 'changed', true);
end;
$$;

revoke all on function graph.reject_history_silver(uuid, uuid, text) from public, anon, authenticated;
grant execute on function graph.reject_history_silver(uuid, uuid, text) to service_role;
