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

export function computeAncestorClosure(nodes: GraphNode[], edges: GraphEdge[]): PrereqAncestorRow[] {
  const rows: PrereqAncestorRow[] = [];
  for (const n of nodes) {
    ancestorsOf(n.id, edges).forEach((info, ancestorId) => {
      rows.push({ nodeId: n.id, ancestorId, minHops: info.hops, minConfidence: info.minConfidence });
    });
  }
  return rows;
}
