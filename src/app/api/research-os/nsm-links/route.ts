import type { NextRequest } from "next/server";
import { graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { bad, ok, withResearchOsRoute } from "@/lib/research-os/route";
import { decideNsmLink, listNsmLinkProposals, type NsmLinkDecision } from "@/lib/research-os/inference/nsm-link-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (r: { status: number; body: Record<string, unknown> }) => ok(r.body, r.status);

export const GET = withResearchOsRoute({ auth: "none" }, async (req: NextRequest) => {
  if (!(await verifyGraphReviewer(req))) return bad(403, "forbidden");
  return reply(await listNsmLinkProposals(graphService()));
});

export const POST = withResearchOsRoute({ auth: "none" }, async (req: NextRequest) => {
  const reviewer = await verifyGraphReviewer(req);
  if (!reviewer) return bad(403, "forbidden");
  let body: { id?: string; decision?: string; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad(400, "bad_request");
  }
  const id = (body.id || "").trim();
  if (!UUID.test(id)) return bad(400, "id is required");
  if (body.decision !== "approved" && body.decision !== "rejected") return bad(400, "decision must be approved or rejected");
  return reply(
    await decideNsmLink(graphService(), {
      id,
      decision: body.decision as NsmLinkDecision["decision"],
      reason: (body.reason || "").trim() || null,
      reviewerId: reviewer.id,
    }),
  );
});
