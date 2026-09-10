/**
 * /api/research-os/production, the Production form (bkt-ros, task item 4:
 * "a Production form (claim, evidence, sources, transfer proof) that saves
 * as draft") and the final stage rule (task item 5: "production (submitted
 * Production)"). Backs graph.productions.
 *
 * GET  ?targetNodeId=<id>  -> { productions: [...] } (the learner's own, newest first)
 * POST { id?, targetNodeId, claim?, evidence?, sources?, transferProof?, status? }
 *      -> upserts a draft (status defaults to "draft"); pass status:"submitted"
 *         to submit, which raises the target node's learner_node_state.stage
 *         to "production" (src/lib/research-os/stages.ts onProductionSubmitted).
 *         Phase 0 has no review queue, so "accepted"/"returned" are not
 *         settable here (task item 6, no teacher layer).
 *
 * Auth: Authorization: Bearer <supabase access token>, required.
 */
import { NextRequest, NextResponse } from "next/server";
import { onProductionSubmitted } from "@/lib/research-os/stages";
import { configured, graphService, verifyLearner, recordEvidence } from "@/lib/research-os/db";

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
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

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
    const transition = onProductionSubmitted();
    await recordEvidence(learnerId, data.target_node_id as string, transition.nextStage, transition.event as unknown as Record<string, unknown>);
  }

  return NextResponse.json({ production: data }, { headers: { "cache-control": "no-store" } });
}
