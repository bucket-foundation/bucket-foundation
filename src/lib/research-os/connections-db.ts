/** Load a person's cross-branch connections (connections.ts) from the graph. Server-only. */
import { graphService } from "./db";
import { crossBranchConnections, type ConnEdge, type ConnNode } from "./connections";
import type { Stage } from "./types";

export async function loadConnections(learnerId: string) {
  const svc = graphService();
  const { data: stateRows, error } = await svc
    .from("learner_node_state")
    .select("node_id,stage")
    .eq("learner_id", learnerId)
    .in("stage", ["understanding", "internalization", "production"]);
  if (error) throw new Error("read_failed");
  const states = ((stateRows as { node_id: string; stage: Stage }[]) || []).map((r) => ({ nodeId: r.node_id, stage: r.stage }));
  if (states.length === 0) return { held: [], bridges: [] };
  const ids = states.map((s) => s.nodeId);
  const [{ data: out }, { data: inn }] = await Promise.all([
    svc.from("edges").select("from_id,to_id,kind").in("from_id", ids).neq("kind", "prerequisite"),
    svc.from("edges").select("from_id,to_id,kind").in("to_id", ids).neq("kind", "prerequisite"),
  ]);
  const rows = [...((out as { from_id: string; to_id: string; kind: string }[]) || []), ...((inn as { from_id: string; to_id: string; kind: string }[]) || [])];
  const edges: ConnEdge[] = rows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind }));
  const nodeIds = Array.from(new Set(edges.flatMap((e) => [e.fromId, e.toId])));
  if (nodeIds.length === 0) return { held: [], bridges: [] };
  const { data: nodeRows } = await svc.from("nodes").select("id,slug,title,branch,kind").in("id", nodeIds);
  const nodes: ConnNode[] = ((nodeRows as ConnNode[]) || []).map((n) => ({ id: n.id, slug: n.slug, title: n.title, branch: n.branch, kind: n.kind }));
  return crossBranchConnections(states, nodes, edges);
}
