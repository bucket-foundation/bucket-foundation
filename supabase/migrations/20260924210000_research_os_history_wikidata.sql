alter table graph.node_external_ids add column if not exists source_id text;
alter table graph.node_external_ids add column if not exists source_revision text;
alter table graph.node_external_ids add column if not exists reviewed_by uuid references auth.users (id) on delete set null;
alter table graph.node_external_ids add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'node_external_ids_admission') then
    alter table graph.node_external_ids add constraint node_external_ids_admission foreign key (source_id, source_revision)
      references graph.evidence_source_admissions (source_id, source_revision) on delete restrict;
  end if;
end $$;
create index if not exists node_external_ids_source_idx on graph.node_external_ids (source_id, source_revision);

create table if not exists graph.external_id_proposals (
  id              uuid        primary key default gen_random_uuid(),
  node_id         uuid        not null references graph.nodes (id) on delete cascade,
  authority       text        not null,
  candidates      jsonb       not null,
  reason          text        not null,
  source_id       text        not null,
  source_revision text        not null,
  status          text        not null default 'pending',
  chosen_id       text,
  reviewer_id     uuid        references auth.users (id) on delete set null,
  decision_reason text,
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  constraint external_id_proposals_node_key unique (node_id, authority, source_id, source_revision),
  constraint external_id_proposals_admission foreign key (source_id, source_revision)
    references graph.evidence_source_admissions (source_id, source_revision) on delete restrict,
  constraint external_id_proposals_authority check (authority in ('wikidata')),
  constraint external_id_proposals_candidates check (jsonb_typeof(candidates) = 'array'),
  constraint external_id_proposals_reason check (reason in ('one_candidate', 'several_candidates', 'no_candidate')),
  constraint external_id_proposals_status check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  constraint external_id_proposals_chosen check (chosen_id is null or chosen_id ~ '^Q[0-9]+$'),
  constraint external_id_proposals_decision_reason check (decision_reason is null or length(decision_reason) between 1 and 500)
);
create index if not exists external_id_proposals_status_idx on graph.external_id_proposals (status);
alter table graph.external_id_proposals enable row level security;
revoke all on graph.external_id_proposals from anon, authenticated;

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
  v_p     graph.external_id_proposals;
  v_owner uuid;
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
  return jsonb_build_object('ok', true, 'changed', true, 'status', 'approved', 'qid', p_qid);
end;
$$;

create or replace function graph.medallion_withdrawal_cascade()
returns trigger
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
begin
  update graph.silver_items
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  update graph.factoids f
    set status = 'withdrawn'
    from graph.silver_items s
    where s.id = f.silver_item_id and s.source_id = new.source_id and s.source_revision = new.source_revision
      and f.status <> 'withdrawn';

  update graph.places
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  update graph.periods
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  delete from graph.node_external_ids
    where source_id = new.source_id and source_revision = new.source_revision;

  update graph.external_id_proposals
    set status = 'withdrawn'
    where source_id = new.source_id and source_revision = new.source_revision and status <> 'withdrawn';

  with orphaned as (
    select distinct l.node_id
    from graph.gold_lineage l
    join graph.silver_items s on s.id = l.silver_item_id
    where l.node_id is not null
      and s.source_id = new.source_id and s.source_revision = new.source_revision
      and not exists (
        select 1 from graph.gold_lineage l2
        join graph.silver_items s2 on s2.id = l2.silver_item_id
        where l2.node_id = l.node_id and s2.status <> 'withdrawn'
      )
  ), queued as (
    insert into graph.medallion_withdrawn_nodes (node_id, prior_visibility, source_id)
    select n.id, n.visibility, new.source_id
    from graph.nodes n join orphaned o on o.node_id = n.id
    on conflict (node_id) do nothing
    returning node_id
  )
  update graph.nodes set visibility = 'private'
    where id in (select node_id from orphaned) and visibility <> 'private';
  return new;
end;
$$;

revoke all on function graph.decide_external_id(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function graph.decide_external_id(uuid, uuid, text, text) to service_role;
revoke all on function graph.medallion_withdrawal_cascade() from public, anon, authenticated;
