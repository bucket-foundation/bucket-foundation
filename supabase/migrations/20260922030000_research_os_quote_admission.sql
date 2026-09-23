-- ros-ai-access: a curated Quote is admitted before it is recorded.
--
-- graph.evidence_source_admissions (the corpus slice) is the register of
-- what may be quoted and under which rights revision.
-- graph.record_quote_receipt wrote a receipt without consulting it, so a
-- source withdrawn from the corpus could still be quoted and cited.
--
-- This migration replaces the function rather than editing either of the
-- two it sits between, because it needs both to exist: the receipts table
-- from 20260921030000 and the admission registry from the corpus slice.
-- Applying it before either one is applied will fail, which is the right
-- failure.
--
-- Rollback: re-apply 20260921030000_research_os_quote_receipts.sql, which
-- recreates the function without the check.

CREATE OR REPLACE FUNCTION graph.record_quote_receipt(p_learner uuid, p_target uuid, p_source_id text, p_source_revision text, p_source_node uuid, p_passage_id text, p_locator text, p_text_hash text, p_session text, p_idempotency_key text, p_payload_hash text, p_stage text, p_event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'graph', 'pg_catalog', 'pg_temp'
AS $function$
declare
  v_existing graph.source_quote_receipts;
  v_receipt uuid;
  v_append jsonb;
  v_allowed boolean;
  v_admission_status text;
  v_rights_revision int;
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

  -- A quotation is admitted or it is refused. graph.quote_admission reads
  -- the registry row FOR SHARE, so a withdrawal running concurrently waits
  -- on this and cannot land between the check and the receipt. It is keyed
  -- on the same (source_id, source_revision) the receipt stores, which is
  -- what curatedSourceRevision computes: verified against all thirteen
  -- curated passages on the local stack, thirteen of thirteen.
  --
  -- The order here is deliberate: the idempotency read comes first. A
  -- retry of a quotation that was admitted when it was made still answers
  -- with its receipt, so a withdrawal leaves one learner's completed Quote
  -- alone and stops the next new quotation of that source.
  select allowed, status, rights_revision
    into v_allowed, v_admission_status, v_rights_revision
  from graph.quote_admission(p_source_id, p_source_revision);

  if not coalesce(v_allowed, false) then
    return jsonb_build_object(
      'ok', false,
      -- graph.quote_admission answers 'unknown' for a source that was
      -- never admitted, and the registry's own status otherwise. Only the
      -- first needs translating; a 'withdrawn' reads better as itself
      -- than as anything this function could invent.
      'error', case
                 when v_admission_status is null or v_admission_status = 'unknown' then 'source_not_admitted'
                 else v_admission_status
               end,
      'source_id', p_source_id,
      'source_revision', p_source_revision
    );
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
    'event_count', (v_append->>'event_count')::int,
    'rights_revision', v_rights_revision
  );
end;
$function$


