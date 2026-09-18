/**
 * /api/research-os/node-proposals, the missing-prime review (ros-prime 2,
 * learning/research-os/PRIMES.md "Slice 2"). Backs graph.node_proposals,
 * filled by scripts/research-os/decompose-further.ts. The work lives in
 * src/lib/research-os/inference/review-actions.ts.
 *
 * GET  -> { branches, proposals }: every pending row, the most-named first,
 *   with each naming node's title and reason, the aliases merged into it,
 *   the existing nodes it may duplicate, and the branch approval would use.
 *
 * POST { id, decision: "approved" | "rejected", reason?, title?, summary?, branch? }
 *   Approving creates the concept node with the reviewer's title, summary,
 *   and branch (defaults from the proposal), at the lowest grade tier among
 *   the naming nodes, and queues an unchecked proposal from it to each of
 *   them. A decided proposal returns alreadyDecided and writes nothing.
 *
 * Auth and status codes match /api/research-os/edges.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { decideNode, listNodeProposals } from "@/lib/research-os/inference/review-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (r: { status: number; body: Record<string, unknown> }) =>
  NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "no-store" } });

export async function GET(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  if (!(await verifyReviewer(req))) return reply({ status: 403, body: { error: "forbidden" } });
  return reply(await listNodeProposals(graphService()));
}

interface Body {
  id?: string;
  decision?: "approved" | "rejected";
  reason?: string;
  title?: string;
  summary?: string;
  branch?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return reply({ status: 403, body: { error: "forbidden" } });
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return reply({ status: 400, body: { error: "bad_request" } });
  }
  const id = (body.id || "").trim();
  if (!id) return reply({ status: 400, body: { error: "id is required" } });
  if (body.decision !== "approved" && body.decision !== "rejected") return reply({ status: 400, body: { error: "decision must be approved or rejected" } });
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
}
