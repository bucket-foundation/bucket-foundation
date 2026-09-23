import { loadSubgraph, verifyLearner } from "@/lib/research-os/db";
import { filterSubgraphForViewer } from "@/lib/research-os/access-db";
import { directionsFrom } from "@/lib/research-os/directions";
import { bad, withResearchOsRoute } from "@/lib/research-os/route";
import type { GraphNode } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lite = (n: GraphNode) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, frontierFlag: n.frontierFlag ?? null });

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
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
  if (!filtered.ok) return bad(503, "access_unavailable");
  const { nodes, edges } = filtered;
  if (!nodes.some((n) => n.id === nodeId)) return bad(404, "node_not_found");
  const d = directionsFrom(nodeId, nodes, edges);
  return { dependents: d.dependents.map(lite), frontier: d.frontier.map(lite), openQuestions: d.openQuestions.map(lite), reach: d.reach };
});
