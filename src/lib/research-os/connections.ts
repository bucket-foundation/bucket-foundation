import { stageAtLeast } from "./types";
import type { Stage } from "./types";

export interface ConnNode {
  id: string;
  slug: string;
  title: string;
  branch: string;
  kind?: string;
}
export interface ConnEdge {
  fromId: string;
  toId: string;
  kind: string;
}
export interface Held {
  from: ConnNode;
  to: ConnNode;
  kind: string;
}
export interface Bridge {
  held: ConnNode;
  next: ConnNode;
  kind: string;
}

export const CONNECTING_KINDS = new Set(["derives_from", "generalizes", "example_of", "cites", "extends", "replicates", "answers", "contradicts", "reviews"]);

export function crossBranchConnections(
  states: { nodeId: string; stage: Stage }[],
  nodes: ConnNode[],
  edges: ConnEdge[]
): { held: Held[]; bridges: Bridge[] } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const understood = new Set(states.filter((s) => stageAtLeast(s.stage, "understanding")).map((s) => s.nodeId));
  const held: Held[] = [];
  const bridges: Bridge[] = [];
  const seen = new Set<string>();
  for (const e of edges) {
    if (!CONNECTING_KINDS.has(e.kind)) continue;
    const a = byId.get(e.fromId);
    const b = byId.get(e.toId);
    if (!a || !b || a.branch === b.branch) continue;
    const ua = understood.has(a.id);
    const ub = understood.has(b.id);
    const key = `${a.id}|${b.id}|${e.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (ua && ub) held.push({ from: a, to: b, kind: e.kind });
    else if (ua) bridges.push({ held: a, next: b, kind: e.kind });
    else if (ub) bridges.push({ held: b, next: a, kind: e.kind });
  }
  held.sort((x, y) => x.from.title.localeCompare(y.from.title));
  bridges.sort((x, y) => x.next.title.localeCompare(y.next.title));
  return { held, bridges };
}
