import type { AtlasBranch } from "./solvability-atlas";
import { CORE_RADIUS, FRONTIER_RADIUS, OUTER_RADIUS, ZONE_LABEL, frontierXY, growthRanking, type Frontier, type FrontierPoint, type Zone } from "./solvability-frontier";

export const BRANCH_COLOR: Record<AtlasBranch, string> = {
  mathematics: "#1f6f78",
  physics: "#8a5fb0",
  chemistry: "#c9833f",
  information: "#2f5fa8",
  biophysics: "#4d9a6a",
  cosmology: "#b0486b",
  mind: "#a3923a",
  bucketmath: "#8b8b84",
};

const INK = "#1c2b2d";
const PAPER = "#f7f3ea";
const MUTED = "#6b756f";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f1 = (x: number) => x.toFixed(1);

export interface SvgOptions {
  size?: number;
  labels?: number;
}

function labelled(f: Frontier, limit: number): FrontierPoint[] {
  const open = f.points.filter((p) => p.zone !== "solved" && p.sourceKind === "problem");
  const solved = f.points.filter((p) => p.zone === "solved" && p.sourceKind === "problem");
  return [...open, ...solved].slice(0, limit);
}

export function frontierSvg(f: Frontier, opts: SvgOptions = {}): string {
  const size = opts.size ?? 1400;
  const cx = size / 2;
  const cy = size / 2 + 60;
  const unit = (size * 0.25) / FRONTIER_RADIUS;
  const at = (p: FrontierPoint): [number, number] => {
    const [x, y] = frontierXY(p);
    return [cx + x * unit, cy + y * unit];
  };
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + 260}" width="${size}" height="${size + 260}" font-family="Georgia, 'Times New Roman', serif" role="img" aria-label="Solvability frontier: ${f.inside} problems inside the circle, ${f.outside} outside">`);
  out.push(`<rect width="100%" height="100%" fill="${PAPER}"/>`);
  out.push(`<text x="60" y="64" font-size="34" font-weight="700" fill="${INK}">Solvability frontier</text>`);
  out.push(`<text x="60" y="96" font-size="17" fill="${MUTED}">${f.inside} problems inside the circle: ${f.counts.solved} solved, ${f.counts.reachable} open and close to a solved one. ${f.outside} outside.</text>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f1(OUTER_RADIUS * unit)}" fill="none" stroke="${MUTED}" stroke-width="0.6" stroke-dasharray="2 7" opacity="0.5"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f1(FRONTIER_RADIUS * unit)}" fill="#e7efe9" stroke="${INK}" stroke-width="3.2"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f1(CORE_RADIUS * unit)}" fill="#d6e6dc" stroke="${MUTED}" stroke-width="1" stroke-dasharray="5 5"/>`);
  const band = (r: number, text: string, strong = false) => out.push(`<text x="${f1(cx - r * unit)}" y="${f1(cy)}" font-size="13" fill="${strong ? INK : MUTED}" text-anchor="middle" letter-spacing="2" font-weight="${strong ? 700 : 400}" transform="rotate(-90 ${f1(cx - r * unit)} ${f1(cy)})">${text}</text>`);
  band(CORE_RADIUS - 0.05, "SOLVED");
  band((CORE_RADIUS + FRONTIER_RADIUS) / 2, "WITHIN REACH OF KNOWN RESULTS");
  band(FRONTIER_RADIUS + 0.05, "FRONTIER", true);
  band((FRONTIER_RADIUS + OUTER_RADIUS) / 2 + 0.05, "NEEDS A NEW IDEA");
  const byId = new Map(f.points.map((p) => [p.id, p]));
  for (const p of growthRanking(f)) {
    const [x1, y1] = at(p);
    for (const id of p.pulls) {
      const q = byId.get(id);
      if (!q || q.id < p.id) continue;
      const [x2, y2] = at(q);
      out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#b0486b" stroke-width="0.9" opacity="0.45"/>`);
    }
  }
  for (const p of f.points) {
    const [x, y] = at(p);
    const c = BRANCH_COLOR[p.branch];
    if (p.zone === "solved") out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${p.sourceKind === "problem" ? 5 : 2.6}" fill="${c}" opacity="${p.sourceKind === "problem" ? 0.95 : 0.5}"/>`);
    else if (p.zone === "reachable") out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="6" fill="${PAPER}" stroke="${c}" stroke-width="2.6"/>`);
    else out.push(`<path d="M${f1(x)},${f1(y - 8)} L${f1(x + 7)},${f1(y + 6)} L${f1(x - 7)},${f1(y + 6)} Z" fill="${c}" stroke="${INK}" stroke-width="0.8"/>`);
  }
  for (const p of labelled(f, opts.labels ?? 80)) {
    if (p.zone === "solved") continue;
    const dx = Math.cos(p.theta);
    const dy = -Math.sin(p.theta);
    const r = (p.zone === "beyond" ? Math.max(p.radius, FRONTIER_RADIUS) : p.radius) * unit + 13;
    const x = cx + dx * r;
    const y = cy + dy * r;
    const deg = (-p.theta * 180) / Math.PI;
    const flip = dx < 0;
    const text = `${p.title}${p.zone === "beyond" && p.growth > 1 ? `  +${p.growth}` : ""}`;
    out.push(`<text x="${f1(x)}" y="${f1(y)}" font-size="11.5" fill="${p.zone === "beyond" ? INK : MUTED}" font-weight="${p.zone === "beyond" ? 700 : 400}" text-anchor="${flip ? "end" : "start"}" dominant-baseline="middle" transform="rotate(${f1(flip ? deg + 180 : deg)} ${f1(x)} ${f1(y)})">${esc(text)}</text>`);
  }
  const ly = size + 150;
  const legend: [Zone, string][] = [["solved", `<circle cx="0" cy="-4" r="5" fill="${INK}"/>`], ["reachable", `<circle cx="0" cy="-4" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="2.6"/>`], ["beyond", `<path d="M0,-12 L7,2 L-7,2 Z" fill="${INK}"/>`]];
  legend.forEach(([zone, mark], i) => out.push(`<g transform="translate(${70 + i * 330} ${ly})">${mark}<text x="16" y="0" font-size="15" fill="${INK}">${esc(ZONE_LABEL[zone])}: ${f.counts[zone]}</text></g>`));
  out.push(`<text x="60" y="${ly + 34}" font-size="14" fill="${MUTED}">${esc(f.rule)}</text>`);
  out.push(`<text x="60" y="${ly + 58}" font-size="14" fill="${MUTED}">Angle is position in meaning. A red line joins two outside problems close enough that solving one brings the other inside; +n counts the problems that move.</text>`);
  out.push(`<text x="60" y="${ly + 82}" font-size="14" fill="${MUTED}">Similarity is measured on titles and keywords. Whether AI can solve what sits inside is the hypothesis under test.</text>`);
  out.push("</svg>");
  return out.join("\n");
}

export interface TextOptions {
  width?: number;
  color?: boolean;
  list?: number;
}

const ANSI: Record<Zone | "ring" | "dim" | "off", string> = { solved: "\x1b[32m", reachable: "\x1b[36m", beyond: "\x1b[33;1m", ring: "\x1b[37;1m", dim: "\x1b[2m", off: "\x1b[0m" };
export const TEXT_MARK: Record<Zone, string> = { solved: "·", reachable: "o", beyond: "▲" };
const TAGS = "123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function frontierText(f: Frontier, opts: TextOptions = {}): string[] {
  const width = Math.max(41, (opts.width ?? 79) | 1);
  const height = Math.round(width / 2) | 1;
  const paint = (kind: keyof typeof ANSI, s: string) => (opts.color ? `${ANSI[kind]}${s}${ANSI.off}` : s);
  const cells: { ch: string; kind: keyof typeof ANSI | null }[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ ch: " ", kind: null })));
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const scale = cy / (OUTER_RADIUS + 0.08);
  const put = (x: number, y: number, ch: string, kind: keyof typeof ANSI, force = false) => {
    const col = Math.round(cx + x * scale * 2);
    const row = Math.round(cy + y * scale);
    if (row < 0 || row >= height || col < 0 || col >= width) return;
    if (force || cells[row][col].ch === " " || cells[row][col].kind === "ring" || cells[row][col].kind === "dim") cells[row][col] = { ch, kind };
  };
  const ring = (r: number, ch: string, kind: keyof typeof ANSI) => {
    const steps = Math.ceil(2 * Math.PI * r * scale * 4);
    for (let i = 0; i < steps; i++) put(r * Math.cos((2 * Math.PI * i) / steps), r * Math.sin((2 * Math.PI * i) / steps), ch, kind);
  };
  ring(CORE_RADIUS, ".", "dim");
  ring(FRONTIER_RADIUS, "#", "ring");
  const ranked = growthRanking(f);
  const tag = new Map(ranked.slice(0, TAGS.length).map((p, i) => [p.id, TAGS[i]]));
  const order: Zone[] = ["solved", "reachable", "beyond"];
  for (const zone of order)
    for (const p of f.points.filter((q) => q.zone === zone)) {
      const [x, y] = frontierXY(p);
      put(x, y, zone === "beyond" ? (tag.get(p.id) ?? TEXT_MARK.beyond) : TEXT_MARK[zone], zone, zone !== "solved");
    }
  const lines = cells.map((row) => row.map((c) => (c.kind ? paint(c.kind, c.ch) : c.ch)).join("").replace(/\s+$/, ""));
  const out = [
    `Solvability frontier: ${f.inside} inside (${f.counts.solved} solved, ${f.counts.reachable} open within reach), ${f.outside} outside`,
    "",
    ...lines,
    "",
    `${paint("ring", "#")} frontier at reach ${f.threshold}   ${paint("solved", TEXT_MARK.solved)} solved   ${paint("reachable", TEXT_MARK.reachable)} open, within reach   ${paint("beyond", "1-9a-z")} open, needs a new idea`,
    "",
    "Outside the circle, ranked by how far solving each one moves the frontier:",
  ];
  const pad = Math.min(34, Math.max(...ranked.map((p) => p.title.length), 8));
  ranked.slice(0, opts.list ?? ranked.length).forEach((p, i) => {
    const title = p.title.length > pad ? `${p.title.slice(0, pad - 1)}…` : p.title.padEnd(pad);
    out.push(` ${paint("beyond", TAGS[i] ?? TEXT_MARK.beyond)}  ${title}  reach ${p.reach.toFixed(2)}  +${String(p.growth).padEnd(2)} nearest solved: ${p.nearest?.title ?? "none"}`);
  });
  out.push("", f.rule, "Similarity is measured on titles and keywords. Whether AI can solve what sits inside is the hypothesis under test.");
  return out;
}
