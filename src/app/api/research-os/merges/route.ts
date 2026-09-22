/**
 * /api/research-os/merges: the duplicate-node queue (ros-graph-dedup).
 *
 * GET lists pending pairs with both nodes; POST { id, decision:
 * "merge" | "merge_swapped" | "reject", reason? } merges the pair, either
 * way round, or keeps both. Graph reviewers only (verifyGraphReviewer, the
 * same gate as /api/research-os/edges).
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { decideMerge, listMergeProposals, type MergeDecision } from "@/lib/research-os/inference/merge-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (r: { status: number; body: Record<string, unknown> }) => NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "no-store" } });

const DECISIONS = new Set<MergeDecision["decision"]>(["merge", "merge_swapped", "reject"]);

export async function GET(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  if (!(await verifyGraphReviewer(req))) return reply({ status: 403, body: { error: "forbidden" } });
  return reply(await listMergeProposals(graphService()));
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
  if (!id) return reply({ status: 400, body: { error: "id is required" } });
  if (!DECISIONS.has(body.decision as MergeDecision["decision"])) return reply({ status: 400, body: { error: "decision must be merge, merge_swapped or reject" } });
  return reply(
    await decideMerge(graphService(), {
      id,
      decision: body.decision as MergeDecision["decision"],
      reason: (body.reason || "").trim() || null,
      reviewerId: reviewer.id,
    }),
  );
}
