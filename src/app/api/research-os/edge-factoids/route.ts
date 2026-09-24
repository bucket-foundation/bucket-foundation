import { graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { isEdgeId, purgeEdgeFactoids } from "@/lib/research-os/edge-factoids";
import { bad, ok, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const reviewer = await verifyGraphReviewer(req);
  if (!reviewer) return bad(403, "forbidden");
  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as { action?: string; edgeId?: unknown };
  if (body.action !== "purge") return bad(400, "action must be purge");
  if (!isEdgeId(body.edgeId)) return bad(400, "edgeId must be an edge uuid");
  const r = await purgeEdgeFactoids(graphService(), body.edgeId, reviewer.id);
  return ok(r.body, r.status);
});
