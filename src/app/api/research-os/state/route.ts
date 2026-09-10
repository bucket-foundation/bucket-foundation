/**
 * /api/research-os/state, learner-node-state reads and the two direct stage
 * events (bkt-ros, task item 5): opening a node (access -> awareness) and
 * answering a transfer item (understanding -> internalization, stubbed to
 * auto-hold in Phase 0, see src/lib/research-os/stages.ts).
 *
 * The other two transitions live elsewhere: awareness -> understanding is
 * decided by the Check tool (POST /api/research-os/workspace action=check),
 * and the production transition by POST /api/research-os/production.
 *
 * GET  ?nodeIds=id1,id2   -> { states: [{ nodeId, stage, confidence, updatedAt }] }
 * POST { nodeId, action: "open" | "transfer_item" } -> { stage, event }
 *
 * Auth: Authorization: Bearer <supabase access token>, required for both.
 * 401 unauthorized · 400 bad input · 503 not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { onNodeOpened, onTransferItemAnswered } from "@/lib/research-os/stages";
import type { Stage } from "@/lib/research-os/types";
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
  const nodeIds = (searchParams.get("nodeIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (nodeIds.length === 0) return NextResponse.json({ states: [] });

  const svc = graphService();
  const { data, error } = await svc
    .from("learner_node_state")
    .select("node_id,stage,confidence,updated_at")
    .eq("learner_id", learnerId)
    .in("node_id", nodeIds);
  if (error) return bad(500, "read_failed");

  return NextResponse.json({
    states: (data || []).map((r: { node_id: string; stage: string; confidence: number | null; updated_at: string }) => ({
      nodeId: r.node_id,
      stage: r.stage,
      confidence: r.confidence,
      updatedAt: r.updated_at,
    })),
  });
}

interface StateBody {
  nodeId?: string;
  action?: "open" | "transfer_item";
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  let body: StateBody;
  try {
    body = (await req.json()) as StateBody;
  } catch {
    return bad(400, "bad_request");
  }
  const nodeId = (body.nodeId || "").trim();
  if (!nodeId) return bad(400, "nodeId is required");
  if (body.action !== "open" && body.action !== "transfer_item") return bad(400, "unknown action");

  const svc = graphService();
  const { data: existing } = await svc
    .from("learner_node_state")
    .select("stage")
    .eq("learner_id", learnerId)
    .eq("node_id", nodeId)
    .maybeSingle();
  const currentStage = ((existing?.stage as Stage | undefined) ?? "access") as Stage;

  const transition = body.action === "open" ? onNodeOpened(currentStage) : onTransferItemAnswered(currentStage);

  await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);

  return NextResponse.json({ stage: transition.nextStage, event: transition.event }, { headers: { "cache-control": "no-store" } });
}
