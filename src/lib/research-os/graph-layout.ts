export interface LayoutNode {
  id: string;
  tier: number;
  title: string;
}
export interface LayoutEdge {
  fromId: string;
  toId: string;
}
export interface Placed {
  id: string;
  col: number;
  row: number;
  x: number;
  y: number;
}
export interface Layout {
  placed: Placed[];
  columns: number[];
  rows: number;
  width: number;
  height: number;
}

export const COL_W = 220;
export const ROW_H = 30;
export const PAD_X = 40;
export const PAD_Y = 30;

export function layoutGraph(nodes: LayoutNode[], edges: LayoutEdge[]): Layout {
  const tiers = Array.from(new Set(nodes.map((n) => n.tier))).sort((a, b) => a - b);
  const colOf = new Map(tiers.map((t, i) => [t, i]));
  const byCol: LayoutNode[][] = tiers.map(() => []);
  nodes.forEach((n) => byCol[colOf.get(n.tier)!].push(n));
  byCol.forEach((c) => c.sort((a, b) => a.title.localeCompare(b.title)));
  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();
  const ids = new Set(nodes.map((n) => n.id));
  edges.forEach((e) => {
    if (!ids.has(e.fromId) || !ids.has(e.toId)) return;
    preds.set(e.toId, [...(preds.get(e.toId) ?? []), e.fromId]);
    succs.set(e.fromId, [...(succs.get(e.fromId) ?? []), e.toId]);
  });
  const row = new Map<string, number>();
  byCol.forEach((c) => c.forEach((n, i) => row.set(n.id, i)));
  const sweep = (col: LayoutNode[], neighbors: Map<string, string[]>) => {
    const key = (n: LayoutNode) => {
      const ns = (neighbors.get(n.id) ?? []).map((id) => row.get(id)).filter((r): r is number => r !== undefined);
      return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : row.get(n.id)!;
    };
    col.sort((a, b) => key(a) - key(b) || a.title.localeCompare(b.title));
    col.forEach((n, i) => row.set(n.id, i));
  };
  for (let pass = 0; pass < 3; pass++) {
    for (let c = 1; c < byCol.length; c++) sweep(byCol[c], preds);
    for (let c = byCol.length - 2; c >= 0; c--) sweep(byCol[c], succs);
  }
  const rows = Math.max(1, ...byCol.map((c) => c.length));
  const placed: Placed[] = [];
  byCol.forEach((c, ci) => {
    c.forEach((n, ri) => placed.push({ id: n.id, col: ci, row: ri, x: PAD_X + ci * COL_W, y: PAD_Y + ri * ROW_H }));
  });
  return { placed, columns: tiers, rows, width: PAD_X * 2 + Math.max(1, tiers.length) * COL_W, height: PAD_Y * 2 + rows * ROW_H };
}
