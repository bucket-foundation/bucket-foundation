export type GraphNode = { id: string; name: string; group: string; centrality: number; edges: number };
export type GraphEdge = { source: string; target: string; weight: number };
export type CanonGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export interface RawGraph {
  nodes: { id: string; name: string; group: string }[];
  edges: { source: string; target: string; weight: number }[];
}

export interface Centrality {
  degree: Record<string, number>;
  weighted: Record<string, number>;
}

export const NO_CENTRALITY: Centrality = { degree: {}, weighted: {} };

const OPENALEX_AUTHOR = /^A\d+$/;

export function recordId(raw: string): string {
  return OPENALEX_AUTHOR.test(raw) ? `openalex:${raw}` : raw;
}

export function buildCanonGraph(raw: RawGraph, cent: Centrality = NO_CENTRALITY): CanonGraph {
  const known = new Set(raw.nodes.map((n) => n.id));
  const edges = raw.edges.filter((e) => e.source !== e.target && known.has(e.source) && known.has(e.target));
  const linked = new Set<string>();
  for (const e of edges) {
    linked.add(e.source);
    linked.add(e.target);
  }
  const nodes = raw.nodes
    .filter((n) => linked.has(n.id))
    .map((n) => ({ id: recordId(n.id), name: n.name, group: n.group, centrality: cent.weighted[n.id] || 0, edges: cent.degree[n.id] || 0 }));
  return { nodes, edges: edges.map((e) => ({ source: recordId(e.source), target: recordId(e.target), weight: e.weight })) };
}

export function neighbours(g: CanonGraph, id: string): { id: string; weight: number }[] {
  const out = new Map<string, number>();
  for (const e of g.edges) {
    if (e.source === id) out.set(e.target, (out.get(e.target) ?? 0) + e.weight);
    else if (e.target === id) out.set(e.source, (out.get(e.source) ?? 0) + e.weight);
  }
  return Array.from(out, ([n, weight]) => ({ id: n, weight })).sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : 1));
}

export function components(g: CanonGraph): string[][] {
  const parent = new Map(g.nodes.map((n) => [n.id, n.id]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  for (const e of g.edges) if (parent.has(e.source) && parent.has(e.target)) parent.set(find(e.source), find(e.target));
  const groups = new Map<string, string[]>();
  for (const n of g.nodes) (groups.get(find(n.id)) ?? groups.set(find(n.id), []).get(find(n.id))!).push(n.id);
  return Array.from(groups.values())
    .map((ids) => ids.sort())
    .sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1));
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export function matchNodes(g: CanonGraph, query: string): string[] {
  const words = fold(query).filter((w) => w.length >= 3);
  if (!words.length) return [];
  return g.nodes.filter((n) => fold(n.name).some((part) => words.some((w) => part.startsWith(w)))).map((n) => n.id);
}

export interface Placed {
  x: number;
  y: number;
}

export function layoutCanonGraph(g: CanonGraph, iterations = 300): Map<string, Placed> {
  const out = new Map<string, Placed>();
  let originX = 0;
  for (const ids of components(g)) {
    const n = ids.length;
    const radius = Math.max(40, Math.sqrt(n) * 60);
    const pos = ids.map((_, i) => ({ x: radius * Math.cos((2 * Math.PI * i) / n), y: radius * Math.sin((2 * Math.PI * i) / n) }));
    const local = new Map(ids.map((id, i) => [id, i]));
    const links = g.edges.filter((e) => local.has(e.source) && local.has(e.target)).map((e) => [local.get(e.source)!, local.get(e.target)!] as const);
    const k = 70;
    for (let t = 0; t < iterations && n > 1; t++) {
      const step = radius * 0.1 * (1 - t / iterations) + 1;
      const disp = pos.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const dx = pos[i].x - pos[j].x || 0.01 * (i - j);
          const dy = pos[i].y - pos[j].y;
          const d2 = Math.max(dx * dx + dy * dy, 1);
          const f = (k * k) / d2;
          disp[i].x += dx * f;
          disp[i].y += dy * f;
          disp[j].x -= dx * f;
          disp[j].y -= dy * f;
        }
      for (const [a, b] of links) {
        const dx = pos[a].x - pos[b].x;
        const dy = pos[a].y - pos[b].y;
        const d = Math.max(Math.hypot(dx, dy), 1);
        const f = d / k;
        disp[a].x -= dx * f;
        disp[a].y -= dy * f;
        disp[b].x += dx * f;
        disp[b].y += dy * f;
      }
      for (let i = 0; i < n; i++) {
        const len = Math.max(Math.hypot(disp[i].x, disp[i].y), 1e-9);
        pos[i].x += (disp[i].x / len) * Math.min(len, step);
        pos[i].y += (disp[i].y / len) * Math.min(len, step);
      }
    }
    const minX = Math.min(...pos.map((p) => p.x));
    const maxX = Math.max(...pos.map((p) => p.x));
    ids.forEach((id, i) => out.set(id, { x: Math.round((pos[i].x - minX + originX) * 10) / 10, y: Math.round(pos[i].y * 10) / 10 }));
    originX += maxX - minX + 120;
  }
  return out;
}
