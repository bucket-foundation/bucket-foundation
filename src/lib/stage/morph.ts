import type { Vec3 } from "../explore/frame";

export interface MorphItem {
  id: string;
  from: Vec3;
  to: Vec3;
  fromScale: number;
  toScale: number;
  kind: "shared" | "leaving" | "entering";
}

export interface MorphSample {
  id: string;
  position: Vec3;
  scale: number;
}

export function planMorph(prev: Map<string, Vec3>, next: Map<string, Vec3>): MorphItem[] {
  const out: MorphItem[] = [];
  for (const [id, to] of Array.from(next)) {
    const from = prev.get(id);
    if (from) out.push({ id, from, to, fromScale: 1, toScale: 1, kind: "shared" });
    else out.push({ id, from: to, to, fromScale: 0, toScale: 1, kind: "entering" });
  }
  for (const [id, from] of Array.from(prev)) if (!next.has(id)) out.push({ id, from, to: from, fromScale: 1, toScale: 0, kind: "leaving" });
  return out;
}

export function ease(k: number): number {
  const x = Math.min(1, Math.max(0, k));
  return x * x * (3 - 2 * x);
}

export function sampleMorph(item: MorphItem, k: number, reduced = false): MorphSample {
  const e = reduced ? 1 : ease(k);
  return {
    id: item.id,
    position: [item.from[0] + (item.to[0] - item.from[0]) * e, item.from[1] + (item.to[1] - item.from[1]) * e, item.from[2] + (item.to[2] - item.from[2]) * e],
    scale: item.fromScale + (item.toScale - item.fromScale) * e,
  };
}

export function bufferSize(plan: MorphItem[]): number {
  return plan.length;
}

export function settled(plan: MorphItem[]): MorphItem[] {
  return plan.filter((p) => p.kind !== "leaving");
}
