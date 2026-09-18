/**
 * /api/research-os/irreducible, the review of nodes the decompose-further
 * queue called irreducible (learning/research-os/PRIMES.md, "Slice 2"): the
 * founder's primes, the ideas that do not break down further. Backs
 * graph.irreducible_proposals. The work lives in
 * src/lib/research-os/inference/review-actions.ts.
 *
 * GET  -> { proposals }: pending verdicts, the nodes most rested on first.
 * POST { id, decision: "confirmed" | "rejected", reason? }. A confirmed node
 *   leaves the decompose-further targets; a rejected one returns to them.
 *
 * Auth and status codes match /api/research-os/edges.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { decideIrreducible, listIrreducible } from "@/lib/research-os/inference/review-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (r: { status: number; body: Record<string, unknown> }) =>
  NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "no-store" } });

export async function GET(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  if (!(await verifyReviewer(req))) return reply({ status: 403, body: { error: "forbidden" } });
  return reply(await listIrreducible(graphService()));
}

export async function POST(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return reply({ status: 403, body: { error: "forbidden" } });
  let body: { id?: string; decision?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return reply({ status: 400, body: { error: "bad_request" } });
  }
  const id = (body.id || "").trim();
  if (!id) return reply({ status: 400, body: { error: "id is required" } });
  if (body.decision !== "confirmed" && body.decision !== "rejected") return reply({ status: 400, body: { error: "decision must be confirmed or rejected" } });
  return reply(await decideIrreducible(graphService(), { id, decision: body.decision, reason: (body.reason || "").trim() || null, reviewerId: reviewer.id }));
}
