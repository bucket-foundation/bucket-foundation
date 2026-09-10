/**
 * Research OS for K-12, Phase 0, the prereq_ancestor closure table's
 * in-memory counterpart (bkt-ros, closing task item 1: "prereq_ancestor
 * closure table: migration plus a maintenance function or script that
 * rebuilds it from edges"). Pure functions over plain GraphEdge arrays, no
 * I/O, so three callers share one implementation of "backward ancestor
 * closure over prerequisite edges":
 *   - scripts/rebuild-prereq-ancestor.mjs, which writes the full closure to
 *     graph.prereq_ancestor;
 *   - src/lib/research-os/frontier.ts's computeFrontier, which prunes to a
 *     target's closure before walking when a closure table is available
 *     (see its optional `ancestorRows` parameter);
 *   - src/lib/research-os/probe.ts, which needs "does this learner have any
 *     state on any ancestor of the target" to decide whether a diagnostic
 *     probe is due.
 *
 * Mirrors RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3's
 * `graph.prereq_ancestor (node_id, ancestor_id, min_hops)` shape exactly, so
 * rows computed here upsert directly into that table with no reshaping.
 */
import type { GraphEdge, GraphNode } from "./types";

export interface PrereqAncestorRow {
  nodeId: string;
  ancestorId: string;
  minHops: number;
}

/**
 * Every ancestor of `targetId` reachable backward over `prerequisite` edges,
 * with the minimum hop count to each. Unconditional: does not stop at any
 * mastery boundary (that is frontier.ts's job) -- this is the full
 * graph-structural closure, exactly what a `graph.prereq_ancestor` row set
 * for one node represents. `targetId` itself is never included.
 */
export function ancestorsOf(targetId: string, edges: GraphEdge[]): Map<string, number> {
  const backward = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== "prerequisite") continue;
    if (!backward.has(e.toId)) backward.set(e.toId, []);
    backward.get(e.toId)!.push(e.fromId);
  }

  const hops = new Map<string, number>();
  const seen = new Set<string>([targetId]);
  const queue: Array<[string, number]> = [[targetId, 0]];
  while (queue.length) {
    const [cur, h] = queue.shift()!;
    for (const prev of backward.get(cur) ?? []) {
      if (seen.has(prev)) continue;
      seen.add(prev);
      hops.set(prev, h + 1);
      queue.push([prev, h + 1]);
    }
  }
  return hops;
}

/**
 * The full closure for every node in `nodes`, the exact row set
 * scripts/rebuild-prereq-ancestor.mjs persists to graph.prereq_ancestor. At
 * Phase 0/1 graph sizes (tens to low thousands of nodes) an O(V*(V+E))
 * recompute on every rebuild is fine; Phase 2+, per the review's own gap
 * analysis ("Prerequisite ancestor closure table", effort M, Phase 1), moves
 * this to an incrementally-refreshed worker instead of a full rebuild.
 */
export function computeAncestorClosure(nodes: GraphNode[], edges: GraphEdge[]): PrereqAncestorRow[] {
  const rows: PrereqAncestorRow[] = [];
  for (const n of nodes) {
    for (const [ancestorId, minHops] of ancestorsOf(n.id, edges)) {
      rows.push({ nodeId: n.id, ancestorId, minHops });
    }
  }
  return rows;
}
