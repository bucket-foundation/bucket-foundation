import { CORE_RADIUS, FRONTIER_RADIUS, OUTER_RADIUS, type Zone } from "./solvability-frontier";

const ZONE_COLOR: Record<Zone, string> = { solved: "#1f6f78", reachable: "#c9833f", beyond: "#b0486b", unsampled: "#8f8f88" };
const INK = "#1c2b2d";
const PAPER = "#f7f3ea";
const HAIR = "#c9c2ad";
const SIZE = 240;
const SCALE = (SIZE / 2 - 8) / OUTER_RADIUS;

const f1 = (x: number) => x.toFixed(1);
const xy = (theta: number, radius: number): [number, number] => [SIZE / 2 + SCALE * radius * Math.cos(theta), SIZE / 2 - SCALE * radius * Math.sin(theta)];

export interface GlyphPoint {
  id: string;
  theta: number;
  radius: number;
  solved: boolean;
}

export function recordGlyph(self: { title: string; zone: Zone; theta: number; radius: number }, neighbours: readonly GlyphPoint[]): string {
  const [x, y] = xy(self.theta, self.radius);
  const rings = [CORE_RADIUS, FRONTIER_RADIUS, OUTER_RADIUS]
    .map((r, i) => `<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${f1(SCALE * r)}" fill="none" stroke="${i === 1 ? INK : HAIR}" stroke-width="${i === 1 ? 1 : 0.8}" ${i === 0 ? 'stroke-dasharray="3 3"' : ""}/>`)
    .join("");
  const links = neighbours
    .map((n) => {
      const [nx, ny] = xy(n.theta, n.radius);
      return `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(nx)}" y2="${f1(ny)}" stroke="${n.solved ? ZONE_COLOR.solved : ZONE_COLOR.beyond}" stroke-opacity="0.35" stroke-width="0.8"/>`;
    })
    .join("");
  const dots = neighbours
    .map((n) => {
      const [nx, ny] = xy(n.theta, n.radius);
      return n.solved
        ? `<circle cx="${f1(nx)}" cy="${f1(ny)}" r="2.6" fill="${ZONE_COLOR.solved}"/>`
        : `<circle cx="${f1(nx)}" cy="${f1(ny)}" r="2.6" fill="${PAPER}" stroke="${ZONE_COLOR.beyond}" stroke-width="1"/>`;
    })
    .join("");
  const title = self.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="Position of ${title} on the frontier: ${self.zone}"><rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/>${rings}${links}${dots}<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="${ZONE_COLOR[self.zone]}" stroke="${INK}" stroke-width="1.2"/></svg>`;
}
