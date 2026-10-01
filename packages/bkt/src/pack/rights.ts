import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const DENIED_NAME = /kruse/i;
export const DENIED_PREFIXES = ["_intake/kruse-blog-corpus", "_intake/kruse-references-mined"];
export const VIDEO_META_FILES = ["info.md", "metadata.json"];
export const BACKSTOP_PREFIXES = ["_intake/canon-claims-raw", "_intake/concept-digests", "_intake/canon-profiles"];

const VIDEO_DIR = /^([A-Za-z0-9_-]{11})-/;
const VIDEO_REF = [/(?:^|\/)yt\/([A-Za-z0-9_-]{11})-/g, /[?&]v=([A-Za-z0-9_-]{11})/g, /youtu\.be\/([A-Za-z0-9_-]{11})/g, /\/embed\/([A-Za-z0-9_-]{11})/g, /^([A-Za-z0-9_-]{11})-/g];

export type Denial = "prefix" | "video" | "path" | "file" | "text";

export interface Denylist {
  videoIds: Set<string>;
  prefixes: string[];
  files: Set<string>;
  unreadable: Set<string>;
}

export const AGGREGATE_ROOT = "_intake/";
export const MARKER_CHARS = 48;
export const MARKER_MIN_CHARS = 25;

export function marker(text: string): string | null {
  const m = text.replace(/\s+/g, " ").trim().slice(0, MARKER_CHARS);
  return m.length >= MARKER_MIN_CHARS ? m : null;
}

export function deniedVideoIds(repo: string): Set<string> {
  const root = join(repo, "yt");
  if (!existsSync(root)) throw new Error(`rights: ${root} is missing, so the denied video list cannot be built`);
  const ids = new Set<string>();
  for (const dir of readdirSync(root).sort()) {
    const m = VIDEO_DIR.exec(dir);
    if (!m || !statSync(join(root, dir)).isDirectory()) continue;
    const named = DENIED_NAME.test(dir);
    const found = VIDEO_META_FILES.map((f) => join(root, dir, f))
      .filter((p) => existsSync(p))
      .map((p) => DENIED_NAME.test(readFileSync(p, "utf8")));
    if (found.length > 1 && new Set(found).size > 1) throw new Error(`rights: ${VIDEO_META_FILES.join(" and ")} disagree for yt/${dir}, so the denied video list cannot be trusted`);
    if (named || found.some(Boolean)) ids.add(m[1]);
  }
  if (ids.size === 0) throw new Error("rights: no denied video found under yt, so the filter would pass everything");
  return ids;
}

export function buildDenylist(repo: string): Denylist {
  return { videoIds: deniedVideoIds(repo), prefixes: DENIED_PREFIXES, files: new Set(), unreadable: new Set() };
}

export function citesDenied(deny: Denylist, body: string): boolean {
  if (DENIED_NAME.test(body) || deny.prefixes.some((p) => body.includes(p))) return true;
  return videoIdsIn(body).some((id) => deny.videoIds.has(id));
}

export function withDeniedFiles(repo: string, deny: Denylist, paths: Iterable<string>): Denylist {
  const files = new Set(deny.files);
  const unreadable = new Set(deny.unreadable);
  for (const p of new Set(paths)) {
    if (!p.startsWith(AGGREGATE_ROOT) || denyRef(deny, p)) continue;
    const full = join(repo, p);
    const readable = existsSync(full) && statSync(full).isFile();
    if (!readable) unreadable.add(p);
    if (!readable || citesDenied(deny, readFileSync(full, "utf8"))) files.add(p);
  }
  return { ...deny, files, unreadable };
}

export function videoIdsIn(ref: string): string[] {
  const out: string[] = [];
  for (const re of VIDEO_REF) for (const m of ref.matchAll(re)) out.push(m[1]);
  return out;
}

export function denyRef(deny: Denylist, ref: string): Denial | null {
  const clean = ref.replace(/^.*?\/bucket-foundation\//, "");
  if (deny.prefixes.some((p) => clean === p || clean.startsWith(`${p}/`))) return "prefix";
  if (videoIdsIn(clean).some((id) => deny.videoIds.has(id))) return "video";
  if (DENIED_NAME.test(clean)) return "path";
  if (deny.files.has(clean)) return "file";
  return null;
}

export function denyRow(deny: Denylist, refs: (string | null | undefined)[], text = ""): Denial | null {
  for (const ref of refs) {
    const d = ref ? denyRef(deny, ref) : null;
    if (d) return d;
  }
  return DENIED_NAME.test(text) ? "text" : null;
}

export function keepVectorRows(vectors: Float32Array, dim: number, keep: number[]): Float32Array {
  const out = new Float32Array(keep.length * dim);
  keep.forEach((row, i) => {
    if (row < 0 || (row + 1) * dim > vectors.length) throw new Error(`rights: vector row ${row} is outside the matrix`);
    out.set(vectors.subarray(row * dim, (row + 1) * dim), i * dim);
  });
  return out;
}

export interface GraphLike {
  nodes: { id: string; name?: string; url?: string; path?: string }[];
  edges: { source: string; target: string }[];
}

export function keepConnections<G extends GraphLike>(deny: Denylist, graph: G): { graph: G; denied: number } {
  const gone = new Set(graph.nodes.filter((n) => denyRow(deny, [n.id, n.url, n.path], n.name)).map((n) => n.id));
  return {
    graph: { ...graph, nodes: graph.nodes.filter((n) => !gone.has(n.id)), edges: graph.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)) },
    denied: gone.size,
  };
}

function strings(v: unknown, at: string, out: { at: string; s: string }[]) {
  if (typeof v === "string") out.push({ at, s: v });
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}[${i}]`, out));
  else if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) {
      out.push({ at: `${at}.${k}`, s: k });
      strings(x, `${at}.${k}`, out);
    }
}

export function residual(deny: Denylist, value: unknown): string[] {
  const all: { at: string; s: string }[] = [];
  strings(value, "$", all);
  const hits: string[] = [];
  for (const { at, s } of all) {
    if (DENIED_NAME.test(s)) hits.push(`${at}: denied name`);
    else if (deny.prefixes.some((p) => s.includes(p))) hits.push(`${at}: denied path`);
    else {
      for (const id of deny.videoIds) {
        if (s.includes(id)) {
          hits.push(`${at}: denied video`);
          break;
        }
      }
    }
  }
  return hits;
}

export function quoted(markers: Iterable<string>, texts: Iterable<string>): string[] {
  const list = [...markers];
  const hits: string[] = [];
  for (const t of texts) {
    const flat = t.replace(/\s+/g, " ");
    const m = list.find((x) => flat.includes(x));
    if (m) hits.push(`quotes a denied row: ${m}`);
  }
  return hits;
}

export function assertClean(deny: Denylist, value: unknown, what: string, markers: Iterable<string> = [], texts: Iterable<string> = []): void {
  const hits = [...residual(deny, value), ...quoted(markers, texts)];
  if (hits.length) throw new Error(`rights: ${hits.length} denied rows left in ${what}: ${hits.slice(0, 5).join("; ")}`);
}
