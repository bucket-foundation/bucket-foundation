/**
 * /api/research-os/review, the teacher review queue (bkt-ros, Phase 1 item
 * 4). Backs graph.teacher_reviews
 * (supabase/migrations/20260910020000_research_os_teacher_reviews.sql),
 * the decision layer for the two things Phase 0 shipped with no review
 * path: a held transfer-item answer
 * (src/lib/research-os/stages.ts onTransferItemAnswered) and a submitted
 * Production (graph.productions.status = 'submitted').
 *
 * GET  -> { transferHolds: [...], productions: [...] }, every item still
 *   awaiting a decision. A "pending" transfer hold is any
 *   graph.learner_node_state row whose LATEST evidence entry is a held
 *   transfer_item and whose stage has not already moved to Internalization
 *   or past it; a "pending" production is any graph.productions row with
 *   status = 'submitted'. Both queries filter on the primary table's own
 *   state alone, with no join against graph.teacher_reviews, so a decision
 *   that already advanced a row falls out of "pending" on its own (matches
 *   onTeacherReview's own eligibility gate).
 *
 * POST { kind: "transfer_item", learnerId, nodeId, decision, reason? }
 *      | { kind: "production", productionId, decision, reason? }
 *   -> applies the decision. "returned" requires a one-line `reason`
 *   (RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3: "a teacher can advance or
 *   hold back a stage directly, with a required one-line reason"). Every
 *   decision writes one graph.teacher_reviews row (the audit trail this
 *   table exists for); an "approved" transfer_item ALSO appends the
 *   decision as an evidence event on the learner's own
 *   graph.learner_node_state row (task item 4, "evidence logged on
 *   approve") and, when eligible, raises their stage to Internalization.
 *
 *   An "approved" production (bkt-ros, ros-06 item 3, the accept path)
 *   flips graph.productions.status to 'accepted', appends a
 *   'teacher_review' evidence event to the target node's own
 *   graph.learner_node_state row (src/lib/research-os/stages.ts's
 *   onProductionReview; Production is already the graph's terminal stage,
 *   so this re-affirms it rather than raising it further), and emits the
 *   row to the engine outbox (db.ts's emitProductionOutboxIfAccepted,
 *   the exact function /api/research-os/production's own POST already
 *   uses, shared rather than duplicated here). A "returned" production goes
 *   back to graph.productions.status 'draft' -- not 'returned' -- so the
 *   learner can revise and resubmit through the same submit path, with the
 *   reason appended to the production's own `notes` column (ros-06 item
 *   3's "a teacher note stored on the production row") AND a
 *   'production_returned' evidence event (src/lib/research-os/stages.ts's
 *   onProductionReturned, per src/lib/research-os/EVIDENCE-SCHEMA.md's
 *   "corrective event" section): `stage` stays at 'production' (the
 *   high-water-mark rule never runs backward), the event itself, plus
 *   graph.productions.status, is what records the correction.
 *
 * Production guard (bkt-ros, production guard bead): GET's own
 * `productions` entries now also carry `sourceProvenance`,
 * `duplicateFlag`, `lateralReadingFlag`, `counterEvidence`, and
 * `counterEvidenceRequired`, the
 * exact values `/api/research-os/production`'s POST computed and stored
 * at submit time (production-guard.ts's own functions, never recomputed
 * here, task item 5's own "show guard flags beside each queued
 * Production"). POST refuses an "approved" decision on a production
 * whose `source_provenance` carries any unverified source (production-
 * guard.ts's hasUnverifiedSource), 409 `unverified_sources_block_accept`
 * -- task item 1's own gate, "approve remains blocked while unverified
 * sources exist" -- so a reviewer must choose "returned" instead; "kind":
 * "production", "returned" always remains available regardless. A
 * successful "approved" production decision also computes and stores
 * `production_incentive_eligible` (production-guard.ts's
 * computeIncentiveEligible against the target node's linked canon
 * record, `canon-link.ts`'s lookupCanonSignoff): no payment code reads
 * it, task item 4's own scope line.
 *
 * Auth: Authorization: Bearer <supabase access token>, verified against
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS allowlist.
 * TODO(Phase 1, review section 4 gap analysis "Role system"): reviewer.ts's
 * own header has the full plan to replace this with a roster-backed role.
 * 403 not a reviewer (also covers an unset/empty allowlist, fail closed) ·
 * 400 bad input · 404 target row not found · 503 not configured.
 *
 * A production decision also answers 409 when the production is no longer
 * submitted or carries an unverified source, and 503 with retry-after when
 * graph.review_production cannot take its lock inside a second. That
 * function writes the status, the notes, the audit row and the evidence
 * event together, so an audit-row failure now reads as write_failed rather
 * than the review_write_failed the four-statement sequence returned.
 */
import { authorizeNodes } from "@/lib/research-os/read-access";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createNodeFromProduction } from "@/lib/research-os/production-node";
import { onTeacherReview, onProductionReview, onProductionReturned } from "@/lib/research-os/stages";
import type { Stage } from "@/lib/research-os/types";
import { awardProgress, configured, graphService, recordEvidence, emitProductionOutboxIfAccepted, findNodeById, inChunks} from "@/lib/research-os/db";
import { evidenceErrorResponse } from "@/lib/research-os/evidence-errors";
import { verifyReviewer, isReviewerEmail } from "@/lib/research-os/reviewer";
import {
  hasUnverifiedSource,
  isSourceProvenanceStale,
  unverifiedSourceReturnNote,
  computeIncentiveEligible,
  type SourceCheck,
  type DuplicateFlag,
  type LateralReadingFlag,
} from "@/lib/research-os/production-guard";
import { lookupCanonSignoff } from "@/lib/research-os/canon-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Shown for a production whose source_provenance is stale
 * (isSourceProvenanceStale): there is no per-source check to name, since
 * the guard never ran against this row's current sources at all. */
const STALE_SOURCE_NOTE =
  "Returned: this production's sources were never checked against a Quote call (submitted before the provenance guard shipped). " +
  "Resubmit through the workspace so each source can be verified, then it can be reviewed again.";

interface StateRow {
  learner_id: string;
  node_id: string;
  stage: string;
  evidence: Array<Record<string, unknown>> | null;
  updated_at: string;
}
interface ProductionRow {
  id: string;
  learner_id: string;
  target_node_id: string;
  related_node_id?: string | null;
  kind?: string | null;
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  transfer_proof: Record<string, unknown>;
  status: string;
  created_at: string;
  notes: unknown[];
  source_provenance: SourceCheck[] | null;
  duplicate_flag: DuplicateFlag | null;
  counter_evidence: unknown[] | null;
  counter_evidence_required: boolean | null;
  lateral_reading_flag: LateralReadingFlag;
}

/** sourceLines as checkSourceProvenance's own caller builds them
 * (production-guard.ts's own String() coercion, `/api/research-os/
 * production`'s POST), so a staleness comparison here counts the same
 * way a real submit would have. */
function sourceLinesOf(sources: unknown[] | null | undefined): string[] {
  return ((sources ?? []) as unknown[]).map((s) => String(s));
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  const svc = graphService();

  const scope = await reviewerScope(reviewer);
  if (!scope.ok) return bad(500, "read_failed");
  const scopedLearners = scope.learners;
  if (scopedLearners && scopedLearners.length === 0) {
    return NextResponse.json({ transferHolds: [], productions: [] }, { headers: { "cache-control": "no-store" } });
  }

  // A held transfer_item never changes `stage` (onTransferItemAnswered),
  // so it always leaves the row at 'understanding'. Any row already at
  // Internalization or Production either never held, or already got a
  // decision, so scoping to 'understanding' here is the same "pending"
  // filter a join against teacher_reviews would give, with no join needed.
  const stateRead = await inLearnerChunks<StateRow>(scopedLearners, (chunk, from, to) => {
    let q = svc.from("learner_node_state").select("learner_id,node_id,stage,evidence,updated_at").eq("stage", "understanding");
    if (chunk) q = q.in("learner_id", chunk);
    return q
      .order("learner_id", { ascending: true })
      .order("node_id", { ascending: true })
      .range(from, to) as unknown as Promise<{ data: StateRow[] | null; error: { message: string } | null }>;
  });
  if (!stateRead.ok) return bad(500, "read_failed");
  const stateRows = stateRead.rows;

  const held = (stateRows || []).filter((r) => {
    const ev = r.evidence || [];
    const last = ev[ev.length - 1];
    return last && last.kind === "transfer_item" && last.held === true;
  });

  const productionRead = await inLearnerChunks<ProductionRow>(scopedLearners, (chunk, from, to) => {
    let q = svc
      .from("productions")
      .select(
        "id,learner_id,target_node_id,related_node_id,kind,claim,evidence,sources,transfer_proof,status,created_at,notes,source_provenance,duplicate_flag,counter_evidence,counter_evidence_required,lateral_reading_flag",
      )
      .eq("status", "submitted");
    if (chunk) q = q.in("learner_id", chunk);
    return q
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to) as unknown as Promise<{ data: ProductionRow[] | null; error: { message: string } | null }>;
  });
  if (!productionRead.ok) return bad(500, "read_failed");
  const productionRows = productionRead.rows.sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)));

  const nodeIds = Array.from(
    new Set([...held.map((r) => r.node_id), ...((productionRows as ProductionRow[]) || []).map((r) => r.target_node_id)]),
  );
  let titleById = new Map<string, string>();
  if (nodeIds.length) {
    // A queue item names a node, and the node is not the reviewer's to
    // read just because a learner in their class worked on it. Same rule
    // the connections graph got: titles are filtered before they join.
    const readable = await authorizeNodes(nodeIds, { id: reviewer.id }, "view");
    if (!readable.ok) return bad(503, "access_unavailable");
    if (readable.allowed.length) {
      // Chunked, because a queue past a thousand items puts a thousand
      // uuids in the request line and PostgREST answers 414. The old
      // read discarded that error and served no titles at all.
      let nodes: { id: string; title: string }[];
      try {
        nodes = await inChunks<{ id: string; title: string }>(readable.allowed, (chunk, page) =>
          svc.from("nodes").select("id,title").in("id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: { id: string; title: string }[] | null; error: { message: string } | null }>,
        );
      } catch (err) {
        console.error("[research-os/review] title read failed:", err instanceof Error ? err.message : err);
        return bad(503, "access_unavailable");
      }
      titleById = new Map(nodes.map((n) => [n.id, n.title]));
    }
  }

  return NextResponse.json(
    {
      transferHolds: held.map((r) => {
        const ev = r.evidence || [];
        const last = ev[ev.length - 1];
        return {
          learnerId: r.learner_id,
          nodeId: r.node_id,
          nodeTitle: titleById.get(r.node_id) ?? r.node_id,
          stage: r.stage,
          heldAt: (last?.at as string | undefined) ?? r.updated_at,
        };
      }),
      // Production guard (bkt-ros, production guard bead, task item 5):
      // sourceProvenance/duplicateFlag/counterEvidence/
      // counterEvidenceRequired are read straight from the row, computed
      // once at submit time by /api/research-os/production's POST, never
      // recomputed here. guardFlags is a small derived summary
      // (production-guard.ts's own hasUnverifiedSource plus a "missing
      // counter-evidence" check) so the review page does not need to
      // re-derive it from the raw arrays.
      productions: ((productionRows as ProductionRow[]) || []).map((p) => {
        const sourceProvenance = p.source_provenance ?? [];
        const counterEvidence = p.counter_evidence ?? [];
        const counterEvidenceRequired = p.counter_evidence_required ?? false;
        // A stale row (migration-default '[]' on a production that
        // reached "submitted" before this guard existed) reads the same
        // as unverified here, matching the approve gate below: the
        // review page must never show "0 unverified" for a production
        // whose sources were never checked at all.
        const stale = isSourceProvenanceStale(sourceLinesOf(p.sources), sourceProvenance);
        return {
          id: p.id,
          learnerId: p.learner_id,
          targetNodeId: p.target_node_id,
          relatedNodeId: p.related_node_id ?? null,
          kind: p.kind ?? "production",
          targetTitle: titleById.get(p.target_node_id) ?? p.target_node_id,
          claim: p.claim,
          evidence: p.evidence,
          sources: p.sources,
          transferProof: p.transfer_proof,
          createdAt: p.created_at,
          notes: p.notes ?? [],
          sourceProvenance,
          duplicateFlag: p.duplicate_flag ?? null,
          lateralReadingFlag: p.lateral_reading_flag ?? null,
          counterEvidence,
          counterEvidenceRequired,
          guardFlags: {
            hasUnverifiedSource: stale || hasUnverifiedSource(sourceProvenance),
            unverifiedCount: stale ? sourceLinesOf(p.sources).length : sourceProvenance.filter((s) => !s.verified).length,
            sourceProvenanceStale: stale,
            missingCounterEvidence: counterEvidenceRequired && counterEvidence.length === 0,
          },
          // The exact text a "returned" decision on this production could
          // use (production-guard.ts's own template), so the review page
          // never re-derives it client-side; "" when there is nothing to
          // template (no unverified source). A stale row has no per-source
          // checks to template individually, so it gets the same fixed
          // "never checked" note the POST approve gate returns.
          unverifiedSourceNoteTemplate: stale ? STALE_SOURCE_NOTE : unverifiedSourceReturnNote(sourceProvenance),
        };
      }),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * Which learners a reviewer may act on. An email on
 * RESEARCH_OS_REVIEWER_EMAILS is the graph's own reviewer and answers
 * null, meaning every learner. A reviewer who holds the role through a
 * class answers the members of their classes: creating a class is open to
 * anyone signed in, so class staff is self-grantable and cannot carry a
 * graph-wide read or a graph-wide decision (Bucket critic C21, C24).
 *
 * Both reads page, since PostgREST stops at a thousand rows and a
 * reviewer above that would silently lose learners. Each page is ordered:
 * Postgres gives no stable row order across LIMIT/OFFSET without one, so
 * an unordered page can repeat a row and skip another (Bucket critic C30).
 */
async function reviewerScope(reviewer: { id: string; email: string | null }): Promise<{ ok: true; learners: string[] | null } | { ok: false }> {
  if (reviewer.email && isReviewerEmail(reviewer.email)) return { ok: true, learners: null };
  const svc = graphService();

  const classIds: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await svc
      .from("class_members")
      .select("class_id")
      .eq("learner_id", reviewer.id)
      .in("role", ["teacher", "librarian"])
      .order("class_id", { ascending: true })
      .range(from, from + 999);
    if (error) return { ok: false };
    const rows = (data as { class_id: string }[]) || [];
    classIds.push(...rows.map((r) => r.class_id));
    if (rows.length < 1000) break;
  }
  if (classIds.length === 0) return { ok: true, learners: [] };

  const learners = new Set<string>();
  for (const part of chunkIds(classIds)) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await svc
        .from("class_members")
        .select("learner_id")
        .in("class_id", part)
        .order("learner_id", { ascending: true })
        .range(from, from + 999);
      if (error) return { ok: false };
      const rows = (data as { learner_id: string }[]) || [];
      rows.forEach((r) => learners.add(r.learner_id));
      if (rows.length < 1000) break;
    }
  }
  return { ok: true, learners: Array.from(learners) };
}

/** 100 ids at a time, the bound read-access.ts measured for a request line. */
function chunkIds(ids: string[], size = 100): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/**
 * The rows for these learners, read in bounded batches and paged.
 *
 * Two different limits bite here. The `in()` list is bounded at 100 ids
 * because PostgREST puts it in the request line, and the row count is
 * bounded at 1,000 by PostgREST itself. Chunking the ids alone left the
 * second one silent: a hundred learners at `understanding` overflow a
 * thousand rows and the queue drops the remainder with no error at all
 * (Bucket critic C30). Each page is ordered by the caller.
 */
const PAGE = 1000;
const MAX_PAGES = 200;

async function inLearnerChunks<T>(
  learners: string[] | null,
  read: (chunk: string[] | null, from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ ok: true; rows: T[] } | { ok: false }> {
  const rows: T[] = [];
  for (const part of learners ? chunkIds(learners) : [null]) {
    for (let p = 0; ; p += 1) {
      // A read that forgets `.range()` answers the same page forever.
      // Failing loudly beats spinning.
      if (p >= MAX_PAGES) return { ok: false };
      const { data, error } = await read(part, p * PAGE, p * PAGE + PAGE - 1);
      if (error) return { ok: false };
      const page = (data as T[]) || [];
      rows.push(...page);
      if (page.length < PAGE) break;
    }
  }
  return { ok: true, rows };
}

interface ReviewBody {
  kind?: "transfer_item" | "production";
  learnerId?: string;
  nodeId?: string;
  productionId?: string;
  decision?: "approved" | "returned";
  reason?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  let body: ReviewBody;
  try {
    body = (await req.json()) as ReviewBody;
  } catch {
    return bad(400, "bad_request");
  }

  if (body.kind !== "transfer_item" && body.kind !== "production") return bad(400, "kind must be transfer_item or production");
  if (body.decision !== "approved" && body.decision !== "returned") return bad(400, "decision must be approved or returned");
  const reason = (body.reason || "").trim() || undefined;
  if (body.decision === "returned" && !reason) return bad(400, "a one-line reason is required to return an item");

  const svc = graphService();

  // A decision is a write on another learner's record, so it takes the
  // same scope the queue takes. Scoping the read alone left a reviewer
  // able to decide on work they can no longer see (Bucket critic C24).
  const scope = await reviewerScope(reviewer);
  if (!scope.ok) return bad(500, "read_failed");
  const mayDecideFor = (learner: string): boolean => scope.learners === null || scope.learners.includes(learner);

  if (body.kind === "transfer_item") {
    const learnerId = (body.learnerId || "").trim();
    const nodeId = (body.nodeId || "").trim();
    if (!learnerId || !nodeId) return bad(400, "learnerId and nodeId are required");
    // Out of scope answers the same 404, with the same code, that a
    // learner with no row answers, so a reviewer cannot map the graph's
    // learners by reading the error (Bucket critic C34).
    if (!mayDecideFor(learnerId)) return bad(404, "state_not_found");

    const { data: existing, error: readErr } = await svc
      .from("learner_node_state")
      .select("stage")
      .eq("learner_id", learnerId)
      .eq("node_id", nodeId)
      .maybeSingle();
    if (readErr) return bad(500, "read_failed");
    if (!existing) return bad(404, "state_not_found");

    const currentStage = existing.stage as Stage;
    const transition = onTeacherReview(currentStage, body.decision, reviewer.id, reason);

    const { error: insErr } = await svc.from("teacher_reviews").insert({
      reviewer_id: reviewer.id,
      learner_id: learnerId,
      kind: "transfer_item",
      node_id: nodeId,
      decision: body.decision,
      reason: reason ?? null,
      evidence: transition.event,
    });
    if (insErr) return bad(500, "review_write_failed");

    // Task item 4: "evidence logged on approve" -- only an approval mirrors
    // onto the learner's own progress log and can move their stage;
    // "returned" is recorded above in teacher_reviews (the review's own
    // audit trail) without touching learner_node_state.
    if (body.decision === "approved") {
      try {
        await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
      } catch (err) {
        const mapped = evidenceErrorResponse(err);
        if (mapped) return mapped;
        throw err;
      }
    }

    return NextResponse.json({ decision: body.decision, stage: transition.nextStage }, { headers: { "cache-control": "no-store" } });
  }

  // kind === "production" (bkt-ros, ros-06 item 3, the accept path)
  const productionId = (body.productionId || "").trim();
  // The production's own learner decides whether this reviewer may act.
  // Read before the row is loaded for the decision, and answered as
  // not-found so the id itself discloses nothing.
  if (productionId && scope.learners !== null) {
    const { data: owner, error: ownerErr } = await svc
      .from("productions")
      .select("learner_id")
      .eq("id", productionId)
      .maybeSingle();
    if (ownerErr) return bad(500, "read_failed");
    if (!owner || !mayDecideFor((owner as { learner_id: string }).learner_id)) return bad(404, "production_not_found");
  }
  if (!productionId) return bad(400, "productionId is required");

  const { data: production, error: prodErr } = await svc
    .from("productions")
    .select("id,learner_id,target_node_id,related_node_id,kind,node_id,claim,evidence,sources,status,created_at,updated_at,notes,source_provenance")
    .eq("id", productionId)
    .maybeSingle();
  if (prodErr) return bad(500, "read_failed");
  if (!production) return bad(404, "production_not_found");
  if (production.status !== "submitted") return bad(409, `production is already "${production.status}", not pending`);

  // Production guard, task item 1's own gate: "a Production with any
  // unverified_source cannot reach status accepted." An "approved"
  // decision on such a production is refused outright, before any write;
  // "returned" stays available regardless, and unverifiedSourceReturnNote
  // gives the reviewer a template to send with it. A stale row (this
  // production's source_provenance was never computed against its
  // current sources, migration default '[]' on a pre-guard submission)
  // reads the same as unverified: "cannot reach accepted through any
  // route" covers a source that was never checked at all, not only one a
  // check explicitly failed.
  const sourceProvenance = (production.source_provenance as SourceCheck[] | null) ?? [];
  const stale = isSourceProvenanceStale(sourceLinesOf(production.sources as unknown[] | null), sourceProvenance);
  if (body.decision === "approved" && (stale || hasUnverifiedSource(sourceProvenance))) {
    return NextResponse.json(
      {
        error: "unverified_sources_block_accept",
        message: "This production has a source that could not be matched to a Quote call. Return it instead of approving.",
        noteTemplate: stale ? STALE_SOURCE_NOTE : unverifiedSourceReturnNote(sourceProvenance),
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  // "returned" sends the production back to draft (not the "returned"
  // status value) so the learner can revise and resubmit through the same
  // submit path; "approved" is the accept path proper. Either way the
  // teacher's note is appended to the production's own `notes` column
  // (task item 3), independent of graph.teacher_reviews' separate audit
  // row below.
  const newStatus = body.decision === "approved" ? "accepted" : "draft";
  const noteEntry = { at: now, reviewerId: reviewer.id, decision: body.decision, reason: reason ?? null };
  const priorNotes = (production.notes as unknown[] | null) ?? [];
  const notes = [...priorNotes, noteEntry];

  // Production guard, task item 4: computed only on the "approved" path,
  // against the target node's own linked canon record
  // (graph.nodes.provenance.paper_id, canon-import.ts's own link), never
  // against a claim the guard cannot trace to canon at all. No payment
  // code reads this value; it is a stored eligibility signal only.
  let incentiveEligible = false;
  if (body.decision === "approved") {
    const targetNode = await findNodeById(production.target_node_id as string);
    const paperId = (targetNode?.provenance as { paper_id?: string } | undefined)?.paper_id;
    const signoff = paperId ? lookupCanonSignoff(paperId) : null;
    incentiveEligible = computeIncentiveEligible("accepted", signoff);
  }

  // The production's status, the teacher's audit row and the learner's
  // evidence event commit together (graph.review_production). Writing them
  // in sequence left a lock wait on the append with an accepted production,
  // no review event, and a retry that answered 409 because the status had
  // already moved.
  const reviewId = randomUUID();
  const transition =
    body.decision === "approved" ? onProductionReview(reviewer.id, reason, reviewId) : onProductionReturned(reviewer.id, reason, reviewId);
  const { data: reviewed, error: rpcErr } = await svc.rpc("review_production", {
    p_production: productionId,
    p_review_id: reviewId,
    p_reviewer: reviewer.id,
    p_decision: body.decision,
    p_next_status: newStatus,
    p_notes: notes,
    p_incentive: incentiveEligible,
    p_reason: reason ?? null,
    p_note: noteEntry,
    p_learner: production.learner_id as string,
    p_target: production.target_node_id as string,
    p_stage: transition.nextStage,
    p_event: transition.event as unknown as Record<string, unknown>,
  });
  if (rpcErr) {
    const code = (rpcErr as { code?: string }).code ?? null;
    if (code === "55P03" || code === "40001" || code === "40P01") {
      return NextResponse.json(
        { error: "busy" },
        { status: 503, headers: { "cache-control": "no-store", "retry-after": "1" } },
      );
    }
    console.error(`[research-os/review] review_production failed (${code ?? "unknown"}): ${rpcErr.message}`);
    return bad(500, "write_failed");
  }
  const result = (reviewed || {}) as {
    ok?: boolean;
    error?: string;
    status?: string;
    review_id?: string;
    production?: Record<string, unknown>;
    award_from?: string | null;
    awards?: boolean;
  };
  if (!result.ok) {
    if (result.error === "production_not_found") return bad(404, "production_not_found");
    return bad(409, `production is already "${result.status}", not pending`);
  }
  const updated = (result.production ?? null) as Record<string, unknown> | null;

  // The game layer runs outside the transaction: activity on every review,
  // XP only when the node's high-water mark moved.
  try {
    await awardProgress(
      production.learner_id as string,
      production.target_node_id as string,
      (result.award_from ?? null) as Stage | null,
      transition.nextStage as Stage,
      { xp: result.awards === true },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("update failed")) {
      console.warn(`[research-os/review] award failed for production ${productionId}: ${message}`);
    }
  }

  // The accepted production becomes a node of its kind with an edge to
  // the node it acts on (production-node.ts). Never fails the review.
  if (body.decision === "approved" && updated) {
    try {
      await createNodeFromProduction({
        id: production.id as string,
        learner_id: production.learner_id as string,
        target_node_id: production.target_node_id as string,
        related_node_id: (production.related_node_id as string | null) ?? null,
        kind: (production.kind as string | null) ?? "production",
        claim: (production.claim as string | null) ?? null,
        sources: (production.sources as unknown[] | null) ?? [],
        node_id: (production.node_id as string | null) ?? null,
      });
    } catch (err) {
      console.error("[research-os/review] createNodeFromProduction failed:", err instanceof Error ? err.message : err);
    }
  }

  if (body.decision === "approved" && updated) {
    // Task item 3: "thereby triggers the existing outbox write" -- the
    // exact function /api/research-os/production's own POST uses, not
    // reimplemented here.
    await emitProductionOutboxIfAccepted({
      id: updated.id as string,
      target_node_id: updated.target_node_id as string,
      claim: (updated.claim as string | null) ?? null,
      evidence: (updated.evidence as unknown[]) ?? [],
      sources: (updated.sources as unknown[]) ?? [],
      status: updated.status as string,
      created_at: updated.created_at as string,
      updated_at: updated.updated_at as string | undefined,
    });
  }

  return NextResponse.json(
    { decision: body.decision, status: newStatus, productionIncentiveEligible: incentiveEligible },
    { headers: { "cache-control": "no-store" } },
  );
}
