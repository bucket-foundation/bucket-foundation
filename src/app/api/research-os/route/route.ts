/**
 * GET /api/research-os/route, frontier-backward routing (bkt-ros, task item
 * 3). Computes the ordered forward chain from the learner's frontier to a
 * target node over the Phase 0 seeded subgraph
 * (supabase/seed/research-os-sky-blue.json), per
 * RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3 and section 8's Phase 0 slice.
 *
 * Query params:
 *   target  required, a graph.nodes.slug (default branch's target is
 *           "why-the-sky-is-blue")
 *   branch  optional, default "02-physics" (the only seeded branch today)
 *
 * Auth: Authorization: Bearer <supabase access token> is OPTIONAL. Signed in,
 * the route reads that learner's real graph.learner_node_state rows. Signed
 * out, it computes the route for a fresh learner (no state records at all),
 * which is a valid input per the routing rule ("treat no record as access"),
 * letting the prototype page render a route before sign-in. A PRESENT but
 * invalid token is rejected (401) rather than silently treated as anonymous.
 *
 * 200: { target, frontier: [...], chain: [{ node, stage, hops, isFrontier }], gap: [...],
 *        engineFrontier: [{ node, prerequisiteNodeIds, heldCount, totalCount, heldFraction }] }
 * 400: bad target · 401: bad token · 404: target not found · 503: not configured
 *
 * `engineFrontier` (engine bridge task item 2) is optional and additive:
 * every engine hypothesis node (src/lib/research-os/engine-bridge.ts) in the
 * same branch whose `derives_from` prerequisites this learner mostly holds,
 * nearest first (src/lib/research-os/engine-frontier.ts). Empty until an
 * engine hypothesis has been ingested into this branch; the workspace page
 * renders it only when non-empty.
 */
import { NextRequest, NextResponse } from "next/server";
import { computeFrontier } from "@/lib/research-os/frontier";
import { findFrontierEngineTargets } from "@/lib/research-os/engine-frontier";
import { configured, loadSubgraph, loadLearnerStates, verifyLearner } from "@/lib/research-os/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");

  const { searchParams } = new URL(req.url);
  const targetSlug = (searchParams.get("target") || "why-the-sky-is-blue").trim();
  const branch = (searchParams.get("branch") || "02-physics").trim();
  if (!targetSlug) return bad(400, "target is required");

  // Optional auth: a present Authorization header must verify; absent is fine.
  let learnerId: string | null = null;
  if (req.headers.get("authorization")) {
    learnerId = await verifyLearner(req);
    if (!learnerId) return bad(401, "unauthorized");
  }

  let nodes, edges;
  try {
    ({ nodes, edges } = await loadSubgraph(branch));
  } catch {
    return bad(500, "graph_load_failed");
  }

  const target = nodes.find((n) => n.slug === targetSlug);
  if (!target) return bad(404, "target_not_found");

  const states = learnerId ? await loadLearnerStates(learnerId, nodes.map((n) => n.id)) : [];

  const result = computeFrontier(nodes, edges, states, target.id);
  const engineFrontier = findFrontierEngineTargets(nodes, edges, states);

  return NextResponse.json(
    {
      target: result.target,
      frontier: result.frontier,
      chain: result.chain,
      gap: result.gap,
      engineFrontier,
      learner: learnerId ? "self" : "anonymous",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
