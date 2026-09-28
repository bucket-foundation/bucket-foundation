import { graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { decideHistory, listHistoryReview, parseHistoryDecision } from "@/lib/history/review";
import { bad, ok, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  if (!(await verifyGraphReviewer(req))) return bad(403, "forbidden");
  const r = await listHistoryReview(graphService());
  return r.ok ? ok(r.value as unknown as Record<string, unknown>) : bad(r.status, r.error);
});

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const reviewer = await verifyGraphReviewer(req);
  if (!reviewer) return bad(403, "forbidden");
  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const parsed = parseHistoryDecision(read.value);
  if (!parsed.ok) return bad(400, parsed.error);
  const r = await decideHistory(graphService(), reviewer.id, parsed.value);
  return r.ok ? ok(r.value) : bad(r.status, r.error);
});
