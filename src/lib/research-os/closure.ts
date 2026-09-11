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
 * `graph.prereq_ancestor (node_id, ancestor_id, min_hops)` shape, extended
 * (bkt-ros ros-03 item 1) with a `min_confidence` column: the minimum
 * single-edge confidence along the same shortest-hop path `min_hops`
 * already walks, a cheap summary statistic. frontier.ts's computeFrontier
 * runs the heavier confidence-optimal, max-product search at request time,
 * over live graph.edges, when a learner routes; that walk is the source of
 * routing confidence. The closure table here stays a fast pruning input
 * (see frontier.ts's `ancestorRows` parameter).
 */
import type { GraphEdge, GraphNode } from "./types";
import { edgeConfidence } from "./types";

export interface PrereqAncestorRow {
  nodeId: string;
  ancestorId: string;
  minHops: number;
  minConfidence: number;
}

export interface AncestorInfo {
  hops: number;
  minConfidence: number;
}

/**
 * Every ancestor of `targetId` reachable backward over `prerequisite` edges,
 * with the minimum hop count to each and the minimum single-edge confidence
 * along that same shortest-hop path. Unconditional: does not stop at any
 * mastery boundary (that is frontier.ts's job) -- this is the full
 * graph-structural closure, exactly what a `graph.prereq_ancestor` row set
 * for one node represents. `targetId` itself is never included.
 */
export function ancestorsOf(targetId: string, edges: GraphEdge[]): Map<string, AncestorInfo> {
  const backward = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    if (e.kind !== "prerequisite") continue;
    if (!backward.has(e.toId)) backward.set(e.toId, []);
    backward.get(e.toId)!.push(e);
  }

  const info = new Map<string, AncestorInfo>();
  const seen = new Set<string>([targetId]);
  const queue: string[] = [targetId];
  while (queue.length) {
    const cur = queue.shift()!;
    const curHops = cur === targetId ? 0 : info.get(cur)!.hops;
    const curConfidence = cur === targetId ? 1 : info.get(cur)!.minConfidence;
    for (const e of backward.get(cur) ?? []) {
      const prev = e.fromId;
      if (seen.has(prev)) continue;
      seen.add(prev);
      info.set(prev, { hops: curHops + 1, minConfidence: Math.min(curConfidence, edgeConfidence(e)) });
      queue.push(prev);
    }
  }
  return info;
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
    // .forEach rather than `for...of` over the Map directly: this repo's
    // tsconfig has no explicit `target` (TS defaults below ES2015), and
    // iterating a Map/Set with `for...of` or a spread needs
    // --downlevelIteration or an ES2015+ target (TS2802).
    ancestorsOf(n.id, edges).forEach((info, ancestorId) => {
      rows.push({ nodeId: n.id, ancestorId, minHops: info.hops, minConfidence: info.minConfidence });
    });
  }
  return rows;
}
