import { radiusOf, spokeAngle, type SpaceComponent } from "./space";

export const CIRCLE_RADIUS = 130;
export const RINGS = [0.25, 0.5, 0.75, 1];

export type Point = [number, number];

export function spokeDirection(component: Pick<SpaceComponent, "angle_deg">): Point {
  const a = spokeAngle(component);
  return [Math.cos(a), -Math.sin(a)];
}

export function polygonPoints(scores: number[], components: Pick<SpaceComponent, "angle_deg">[], radius = CIRCLE_RADIUS): Point[] {
  return scores.map((s, i) => {
    const [dx, dy] = spokeDirection(components[i]);
    const r = radius * radiusOf(s);
    return [r * dx, r * dy];
  });
}

export function smoothLoop(p: Point[], t = 0.35): string {
  const n = p.length;
  if (n === 0) return "";
  const at = (i: number) => p[(i + n) % n];
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(p[0][0])},${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * t) / 2, p1[1] + ((p2[1] - p0[1]) * t) / 2];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * t) / 2, p2[1] - ((p3[1] - p1[1]) * t) / 2];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d} Z`;
}

export function wrapLabel(label: string, at: number): string[] {
  const lines: string[] = [];
  for (const w of label.split(/\s+/).filter(Boolean)) {
    if (lines.length && `${lines[lines.length - 1]} ${w}`.length <= at) lines[lines.length - 1] += ` ${w}`;
    else lines.push(w);
  }
  return lines;
}

export function labelLayout(dir: Point, lines: number): { anchor: "start" | "middle" | "end"; shift: number } {
  const [dx, dy] = dir;
  const anchor = Math.abs(dx) < 0.3 ? "middle" : dx > 0 ? "start" : "end";
  const shift = dy < -0.3 ? -(lines - 1) : Math.abs(dy) <= 0.3 ? -(lines - 1) / 2 : 0;
  return { anchor, shift };
}

export function ariaSummary(labels: string[], series: { name: string; scores: number[] }[]): string {
  return series.map((s) => `${s.name}: ${labels.map((l, i) => `${l} ${Math.round(radiusOf(s.scores[i]) * 100)}`).join(", ")}`).join(". ");
}
