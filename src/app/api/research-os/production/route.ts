/**
 * /api/research-os/production, the Production form (bkt-ros, task item 4:
 * "a Production form (claim, evidence, sources, transfer proof) that saves
 * as draft") and the final stage rule (task item 5: "production (submitted
 * Production)"). Backs graph.productions.
 *
 * GET  ?targetNodeId=<id>  -> { productions: [...] } (the learner's own, newest first)
 * POST { id?, targetNodeId, claim?, evidence?, sources?, transferProof?, status?, sessionId? }
 *      -> upserts a draft (status defaults to "draft"); pass status:"submitted"
 *         to submit, which raises the target node's learner_node_state.stage
 *         to "production" (src/lib/research-os/stages.ts onProductionSubmitted).
 *         Phase 0 has no review queue, so "accepted"/"returned" are not
 *         settable here (task item 6, no teacher layer).
 *
 * Engine bridge task item 3: whenever a write here leaves a production at
 * status "accepted", its row is emitted to `public.research_os_
 * productions_outbox` (db.ts's emitProductionOutboxIfAccepted, shared with
 * /api/research-os/review's own accept path, ros-06). This route's own
 * status validation above never lets a learner set "accepted" directly;
 * the accept path lives in the review route once a teacher approves. See
 * learning/research-os/ENGINE-BRIDGE.md.
 *
 * Auth: Authorization: Bearer <supabase access token>, required.
 *
 * Consent gate (bkt-ros ros-07 follow-up, "consent gate wiring"): POST is
 * gated by src/lib/research-os/consent.ts's requireConsent, action
 * "production_submit", checked right after verifyLearner and before the
 * body is even parsed. This covers a draft save as well as a submit: both
 * carry the learner's own claim/evidence/sources/transfer-proof text. GET
 * (reading back the learner's own already-saved productions) is not
 * gated. A blocked POST returns 403 with consentBlockedBody(gate) as its
 * body.
 */
import { NextRequest, NextResponse } from "next/server";
import { onProductionSubmitted } from "@/lib/research-os/stages";
import { consentBlockedBody, requireConsent } from "@/lib/research-os/consent";
import { configured, graphService, verifyLearner, recordEvidence, emitProductionOutboxIfAccepted, loadCurrentStage } from "@/lib/research-os/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  const { searchParams } = new URL(req.url);
  const targetNodeId = searchParams.get("targetNodeId");

  const svc = graphService();
  let q = svc.from("productions").select("*").eq("learner_id", learnerId).order("created_at", { ascending: false });
  if (targetNodeId) q = q.eq("target_node_id", targetNodeId);
  const { data, error } = await q;
  if (error) return bad(500, "read_failed");
  return NextResponse.json({ productions: data || [] }, { headers: { "cache-control": "no-store" } });
}

interface ProductionBody {
  id?: string;
  targetNodeId?: string;
  claim?: string;
  evidence?: unknown[];
  sources?: unknown[];
  transferProof?: Record<string, unknown>;
  status?: "draft" | "submitted";
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  const gate = await requireConsent(learnerId, "production_submit");
  if (!gate.allowed) return NextResponse.json(consentBlockedBody(gate), { status: 403 });

  let body: ProductionBody;
  try {
    body = (await req.json()) as ProductionBody;
  } catch {
    return bad(400, "bad_request");
  }
  if (!body.id && !body.targetNodeId) return bad(400, "targetNodeId is required for a new production");
  if (body.status && body.status !== "draft" && body.status !== "submitted") {
    return bad(400, 'status must be "draft" or "submitted" (accept/return require a teacher, Phase 1)');
  }

  const svc = graphService();

  // Ownership check: the service-role client bypasses RLS, so an update-by-id
  // must verify the existing row belongs to this learner here, in application
  // code, before the upsert -- otherwise a learner who knows or guesses
  // another learner's production id could overwrite that row and reassign it
  // to themselves (the RLS own_update policy would block this on a direct
  // client, but this route never uses that path).
  if (body.id) {
    const { data: owned, error: ownErr } = await svc
      .from("productions")
      .select("learner_id")
      .eq("id", body.id)
      .maybeSingle();
    if (ownErr) return bad(500, "read_failed");
    if (!owned) return bad(404, "production_not_found");
    if (owned.learner_id !== learnerId) return bad(403, "forbidden");
  }

  const row: Record<string, unknown> = {
    learner_id: learnerId,
    claim: body.claim ?? null,
    evidence: body.evidence ?? [],
    sources: body.sources ?? [],
    transfer_proof: body.transferProof ?? {},
    status: body.status ?? "draft",
    updated_at: new Date().toISOString(),
  };
  if (body.id) row.id = body.id;
  if (body.targetNodeId) row.target_node_id = body.targetNodeId;

  const { data, error } = await svc.from("productions").upsert(row, { onConflict: "id" }).select("*").maybeSingle();
  if (error) return bad(500, "write_failed");

  if (body.status === "submitted" && data?.target_node_id) {
    // ros-04: fetch the real stage first so the evidence event's
    // `fromStage` reflects the learner's real prior stage (see db.ts's
    // loadCurrentStage), instead of an assumed one.
    const currentStage = await loadCurrentStage(learnerId, data.target_node_id as string);
    const transition = onProductionSubmitted(currentStage, { sessionId: (body.sessionId || "").trim() || undefined });
    await recordEvidence(learnerId, data.target_node_id as string, transition.nextStage, transition.event as unknown as Record<string, unknown>);
  }

  // Engine bridge task item 3: an accepted production is the engine's own
  // evidence item. Unreachable today (the status validation above never lets
  // a learner set "accepted"), wired for Phase 1's teacher-accept path
  // (bkt-ros ros-06, /api/research-os/review's POST), which shares this
  // exact emit function rather than duplicating it. See db.ts's
  // emitProductionOutboxIfAccepted for the best-effort posture.
  if (data) {
    await emitProductionOutboxIfAccepted({
      id: data.id as string,
      target_node_id: data.target_node_id as string,
      claim: (data.claim as string | null) ?? null,
      evidence: (data.evidence as unknown[]) ?? [],
      sources: (data.sources as unknown[]) ?? [],
      status: data.status as string,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string | undefined,
    });
  }

  return NextResponse.json({ production: data }, { headers: { "cache-control": "no-store" } });
}
