/** Load a person's cross-branch connections (connections.ts) from the graph. Server-only. */
import { graphService, inChunks, pagedRead } from "./db";
import { crossBranchConnections, type ConnEdge, type ConnNode } from "./connections";
import type { Stage } from "./types";

type EdgeRow = { id: string; from_id: string; to_id: string; kind: string };

/**
 * Every non-prerequisite edge touching one of these nodes, each exactly
 * once.
 *
 * Two things make that true. `id` is the final sort key on both reads,
 * because a page boundary landing inside a group of edges sharing a pair
 * would otherwise repeat one and skip another, and `id` is the primary
 * key so the order it completes is total. And an edge whose two ends are
 * both in `ids` comes back from both reads, so the results merge by that
 * same key. Nothing downstream deduplicates: a repeat inflates a held
 * count and a skip loses a connection.
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
  // This read feeds every id below it, and it was neither ordered nor
  // paged, so the connection counters capped at a thousand states
  // whatever the reads under them did.
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
  const nodeRows = await inChunks<ConnNode>(nodeIds, (chunk, page) => svc.from("nodes").select("id,slug,title,branch,kind").in("id", chunk).order("id").range(page.from, page.to) as unknown as Promise<{ data: ConnNode[] | null; error: { message: string } | null }>);
  const nodes: ConnNode[] = nodeRows.map((n) => ({ id: n.id, slug: n.slug, title: n.title, branch: n.branch, kind: n.kind }));
  return crossBranchConnections(states, nodes, edges);
}
