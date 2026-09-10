/**
 * Research OS for K-12, Phase 0, frontier-backward routing (bkt-ros).
 * Implements RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3 "Frontier-backward
 * routing, in steps" 2-4 and 6-7, scoped down to the task's Phase 0 slice:
 * "hardcoded scope: ... walks prerequisite edges backward to the nearest
 * nodes at stage >= understanding (treat no record as access), and returns
 * the ordered forward chain." No diagnostic probe (review step 5) and no
 * `graph.prereq_ancestor` closure table (review step 3): the Phase 0 subgraph
 * is 15-25 nodes, so a request-time BFS over `graph.edges` is fast enough and
 * a precomputed closure table would be premature (see the migration's header
 * comment for the full Phase 0/1 boundary).
 *
 * Deliberately dependency-free: no Supabase types, no fetch. This is a pure
 * function over plain arrays so it is unit-testable with synthetic learner
 * states and no database (scripts/test-research-os-routing.ts).
 */
import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "./types";
import { stageAtLeast } from "./types";

export interface FrontierStep {
  node: GraphNode;
  stage: Stage; // the learner's stage on this node right now ('access' if no record)
  hops: number; // prerequisite-hops from this node to the target; 0 = the target itself
  isFrontier: boolean; // true if this is a stop point: mastered, or a root with no prerequisite
}

export interface FrontierResult {
  target: GraphNode;
  /** The mastered-or-root nodes closest to the target; where the visible route starts. */
  frontier: GraphNode[];
  /** Ordered frontier -> target, every node the learner needs to see, each with its stage. */
  chain: FrontierStep[];
  /** The subset of `chain` still below Understanding: what the learner has left to do. */
  gap: GraphNode[];
}

/**
 * Compute the frontier-backward route to `targetNodeId`.
 *
 * @param nodes  every node in the routable subgraph (Phase 0: the seeded path)
 * @param edges  every edge in that subgraph; only `kind === 'prerequisite'` is walked
 * @param states the learner's known states; a node absent from this array is
 *               treated as stage 'access', matching the task's routing rule
 */
export function computeFrontier(
  nodes: GraphNode[],
  edges: GraphEdge[],
  states: LearnerNodeState[],
  targetNodeId: string,
): FrontierResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const target = byId.get(targetNodeId);
  if (!target) throw new Error(`computeFrontier: target node ${targetNodeId} not found`);

  const stateByNode = new Map(states.map((s) => [s.nodeId, s.stage]));
  const stageOf = (nodeId: string): Stage => stateByNode.get(nodeId) ?? "access";

  // backward adjacency over prerequisite edges: to -> [from, from, ...]
  const backward = new Map<string, string[]>();
  for (const n of nodes) backward.set(n.id, []);
  for (const e of edges) {
    if (e.kind !== "prerequisite") continue;
    if (!backward.has(e.toId)) continue; // edge endpoint outside this subgraph, ignore
    backward.get(e.toId)!.push(e.fromId);
  }

  const hops = new Map<string, number>([[targetNodeId, 0]]);
  const parent = new Map<string, string>(); // childId -> the node one hop closer to target
  const visited = new Set<string>([targetNodeId]);
  const frontierIds: string[] = [];
  const queue: string[] = [targetNodeId];

  while (queue.length) {
    const cur = queue.shift()!;
    const mastered = stageAtLeast(stageOf(cur), "understanding");
    const prereqs = backward.get(cur) ?? [];
    const isRoot = prereqs.length === 0;

    // Stop expanding at a mastered node (the learner already holds it, no
    // need to route further back) or a root (nothing earlier to route to).
    // Both are frontier points; "no record" defaults to 'access', so an
    // un-evidenced root still stops the walk here rather than erroring. This
    // applies to the target itself too: an already-mastered target (e.g. a
    // learner reviewing a node they already reached Production on) routes to
    // just itself rather than re-walking the whole path behind it.
    if (mastered || isRoot) {
      frontierIds.push(cur);
      continue;
    }

    for (const prev of prereqs) {
      if (visited.has(prev)) continue;
      visited.add(prev);
      hops.set(prev, (hops.get(cur) ?? 0) + 1);
      parent.set(prev, cur);
      queue.push(prev);
    }
  }

  const frontierSet = new Set(frontierIds);
  const chain: FrontierStep[] = Array.from(visited)
    .map((id) => {
      const node = byId.get(id)!;
      return {
        node,
        stage: stageOf(id),
        hops: hops.get(id) ?? 0,
        isFrontier: frontierSet.has(id),
      };
    })
    // Farthest from target (the frontier) first, target last: the order a
    // learner walks the path forward.
    .sort((a, b) => b.hops - a.hops || a.node.slug.localeCompare(b.node.slug));

  return {
    target,
    frontier: frontierIds.map((id) => byId.get(id)!),
    chain,
    gap: chain.filter((s) => !s.isFrontier).map((s) => s.node),
  };
}
