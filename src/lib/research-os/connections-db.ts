/** Load a person's cross-branch connections (connections.ts) from the graph. Server-only. */
import { graphService, inChunks } from "./db";
import { authorizeNodes, readVisibility, storeWithNodes } from "./read-access";
import type { NodeAccess } from "./access";
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
  type Row = { from_id: string; to_id: string; kind: string };
  const [out, inn] = await Promise.all([
    inChunks<Row>(ids, (chunk) => svc.from("edges").select("from_id,to_id,kind").in("from_id", chunk).neq("kind", "prerequisite") as unknown as Promise<{ data: Row[] | null; error: { message: string } | null }>),
    inChunks<Row>(ids, (chunk) => svc.from("edges").select("from_id,to_id,kind").in("to_id", chunk).neq("kind", "prerequisite") as unknown as Promise<{ data: Row[] | null; error: { message: string } | null }>),
  ]);
  const rows = [...out, ...inn];
  const edges: ConnEdge[] = rows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind }));
  const nodeIds = Array.from(new Set(edges.flatMap((e) => [e.fromId, e.toId])));
  if (nodeIds.length === 0) return { held: [], bridges: [] };
  // A bridge points at a node the learner holds no state on, which is
  // exactly the node they may have no right to see, so the titles are
  // filtered before they are joined (Bucket critic C20). The select
  // carries visibility and owner, so the decision costs no extra read.
  type NodeRow = ConnNode & { visibility: string | null; owner_id: string | null };
  const nodeRows = await inChunks<NodeRow>(nodeIds, (chunk) => svc.from("nodes").select("id,slug,title,branch,kind,visibility,owner_id").in("id", chunk) as unknown as Promise<{ data: NodeRow[] | null; error: { message: string } | null }>);
  const access: NodeAccess[] = nodeRows.map((n) => ({
    id: n.id,
    visibility: readVisibility(n.visibility),
    ownerId: n.owner_id ?? null,
  }));
  const decision = await authorizeNodes(nodeRows.map((n) => n.id), { id: learnerId }, "view", storeWithNodes(access));
  if (!decision.ok) return { held: [], bridges: [], unavailable: true };
  const visible = new Set(decision.allowed);
  const nodes: ConnNode[] = nodeRows
    .filter((n) => visible.has(n.id))
    .map((n) => ({ id: n.id, slug: n.slug, title: n.title, branch: n.branch, kind: n.kind }));
  const readableEdges = edges.filter((e) => visible.has(e.fromId) && visible.has(e.toId));
  return crossBranchConnections(states, nodes, readableEdges);
}
