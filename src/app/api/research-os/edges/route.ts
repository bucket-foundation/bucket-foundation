import { graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { decideEdge, KINDS, listEdgeProposals } from "@/lib/research-os/inference/review-actions";
import type { ApprovedKind } from "@/lib/research-os/inference/decide";
import { bad, ok, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (r: { status: number; body: Record<string, unknown> }) => ok(r.body, r.status);

interface Body {
  id?: string;
  decision?: "approved" | "rejected";
  kind?: string;
  reason?: string;
}

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  if (!(await verifyGraphReviewer(req))) return bad(403, "forbidden");
  return reply(await listEdgeProposals(graphService(), req.nextUrl.searchParams.get("source")));
});

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const reviewer = await verifyGraphReviewer(req);
  if (!reviewer) return bad(403, "forbidden");
  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as Body;
  const id = (body.id || "").trim();
  if (!id) return bad(400, "id is required");
  if (body.decision !== "approved" && body.decision !== "rejected") return bad(400, "decision must be approved or rejected");
  if (body.kind !== undefined && !KINDS.has(body.kind as ApprovedKind)) return bad(400, "kind must be prerequisite or derives_from");
  return reply(
    await decideEdge(graphService(), {
      id,
      decision: body.decision,
      kind: body.kind as ApprovedKind | undefined,
      reason: (body.reason || "").trim() || null,
      reviewerId: reviewer.id,
    }),
  );
});
