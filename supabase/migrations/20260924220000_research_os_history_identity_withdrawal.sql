create table if not exists graph.withdrawn_factoids (
  factoid_id   uuid        primary key references graph.factoids (id) on delete cascade,
  reason       text        not null,
  withdrawn_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewer_id  uuid        references auth.users (id) on delete set null,
  constraint withdrawn_factoids_reason check (length(reason) between 1 and 500)
);
alter table graph.withdrawn_factoids enable row level security;
revoke all on graph.withdrawn_factoids from anon, authenticated;

create or replace function graph.withdraw_identity_dependents(
  p_node   uuid,
  p_qids   text[],
  p_reason text,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_slug     text;
  v_silver   uuid[];
  v_queued   integer;
  v_factoids integer;
begin
  if p_status not in ('withdrawn', 'rejected') then
    raise exception 'withdraw_identity_dependents: status is withdrawn or rejected' using errcode = '22023';
  end if;
  select slug into v_slug from graph.nodes where id = p_node;
  if v_slug is null or coalesce(cardinality(p_qids), 0) = 0 then
    return jsonb_build_object('silver', 0, 'factoids', 0, 'queued', 0);
  end if;
  select coalesce(array_agg(s.id), '{}') into v_silver
    from graph.silver_items s
    where s.parser = 'history-import' and s.subject = v_slug and s.proposal->>'qid' = any (p_qids)
      and s.status not in ('withdrawn', 'rejected');

  insert into graph.withdrawn_factoids (factoid_id, reason)
    select f.id, left(p_reason, 500) from graph.factoids f
    where f.silver_item_id = any (v_silver) and f.status = 'active'
    on conflict (factoid_id) do nothing;
  get diagnostics v_queued = row_count;

  update graph.factoids set status = 'withdrawn', preferred = false
    where silver_item_id = any (v_silver) and status = 'active';
  get diagnostics v_factoids = row_count;

  update graph.silver_items s
    set status = case when exists (select 1 from graph.factoids f where f.silver_item_id = s.id) then 'withdrawn' else p_status end,
        review_reason = coalesce(s.review_reason, left(p_reason, 500)),
        reviewed_at = coalesce(s.reviewed_at, now())
    where s.id = any (v_silver);

  return jsonb_build_object('silver', cardinality(v_silver), 'factoids', v_factoids, 'queued', v_queued);
end;
$$;

create or replace function graph.node_external_ids_withdraw_dependents()
returns trigger
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
begin
  if old.authority = 'wikidata' then
    perform graph.withdraw_identity_dependents(old.node_id, array[old.external_id], 'the Wikidata link ' || old.external_id || ' was withdrawn', 'withdrawn');
  end if;
  return old;
end;
$$;

drop trigger if exists node_external_ids_withdraw_dependents on graph.node_external_ids;
create trigger node_external_ids_withdraw_dependents
  after delete on graph.node_external_ids
  for each row execute function graph.node_external_ids_withdraw_dependents();

create or replace function graph.decide_external_id(
  p_proposal uuid,
  p_reviewer uuid,
  p_qid      text,
  p_reason   text default null
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_p      graph.external_id_proposals;
  v_owner  uuid;
  v_others text[];
begin
  if p_proposal is null or p_reviewer is null then
    raise exception 'decide_external_id: a proposal and a reviewer are required' using errcode = '22023';
  end if;
  select * into v_p from graph.external_id_proposals where id = p_proposal for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'proposal_not_found');
  end if;
  if v_p.status <> 'pending' then
    return jsonb_build_object('ok', v_p.status in ('approved', 'rejected'), 'changed', false, 'status', v_p.status);
  end if;
  if p_qid is null then
    if coalesce(btrim(p_reason), '') = '' then
      raise exception 'decide_external_id: a rejection needs a reason' using errcode = '22023';
    end if;
    update graph.external_id_proposals
      set status = 'rejected', reviewer_id = p_reviewer, decision_reason = left(btrim(p_reason), 500), decided_at = now()
      where id = p_proposal;
    select coalesce(array_agg(c->>'qid'), '{}') into v_others from jsonb_array_elements(v_p.candidates) c;
    perform graph.withdraw_identity_dependents(v_p.node_id, v_others, 'the Wikidata link was rejected: ' || btrim(p_reason), 'rejected');
    return jsonb_build_object('ok', true, 'changed', true, 'status', 'rejected');
  end if;
  if not exists (select 1 from jsonb_array_elements(v_p.candidates) c where c->>'qid' = p_qid) then
    return jsonb_build_object('ok', false, 'error', 'not_a_candidate');
  end if;
  select node_id into v_owner from graph.node_external_ids where authority = v_p.authority and external_id = p_qid;
  if v_owner is not null and v_owner <> v_p.node_id then
    return jsonb_build_object('ok', false, 'error', 'qid_linked_elsewhere');
  end if;
  insert into graph.node_external_ids (authority, external_id, node_id, source_id, source_revision, reviewed_by, reviewed_at)
    values (v_p.authority, p_qid, v_p.node_id, v_p.source_id, v_p.source_revision, p_reviewer, now())
    on conflict (authority, external_id) do nothing;
  update graph.external_id_proposals
    set status = 'approved', chosen_id = p_qid, reviewer_id = p_reviewer, decision_reason = nullif(btrim(coalesce(p_reason, '')), ''), decided_at = now()
    where id = p_proposal;
  select coalesce(array_agg(c->>'qid'), '{}') into v_others from jsonb_array_elements(v_p.candidates) c where c->>'qid' <> p_qid;
  perform graph.withdraw_identity_dependents(v_p.node_id, v_others, 'another candidate, ' || p_qid || ', was linked', 'rejected');
  return jsonb_build_object('ok', true, 'changed', true, 'status', 'approved', 'qid', p_qid);
end;
$$;

create or replace function graph.withdraw_external_id(
  p_qid      text,
  p_reviewer uuid,
  p_reason   text
) returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_node uuid;
begin
  if p_qid is null or p_reviewer is null or coalesce(btrim(p_reason), '') = '' then
    raise exception 'withdraw_external_id: a QID, a reviewer and a reason are required' using errcode = '22023';
  end if;
  delete from graph.node_external_ids where authority = 'wikidata' and external_id = p_qid returning node_id into v_node;
  if v_node is null then
    return jsonb_build_object('ok', false, 'error', 'link_not_found');
  end if;
  update graph.external_id_proposals
    set status = 'withdrawn', decision_reason = left('withdrawn by a reviewer: ' || btrim(p_reason), 500), reviewer_id = p_reviewer, decided_at = now()
    where node_id = v_node and authority = 'wikidata' and chosen_id = p_qid and status = 'approved';
  return jsonb_build_object('ok', true, 'node', v_node, 'queued', (select count(*) from graph.withdrawn_factoids w join graph.factoids f on f.id = w.factoid_id where f.subject_id = v_node and w.reviewed_at is null));
end;
$$;

create or replace function graph.revive_history_factoids(p_silver uuid[])
returns integer
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  f       graph.factoids;
  revived integer := 0;
begin
  for f in
    select * from graph.factoids
    where silver_item_id = any (p_silver) and status = 'withdrawn'
      and not exists (select 1 from graph.withdrawn_factoids w where w.factoid_id = factoids.id and w.reviewed_at is null)
    order by created_at, id
    for update
  loop
    update graph.factoids set
      status = 'active',
      preferred = f.preferred and not exists (
        select 1 from graph.factoids o
        where o.subject_id = f.subject_id and o.role = f.role and o.preferred and o.status = 'active' and o.id <> f.id
      )
    where id = f.id;
    revived := revived + 1;
  end loop;
  update graph.silver_items s set status = 'withdrawn'
    where s.id = any (p_silver)
      and exists (select 1 from graph.factoids fq join graph.withdrawn_factoids w on w.factoid_id = fq.id where fq.silver_item_id = s.id and w.reviewed_at is null);
  return revived;
end;
$$;

create or replace function graph.tag_identity_silver()
returns integer
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_tagged integer;
begin
  update graph.silver_items s
    set proposal = s.proposal || jsonb_build_object('identity_proposal_id', p.id)
    from graph.external_id_proposals p
    join graph.nodes n on n.id = p.node_id
    where s.parser = 'history-import' and s.subject = n.slug and p.authority = 'wikidata'
      and s.proposal ? 'qid'
      and exists (select 1 from jsonb_array_elements(p.candidates) c where c->>'qid' = s.proposal->>'qid')
      and s.proposal->>'identity_proposal_id' is distinct from p.id::text;
  get diagnostics v_tagged = row_count;
  return v_tagged;
end;
$$;

revoke all on function graph.tag_identity_silver() from public, anon, authenticated;
grant execute on function graph.tag_identity_silver() to service_role;

revoke all on function graph.withdraw_identity_dependents(uuid, text[], text, text) from public, anon, authenticated, service_role;
revoke all on function graph.node_external_ids_withdraw_dependents() from public, anon, authenticated;
revoke all on function graph.decide_external_id(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function graph.withdraw_external_id(text, uuid, text) from public, anon, authenticated;
revoke all on function graph.revive_history_factoids(uuid[]) from public, anon, authenticated, service_role;
grant execute on function graph.decide_external_id(uuid, uuid, text, text) to service_role;
grant execute on function graph.withdraw_external_id(text, uuid, text) to service_role;
