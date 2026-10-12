import { FORCE_STEPS, GRAPH_RADIUS } from "../../../../src/lib/explore/modes/graph";
import { LANE_HEIGHT } from "../../../../src/lib/explore/modes/timeline";
import { linksFromHits, type Guide, type RowFrame, type SceneLayout, type SceneNode, type Vec3 } from "../../../../src/lib/explore/modes/types";
import type { Hit } from "../../../../src/lib/explore/search";
import type { RowScene } from "./rows";

export const TIMELINE_WIDTH = 9;
export const STACK_ROWS = 24;
export const STACK_GAP = LANE_HEIGHT * 0.22;
export const LANE_GAP = LANE_HEIGHT * 0.9;
export const MARK_GAP = 0.05;
export const UNDATED = "No year";
export const LANE_LABEL_RISE = 0.2;
export const LANE_LABEL_UNITS_PER_CHAR = 0.075;
export const RING_RADIUS = 1.35;
export const LABEL_CLEARANCE = 0.2;
export const LABEL_UNITS_PER_CHAR = 0.062;
const AXIS_COLOR = "#6B6252";
const MARK = 0.03;

function hashUnit(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function fastForceLayout(ids: string[], edges: [string, string][], steps = FORCE_STEPS, radius = GRAPH_RADIUS): Map<string, Vec3> {
  const n = ids.length;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  ids.forEach((id, i) => {
    const u = hashUnit(id, 1) * 2 - 1;
    const t = hashUnit(id, 2) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    x[i] = radius * r * Math.cos(t);
    y[i] = radius * u;
    z[i] = radius * r * Math.sin(t);
  });
  const out = () => new Map(ids.map((id, i) => [id, [x[i], y[i], z[i]] as Vec3]));
  if (n < 2) return out();
  const index = new Map(ids.map((id, i) => [id, i]));
  const from: number[] = [];
  const to: number[] = [];
  for (const [a, b] of edges) {
    const i = index.get(a);
    const j = index.get(b);
    if (i === undefined || j === undefined || i === j) continue;
    from.push(i);
    to.push(j);
  }
  const rest = radius * 0.55;
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  const fz = new Float64Array(n);
  const clamp = (v: number) => Math.max(-0.2, Math.min(0.2, v));
  for (let step = 0; step < steps; step++) {
    const cool = 1 - step / steps;
    fx.fill(0);
    fy.fill(0);
    fz.fill(0);
    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      const zi = z[i];
      for (let j = i + 1; j < n; j++) {
        const dx = xi - x[j];
        const dy = yi - y[j];
        const dz = zi - z[j];
        const dist2 = Math.max(dx * dx + dy * dy + dz * dz, 0.0025);
        const f = 0.02 / dist2;
        const dist = Math.sqrt(dist2);
        const px = (dx / dist) * f;
        const py = (dy / dist) * f;
        const pz = (dz / dist) * f;
        fx[i] += px;
        fy[i] += py;
        fz[i] += pz;
        fx[j] -= px;
        fy[j] -= py;
        fz[j] -= pz;
      }
    }
    for (let e = 0; e < from.length; e++) {
      const i = from[e];
      const j = to[e];
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      const dz = z[j] - z[i];
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1e-6);
      const f = 0.08 * (dist - rest);
      const px = (dx / dist) * f;
      const py = (dy / dist) * f;
      const pz = (dz / dist) * f;
      fx[i] += px;
      fy[i] += py;
      fz[i] += pz;
      fx[j] -= px;
      fy[j] -= py;
      fz[j] -= pz;
    }
    for (let i = 0; i < n; i++) {
      x[i] += clamp(fx[i] - 0.05 * x[i]) * cool;
      y[i] += clamp(fy[i] - 0.05 * y[i]) * cool;
      z[i] += clamp(fz[i] - 0.05 * z[i]) * cool;
    }
  }
  return out();
}

export function rowGraph(hits: Hit[]): SceneLayout {
  const ids = hits.map((hit) => hit.id);
  const links = linksFromHits(hits, new Set(ids)).filter((link) => link.from !== link.to);
  const positions = fastForceLayout(ids, links.map((link) => [link.from, link.to]));
  return { nodes: hits.map((hit) => ({ id: hit.id, position: positions.get(hit.id) as Vec3, color: AXIS_COLOR, size: 0.05, label: hit.title })), links, guides: [], legend: [], camera: [0, 0, 5], spin: 0, wheel: "zoom" };
}

export function axisShare(axis: NonNullable<RowFrame["axis"]>, value: number): number {
  const at = Math.max(axis.from, Math.min(axis.to, value));
  if (axis.to <= axis.from) return 0.5;
  if (axis.scale === "linear") return (at - axis.from) / (axis.to - axis.from);
  return 1 - Math.log10(axis.to + 1 - at) / Math.log10(axis.to + 1 - axis.from);
}

export function axisLabel(axis: NonNullable<RowFrame["axis"]>, value: number): string {
  if (axis.unit === "age") return `age ${value}`;
  return value < 0 ? `${(-value).toLocaleString("en-US")} BCE` : String(value);
}

export function axisTicks(axis: NonNullable<RowFrame["axis"]>): number[] {
  if (axis.to <= axis.from) return [axis.from];
  if (axis.scale === "log") {
    const out = [axis.to];
    for (let back = 10; axis.to - back > axis.from; back *= 10) out.push(axis.to - back);
    return [...out, axis.from].sort((a, b) => a - b);
  }
  const span = axis.to - axis.from;
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000].find((s) => span / s <= 8) ?? Math.ceil(span / 8);
  const out: number[] = [];
  for (let v = Math.ceil(axis.from / step) * step; v <= axis.to; v += step) out.push(v);
  return out;
}

interface Placed {
  hit: Hit;
  start: number;
  end: number | null;
  weight: number | null;
}

export function rowTimeline(hits: Hit[], scene: RowScene): SceneLayout & { axisLength: number } {
  const axis = scene.axis;
  const left = -TIMELINE_WIDTH / 2;
  const xOf = (value: number) => (axis ? left + axisShare(axis, value) * TIMELINE_WIDTH : left);
  const lanes = scene.groups.filter((group) => hits.some((hit) => hit.branch === group.id));
  const weights = hits.map((hit) => scene.weight?.[scene.at[hit.id]] ?? null).filter((w): w is number => w !== null && w > 0);
  const heaviest = weights.length ? Math.max(...weights) : 1;
  const nodes: SceneNode[] = [];
  const guides: Guide[] = [];
  let top = 0;
  let undated = false;
  const first = LANE_LABEL_RISE;
  for (const group of lanes) {
    const placed: Placed[] = [];
    for (const hit of hits) {
      if (hit.branch !== group.id) continue;
      const i = scene.at[hit.id];
      const from = scene.from?.[i] ?? hit.year;
      const to = scene.to?.[i] ?? null;
      const start = from === null || !axis ? null : xOf(from);
      if (start === null) undated = true;
      placed.push({ hit, start: start ?? left - 0.6, end: start !== null && to !== null && to > (from as number) ? xOf(to) : null, weight: scene.weight?.[i] ?? null });
    }
    placed.sort((a, b) => a.start - b.start || (a.hit.id < b.hit.id ? -1 : 1));
    const free: number[] = [];
    let used = 1;
    placed.forEach((item, order) => {
      let row = free.findIndex((until) => until + MARK_GAP <= item.start);
      if (row < 0) row = free.length < STACK_ROWS ? free.length : order % STACK_ROWS;
      free[row] = Math.max(free[row] ?? Number.NEGATIVE_INFINITY, item.end ?? item.start);
      used = Math.max(used, row + 1);
      const y = top - row * STACK_GAP;
      const size = item.weight !== null && item.weight > 0 ? MARK * (0.7 + 1.1 * Math.sqrt(item.weight / heaviest)) : MARK;
      nodes.push({ id: item.hit.id, position: [item.start, y, 0], color: group.color, size, label: item.hit.title });
      if (item.end !== null) guides.push({ kind: "line", points: [[item.start, y, 0], [item.end, y, 0]], color: group.color });
    });
    guides.push({ kind: "text", position: [left + (group.label.length * LANE_LABEL_UNITS_PER_CHAR) / 2, top + LANE_LABEL_RISE, 0], text: group.label, color: group.color, size: 11 });
    top -= (used - 1) * STACK_GAP + LANE_GAP + LANE_LABEL_RISE;
  }
  const bottom = top + STACK_GAP;
  const height = first - bottom + LANE_GAP;
  const shift = height / 2 - first - LANE_GAP / 2;
  const lift = ([px, py, pz]: Vec3): Vec3 => [px, py + shift, pz];
  const moved = guides.map((guide): Guide => (guide.kind === "line" ? { ...guide, points: guide.points.map(lift) } : guide.kind === "text" ? { ...guide, position: lift(guide.position) } : guide));
  const baseline = bottom + shift;
  if (axis) {
    moved.push({ kind: "line", points: [[left, baseline, 0], [left + TIMELINE_WIDTH, baseline, 0]], color: AXIS_COLOR });
    for (const tick of axisTicks(axis)) {
      const x = xOf(tick);
      moved.push({ kind: "line", points: [[x, baseline, 0], [x, baseline - 0.06, 0]], color: AXIS_COLOR });
      moved.push({ kind: "text", position: [x, baseline - 0.2, 0], text: axisLabel(axis, tick), color: AXIS_COLOR, size: 10 });
    }
  }
  if (undated) moved.push({ kind: "text", position: [left - 0.6, baseline - 0.2, 0], text: UNDATED, color: AXIS_COLOR, size: 10 });
  const shown = new Set(hits.map((hit) => hit.id));
  return {
    nodes: nodes.map((node) => ({ ...node, position: lift(node.position) })),
    links: linksFromHits(hits, shown).filter((link) => link.from !== link.to),
    guides: moved,
    legend: [],
    camera: [0, 0, 8],
    wheel: "zoom",
    axisLength: Math.max(TIMELINE_WIDTH + 2.4, (height + 1) * 2.3),
  };
}

export const RING_CAMERA = 5.8;
const RING_HALF_VIEW = 4.4;

function ringPass(layout: SceneLayout, labels: Map<string, { label: string; color: string }>, scale: number): { guides: Guide[]; reach: number } {
  let reach = RING_RADIUS;
  const guides = layout.guides.map((guide): Guide => {
    if (guide.kind !== "text") return guide;
    const named = labels.get(guide.text);
    const text = named?.label ?? guide.text;
    const angle = Math.atan2(guide.position[1], guide.position[0]);
    const half = (text.length * LABEL_UNITS_PER_CHAR * scale) / 2;
    const radius = RING_RADIUS + LABEL_CLEARANCE * scale + half * Math.abs(Math.cos(angle)) + 0.14 * scale * Math.abs(Math.sin(angle));
    reach = Math.max(reach, Math.abs(radius * Math.cos(angle)) + half + 0.2);
    return { ...guide, text, color: named?.color ?? guide.color, position: [radius * Math.cos(angle), radius * Math.sin(angle), 0] };
  });
  return { guides, reach };
}

export function ringLabels(layout: SceneLayout, labels: Map<string, { label: string; color: string }>): SceneLayout {
  const first = ringPass(layout, labels, 1);
  const scale = Math.max(1, first.reach / RING_HALF_VIEW);
  const fitted = scale === 1 ? first : ringPass(layout, labels, scale * Math.max(1, ringPass(layout, labels, scale).reach / (RING_HALF_VIEW * scale)));
  const zoom = Math.max(1, fitted.reach / RING_HALF_VIEW);
  return { ...layout, guides: fitted.guides, camera: [0, 0, RING_CAMERA * zoom] };
}

export function labelClears(guide: Extract<Guide, { kind: "text" }>, nodes: SceneNode[], cameraZ = RING_CAMERA): boolean {
  const scale = cameraZ / RING_CAMERA;
  const half = (guide.text.length * LABEL_UNITS_PER_CHAR * scale) / 2;
  const [gx, gy] = guide.position;
  return nodes.every((node) => Math.abs(node.position[0] - gx) > half + node.size || Math.abs(node.position[1] - gy) > 0.09 * scale + node.size);
}
