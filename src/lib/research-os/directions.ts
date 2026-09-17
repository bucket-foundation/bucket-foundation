/**
 * Research OS, the Awareness level as a view (ros-24): from any node,
 * where knowledge goes. Pure, over the same nodes and edges the router
 * uses. Edge convention (frontier.ts, the workspace route's prerequisite
 * lookup): a prerequisite or derives_from edge runs from the prerequisite
 * to the node that needs it, so "forward" from a node follows edges whose
 * fromId is the node.
 */
import type { GraphEdge, GraphNode, NodeKind } from "./types";

export const FRONTIER_NODE_KINDS: NodeKind[] = ["hypothesis", "extension", "replication", "peer_review"];
const FORWARD_KINDS = new Set(["prerequisite", "derives_from", "generalizes", "extends", "replicates", "answers"]);

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
    if (!FORWARD_KINDS.has(e.kind)) continue;
    if (!byId.has(e.fromId) || !byId.has(e.toId)) continue;
    forward.set(e.fromId, [...(forward.get(e.fromId) ?? []), e.toId]);
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
