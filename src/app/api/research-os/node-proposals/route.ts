import { graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { decideNode, listNodeProposals } from "@/lib/research-os/inference/review-actions";
import { bad, ok, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (r: { status: number; body: Record<string, unknown> }) => ok(r.body, r.status);

interface Body {
  id?: string;
  decision?: "approved" | "rejected";
  reason?: string;
  title?: string;
  summary?: string;
  branch?: string;
}

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  if (!(await verifyGraphReviewer(req))) return bad(403, "forbidden");
  return reply(await listNodeProposals(graphService()));
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
  const clip = (s: unknown, n: number) => (typeof s === "string" && s.trim() ? s.trim().slice(0, n) : undefined);
  return reply(
    await decideNode(graphService(), {
      id,
      decision: body.decision,
      reason: (body.reason || "").trim() || null,
      reviewerId: reviewer.id,
      overrides: { title: clip(body.title, 160), summary: clip(body.summary, 2000), branch: clip(body.branch, 60) },
    }),
  );
});
