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
 * 200: { target, frontier: [...], chain: [{ node, stage, hops, isFrontier, edgeConfidence, pathConfidence }],
 *        gap: [...], lowConfidenceFlags: [...],
 *        engineFrontier: [{ node, prerequisiteNodeIds, heldCount, totalCount, heldFraction }] }
 * 400: bad target · 401: bad token · 404: target not found · 503: not configured
 *
 * `engineFrontier` (engine bridge task item 2) is optional and additive:
 * every engine hypothesis node (src/lib/research-os/engine-bridge.ts) in the
 * same branch whose `derives_from` prerequisites this learner mostly holds,
 * nearest first (src/lib/research-os/engine-frontier.ts). Empty until an
 * engine hypothesis has been ingested into this branch; the workspace page
 * renders it only when non-empty.
 *
 * Phase 1 (bkt-ros, closing stub list item 1): also reads
 * graph.prereq_ancestor for the target (db.ts's loadAncestorRows) and
 * passes the rows to computeFrontier, which prunes the walk to the target's
 * closure when rows exist. An empty result (table not yet rebuilt for this
 * branch, or a read error) is a normal input: computeFrontier treats it as
 * no closure table yet and falls back to its original full-graph walk
 * unchanged.
 *
 * Phase 1 (bkt-ros ros-03 item 2/3): computeFrontier now prefers the
 * highest-confidence chain to the target and returns `lowConfidenceFlags`,
 * every edge on the returned chain below LOW_CONFIDENCE_THRESHOLD. For a
 * signed-in learner, those flags are also written to graph.edge_flags
 * (db.ts's writeEdgeFlags) so ros-06's class view can surface them; an
 * anonymous request has no learner to attach a flag to, so the write is
 * skipped (the flags still come back in the response either way). The
 * write is best-effort: a failure there never fails the route response
 * itself, matching loadAncestorRows' own fail-open posture.
 *
 * ros-14 UPDATE (faded guidance for low-prior-knowledge learners): the
 * response gains `guidance`, this learner's current GuidanceLevel
 * (guidance.ts's own server function, from this response's own `chain`)
 * forced to "low" when the learner's class has the research_os_
 * guidance_enabled arm switch off, or `null` for an anonymous request (no
 * learner state to compute a level from). The workspace page reads this to
 * decide how much of the selected node's worked example to show before
 * the learner's own explanation box (GUIDANCE.md section 2).
 */
import { NextRequest, NextResponse } from "next/server";
import { computeFrontier } from "@/lib/research-os/frontier";
import { findFrontierEngineTargets } from "@/lib/research-os/engine-frontier";
import { guidanceLevel } from "@/lib/research-os/guidance";
import type { GuidanceLevel } from "@/lib/research-os/types";
import {
  configured,
  loadSubgraph,
  loadLearnerStates,
  loadAncestorRows,
  writeEdgeFlags,
  verifyLearner,
  isGuidanceEnabledForLearner,
} from "@/lib/research-os/db";

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

  // Phase 1 item 1: prune to the target's precomputed closure when
  // graph.prereq_ancestor has rows for it. loadAncestorRows fails open to
  // [], which computeFrontier treats as "no closure table yet" and falls
  // back to its original full-graph walk -- never a hard failure here.
  const ancestorRows = await loadAncestorRows(target.id);
  const result = computeFrontier(nodes, edges, states, target.id, ancestorRows);
  const engineFrontier = findFrontierEngineTargets(nodes, edges, states);

  if (learnerId && result.lowConfidenceFlags.length > 0) {
    try {
      await writeEdgeFlags(learnerId, target.id, result.lowConfidenceFlags);
    } catch (err) {
      // Best-effort side channel: a flag-write failure must never fail the
      // route response the learner is waiting on.
      console.error("[research-os/route] writeEdgeFlags failed:", err instanceof Error ? err.message : err);
    }
  }

  // ros-14: a signed-in learner's guidance level, forced to "low" behind
  // the class arm switch; both reads fail open (guidanceLevel to "medium"
  // by construction, isGuidanceEnabledForLearner to true) rather than
  // failing the whole route response.
  let guidance: GuidanceLevel | null = null;
  if (learnerId) {
    try {
      guidance = await guidanceLevel(learnerId, result.chain);
      if (!(await isGuidanceEnabledForLearner(learnerId))) guidance = "low";
    } catch {
      guidance = "medium";
    }
  }

  return NextResponse.json(
    {
      target: result.target,
      frontier: result.frontier,
      chain: result.chain,
      gap: result.gap,
      lowConfidenceFlags: result.lowConfidenceFlags,
      engineFrontier,
      guidance,
      learner: learnerId ? "self" : "anonymous",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
