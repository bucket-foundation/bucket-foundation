import { NextRequest, NextResponse } from "next/server";
import { computeFrontier } from "@/lib/research-os/frontier";
import { llmEnabled } from "@/lib/research-os/deterministic";
import { filterSubgraphForViewer } from "@/lib/research-os/access-db";
import { findFrontierEngineTargets } from "@/lib/research-os/engine-frontier";
import { guidanceLevel } from "@/lib/research-os/guidance";
import type { GuidanceLevel } from "@/lib/research-os/types";
import { configured, loadSubgraph, loadLearnerStates, loadAncestorRows, writeEdgeFlags, verifyLearner, isGuidanceEnabledForLearner, graphService } from "@/lib/research-os/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");

  const { searchParams } = new URL(req.url);
  const targetSlug = (searchParams.get("target") || "why-the-sky-is-blue").trim();
  let branch = (searchParams.get("branch") || "").trim();
  if (!branch) {
    const { data: t, error: tErr } = await graphService().from("nodes").select("branch").eq("slug", targetSlug).maybeSingle();
    if (tErr) {
      console.error("[research-os/route] target branch read failed:", tErr.message);
      return bad(503, "graph_read_failed");
    }
    branch = ((t as { branch?: string } | null)?.branch || "02-physics").trim();
  }
  if (!targetSlug) return bad(400, "target is required");

  let learnerId: string | null = null;
  if (req.headers.get("authorization")) {
    learnerId = await verifyLearner(req);
    if (!learnerId) return bad(401, "unauthorized");
  }

  let nodes, edges;
  try {
    ({ nodes, edges } = await loadSubgraph(branch, { externalFactors: true }));
    const filtered = await filterSubgraphForViewer(nodes, edges, learnerId);
    if (!filtered.ok) return bad(503, "access_unavailable");
    ({ nodes, edges } = filtered);
  } catch {
    return bad(500, "graph_load_failed");
  }

  const target = nodes.find((n) => n.slug === targetSlug);
  if (!target) return bad(404, "target_not_found");

  const states = learnerId ? await loadLearnerStates(learnerId, nodes.map((n) => n.id)) : [];

  const ancestorRows = await loadAncestorRows(target.id);
  const result = computeFrontier(nodes, edges, states, target.id, ancestorRows);
  const engineFrontier = findFrontierEngineTargets(nodes, edges, states);

  if (learnerId && result.lowConfidenceFlags.length > 0) {
    try {
      await writeEdgeFlags(learnerId, target.id, result.lowConfidenceFlags);
    } catch (err) {
      console.error("[research-os/route] writeEdgeFlags failed:", err instanceof Error ? err.message : err);
    }
  }

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
      openQuestions: nodes.filter((n) => n.frontierFlag === "open_question").map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier })),
      guidance,
      llmEnabled: llmEnabled(),
      learner: learnerId ? "self" : "anonymous",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
