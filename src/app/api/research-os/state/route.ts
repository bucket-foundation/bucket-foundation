import { NextRequest, NextResponse } from "next/server";
import { onNodeOpened, onTransferItemAnswered } from "@/lib/research-os/stages";
import { consentRefusal, requireConsent } from "@/lib/research-os/consent";
import type { Stage } from "@/lib/research-os/types";
import { configured, graphService, verifyLearner, recordEvidence } from "@/lib/research-os/db";
import { authorizeNode } from "@/lib/research-os/read-access";
import { evidenceErrorResponse } from "@/lib/research-os/evidence-errors";

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

const MAX_TRANSFER_ANSWER_CHARS = 2000;

interface StateBody {
  nodeId?: string;
  action?: "open" | "transfer_item";
  answer?: string;
  itemId?: string;
  sessionId?: string;
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
  const sessionId = (body.sessionId || "").trim() || undefined;
  const answer = (body.answer || "").trim();
  if (body.action === "transfer_item") {
    const gate = await requireConsent(learnerId, "transfer_answer");
    if (!gate.allowed) {
      const refusal = consentRefusal(gate);
      return NextResponse.json(refusal.body, { status: refusal.status });
    }
    if (!answer) return bad(400, "answer is required");
    if (answer.length > MAX_TRANSFER_ANSWER_CHARS) return bad(400, "answer too long");
  }

  const continuable = await authorizeNode(nodeId, { id: learnerId }, "continue");
  if (!continuable.ok) {
    if (continuable.reason === "unavailable") return bad(503, "access_unavailable");
    return bad(404, "node_not_found");
  }

  const svc = graphService();
  const { data: existing } = await svc
    .from("learner_node_state")
    .select("stage")
    .eq("learner_id", learnerId)
    .eq("node_id", nodeId)
    .maybeSingle();
  const currentStage = ((existing?.stage as Stage | undefined) ?? "access") as Stage;

  const transition =
    body.action === "open"
      ? onNodeOpened(currentStage, { sessionId })
      : onTransferItemAnswered(currentStage, { learnerText: answer, itemId: (body.itemId || "").trim() || undefined, sessionId });

  try {
    await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);
  } catch (err) {
    const mapped = evidenceErrorResponse(err);
    if (mapped) return mapped;
    throw err;
  }

  return NextResponse.json({ stage: transition.nextStage, event: transition.event }, { headers: { "cache-control": "no-store" } });
}
