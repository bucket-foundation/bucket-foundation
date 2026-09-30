export interface MapAxis {
  label: string;
  angle: number;
  terms: string[];
}

export interface MapAdvisor {
  id: string;
  name: string;
  field: string;
  score: number;
  star: number[];
}

export interface MapModel {
  axes: MapAxis[];
  advisors: MapAdvisor[];
  split?: boolean;
}

export type Point = [number, number];

export function axisAngles(axes: MapAxis[]): number[] {
  const spread = new Set(axes.map((a) => a.angle)).size < 2;
  return axes.map((a, i) => (((spread ? (360 * i) / Math.max(1, axes.length) : a.angle) % 360) * Math.PI) / 180);
}

export function project(vec: number[], angles: number[]): Point {
  let x = 0;
  let y = 0;
  let mass = 0;
  angles.forEach((a, i) => {
    const w = Math.max(0, vec[i] ?? 0);
    x += w * Math.cos(a);
    y += w * Math.sin(a);
    mass += w;
  });
  return mass > 0 ? [x / mass, y / mass] : [0, 0];
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : 0;
}

const words = (text: string): string[] => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function termVector(text: string, axes: MapAxis[]): number[] {
  const count = new Map<string, number>();
  for (const w of words(text)) count.set(w, (count.get(w) ?? 0) + 1);
  const raw = axes.map((a) => {
    const seen = new Set<string>();
    let hits = 0;
    for (const term of a.terms) for (const w of words(term)) if (!seen.has(w)) {
      seen.add(w);
      hits += Math.log1p(count.get(w) ?? 0);
    }
    return hits;
  });
  const top = Math.max(...raw, 0);
  return top > 0 ? raw.map((v) => v / top) : raw.map(() => 0);
}

export function nearestAdvisors(you: number[], advisors: MapAdvisor[], k = 3): MapAdvisor[] {
  return advisors
    .map((a) => ({ a, s: cosine(you, a.star) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || (x.a.id < y.a.id ? -1 : 1))
    .slice(0, k)
    .map((x) => x.a);
}
