import { graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { decideIrreducible, listIrreducible } from "@/lib/research-os/inference/review-actions";
import { bad, ok, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (r: { status: number; body: Record<string, unknown> }) => ok(r.body, r.status);

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  if (!(await verifyGraphReviewer(req))) return bad(403, "forbidden");
  return reply(await listIrreducible(graphService()));
});

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const reviewer = await verifyGraphReviewer(req);
  if (!reviewer) return bad(403, "forbidden");
  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as { id?: string; decision?: string; reason?: string };
  const id = (body.id || "").trim();
  if (!id) return bad(400, "id is required");
  if (body.decision !== "confirmed" && body.decision !== "rejected") return bad(400, "decision must be confirmed or rejected");
  return reply(await decideIrreducible(graphService(), { id, decision: body.decision, reason: (body.reason || "").trim() || null, reviewerId: reviewer.id }));
});
