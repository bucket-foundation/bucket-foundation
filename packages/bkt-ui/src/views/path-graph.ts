import type { PrereqGraph } from "@academy/prereq-path";
import type { LearnData } from "./learn-data";

export interface LayoutSize {
  nodeW: number;
  nodeH: number;
  gapX: number;
  gapY: number;
}

export const TOPIC_SIZE: LayoutSize = { nodeW: 184, nodeH: 60, gapX: 48, gapY: 12 };

export interface PlacedTopic {
  id: string;
  depth: number;
  row: number;
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TopicLayout {
  nodes: Map<string, PlacedTopic>;
  columns: string[][];
  edges: { from: string; to: string }[];
  needs: Map<string, string[]>;
  opens: Map<string, string[]>;
  cyclic: boolean;
  size: LayoutSize;
  box: Box;
}

export function layoutTopics(graph: PrereqGraph, size: LayoutSize = TOPIC_SIZE, group: (id: string) => number = () => 0): TopicLayout {
  const ids = Array.from(graph.keys()).sort();
  const needs = new Map<string, string[]>();
  const opens = new Map<string, string[]>(ids.map((id) => [id, []]));
  let cyclic = false;
  for (const id of ids) {
    const all = Array.from(new Set(graph.get(id) ?? []));
    if (all.includes(id)) cyclic = true;
    const kept = all.filter((p) => p !== id && graph.has(p)).sort();
    needs.set(id, kept);
    for (const p of kept) opens.get(p)!.push(id);
  }

  const depth = new Map<string, number>();
  const open = new Set<string>();
  const visit = (id: string): number => {
    const done = depth.get(id);
    if (done !== undefined) return done;
    open.add(id);
    let d = 0;
    for (const p of needs.get(id)!) {
      if (open.has(p)) {
        cyclic = true;
        continue;
      }
      d = Math.max(d, visit(p) + 1);
    }
    open.delete(id);
    depth.set(id, d);
    return d;
  };
  for (const id of ids) visit(id);

  const columns: string[][] = [];
  for (const id of ids) (columns[depth.get(id)!] ??= []).push(id);
  for (let d = 0; d < columns.length; d++) columns[d] = (columns[d] ?? []).sort((a, b) => group(a) - group(b) || (a < b ? -1 : 1));

  const pos = new Map<string, number>();
  const place = (col: string[]) => col.forEach((id, i) => pos.set(id, i - (col.length - 1) / 2));
  const sweep = (col: string[], links: Map<string, string[]>) => {
    const key = new Map<string, number>();
    col.forEach((id, i) => {
      const near = links.get(id)!.filter((n) => pos.has(n) && depth.get(n) !== depth.get(id));
      key.set(id, near.length ? near.reduce((s, n) => s + pos.get(n)!, 0) / near.length : pos.get(id) ?? i - (col.length - 1) / 2);
    });
    col.sort((a, b) => key.get(a)! - key.get(b)!);
    place(col);
  };
  columns.forEach((col, d) => (d === 0 ? place(col) : sweep(col, needs)));
  for (let d = columns.length - 2; d >= 0; d--) sweep(columns[d], opens);
  for (let d = 1; d < columns.length; d++) sweep(columns[d], needs);

  const nodes = new Map<string, PlacedTopic>();
  let top = 0;
  let bottom = 0;
  columns.forEach((col, d) =>
    col.forEach((id, row) => {
      const y = pos.get(id)! * (size.nodeH + size.gapY) - size.nodeH / 2;
      nodes.set(id, { id, depth: d, row, x: d * (size.nodeW + size.gapX), y });
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + size.nodeH);
    }),
  );
  const edges = ids.flatMap((id) => needs.get(id)!.map((p) => ({ from: p, to: id })));
  const w = columns.length ? (columns.length - 1) * (size.nodeW + size.gapX) + size.nodeW : 0;
  return { nodes, columns, edges, needs, opens, cyclic, size, box: { x: 0, y: top, w, h: bottom - top } };
}

export function boxOf(layout: TopicLayout, ids: readonly string[]): Box | null {
  const placed = ids.map((id) => layout.nodes.get(id)).filter((n): n is PlacedTopic => Boolean(n));
  if (placed.length === 0) return null;
  const x = Math.min(...placed.map((n) => n.x));
  const y = Math.min(...placed.map((n) => n.y));
  return {
    x,
    y,
    w: Math.max(...placed.map((n) => n.x)) + layout.size.nodeW - x,
    h: Math.max(...placed.map((n) => n.y)) + layout.size.nodeH - y,
  };
}

export type TopicState = "known" | "due" | "new" | "locked";

export const STATE_LABEL: Record<TopicState, string> = { known: "Known", due: "Due", new: "New", locked: "Locked" };

export const STATE_MEANING: Record<TopicState, string> = {
  known: "You have studied this.",
  due: "It is time to review this.",
  new: "You can start this now.",
  locked: "This needs other topics first.",
};

export function topicStates(data: LearnData, now: number = Date.now()): Map<string, TopicState> {
  const card = (id: string) => {
    for (const s of data.states.values()) if (s.cards[id]) return s.cards[id];
    return undefined;
  };
  const out = new Map<string, TopicState>();
  for (const a of data.atoms.values()) {
    const c = card(a.id);
    if (c) out.set(a.id, c.due != null && c.due <= now ? "due" : "known");
    else out.set(a.id, (a.requires ?? []).every((r) => Boolean(card(r))) ? "new" : "locked");
  }
  return out;
}

export function wrapTitle(title: string, width = 22, lines = 2): string[] {
  const out: string[] = [];
  let line = "";
  const words = title.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (next.length <= width || !line) {
      line = next;
      continue;
    }
    if (out.length === lines - 1) {
      line = `${line} ${words.slice(i).join(" ")}`;
      break;
    }
    out.push(line);
    line = words[i];
  }
  out.push(line);
  return out.map((l) => (l.length > width ? `${l.slice(0, width - 1).trimEnd()}…` : l));
}
