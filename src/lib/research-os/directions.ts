/**
 * Research OS, the Awareness level as a view (ros-24): from any node,
 * where knowledge goes. Pure, over the same nodes and edges the router
 * uses. Edge conventions, as the data and primes.ts (FACTOR_EDGES) have
 * them: a prerequisite edge runs from the prerequisite to the node that
 * needs it; derives_from, extends, replicates, generalizes, and answers run
 * from the newer node to the node it builds on (production-node.ts writes
 * them from the production to its target). "Forward" from a node, where
 * knowledge goes, follows a prerequisite edge from its fromId and the other
 * kinds from their toId.
 */
import type { GraphEdge, GraphNode, NodeKind } from "./types";

export const FRONTIER_NODE_KINDS: NodeKind[] = ["hypothesis", "extension", "replication", "peer_review"];
/** Kinds whose `from` end comes first: forward runs from → to. */
const FORWARD_FROM_KINDS = new Set(["prerequisite"]);
/** Kinds written from the newer node to the node it builds on: forward runs to → from. */
const FORWARD_TO_KINDS = new Set(["derives_from", "generalizes", "extends", "replicates", "answers"]);

export interface Directions {
  /** Nodes one step forward: what this node is a prerequisite of. */
  dependents: GraphNode[];
  /** Frontier-kind nodes and flagged frontier nodes reachable forward within `depth`. */
  frontier: GraphNode[];
  /** Nodes flagged as open questions reachable forward within `depth`. */
  openQuestions: GraphNode[];
  /** How many nodes lie at each forward depth, 1..depth. */
  reach: number[];
}

export function isFrontierNode(n: GraphNode): boolean {
  return FRONTIER_NODE_KINDS.includes(n.kind) || n.frontierFlag === "frontier";
}

export function directionsFrom(nodeId: string, nodes: GraphNode[], edges: GraphEdge[], depth: number = 3): Directions {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const forward = new Map<string, string[]>();
  for (const e of edges) {
    if (!byId.has(e.fromId) || !byId.has(e.toId)) continue;
    const [a, b] = FORWARD_FROM_KINDS.has(e.kind) ? [e.fromId, e.toId] : FORWARD_TO_KINDS.has(e.kind) ? [e.toId, e.fromId] : [null, null];
    if (!a || !b) continue;
    forward.set(a, [...(forward.get(a) ?? []), b]);
  }
  const seen = new Set<string>([nodeId]);
  let layer = [nodeId];
  const reach: number[] = [];
  const reached: GraphNode[] = [];
  for (let d = 1; d <= depth; d++) {
    const next: string[] = [];
    for (const id of layer) {
      for (const to of forward.get(id) ?? []) {
        if (seen.has(to)) continue;
        seen.add(to);
        next.push(to);
        const n = byId.get(to);
        if (n) reached.push(n);
      }
    }
    reach.push(next.length);
    layer = next;
    if (layer.length === 0) {
      while (reach.length < depth) reach.push(0);
      break;
    }
  }
  const dependents = (forward.get(nodeId) ?? []).map((id) => byId.get(id)).filter((n): n is GraphNode => Boolean(n));
  return {
    dependents,
    frontier: reached.filter(isFrontierNode),
    openQuestions: reached.filter((n) => n.frontierFlag === "open_question"),
    reach,
  };
}
