/** Load a person's cross-branch connections (connections.ts) from the graph. Server-only. */
import { graphService, inChunks, pagedRead } from "./db";
import { authorizeNodes, readVisibility, storeWithNodes } from "./read-access";
import type { NodeAccess } from "./access";
import { crossBranchConnections, type ConnEdge, type ConnNode } from "./connections";
import type { Stage } from "./types";

type EdgeRow = { id: string; from_id: string; to_id: string; kind: string };

/**
 * Every non-prerequisite edge touching one of these nodes, each exactly
 * once.
 *
 * Two things make that true. `id` is the final sort key on both reads,
 * because a page boundary landing inside a group of edges that share a
 * pair would otherwise repeat one and skip another, and `id` is the
 * primary key so the order it completes is total (Bucket critic C48).
 * And an edge whose two ends are both in `ids` comes back from both
 * reads, so the results merge by that same key.
 *
 * Exported for `scripts/test-research-os-connections-paging.ts`, which
 * seeds past the row cap and checks both properties.
 */
export async function loadTouchingEdges(ids: string[]): Promise<ConnEdge[]> {
  const svc = graphService();
  const [out, inn] = await Promise.all([
    inChunks<EdgeRow>(ids, (chunk, page) => svc.from("edges").select("id,from_id,to_id,kind").in("from_id", chunk).neq("kind", "prerequisite").order("from_id").order("to_id").order("id").range(page.from, page.to) as unknown as Promise<{ data: EdgeRow[] | null; error: { message: string } | null }>),
    inChunks<EdgeRow>(ids, (chunk, page) => svc.from("edges").select("id,from_id,to_id,kind").in("to_id", chunk).neq("kind", "prerequisite").order("to_id").order("from_id").order("id").range(page.from, page.to) as unknown as Promise<{ data: EdgeRow[] | null; error: { message: string } | null }>),
  ]);
  const byId = new Map<string, EdgeRow>();
  for (const e of [...out, ...inn]) byId.set(e.id, e);
  return Array.from(byId.values()).map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind }));
}

export async function loadConnections(learnerId: string) {
  const svc = graphService();
  const stateRows = await pagedRead<{ node_id: string; stage: Stage }>((page) =>
    svc
      .from("learner_node_state")
      .select("node_id,stage")
      .eq("learner_id", learnerId)
      .in("stage", ["understanding", "internalization", "production"])
      .order("node_id")
      .range(page.from, page.to) as unknown as Promise<{ data: { node_id: string; stage: Stage }[] | null; error: { message: string } | null }>,
  );
  const states = stateRows.map((r) => ({ nodeId: r.node_id, stage: r.stage }));
  if (states.length === 0) return { held: [], bridges: [] };
  const ids = states.map((s) => s.nodeId);
  const edges: ConnEdge[] = await loadTouchingEdges(ids);
  const nodeIds = Array.from(new Set(edges.flatMap((e) => [e.fromId, e.toId])));
  if (nodeIds.length === 0) return { held: [], bridges: [] };
  // A bridge points at a node the learner holds no state on, which is
  // exactly the node they may have no right to see, so the titles are
  // filtered before they are joined (Bucket critic C20). The select
  // carries visibility and owner, so the decision costs no extra read.
  type NodeRow = ConnNode & { visibility: string | null; owner_id: string | null };
  const nodeRows = await inChunks<NodeRow>(nodeIds, (chunk, page) => svc.from("nodes").select("id,slug,title,branch,kind,visibility,owner_id").in("id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: NodeRow[] | null; error: { message: string } | null }>);
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
