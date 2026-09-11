/**
 * Research OS for K-12, Phase 0/1, frontier-backward routing (bkt-ros).
 * Implements RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3 "Frontier-backward
 * routing, in steps" 2-4 and 6-7. Phase 0 shipped this as a hardcoded scope:
 * "walks prerequisite edges backward to the nearest nodes at stage >=
 * understanding (treat no record as access), and returns the ordered forward
 * chain," with no `graph.prereq_ancestor` closure table (review step 3) and
 * no diagnostic probe (review step 5, now src/lib/research-os/probe.ts).
 * Phase 1 adds the closure table below as an optional pruning input; the
 * request-time BFS itself is unchanged and stays the fallback.
 *
 * Deliberately dependency-free: no Supabase types, no fetch. This is a pure
 * function over plain arrays so it is unit-testable with synthetic learner
 * states and no database (scripts/test-research-os-routing.ts).
 *
 * PHASE 1 UPDATE (bkt-ros, closing stub list item 1): computeFrontier now
 * takes an optional fifth argument, `ancestorRows`, the precomputed rows
 * from `graph.prereq_ancestor` (src/lib/research-os/closure.ts's
 * `PrereqAncestorRow`). When supplied, the routable subgraph is pruned to
 * the target's closure (the target plus its listed ancestors) before the
 * same backward walk below runs, instead of scanning every node and edge in
 * the branch. This is the "prunes to a target's closure before walking when
 * available" behavior closure.ts's own header describes. Omitting the
 * argument (or passing an empty array) falls back to the original
 * full-graph walk unchanged, so every existing caller and test keeps
 * working with no change. Equivalence between the two paths is asserted in
 * scripts/test-research-os-closure.ts.
 *
 * PHASE 1 UPDATE (bkt-ros ros-03 item 2, confidence-weighted routing): the
 * backward walk below runs as a Dijkstra variant over edge cost. Every
 * `prerequisite` edge carries a confidence (types.ts's edgeConfidence,
 * defaulting to 1.0); the walk minimizes cumulative -log(confidence) from
 * the target back to each ancestor (equivalently, maximizes the product of
 * confidence along the chosen chain), with ties broken by fewer hops. Edge
 * weights are non-negative (confidence sits in (0,1]), so the standard
 * Dijkstra invariant holds: the first time a node is settled with minimal
 * cost, that cost is final. When every edge carries the default confidence
 * (cost 0 everywhere), every path ties on cost and the hop tie-break alone
 * decides the walk, reproducing the exact plain-BFS shortest-hop result
 * this function returned before confidence existed -- every pre-confidence
 * test keeps passing unchanged. `PLAN-REVISION-1.md` section 2b: "the
 * router prefers the high-confidence alternate chain when one exists, and
 * flags rather than silently routes when it does not" -- the alternate
 * chain preference falls out of Dijkstra directly; the flag is
 * `lowConfidenceFlags` below, populated even when no better alternative
 * exists and the walk has to route through a weak edge anyway.
 */
import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "./types";
import { stageAtLeast, edgeConfidence, LOW_CONFIDENCE_THRESHOLD } from "./types";
import type { PrereqAncestorRow } from "./closure";

export { LOW_CONFIDENCE_THRESHOLD };

export interface FrontierStep {
  node: GraphNode;
  stage: Stage; // the learner's stage on this node right now ('access' if no record)
  hops: number; // prerequisite-hops from this node to the target; 0 = the target itself
  isFrontier: boolean; // true if this is a stop point: mastered, or a root with no prerequisite
  /** Confidence of the prerequisite edge from this node to the next node
   * closer to the target on the chosen chain (undefined for the target
   * itself, hops 0, no such edge). */
  edgeConfidence?: number;
  /** Cumulative product of edgeConfidence over every step from this node
   * down to the target, along the chain computeFrontier chose. 1 for the
   * target itself. */
  pathConfidence: number;
}

export interface LowConfidenceFlag {
  /** graph.edges.id, when the edge that produced this flag carries one
   * (fixtures built without a database never do; see GraphEdge.id). */
  edgeId?: string;
  fromNodeId: string;
  toNodeId: string;
  confidence: number;
  confidenceSource?: string | null;
}

export interface FrontierResult {
  target: GraphNode;
  /** The mastered-or-root nodes closest to the target; where the visible route starts. */
  frontier: GraphNode[];
  /** Ordered frontier -> target, every node the learner needs to see, each with its stage. */
  chain: FrontierStep[];
  /** The subset of `chain` still below Understanding: what the learner has left to do. */
  gap: GraphNode[];
  /** Every edge on the returned chain whose own confidence is below
   * LOW_CONFIDENCE_THRESHOLD (bkt-ros ros-03 item 2): the chain still
   * routes through it when no stronger alternative exists, but a teacher
   * should confirm it (item 3, graph.edge_flags). Sorted for a stable diff. */
  lowConfidenceFlags: LowConfidenceFlag[];
}

/**
 * Prunes `nodes`/`edges` down to `targetNodeId` plus its listed ancestors
 * when `ancestorRows` has rows for that target; otherwise returns the input
 * unchanged. Split out from computeFrontier so the pruning step and the
 * backward walk each stay a single, testable responsibility (equivalence
 * between the two is what scripts/test-research-os-closure.ts asserts: this
 * function must never change which nodes the walk below can reach, only how
 * many nodes/edges it has to scan to reach them).
 */
function pruneToClosure(
  nodes: GraphNode[],
  edges: GraphEdge[],
  targetNodeId: string,
  ancestorRows?: PrereqAncestorRow[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (!ancestorRows || ancestorRows.length === 0) return { nodes, edges };

  const closureIds = new Set<string>([targetNodeId]);
  for (const row of ancestorRows) {
    if (row.nodeId === targetNodeId) closureIds.add(row.ancestorId);
  }
  // No rows for this specific target (e.g. the closure table has been
  // rebuilt for a different branch, or not yet for this one): fall back to
  // the full graph rather than incorrectly routing to just the target.
  if (closureIds.size === 1) return { nodes, edges };

  return {
    nodes: nodes.filter((n) => closureIds.has(n.id)),
    edges: edges.filter((e) => closureIds.has(e.fromId) && closureIds.has(e.toId)),
  };
}

/**
 * Compute the frontier-backward route to `targetNodeId`.
 *
 * @param nodes  every node in the routable subgraph (Phase 0: the seeded path)
 * @param edges  every edge in that subgraph; only `kind === 'prerequisite'` is walked
 * @param states the learner's known states; a node absent from this array is
 *               treated as stage 'access', matching the task's routing rule
 * @param ancestorRows optional graph.prereq_ancestor rows (any node, not
 *               just the target; only rows whose nodeId matches
 *               targetNodeId are used). When present, the routable subgraph
 *               is pruned to the target's closure before walking; omitted
 *               or empty falls back to the original full-graph walk.
 */
export function computeFrontier(
  nodes: GraphNode[],
  edges: GraphEdge[],
  states: LearnerNodeState[],
  targetNodeId: string,
  ancestorRows?: PrereqAncestorRow[],
): FrontierResult {
  const target = nodes.find((n) => n.id === targetNodeId);
  if (!target) throw new Error(`computeFrontier: target node ${targetNodeId} not found`);

  const { nodes: scopedNodes, edges: scopedEdges } = pruneToClosure(nodes, edges, targetNodeId, ancestorRows);
  const byId = new Map(scopedNodes.map((n) => [n.id, n]));

  const stateByNode = new Map(states.map((s) => [s.nodeId, s.stage]));
  const stageOf = (nodeId: string): Stage => stateByNode.get(nodeId) ?? "access";

  // backward adjacency over prerequisite edges: to -> [edge, edge, ...],
  // the edge itself kept (not just fromId) so the Dijkstra relax step below
  // can read its confidence.
  const backward = new Map<string, GraphEdge[]>();
  for (const n of scopedNodes) backward.set(n.id, []);
  for (const e of scopedEdges) {
    if (e.kind !== "prerequisite") continue;
    if (!backward.has(e.toId)) continue; // edge endpoint outside this subgraph, ignore
    backward.get(e.toId)!.push(e);
  }

  // Confidence-weighted backward walk (Dijkstra over cost = -log(confidence),
  // ties broken by fewer hops; see this function's header comment for why
  // this exactly reproduces the old plain-BFS result when every edge
  // defaults to full confidence).
  const cost = new Map<string, number>([[targetNodeId, 0]]);
  const hops = new Map<string, number>([[targetNodeId, 0]]);
  const parentEdge = new Map<string, GraphEdge>(); // ancestorId -> the prerequisite edge (ancestor -> its parent) chosen
  const finalized = new Set<string>();
  const open = new Set<string>([targetNodeId]);
  const frontierIds: string[] = [];

  // True when (aCost, aHops) should be preferred over (bCost, bHops):
  // lower cost first (higher confidence product), fewer hops as the
  // tie-break. A small epsilon absorbs floating-point noise from repeated
  // -log/exp round trips on long chains.
  const preferred = (aCost: number, aHops: number, bCost: number, bHops: number): boolean =>
    aCost < bCost - 1e-9 || (Math.abs(aCost - bCost) <= 1e-9 && aHops < bHops);

  while (open.size > 0) {
    // .forEach rather than `for...of` over the Set directly: this repo's
    // tsconfig has no explicit `target` (TS defaults below ES2015), and
    // iterating a Map/Set with `for...of` needs --downlevelIteration or an
    // ES2015+ target (TS2802), matching closure.ts's own convention.
    let cur: string | null = null;
    open.forEach((id) => {
      if (cur === null || preferred(cost.get(id)!, hops.get(id)!, cost.get(cur)!, hops.get(cur)!)) cur = id;
    });
    open.delete(cur!);
    finalized.add(cur!);

    const mastered = stageAtLeast(stageOf(cur!), "understanding");
    const prereqEdges = backward.get(cur!) ?? [];
    const isRoot = prereqEdges.length === 0;

    // Stop expanding at a mastered node (the learner already holds it, no
    // need to route further back) or a root (nothing earlier to route to).
    // Both are frontier points; "no record" defaults to 'access', so an
    // un-evidenced root still stops the walk here rather than erroring. This
    // applies to the target itself too: an already-mastered target (e.g. a
    // learner reviewing a node they already reached Production on) routes to
    // just itself rather than re-walking the whole path behind it.
    if (mastered || isRoot) {
      frontierIds.push(cur!);
      continue;
    }

    for (const e of prereqEdges) {
      const prev = e.fromId;
      if (finalized.has(prev)) continue; // already settled at its optimal cost
      const candidateCost = cost.get(cur!)! + -Math.log(edgeConfidence(e));
      const candidateHops = hops.get(cur!)! + 1;
      const knownCost = cost.get(prev);
      if (knownCost === undefined || preferred(candidateCost, candidateHops, knownCost, hops.get(prev)!)) {
        cost.set(prev, candidateCost);
        hops.set(prev, candidateHops);
        parentEdge.set(prev, e);
        open.add(prev);
      }
    }
  }

  const frontierSet = new Set(frontierIds);
  const lowConfidenceFlags: LowConfidenceFlag[] = [];
  const chain: FrontierStep[] = Array.from(finalized)
    .map((id) => {
      const node = byId.get(id)!;
      const edge = parentEdge.get(id);
      const conf = edge ? edgeConfidence(edge) : undefined;
      if (edge && conf! < LOW_CONFIDENCE_THRESHOLD) {
        lowConfidenceFlags.push({
          edgeId: edge.id,
          fromNodeId: edge.fromId,
          toNodeId: edge.toId,
          confidence: conf!,
          confidenceSource: edge.confidenceSource ?? null,
        });
      }
      return {
        node,
        stage: stageOf(id),
        hops: hops.get(id) ?? 0,
        isFrontier: frontierSet.has(id),
        edgeConfidence: conf,
        pathConfidence: Math.exp(-(cost.get(id) ?? 0)),
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
    lowConfidenceFlags: lowConfidenceFlags.sort(
      (a, b) => a.fromNodeId.localeCompare(b.fromNodeId) || a.toNodeId.localeCompare(b.toNodeId),
    ),
  };
}
