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
 *
 * Consent gate (bkt-ros ros-07 follow-up, "consent gate wiring"): only
 * action "transfer_item" is gated by src/lib/research-os/consent.ts's
 * requireConsent (action "transfer_answer"), checked before the answer is
 * validated or written. action "open" stays ungated on purpose: it
 * records a navigation event (a learner viewed a node) rather than
 * learner-authored content, and a signed-in minor with no profile yet
 * still needs to be able to browse the map and reach /research-os/profile,
 * the page this gate's "no_profile" case points them to. A blocked
 * transfer_item POST returns 403 with consentBlockedBody(gate) as its
 * body.
 */
import { NextRequest, NextResponse } from "next/server";
import { onNodeOpened, onTransferItemAnswered } from "@/lib/research-os/stages";
import { consentBlockedBody, requireConsent } from "@/lib/research-os/consent";
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

const MAX_TRANSFER_ANSWER_CHARS = 2000;

interface StateBody {
  nodeId?: string;
  action?: "open" | "transfer_item";
  /** The learner's own transfer-item answer text (EVIDENCE-SCHEMA.md's
   * "no stored ... transfer-item answer" gap); required only for
   * action "transfer_item". */
  answer?: string;
  /** The fixed per-target transfer-item id (state route header + this
   * file's POST handler); required only for action "transfer_item". */
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
    if (!gate.allowed) return NextResponse.json(consentBlockedBody(gate), { status: 403 });
    if (!answer) return bad(400, "answer is required");
    if (answer.length > MAX_TRANSFER_ANSWER_CHARS) return bad(400, "answer too long");
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

  await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);

  return NextResponse.json({ stage: transition.nextStage, event: transition.event }, { headers: { "cache-control": "no-store" } });
}
