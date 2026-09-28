alter table graph.factoids add column if not exists preferred_by uuid references auth.users (id) on delete set null;
alter table graph.factoids add column if not exists preferred_at timestamptz;
alter table graph.factoids add column if not exists preferred_via text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'factoids_preferred_via') then
    alter table graph.factoids add constraint factoids_preferred_via check (preferred_via is null or preferred_via in ('reviewer', 'history-import'));
  end if;
end $$;

drop function if exists graph.prefer_history_factoid(uuid, text);

create or replace function graph.prefer_history_factoid(
  p_silver   uuid,
  p_role     text,
  p_reviewer uuid,
  p_importer text default null
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_f graph.factoids;
begin
  if p_silver is null or p_role is null then
    raise exception 'prefer_history_factoid: a silver item and a role are required' using errcode = '22023';
  end if;
  if p_reviewer is null and p_importer is distinct from 'history-import' then
    raise exception 'prefer_history_factoid: a reviewer is required' using errcode = '22023';
  end if;
  if p_reviewer is not null and p_importer is not null then
    raise exception 'prefer_history_factoid: a reviewer or an importer, never both' using errcode = '22023';
  end if;
  select * into v_f from graph.factoids where silver_item_id = p_silver and role = p_role for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'factoid_not_found');
  end if;
  if v_f.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;
  if p_importer is not null and not exists (
    select 1 from graph.gold_lineage l
    where l.factoid_id = v_f.id and l.promoted_by = 'importer' and l.importer = p_importer
  ) then
    raise exception 'prefer_history_factoid: % may prefer only a factoid it promoted', p_importer using errcode = '23514';
  end if;
  if v_f.preferred then
    return jsonb_build_object('ok', true, 'changed', false, 'factoid', v_f.id);
  end if;
  perform pg_advisory_xact_lock(hashtext('graph.factoids'), hashtext(v_f.subject_id::text || ' ' || p_role));
  update graph.factoids set preferred = false
    where subject_id = v_f.subject_id and role = p_role and preferred and status = 'active' and id <> v_f.id;
  update graph.factoids
    set preferred = true, preferred_by = p_reviewer, preferred_at = now(), preferred_via = case when p_reviewer is null then p_importer else 'reviewer' end
    where id = v_f.id;
  return jsonb_build_object('ok', true, 'changed', true, 'factoid', v_f.id);
end;
$$;

revoke all on function graph.prefer_history_factoid(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function graph.prefer_history_factoid(uuid, text, uuid, text) to service_role;
