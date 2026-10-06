import type { AtlasBranch } from "./solvability-atlas";
import { CORE_RADIUS, FRONTIER_RADIUS, OUTER_RADIUS, ZONE_LABEL, ZONES, branchCounts, frontierXY, growthRanking, type Frontier, type FrontierPoint, type Zone } from "./solvability-frontier";

export const BRANCH_COLOR: Record<AtlasBranch, string> = {
  mathematics: "#1f6f78",
  physics: "#8a5fb0",
  chemistry: "#c9833f",
  information: "#2f5fa8",
  biophysics: "#4d9a6a",
  cosmology: "#b0486b",
  mind: "#a3923a",
  bucketmath: "#8b8b84",
  applied: "#6b6b6b",
};

const INK = "#1c2b2d";
const PAPER = "#f7f3ea";
const MUTED = "#3f4a46";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f1 = (x: number) => x.toFixed(1);

export const LABEL_GAP = 15;

export function spread(ys: readonly number[], gap: number, lo: number, hi: number): number[] {
  const out = [...ys];
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
  const over = out.length ? out[out.length - 1] - hi : 0;
  if (over > 0) for (let i = 0; i < out.length; i++) out[i] -= over;
  for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - gap);
  if (out.length && out[0] < lo) {
    const up = lo - out[0];
    for (let i = 0; i < out.length; i++) out[i] += up;
  }
  return out;
}

export const METHOD: readonly string[] = [
  "How this drawing was made. 1. tools/solvability-atlas lists 71 open and closed problems across the seven canon branches (problems.tsv) and every theorem in lean/manifest.json, 156 entries in the atlas data.",
  "2. Each entry's title, branch and keywords are embedded with BAAI/bge-small-en-v1.5, and cosine similarity is computed between every pair (solvability-similarity-data.json).",
  "3. Angle is the entry's rank along the first two principal directions of the embeddings, so neighbours on the circle are neighbours in meaning.",
  "4. An entry counts as solved when it has a resolved year. Reach is an entry's highest similarity to a solved entry other than itself.",
  "5. The frontier sits at the 10th percentile of solved entries' reach: nine in ten solved entries are at least that close to another solved one. Open entries at or above it are inside; the rest are outside.",
  "6. Radius: solved entries fill the inner disc by reach, open entries inside fill the ring up to the frontier, outside entries sit beyond it by how far their reach falls short.",
  "7. For each outside entry, +n counts the outside entries that would move inside if it were solved (itself plus every outside entry at least the threshold similar to it); a red line joins such pairs.",
  "Produced by bkt atlas frontier --svg from src/lib/research-os/solvability-frontier.ts.",
];

export function methodFull(f: Frontier): string[] {
  const kinds = { problem: 0, sourced: 0, variant: 0, lean: 0 } as Record<FrontierPoint["sourceKind"], number>;
  for (const p of f.points) kinds[p.sourceKind] += 1;
  return [
    `How this drawing was made. 1. tools/solvability-atlas lists ${kinds.problem} atlas problems (problems.tsv, MIT) and ${kinds.sourced + kinds.variant} sourced rows (problems-sourced.tsv): ${kinds.sourced} top-level problems and ${kinds.variant} variants, from google-deepmind/formal-conjectures (Apache-2.0) and Wikipedia problem lists (CC BY-SA 4.0, attributed in the data). Lean theorems from lean/manifest.json are embedded but left off this drawing.`,
    "2. Each entry's statement is embedded with BAAI/bge-small-en-v1.5 (the atlas problems use their record text; rows without a statement use name and keywords; the branch word is never in the text). For each entry the 50 most similar entries and its nearest solved entry are stored (solvability-neighbors-data.json).",
    "3. Angle is the entry's rank along the first two principal components of the problem embeddings, so neighbours on the circle are neighbours in meaning.",
    "4. A top-level entry counts as solved when its status is solved. A variant counts as solved only when it and the problem it varies are both solved; a proved special case of an open problem stays open. Reach is an entry's highest similarity to a solved entry other than itself.",
    "5. The frontier sits at the 10th percentile of solved entries' reach: nine in ten solved entries are at least that close to another solved one. Open entries at or above it are inside; the rest are outside.",
    "6. Radius: solved entries fill the inner disc by reach, open entries inside fill the ring up to the frontier, outside entries sit beyond it by how far their reach falls short.",
    "7. For each outside entry, +n counts the outside entries that would move inside if it were solved, counted over its 50 stored neighbours; a red line joins such pairs. Labels name the 40 outside entries with the largest +n and the atlas problems.",
    "Produced by bkt atlas frontier --svg from src/lib/research-os/solvability-frontier.ts.",
  ];
}

export interface SvgOptions {
  size?: number;
  labels?: number;
}

export const FULL_LABELS = 40;

export function isFull(f: Frontier): boolean {
  return f.points.some((p) => p.sourceKind === "sourced" || p.sourceKind === "variant");
}

export function labelled(f: Frontier, limit: number): FrontierPoint[] {
  if (isFull(f)) {
    const top = growthRanking(f).slice(0, FULL_LABELS);
    const known = f.points.filter((p) => p.sourceKind === "problem" && p.zone !== "solved" && !top.includes(p));
    return [...top, ...known];
  }
  const open = f.points.filter((p) => p.zone !== "solved" && p.sourceKind === "problem");
  const solved = f.points.filter((p) => p.zone === "solved" && p.sourceKind === "problem");
  return [...open, ...solved].slice(0, limit);
}

export function frontierSvg(f: Frontier, opts: SvgOptions = {}): string {
  const full = isFull(f);
  const named = labelled(f, opts.labels ?? 80);
  const size = opts.size ?? (full ? 2400 : 1500);
  const unit = (size * 0.23) / FRONTIER_RADIUS;
  const cx = full ? size * 0.5 : size * 0.36;
  const sideCount = (side: number) => named.filter((p) => p.zone !== "solved" && Math.sign(Math.cos(p.theta) || 1) === side).length;
  const half = Math.max(OUTER_RADIUS * unit, (Math.max(sideCount(1), sideCount(-1)) * LABEL_GAP) / 2 + 20);
  const cy = half + 150;
  const at = (p: FrontierPoint): [number, number] => {
    const [x, y] = frontierXY(p);
    return [cx + x * unit, cy + y * unit];
  };
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} __H__" width="${size}" height="__H__" font-family="Georgia, 'Times New Roman', serif" role="img" aria-label="Solvability frontier: ${f.inside} problems inside the circle, ${f.outside} outside">`);
  out.push(`<rect width="100%" height="100%" fill="${PAPER}"/>`);
  out.push(`<text x="60" y="64" font-size="34" font-weight="700" fill="${INK}">Solvability frontier</text>`);
  out.push(`<text x="60" y="100" font-size="21" fill="${INK}">${f.inside} problems inside the circle: ${f.counts.solved} solved, ${f.counts.reachable} open and close to a solved one. ${f.outside} outside.</text>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f1(OUTER_RADIUS * unit)}" fill="none" stroke="${MUTED}" stroke-width="0.6" stroke-dasharray="2 7" opacity="0.5"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f1(FRONTIER_RADIUS * unit)}" fill="#e7efe9" stroke="${INK}" stroke-width="3.2"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f1(CORE_RADIUS * unit)}" fill="#d6e6dc" stroke="${MUTED}" stroke-width="1" stroke-dasharray="5 5"/>`);
  const band = (r: number, text: string, strong = false) =>
    out.push(`<text x="${f1(cx - r * unit * Math.SQRT1_2)}" y="${f1(cy + r * unit * Math.SQRT1_2)}" font-size="16" fill="${INK}" text-anchor="middle" letter-spacing="2.5" font-weight="700" opacity="${strong ? 1 : 0.8}" paint-order="stroke" stroke="${PAPER}" stroke-width="6">${text}</text>`);
  band(CORE_RADIUS - 0.08, "SOLVED");
  band(FRONTIER_RADIUS - 0.08, "WITHIN REACH OF KNOWN RESULTS");
  band(FRONTIER_RADIUS + 0.08, "FRONTIER", true);
  band(OUTER_RADIUS + 0.08, "NEEDS A NEW IDEA");
  const byId = new Map(f.points.map((p) => [p.id, p]));
  const namedIds = new Set(named.map((p) => p.id));
  for (const p of growthRanking(f)) {
    if (full && !namedIds.has(p.id)) continue;
    const [x1, y1] = at(p);
    for (const id of p.pulls) {
      const q = byId.get(id);
      if (!q || (!full && q.id < p.id)) continue;
      const [x2, y2] = at(q);
      out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#b0486b" stroke-width="${full ? 0.7 : 1.4}" opacity="${full ? 0.35 : 0.7}"/>`);
    }
  }
  for (const p of f.points) {
    const [x, y] = at(p);
    const c = BRANCH_COLOR[p.branch];
    const big = !full || namedIds.has(p.id);
    if (p.zone === "solved") out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${big && p.sourceKind === "problem" ? 5 : full ? 1.6 : 2.6}" fill="${c}" opacity="${big && p.sourceKind === "problem" ? 0.95 : 0.5}"/>`);
    else if (p.zone === "reachable") out.push(big ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="6" fill="${PAPER}" stroke="${c}" stroke-width="2.6"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.2" fill="${PAPER}" stroke="${c}" stroke-width="1.1" opacity="0.8"/>`);
    else if (big) out.push(`<path d="M${f1(x)},${f1(y - 8)} L${f1(x + 7)},${f1(y + 6)} L${f1(x - 7)},${f1(y + 6)} Z" fill="${c}" stroke="${INK}" stroke-width="0.8"/>`);
    else out.push(`<path d="M${f1(x)},${f1(y - 3.6)} L${f1(x + 3.2)},${f1(y + 2.6)} L${f1(x - 3.2)},${f1(y + 2.6)} Z" fill="${c}" opacity="0.75"/>`);
  }
  const column = (side: 1 | -1) => {
    const rows = named
      .filter((p) => p.zone !== "solved" && Math.sign(Math.cos(p.theta) || 1) === side)
      .map((p) => ({ p, y: at(p)[1] }))
      .sort((u, v) => u.y - v.y);
    const ys = spread(rows.map((r) => r.y), LABEL_GAP, cy - half, cy + half + 40);
    const lx = side > 0 ? cx + OUTER_RADIUS * unit + 24 : Math.max(full ? 520 : 240, cx - OUTER_RADIUS * unit - 24);
    rows.forEach((r, i) => {
      const [px, py] = at(r.p);
      const y = ys[i];
      out.push(`<line x1="${f1(px)}" y1="${f1(py)}" x2="${f1(lx - side * 6)}" y2="${f1(y)}" stroke="${MUTED}" stroke-width="0.7" opacity="0.6"/>`);
      const text = `${r.p.title}${r.p.zone === "beyond" && r.p.growth > 1 ? `  +${r.p.growth}` : ""}`;
      out.push(`<text x="${f1(lx)}" y="${f1(y)}" font-size="13" fill="${INK}" font-weight="${r.p.zone === "beyond" ? 700 : 400}" text-anchor="${side > 0 ? "start" : "end"}" dominant-baseline="middle">${esc(text)}</text>`);
    });
  };
  column(1);
  column(-1);
  const ly = Math.round(cy + half + 110);
  const legend: [Zone, string][] = [["solved", `<circle cx="0" cy="-6" r="7" fill="${INK}"/>`], ["reachable", `<circle cx="0" cy="-6" r="8" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>`], ["beyond", `<path d="M0,-16 L9,2 L-9,2 Z" fill="${INK}"/>`]];
  legend.forEach(([zone, mark], i) => out.push(`<g transform="translate(${70 + i * 400} ${ly})">${mark}<text x="18" y="0" font-size="20" font-weight="700" fill="${INK}">${esc(ZONE_LABEL[zone])}: ${f.counts[zone]}</text></g>`));
  let by = ly + 40;
  if (full) {
    const counts = branchCounts(f);
    const branches = Object.keys(counts).sort((a, b) => (counts[b].solved + counts[b].reachable + counts[b].beyond) - (counts[a].solved + counts[a].reachable + counts[a].beyond));
    branches.forEach((b, i) => {
      const c = counts[b];
      const x = 70 + (i % 3) * 700;
      const y = by + Math.floor(i / 3) * 26;
      out.push(`<g transform="translate(${x} ${y})"><circle cx="0" cy="-5" r="6" fill="${BRANCH_COLOR[b as AtlasBranch] ?? INK}"/><text x="14" y="0" font-size="15" fill="${INK}">${esc(b)}: ${c.solved + c.reachable + c.beyond} (${c.solved} solved, ${c.reachable} within reach, ${c.beyond} outside)</text></g>`);
    });
    by += Math.ceil(branches.length / 3) * 26 + 12;
  }
  out.push(`<text x="60" y="${by}" font-size="17" fill="${INK}">${esc(f.rule)}</text>`);
  out.push(`<text x="60" y="${by + 26}" font-size="17" fill="${INK}">Angle is position in meaning. A red line joins two outside problems close enough that solving one brings the other inside; +n counts the problems that move.</text>`);
  out.push(`<text x="60" y="${by + 52}" font-size="17" fill="${INK}">${full ? "Similarity is measured on problem statements." : "Similarity is measured on titles and keywords."} Whether AI can solve what sits inside is the hypothesis under test.</text>`);
  let my = by + 96;
  for (const line of full ? methodFull(f) : METHOD)
    for (const part of wrapWords(line, Math.floor((size - 120) / 7.6))) {
      out.push(`<text x="60" y="${my}" font-size="15" fill="${INK}">${esc(part)}</text>`);
      my += 21;
    }
  out.push("</svg>");
  return out.join("\n").replaceAll("__H__", String(my + 30));
}

export interface TextOptions {
  width?: number;
  color?: boolean;
  list?: number;
}

const ANSI: Record<Zone | "ring" | "dim" | "off", string> = { solved: "\x1b[32m", reachable: "\x1b[36m", beyond: "\x1b[33;1m", ring: "\x1b[37;1m", dim: "\x1b[2m", off: "\x1b[0m" };
export const TEXT_MARK: Record<Zone, string> = { solved: "·", reachable: "o", beyond: "▲" };
const TAGS = "123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    if (lines.length && `${lines[lines.length - 1]} ${word}`.length <= width) lines[lines.length - 1] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

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
    ...wrapWords(`Solvability frontier: ${f.inside} inside (${f.counts.solved} solved, ${f.counts.reachable} open within reach), ${f.outside} outside`, width),
    "",
    ...lines,
    "",
    `${paint("ring", "#")} frontier at reach ${f.threshold}   ${paint("solved", TEXT_MARK.solved)} solved   ${paint("reachable", TEXT_MARK.reachable)} open, within reach`,
    `${paint("beyond", "1-9a-z")} open, needs a new idea`,
    "",
    ...wrapWords("Outside the circle, ranked by how far solving each one moves the frontier:", width),
  ];
  const pad = Math.min(34, Math.max(...ranked.map((p) => p.title.length), 8));
  ranked.slice(0, opts.list ?? ranked.length).forEach((p, i) => {
    const title = p.title.length > pad ? `${p.title.slice(0, pad - 1)}…` : p.title.padEnd(pad);
    const head = `  ${title}  reach ${p.reach.toFixed(2)}  +${String(p.growth).padEnd(2)} `;
    const tail = `nearest solved: ${p.nearest?.title ?? "none"}`;
    const room = width - 2 - head.length;
    out.push(` ${paint("beyond", TAGS[i] ?? TEXT_MARK.beyond)}${head}${room >= tail.length ? tail : room > 16 ? `${tail.slice(0, room - 1)}…` : ""}`.replace(/\s+$/, ""));
  });
  const counts = branchCounts(f);
  const branches = Object.keys(counts).sort((a, b) => ZONES.reduce((s, z) => s + counts[b][z], 0) - ZONES.reduce((s, z) => s + counts[a][z], 0));
  out.push("", "Per branch: total, solved, within reach, outside");
  for (const b of branches) out.push(`  ${b.padEnd(12)} ${String(ZONES.reduce((s, z) => s + counts[b][z], 0)).padStart(5)} ${String(counts[b].solved).padStart(5)} ${String(counts[b].reachable).padStart(5)} ${String(counts[b].beyond).padStart(5)}`);
  out.push("", ...wrapWords(f.rule, width), ...wrapWords(`Similarity is measured on ${isFull(f) ? "problem statements" : "titles and keywords"}. Whether AI can solve what sits inside is the hypothesis under test.`, width));
  return out;
}
