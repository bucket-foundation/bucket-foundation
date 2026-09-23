import { NextRequest, NextResponse } from "next/server";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { decideNsmLink, listNsmLinkProposals, type NsmLinkDecision } from "@/lib/research-os/inference/nsm-link-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (r: { status: number; body: Record<string, unknown> }) => NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "no-store" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  if (!(await verifyGraphReviewer(req))) return reply({ status: 403, body: { error: "forbidden" } });
  return reply(await listNsmLinkProposals(graphService()));
}

export async function POST(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  const reviewer = await verifyGraphReviewer(req);
  if (!reviewer) return reply({ status: 403, body: { error: "forbidden" } });
  let body: { id?: string; decision?: string; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return reply({ status: 400, body: { error: "bad_request" } });
  }
  const id = (body.id || "").trim();
  if (!UUID.test(id)) return reply({ status: 400, body: { error: "id is required" } });
  if (body.decision !== "approved" && body.decision !== "rejected") return reply({ status: 400, body: { error: "decision must be approved or rejected" } });
  return reply(
    await decideNsmLink(graphService(), {
      id,
      decision: body.decision as NsmLinkDecision["decision"],
      reason: (body.reason || "").trim() || null,
      reviewerId: reviewer.id,
    }),
  );
}
