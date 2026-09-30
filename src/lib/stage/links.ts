import { EDGE_KINDS, type Edge, type EdgeKind } from "./record";

export function groupEdges(edges: Edge[]): { kind: EdgeKind; edges: Edge[] }[] {
  return EDGE_KINDS.map((kind) => ({ kind, edges: edges.filter((e) => e.kind === kind) })).filter((g) => g.edges.length > 0);
}
