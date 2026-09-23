import { isIdeaNode } from "./idea";
import type { GraphEdge, GraphNode, NodeKind } from "./types";

export const FRONTIER_NODE_KINDS: NodeKind[] = ["hypothesis", "extension", "replication", "peer_review"];
const WORK_NODE_KINDS = new Set(["production", "hypothesis", "extension", "replication", "peer_review"]);

function walkable(n: GraphNode): boolean {
  if (WORK_NODE_KINDS.has(n.kind)) return true;
  const type = (n.provenance as { type?: unknown } | undefined)?.type;
  return isIdeaNode({ kind: n.kind, provenanceType: typeof type === "string" ? type : null });
}

function flagged(n: GraphNode): boolean {
  return n.frontierFlag === "open_question" || n.frontierFlag === "frontier";
}

const FORWARD_FROM_KINDS = new Set(["prerequisite"]);
const FORWARD_TO_KINDS = new Set(["derives_from", "generalizes", "extends", "replicates", "answers"]);

export interface Directions {
  dependents: GraphNode[];
  frontier: GraphNode[];
  openQuestions: GraphNode[];
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
    const target = byId.get(b)!;
    if (!walkable(target) && !flagged(target)) continue;
    forward.set(a, [...(forward.get(a) ?? []), b]);
  }
  const seen = new Set<string>([nodeId]);
  let layer = [nodeId];
  const reach: number[] = [];
  const reached: GraphNode[] = [];
  for (let d = 1; d <= depth; d++) {
    const next: string[] = [];
    let found = 0;
    for (const id of layer) {
      for (const to of forward.get(id) ?? []) {
        if (seen.has(to)) continue;
        seen.add(to);
        found++;
        const n = byId.get(to)!;
        reached.push(n);
        if (walkable(n)) next.push(to);
      }
    }
    reach.push(found);
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
