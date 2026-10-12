import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertClean, buildDenylist, denyRef, type Denylist } from "./rights";
import { STAFF_FLAG } from "./staff";

export type Audience = "public" | "staff";

export interface ReportFigure {
  path: string;
  caption: string;
  licence: string;
  alt?: string;
}

export interface ReportAsset {
  id: string;
  path: string;
  caption: string;
  licence: string;
  audience: Audience;
  source?: string;
  build?: string;
}

export interface ReportTable {
  id: string;
  path: string;
  format: "tsv" | "csv" | "json" | "jsonl";
  label: string;
  licence: string;
  audience: Audience;
  editable?: boolean;
  licence_column?: string;
  source_column?: string;
}

export interface ReportPaper {
  includes?: string[];
  bib?: string[];
  style?: string[];
  lean?: string;
  audience: Audience;
}

export interface ReportRecordSet {
  id: string;
  dir: string;
  schema: string;
  label: string;
  licence: string;
  index?: string;
  audience: Audience;
}

export interface ReportBuild {
  id: string;
  label: string;
  runner: "latex" | "python";
  entry: string;
  inputs?: string[];
  outputs?: string[];
  needs?: string[];
  audience: Audience;
}

export interface ReportAttribution {
  source: string;
  url: string;
  licence: string;
  rows: number;
  notice: string;
  licence_text?: string;
}

export interface ReportRecord {
  schema: string;
  slug: string;
  title: string;
  authors: string[];
  date: string;
  status: "draft" | "private" | "public";
  kind: string;
  abstract?: string;
  abstract_paragraphs?: string[];
  licence?: string;
  source_path: string;
  source_hash: string;
  pdf_path?: string | null;
  pdf_hash?: string | null;
  public_path?: string;
  figures?: ReportFigure[];
  assets?: ReportAsset[];
  tables?: ReportTable[];
  paper?: ReportPaper;
  record_sets?: ReportRecordSet[];
  tool?: { path: string; readme?: string; audience: Audience };
  builds?: ReportBuild[];
  attributions?: ReportAttribution[];
  [key: string]: unknown;
}

export interface PackedFile {
  path: string;
  sha256: string;
  size: number;
  audience: Audience;
  role: string;
}

export interface ResearchOutput {
  slug: string;
  origin: "shipped" | "staff";
  manifest: ReportRecord;
  files: PackedFile[];
  withheld: number;
}

export interface ResearchIndex {
  schema: "bucket.research-pack/1";
  version: string;
  staff: boolean;
  outputs: ResearchOutput[];
}

export interface ResearchBlob {
  enc: "utf8" | "base64";
  data: string;
}

export interface ResearchBlobs {
  version: string;
  blobs: Record<string, ResearchBlob>;
}

export interface ResearchSidePack {
  schema: "bucket.research-side-pack/1";
  version: string;
  outputs: ResearchOutput[];
  blobs: Record<string, ResearchBlob>;
}

export interface ReportLib {
  validateRecord(record: unknown): string[];
  publicPaths(record: ReportRecord): { base: string; pdf: string; figures: string[]; data: string[] };
  localPaths(record: ReportRecord): { path: string; audience: Audience; role: string }[];
}

export const RESEARCH_SCHEMA = "bucket.research-pack/1";
export const SIDE_SCHEMA = "bucket.research-side-pack/1";
export const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
export const MAX_DEPTH = 8;
export const MB = 1024 * 1024;
export const PACK_CAPS = { public: 8 * MB, staff: 16 * MB, total: 32 * MB };
export const SKIPPED_DIRS = new Set(["__pycache__", "out", "cache", "node_modules"]);
const FOLDER_ROLES = new Set(["paper-lean", "record-set", "tool"]);
const AUDIENCE_LISTS = ["assets", "tables", "record_sets", "builds"] as const;

export function pathProblem(path: unknown): string | null {
  if (typeof path !== "string" || path.length === 0) return "the path is empty";
  if (path.includes("\0")) return "the path holds a NUL byte";
  if (path.includes("\\")) return "the path holds a backslash";
  if (path.startsWith("/")) return "the path is absolute";
  const parts = path.split("/");
  if (parts.length > MAX_DEPTH) return `the path is deeper than ${MAX_DEPTH} folders`;
  for (const part of parts) if (!SEGMENT.test(part)) return `the path segment ${JSON.stringify(part)} is refused`;
  return null;
}

export function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function encodeBlob(bytes: Buffer): ResearchBlob {
  const text = bytes.toString("utf8");
  if (!text.includes("\0") && Buffer.from(text, "utf8").equals(bytes)) return { enc: "utf8", data: text };
  return { enc: "base64", data: bytes.toString("base64") };
}

export function decodeBlob(blob: ResearchBlob): Buffer {
  return Buffer.from(blob.data, blob.enc);
}

function walk(repo: string, dir: string): string[] {
  return readdirSync(join(repo, dir), { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.name.startsWith(".") || SKIPPED_DIRS.has(entry.name)) return [];
      if (entry.isSymbolicLink()) throw new Error(`research pack: ${path} is a symlink`);
      if (entry.isDirectory()) return walk(repo, path);
      return entry.isFile() ? [path] : [];
    });
}

interface Wanted {
  path: string;
  audience: Audience;
  role: string;
  optional: boolean;
}

function wantedFiles(repo: string, record: ReportRecord, lib: ReportLib): Wanted[] {
  const live = record.status === "public";
  const base: Audience = live ? "public" : "staff";
  const out = new Map<string, Wanted>();
  const add = (path: string, audience: Audience, role: string, optional = false) => {
    const seen = out.get(path);
    if (!seen) out.set(path, { path, audience, role, optional });
    else if (audience === "staff") seen.audience = "staff";
  };
  add(record.source_path, base, "source", !live);
  if (record.pdf_path) add(record.pdf_path, base, "pdf", !live);
  if (live) {
    const copies = lib.publicPaths(record);
    add(copies.pdf, "public", "public-pdf");
    for (const path of copies.figures) add(path, "public", "figure");
  }
  for (const entry of lib.localPaths(record)) {
    if (!FOLDER_ROLES.has(entry.role)) add(entry.path, entry.audience, entry.role);
    else for (const path of walk(repo, entry.path)) add(path, entry.audience, entry.role);
  }
  return [...out.values()];
}

export function manifestView(record: ReportRecord, lib: ReportLib, staff: boolean): { manifest: ReportRecord; withheld: number } {
  if (staff) return { manifest: record, withheld: 0 };
  const view: ReportRecord = { ...record };
  let withheld = 0;
  for (const key of AUDIENCE_LISTS) {
    const list = record[key];
    if (!Array.isArray(list)) continue;
    const kept = (list as { audience?: string }[]).filter((entry) => entry.audience === "public");
    withheld += list.length - kept.length;
    (view as Record<string, unknown>)[key] = kept;
  }
  for (const key of ["paper", "tool"] as const) {
    if (record[key] && record[key].audience !== "public") {
      delete view[key];
      withheld += 1;
    }
  }
  const publicPath = new Set(lib.localPaths(record).filter((entry) => entry.audience === "public").map((entry) => entry.path));
  if (view.assets) {
    const builds = new Set((view.builds ?? []).map((build) => build.id));
    view.assets = view.assets.map((asset) => {
      const { source, build, ...rest } = asset;
      return { ...rest, ...(source && publicPath.has(source) ? { source } : {}), ...(build && builds.has(build) ? { build } : {}) };
    });
  }
  return { manifest: view, withheld };
}

function cells(line: string, format: string): string[] {
  if (format === "tsv") return line.split("\t");
  const out: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted && ch === '"' && line[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cell);
      cell = "";
    } else cell += ch;
  }
  out.push(cell);
  return out;
}

export function licenceProblems(record: ReportRecord, table: ReportTable, text: string): string[] {
  if (table.licence !== "mixed" && !table.licence_column) return [];
  if (!table.licence_column) return [`${table.path}: licence is mixed and no licence_column is set`];
  if (table.format !== "tsv" && table.format !== "csv") return [`${table.path}: a ${table.format} table cannot carry a licence column`];
  const lines = text.split("\n").filter((line) => line.length > 0);
  const at = cells(lines[0] ?? "", table.format).indexOf(table.licence_column);
  if (at < 0) return [`${table.path}: no column named ${table.licence_column}`];
  const attributed = new Map((record.attributions ?? []).map((row) => [row.licence, row]));
  const problems = new Set<string>();
  for (const line of lines.slice(1)) {
    const licence = cells(line, table.format)[at] ?? "";
    const row = attributed.get(licence);
    if (!row) problems.add(`${table.path}: row licence ${JSON.stringify(licence)} has no attribution`);
    else if (licence.startsWith("GFDL") && !row.licence_text) problems.add(`${table.path}: GFDL rows need an attribution with a licence_text path`);
  }
  return [...problems];
}

export interface ResearchPack {
  index: ResearchIndex;
  blobs: ResearchBlobs;
  encoded: Record<string, number>;
}

export interface PackOptions {
  lib: ReportLib;
  env?: Record<string, string | undefined>;
  deny?: Denylist;
  caps?: typeof PACK_CAPS;
}

export function readRecords(repo: string): ReportRecord[] {
  const root = join(repo, "reports");
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .sort()
    .filter((slug) => existsSync(join(root, slug, "report.json")))
    .map((slug) => JSON.parse(readFileSync(join(root, slug, "report.json"), "utf8")) as ReportRecord);
}

export function buildResearchPack(repo: string, records: ReportRecord[], o: PackOptions): ResearchPack {
  const staff = (o.env ?? process.env)[STAFF_FLAG] === "1";
  const deny = o.deny ?? buildDenylist(repo);
  const caps = o.caps ?? PACK_CAPS;
  const blobs: Record<string, ResearchBlob> = {};
  const encoded: Record<string, number> = {};
  const outputs: ResearchOutput[] = [];
  for (const record of records) {
    const errors = o.lib.validateRecord(record);
    if (errors.length) throw new Error(`research pack: ${record.slug}: ${errors.join("; ")}`);
    if (!SLUG.test(record.slug)) throw new Error(`research pack: slug ${record.slug} is refused`);
    if (record.status !== "public" && !staff) continue;
    const { manifest, withheld } = manifestView(record, o.lib, staff);
    assertClean(deny, manifest, `the research manifest of ${record.slug}`);
    const files: PackedFile[] = [];
    const texts = new Map<string, string>();
    let size = 0;
    for (const want of wantedFiles(repo, record, o.lib)) {
      if (want.audience === "staff" && !staff) continue;
      const problem = pathProblem(want.path);
      if (problem) throw new Error(`research pack: ${record.slug}: ${want.path}: ${problem}`);
      const denied = denyRef(deny, want.path);
      if (denied) throw new Error(`research pack: ${record.slug}: ${want.path} is a denied ${denied}`);
      const full = join(repo, want.path);
      if (!existsSync(full)) {
        if (want.optional) continue;
        throw new Error(`research pack: ${record.slug}: ${want.path} is missing`);
      }
      if (!lstatSync(full).isFile()) throw new Error(`research pack: ${record.slug}: ${want.path} is not a regular file`);
      const bytes = readFileSync(full);
      const hash = sha256(bytes);
      const blob = blobs[hash] ?? encodeBlob(bytes);
      if (blob.enc === "utf8") {
        assertClean(deny, blob.data, `${want.path} in the research pack`);
        texts.set(want.path, blob.data);
      }
      blobs[hash] = blob;
      size += blob.data.length;
      files.push({ path: want.path, sha256: hash, size: bytes.length, audience: want.audience, role: want.role });
    }
    const problems = (manifest.tables ?? []).flatMap((table) => (texts.has(table.path) || table.licence === "mixed" ? licenceProblems(record, table, texts.get(table.path) ?? "") : []));
    if (problems.length) throw new Error(`research pack: ${record.slug}: ${problems.slice(0, 5).join("; ")}`);
    const cap = staff ? caps.staff : caps.public;
    if (size > cap) throw new Error(`research pack: ${record.slug} is ${size} bytes encoded, over the ${cap} byte cap`);
    encoded[record.slug] = size;
    outputs.push({ slug: record.slug, origin: record.status === "public" ? "shipped" : "staff", manifest, files: files.sort((a, b) => (a.path < b.path ? -1 : 1)), withheld });
  }
  const total = Object.values(blobs).reduce((sum, blob) => sum + blob.data.length, 0);
  if (total > caps.total) throw new Error(`research pack: ${total} bytes encoded, over the ${caps.total} byte cap`);
  const version = sha256(JSON.stringify(outputs)).slice(0, 16);
  return { index: { schema: RESEARCH_SCHEMA, version, staff, outputs }, blobs: { version, blobs }, encoded };
}

export function sidePack(full: ResearchPack): ResearchSidePack {
  if (!full.index.staff) throw new Error(`research side pack: set ${STAFF_FLAG}=1, since a public build holds no staff entries`);
  const blobs: Record<string, ResearchBlob> = {};
  const outputs: ResearchOutput[] = [];
  for (const output of full.index.outputs) {
    const files = output.files.filter((file) => file.audience === "staff");
    if (files.length === 0) continue;
    for (const file of files) blobs[file.sha256] = full.blobs.blobs[file.sha256];
    outputs.push({ ...output, files, withheld: 0 });
  }
  return { schema: SIDE_SCHEMA, version: sha256(JSON.stringify(outputs)).slice(0, 16), outputs, blobs };
}

export async function loadReportLib(repo: string): Promise<ReportLib> {
  return (await import(join(repo, "scripts/lib/report-record.mjs"))) as ReportLib;
}

if (import.meta.main) {
  const repo = resolve(import.meta.dir, "../../../..");
  const out = resolve(import.meta.dir, "../../content");
  mkdirSync(out, { recursive: true });
  const pack = buildResearchPack(repo, readRecords(repo), { lib: await loadReportLib(repo) });
  const flag = process.argv.indexOf("--side-pack");
  if (flag >= 0) {
    const file = process.argv[flag + 1];
    if (!file) throw new Error("research side pack: --side-pack needs a file to write");
    const side = sidePack(pack);
    writeFileSync(resolve(file), JSON.stringify(side), { mode: 0o600 });
    console.log(`research side pack ${side.version}: ${side.outputs.length} outputs, ${side.outputs.reduce((n, output) => n + output.files.length, 0)} staff files, written to ${resolve(file)}`);
    process.exit(0);
  }
  writeFileSync(join(out, "research-index.json"), JSON.stringify(pack.index));
  writeFileSync(join(out, "research-blobs.json"), JSON.stringify(pack.blobs));
  const files = pack.index.outputs.reduce((n, output) => n + output.files.length, 0);
  const bytes = Object.values(pack.blobs.blobs).reduce((sum, blob) => sum + blob.data.length, 0);
  console.log(`research pack ${pack.index.version}: ${pack.index.outputs.length} outputs, ${files} files, ${bytes} bytes encoded, staff data ${pack.index.staff ? "included" : "excluded"}`);
}
