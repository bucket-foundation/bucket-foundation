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
 *   An "approved" production flips graph.productions.status to 'accepted'
 *   ('returned' otherwise); Production is already the graph's terminal
 *   stage (src/lib/research-os/types.ts's STAGE_ORDER), so acceptance
 *   lives on the production row's own status alone. A "returned" production
 *   ALSO appends a "production_returned" evidence event to the learner's
 *   own graph.learner_node_state row (stages.ts's onProductionReturned,
 *   EVIDENCE-SCHEMA.md's "corrective event"), so the rejection is visible
 *   in the evidence log even though `stage` itself never moves off
 *   "production".
 *
 * Auth: Authorization: Bearer <supabase access token>, verified against
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS allowlist.
 * TODO(Phase 1, review section 4 gap analysis "Role system"): reviewer.ts's
 * own header has the full plan to replace this with a roster-backed role.
 * 403 not a reviewer (also covers an unset/empty allowlist, fail closed) ·
 * 400 bad input · 404 target row not found · 503 not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { onTeacherReview, onProductionReturned } from "@/lib/research-os/stages";
import type { Stage } from "@/lib/research-os/types";
import { configured, graphService, recordEvidence } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

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
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  transfer_proof: Record<string, unknown>;
  status: string;
  created_at: string;
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  const svc = graphService();

  // A held transfer_item never changes `stage` (onTransferItemAnswered),
  // so it always leaves the row at 'understanding'. Any row already at
  // Internalization or Production either never held, or already got a
  // decision, so scoping to 'understanding' here is the same "pending"
  // filter a join against teacher_reviews would give, with no join needed.
  const { data: stateRows, error: stateErr } = await svc
    .from("learner_node_state")
    .select("learner_id,node_id,stage,evidence,updated_at")
    .eq("stage", "understanding");
  if (stateErr) return bad(500, "read_failed");

  const held = ((stateRows as StateRow[]) || []).filter((r) => {
    const ev = r.evidence || [];
    const last = ev[ev.length - 1];
    return last && last.kind === "transfer_item" && last.held === true;
  });

  const { data: productionRows, error: prodErr } = await svc
    .from("productions")
    .select("id,learner_id,target_node_id,claim,evidence,sources,transfer_proof,status,created_at")
    .eq("status", "submitted")
    .order("created_at", { ascending: true });
  if (prodErr) return bad(500, "read_failed");

  const nodeIds = Array.from(
    new Set([...held.map((r) => r.node_id), ...((productionRows as ProductionRow[]) || []).map((r) => r.target_node_id)]),
  );
  let titleById = new Map<string, string>();
  if (nodeIds.length) {
    const { data: nodes } = await svc.from("nodes").select("id,title").in("id", nodeIds);
    titleById = new Map(((nodes as Array<{ id: string; title: string }>) || []).map((n) => [n.id, n.title]));
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
      productions: ((productionRows as ProductionRow[]) || []).map((p) => ({
        id: p.id,
        learnerId: p.learner_id,
        targetNodeId: p.target_node_id,
        targetTitle: titleById.get(p.target_node_id) ?? p.target_node_id,
        claim: p.claim,
        evidence: p.evidence,
        sources: p.sources,
        transferProof: p.transfer_proof,
        createdAt: p.created_at,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
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

  if (body.kind === "transfer_item") {
    const learnerId = (body.learnerId || "").trim();
    const nodeId = (body.nodeId || "").trim();
    if (!learnerId || !nodeId) return bad(400, "learnerId and nodeId are required");

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
      await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
    }

    return NextResponse.json({ decision: body.decision, stage: transition.nextStage }, { headers: { "cache-control": "no-store" } });
  }

  // kind === "production"
  const productionId = (body.productionId || "").trim();
  if (!productionId) return bad(400, "productionId is required");

  const { data: production, error: prodErr } = await svc
    .from("productions")
    .select("id,learner_id,target_node_id,status")
    .eq("id", productionId)
    .maybeSingle();
  if (prodErr) return bad(500, "read_failed");
  if (!production) return bad(404, "production_not_found");
  if (production.status !== "submitted") return bad(409, `production is already "${production.status}", not pending`);

  const newStatus = body.decision === "approved" ? "accepted" : "returned";
  const { error: updErr } = await svc.from("productions").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", productionId);
  if (updErr) return bad(500, "write_failed");

  const reviewEvidence = { at: new Date().toISOString(), decision: body.decision, reason: reason ?? null, reviewerId: reviewer.id };
  const { error: insErr } = await svc.from("teacher_reviews").insert({
    reviewer_id: reviewer.id,
    learner_id: production.learner_id,
    kind: "production",
    production_id: productionId,
    decision: body.decision,
    reason: reason ?? null,
    evidence: reviewEvidence,
  });
  if (insErr) return bad(500, "review_write_failed");

  // EVIDENCE-SCHEMA.md "The corrective event on graph.productions": a
  // returned production otherwise leaves no trace in
  // graph.learner_node_state.evidence (only graph.productions.status
  // changes). onProductionReturned appends the corrective event without
  // moving `stage` off "production" (see its own header). "accepted" needs
  // no matching call here: graph.productions.status = "accepted" IS that
  // record, per LEARNER-STATE-MODEL.md section 1.
  if (body.decision === "returned" && production.target_node_id) {
    const transition = onProductionReturned({ learnerText: reason });
    await recordEvidence(production.learner_id, production.target_node_id, transition.nextStage, transition.event as unknown as Record<string, unknown>);
  }

  return NextResponse.json({ decision: body.decision, status: newStatus }, { headers: { "cache-control": "no-store" } });
}
