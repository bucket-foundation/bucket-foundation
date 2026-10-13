import dagre from "@dagrejs/dagre";
import raw from "@/data/research-maps/progressions.json";

export type PanelNode = { id: string; label: string; band: number | null; group: string };
export type PanelEdge = { src: string; dst: string; stated: boolean };
export type Panel = { id: string; title: string; note: string; nodes: PanelNode[]; edges: PanelEdge[] };
export type ProgressionGraph = { id: string; title: string; summary: string; panels: Panel[] };

export type PlacedNode = PanelNode & { x: number; y: number; w: number; h: number; lines: string[] };
export type PlacedEdge = PanelEdge & { path: string };
export type BandMark = { label: string; x0: number; x1: number };
export type PanelLayout = { width: number; height: number; nodes: PlacedNode[]; edges: PlacedEdge[]; bands: BandMark[]; groups: string[] };

export const NODE_WIDTH = 150;
export const LINE_HEIGHT = 13;
const CHARS = 25;
const MAX_LINES = 3;

export function loadProgressions(): { date: string; source: string; graphs: ProgressionGraph[] } {
  return raw as { date: string; source: string; graphs: ProgressionGraph[] };
}

export function wrapLabel(label: string, chars = CHARS, maxLines = MAX_LINES): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of label.split(/\s+/)) {
    if (line && (line + " " + word).length > chars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = kept[maxLines - 1].slice(0, chars - 1).trimEnd() + "…";
  return kept;
}

function spline(points: { x: number; y: number }[]): string {
  const p = points.map((q) => ({ x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 }));
  if (p.length < 3) return `M${p[0].x},${p[0].y}L${p[p.length - 1].x},${p[p.length - 1].y}`;
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 1; i < p.length - 1; i += 1) {
    const end = i === p.length - 2 ? p[i + 1] : { x: (p[i].x + p[i + 1].x) / 2, y: (p[i].y + p[i + 1].y) / 2 };
    d += `Q${p[i].x},${p[i].y} ${Math.round(end.x * 10) / 10},${Math.round(end.y * 10) / 10}`;
  }
  return d;
}

export type LayoutOptions = { nodeWidth?: number; ranksep?: number; bandLabels?: string[] };

function measure(panel: Panel, width: number): Map<string, string[]> {
  return new Map(panel.nodes.map((n) => [n.id, wrapLabel(n.label, Math.floor(width / 6))]));
}

const boxHeight = (lines: string[]): number => lines.length * LINE_HEIGHT + 12;

function layoutBanded(panel: Panel, width: number, gap: number, bandLabels: string[]): PanelLayout {
  const lines = measure(panel, width);
  const bandOf = new Map(panel.nodes.map((n) => [n.id, n.band ?? 0]));
  const inside = panel.edges.filter((e) => bandOf.get(e.src) === bandOf.get(e.dst));
  const depthOf = (id: string, trail: string[] = []): number =>
    trail.includes(id) ? 1 : 1 + Math.max(0, ...inside.filter((e) => e.dst === id).map((e) => depthOf(e.src, [...trail, id])));
  const bandsOfLabel = new Map<string, Set<number>>();
  for (const n of panel.nodes) bandsOfLabel.set(n.label, (bandsOfLabel.get(n.label) ?? new Set<number>()).add(n.band ?? 0));
  const lanes = Array.from(bandsOfLabel.entries()).filter(([, bands]) => bands.size > 1).map(([label]) => label);
  const maxRows = Math.max(lanes.length, 8);
  const bandCount = Math.max(...panel.nodes.map((n) => n.band ?? 0)) + 1;
  const column = new Map<string, number>();
  const depths: number[] = [];
  const starts: number[] = [];
  for (let band = 0, start = 0; band < bandCount; band += 1) {
    const own = panel.nodes.filter((n) => (n.band ?? 0) === band).map((n, i) => ({ n, d: depthOf(n.id), i })).sort((x, y) => x.d - y.d || x.i - y.i);
    const span = Math.max(1, Math.ceil(own.length / maxRows));
    const perColumn = Math.ceil(own.length / span);
    own.forEach(({ n }, i) => column.set(n.id, start + Math.floor(i / perColumn)));
    starts.push(start);
    depths.push(span);
    start += span;
  }
  const pitch = Math.max(...panel.nodes.map((n) => boxHeight(lines.get(n.id)!))) + 10;
  const slot = new Map<string, number>();
  for (const n of panel.nodes) if (lanes.includes(n.label)) slot.set(n.id, lanes.indexOf(n.label));
  const columns = Math.max(...Array.from(column.values())) + 1;
  let rows = lanes.length;
  for (let c = 0; c < columns; c += 1) {
    const free = panel.nodes.filter((n) => column.get(n.id) === c && !slot.has(n.id));
    if (free.length === 0) continue;
    const pull = (id: string): number => {
      const from = panel.edges.filter((e) => e.dst === id && slot.has(e.src)).map((e) => slot.get(e.src)!);
      return from.length ? from.reduce((a, b) => a + b, 0) / from.length : rows / 2;
    };
    const taken = new Set(panel.nodes.filter((n) => column.get(n.id) === c && slot.has(n.id)).map((n) => slot.get(n.id)!));
    const ordered = free.map((n) => ({ n, at: pull(n.id) })).sort((a, b) => a.at - b.at);
    rows = Math.max(rows, ordered.length + taken.size);
    let next = Math.max(0, Math.floor((rows - ordered.length - taken.size) / 2));
    for (const { n } of ordered) {
      while (taken.has(next)) next += 1;
      slot.set(n.id, next);
      taken.add(next);
    }
  }
  rows = Math.max(rows, ...Array.from(slot.values()).map((v) => v + 1));
  const top = 4;
  const nodes = panel.nodes.map((n) => {
    const h = boxHeight(lines.get(n.id)!);
    return { ...n, x: column.get(n.id)! * (width + gap) + gap / 2, y: top + slot.get(n.id)! * pitch + (pitch - 10 - h) / 2, w: width, h, lines: lines.get(n.id)! };
  });
  const at = new Map(nodes.map((n) => [n.id, n]));
  const edges = panel.edges.map((e) => {
    const a = at.get(e.src)!;
    const b = at.get(e.dst)!;
    const x0 = a.x + a.w;
    const y0 = a.y + a.h / 2;
    const x1 = b.x;
    const y1 = b.y + b.h / 2;
    const bend = Math.max(18, (x1 - x0) * 0.45);
    const out = a.x + a.w + gap * 0.55;
    const path = x1 > x0 ? `M${x0},${y0}C${x0 + bend},${y0} ${x1 - bend},${y1} ${x1},${y1}` : `M${x0},${y0}C${out},${y0} ${out},${y1} ${b.x + b.w},${y1}`;
    return { ...e, path };
  });
  const bands = depths.map((d, i) => ({ label: bandLabels[i] ?? String(i), x0: starts[i] * (width + gap), x1: (starts[i] + d) * (width + gap) }));
  return { width: columns * (width + gap), height: top * 2 + rows * pitch - 10, nodes, edges, bands, groups: Array.from(new Set(panel.nodes.map((n) => n.group))) };
}

export function layoutPanel(panel: Panel, options: LayoutOptions = {}): PanelLayout {
  const width = options.nodeWidth ?? NODE_WIDTH;
  const ranksep = options.ranksep ?? 46;
  if (panel.nodes.some((n) => n.band !== null)) return layoutBanded(panel, width, ranksep, options.bandLabels ?? []);
  const g = new dagre.graphlib.Graph({ multigraph: false });
  g.setGraph({ rankdir: "LR", nodesep: 9, ranksep, marginx: 4, marginy: 4, ranker: "network-simplex" });
  g.setDefaultEdgeLabel(() => ({}));
  const lines = measure(panel, width);
  for (const n of panel.nodes) g.setNode(n.id, { width, height: boxHeight(lines.get(n.id)!) });
  for (const e of panel.edges) g.setEdge(e.src, e.dst, { weight: e.stated ? 2 : 1 });
  dagre.layout(g);
  const nodes = panel.nodes.map((n) => {
    const at = g.node(n.id);
    return { ...n, x: at.x - at.width / 2, y: at.y - at.height / 2, w: at.width, h: at.height, lines: lines.get(n.id)! };
  });
  const edges = panel.edges.map((e) => ({ ...e, path: spline(g.edge(e.src, e.dst).points) }));
  const size = g.graph();
  return { width: size.width ?? 0, height: size.height ?? 0, nodes, edges, bands: [], groups: Array.from(new Set(panel.nodes.map((n) => n.group))) };
}

export function edgeCounts(panel: Panel): { stated: number; inferred: number } {
  const stated = panel.edges.filter((e) => e.stated).length;
  return { stated, inferred: panel.edges.length - stated };
}
