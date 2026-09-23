-- ros-ai-access, third slice (learning/research-os/ai/IMPLEMENTATION.md,
-- "Quote contract"): a curated Quote that reports success has a durable
-- receipt behind it.
--
-- Today the Quote route rehydrates a curated passage, appends an evidence
-- event best-effort, and returns the span whatever the write did. A
-- production's cited sources are verified later against that event, so a
-- lost write reads as a learner citing a source they never quoted.
--
-- The receipt is the server's record of one quotation: who quoted what,
-- from which source revision, in which session. It is written in the same
-- transaction as the evidence event, so neither exists without the other.
-- A retry with the same idempotency key returns the receipt already
-- written; the same key with different content is a conflict.

create table if not exists graph.source_quote_receipts (
  id                uuid        primary key default gen_random_uuid(),
  learner_id        uuid        not null references auth.users (id) on delete cascade,
  -- The node the quotation is evidence for. The curated slice quotes a
  -- source node and records it as its own target; the imported-passage
  -- slice passes the learner's research target instead.
  target_node_id    uuid        not null references graph.nodes (id) on delete cascade,
  -- The source's stable identity and the revision the text came from.
  source_id         text        not null,
  source_revision   text        not null,
  source_node_id    uuid        references graph.nodes (id) on delete set null,
  passage_id        text,
  locator           text,
  -- The span itself, by hash: the text is rehydrated from the source, and
  -- a receipt that cannot be matched to the current revision is stale.
  text_hash         text        not null,
  session_id        text,
  idempotency_key   text        not null,
  payload_hash      text        not null,
  created_at        timestamptz not null default now(),
  constraint source_quote_receipts_learner_key unique (learner_id, idempotency_key)
);

create index if not exists source_quote_receipts_learner_idx on graph.source_quote_receipts (learner_id, created_at desc);
create index if not exists source_quote_receipts_target_idx on graph.source_quote_receipts (target_node_id);

alter table graph.source_quote_receipts enable row level security;
-- A learner reads their own receipts through the API, which runs as the
-- service role; nothing writes this table outside record_quote_receipt.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'graph' and tablename = 'source_quote_receipts' and policyname = 'own_select'
  ) then
    create policy own_select on graph.source_quote_receipts for select using (auth.uid() = learner_id);
  end if;
end $$;

-- 20260916010000 set default privileges granting service_role everything
-- on any new table in this schema, so a fresh table arrives writable by
-- the API role. Receipts are written by record_quote_receipt alone: a
-- direct insert would produce a receipt with no evidence event behind it,
-- which is the failure this table exists to stop.
grant select on graph.source_quote_receipts to service_role;
revoke insert, update, delete, truncate, trigger, references on graph.source_quote_receipts from service_role;

-- One transaction: the receipt and the evidence event that names it.
--
-- Cite authority was already decided by read-access.ts before the call.
-- What this checks is that the rows still exist: a source or a target
-- deleted while the request was in flight answers source_gone or
-- target_gone rather than writing a receipt that points at nothing.
-- graph.append_evidence takes the row lock and reports a learner deleted
-- mid-request, which raises here so the receipt rolls back with it.
create or replace function graph.record_quote_receipt(
  p_learner uuid,
  p_target uuid,
  p_source_id text,
  p_source_revision text,
  p_source_node uuid,
  p_passage_id text,
  p_locator text,
  p_text_hash text,
  p_session text,
  p_idempotency_key text,
  p_payload_hash text,
  p_stage text,
  p_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_catalog, pg_temp
as $$
declare
  v_existing graph.source_quote_receipts;
  v_receipt uuid;
  v_append jsonb;
begin
  set local lock_timeout = '1s';

  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'record_quote_receipt: an idempotency key is required';
  end if;

  -- A retry of the same quotation answers with the receipt it already
  -- wrote. The same key carrying different content is a conflict, never a
  -- silent overwrite.
  select * into v_existing
  from graph.source_quote_receipts
  where learner_id = p_learner and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.payload_hash is distinct from p_payload_hash then
      return jsonb_build_object('ok', false, 'error', 'idempotency_conflict');
    end if;
    return jsonb_build_object(
      'ok', true,
      'receipt_id', v_existing.id,
      'created_at', v_existing.created_at,
      'replayed', true
    );
  end if;

  if p_source_node is not null and not exists (select 1 from graph.nodes where id = p_source_node) then
    return jsonb_build_object('ok', false, 'error', 'source_gone');
  end if;
  if not exists (select 1 from graph.nodes where id = p_target) then
    return jsonb_build_object('ok', false, 'error', 'target_gone');
  end if;

  begin
    insert into graph.source_quote_receipts (
      learner_id, target_node_id, source_id, source_revision, source_node_id,
      passage_id, locator, text_hash, session_id, idempotency_key, payload_hash
    ) values (
      p_learner, p_target, p_source_id, p_source_revision, p_source_node,
      p_passage_id, p_locator, p_text_hash, p_session, p_idempotency_key, p_payload_hash
    )
    returning id into v_receipt;
  exception when unique_violation then
    -- Another request with the same key committed between the read above
    -- and this insert. That is a retry arriving twice, so it answers the
    -- way the first retry would have.
    select * into v_existing
    from graph.source_quote_receipts
    where learner_id = p_learner and idempotency_key = p_idempotency_key;
    if v_existing.payload_hash is distinct from p_payload_hash then
      return jsonb_build_object('ok', false, 'error', 'idempotency_conflict');
    end if;
    return jsonb_build_object(
      'ok', true,
      'receipt_id', v_existing.id,
      'created_at', v_existing.created_at,
      'replayed', true
    );
  end;

  -- The evidence event names the receipt, so a production's cited source
  -- resolves to a server record rather than to a locator string alone.
  v_append := graph.append_evidence(p_learner, p_target, p_stage, p_event || jsonb_build_object('receiptId', v_receipt));
  if coalesce((v_append->>'deleted')::boolean, false) then
    raise exception 'record_quote_receipt: learner % was deleted', p_learner;
  end if;

  return jsonb_build_object(
    'ok', true,
    'receipt_id', v_receipt,
    'created_at', now(),
    'replayed', false,
    'event_count', (v_append->>'event_count')::int
  );
end;
$$;

revoke all on function graph.record_quote_receipt(uuid, uuid, text, text, uuid, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function graph.record_quote_receipt(uuid, uuid, text, text, uuid, text, text, text, text, text, text, text, jsonb) to service_role;

-- Rollback:
--   drop function if exists graph.record_quote_receipt(uuid, uuid, text, text, uuid, text, text, text, text, text, text, text, jsonb);
--   drop table if exists graph.source_quote_receipts;

-- A receipt carries a learner id, so it joins the privacy delete with
-- every other learner-scoped table.
--
-- The canonical function is the three-argument one that
-- 20260910040000_research_os_privacy_consent.sql defined and
-- 20260910070000_research_os_check_attempts.sql last replaced. Replacing
-- a one-argument version instead would leave two overloads behind, which
-- is how `graph.review_production` shipped a PGRST203 in the slice before
-- this one. The drop below removes that mistake wherever it was applied.
drop function if exists graph.privacy_delete_learner(uuid);

create or replace function graph.privacy_delete_learner(
  p_learner_id uuid,
  p_actor_id uuid default null,
  p_acting_as_reviewer boolean default false
)
returns jsonb
language plpgsql
security definer
-- `extensions` is added here. pgcrypto lives in that schema on Supabase,
-- and the privacy_events insert below calls digest(); without it on the
-- path the whole delete raises "function digest(text, unknown) does not
-- exist" on any database where the session search_path does not already
-- carry extensions. Measured on the local stack, where it does not.
set search_path = graph, bucket, extensions, public
as $$
declare
  v_learner_node_state int;
  v_productions         int;
  v_teacher_reviews     int;
  v_edge_flags          int;
  v_class_members       int;
  v_learner_profiles    int;
  v_check_attempts      int;
  v_quote_receipts      int;
  v_academy_progress    int;
  v_academy_profiles    int;
  v_academy_credentials int;
begin
  -- Receipts go first: they reference graph.nodes, and a learner's own
  -- quotation record is theirs to erase along with everything else.
  delete from graph.source_quote_receipts where learner_id = p_learner_id;
  get diagnostics v_quote_receipts = row_count;

  delete from graph.learner_node_state where learner_id = p_learner_id;
  get diagnostics v_learner_node_state = row_count;

  -- Cascades to public.research_os_productions_outbox via that table's own
  -- `id` foreign key (on delete cascade).
  delete from graph.productions where learner_id = p_learner_id;
  get diagnostics v_productions = row_count;

  -- Only rows where THIS learner is the subject. A reviewer's own
  -- decisions about other learners are untouched, even when the reviewer
  -- and the learner being deleted happen to share the same account.
  delete from graph.teacher_reviews where learner_id = p_learner_id;
  get diagnostics v_teacher_reviews = row_count;

  delete from graph.edge_flags where learner_id = p_learner_id;
  get diagnostics v_edge_flags = row_count;

  -- Only the learner's own membership row. The class object itself
  -- (graph.classes: name, reviewer_email) belongs to the reviewer and
  -- stays untouched (see 20260910030000_research_os_classes.sql).
  delete from graph.class_members where learner_id = p_learner_id;
  get diagnostics v_class_members = row_count;

  delete from graph.learner_profiles where learner_id = p_learner_id;
  get diagnostics v_learner_profiles = row_count;

  -- Every held-attempt row for this learner, regardless of age: a delete
  -- request removes all of this learner's data now, not only what has
  -- already crossed the 24-hour hard expiry.
  delete from graph.check_attempts where learner_id = p_learner_id;
  get diagnostics v_check_attempts = row_count;

  delete from bucket.academy_progress where user_id = p_learner_id;
  get diagnostics v_academy_progress = row_count;

  delete from bucket.academy_profiles where user_id = p_learner_id;
  get diagnostics v_academy_profiles = row_count;

  delete from bucket.academy_credentials where user_id = p_learner_id;
  get diagnostics v_academy_credentials = row_count;

  insert into graph.privacy_events (learner_id_hash, action, actor_id_hash, acting_as_reviewer)
  values (
    encode(digest(p_learner_id::text, 'sha256'), 'hex'),
    'delete',
    case when p_actor_id is not null then encode(digest(p_actor_id::text, 'sha256'), 'hex') else null end,
    coalesce(p_acting_as_reviewer, false)
  );

  -- Hygiene: any OTHER learner's check_attempts rows past the 24-hour hard
  -- expiry are swept here too. Best-effort within the same transaction; a
  -- failure here would roll back the whole delete, which is acceptable,
  -- purge_expired_check_attempts only deletes rows, it cannot fail on
  -- data it does not touch.
  perform graph.purge_expired_check_attempts();

  return jsonb_build_object(
    'source_quote_receipts', v_quote_receipts,
    'learner_node_state', v_learner_node_state,
    'productions', v_productions,
    'teacher_reviews', v_teacher_reviews,
    'edge_flags', v_edge_flags,
    'class_members', v_class_members,
    'learner_profiles', v_learner_profiles,
    'check_attempts', v_check_attempts,
    'academy_progress', v_academy_progress,
    'academy_profiles', v_academy_profiles,
    'academy_credentials', v_academy_credentials
  );
end;
$$;
