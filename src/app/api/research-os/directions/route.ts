/**
 * Research OS, the Awareness view (ros-24): from a node, where knowledge
 * goes. GET /api/research-os/directions?node=<id>&branch=<slug>
 *   -> { dependents, frontier, openQuestions, reach }, nodes as
 *      { id, slug, title, kind, tier, frontierFlag }.
 * Optional auth: signed in, private and shared nodes the viewer may see are
 * included; signed out, public nodes only.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, loadSubgraph, verifyLearner } from "@/lib/research-os/db";
import { filterSubgraphForViewer } from "@/lib/research-os/access-db";
import { directionsFrom } from "@/lib/research-os/directions";
import type { GraphNode } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, ...NO_STORE });
}

const lite = (n: GraphNode) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, frontierFlag: n.frontierFlag ?? null });

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const { searchParams } = new URL(req.url);
  const nodeId = (searchParams.get("node") || "").trim();
  const branch = (searchParams.get("branch") || "02-physics").trim();
  if (!nodeId) return bad(400, "node_required");
  const viewerId = req.headers.get("authorization") ? await verifyLearner(req) : null;
  let graph;
  try {
    graph = await loadSubgraph(branch);
  } catch {
    return bad(500, "graph_load_failed");
  }
  const filtered = await filterSubgraphForViewer(graph.nodes, graph.edges, viewerId);
  if (filtered.unavailable) return bad(503, "access_unavailable");
  const { nodes, edges } = filtered;
  if (!nodes.some((n) => n.id === nodeId)) return bad(404, "node_not_found");
  const d = directionsFrom(nodeId, nodes, edges);
  return NextResponse.json(
    { dependents: d.dependents.map(lite), frontier: d.frontier.map(lite), openQuestions: d.openQuestions.map(lite), reach: d.reach },
    NO_STORE
  );
}
