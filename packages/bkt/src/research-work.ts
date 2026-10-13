import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { diffLines, DIFF_BYTES, unifiedPatch, type Hunk } from "./diff";
import { MB, pathProblem, sha256, SLUG, type ReportRecord, type ResearchOutput } from "./pack/research";
import { guardPath, type Research, ResearchError } from "./research";
import { parseTable } from "./research-table";
import type { Route } from "./serve";

export const EDIT_BYTES = 4 * MB;
export const FILE_BODY_BYTES = EDIT_BYTES + 64 * 1024;
export const WORK_BYTES = 256 * MB;
export const WORK_FILES = 2_000;
export const EDIT_EXTS = [".md", ".tex", ".bib", ".sty", ".tsv", ".csv", ".json", ".jsonl", ".py", ".txt", ".lean"];
export const WORK_SCHEMA = "bucket.research-work/1";
export const PLAIN_STORE = "Edits are kept on this computer as plain files, so the tools that build a paper can read them.";

export type ChangeState = "edited" | "shipped-changed" | "base-unknown";

export interface Change {
  path: string;
  state: ChangeState;
  base: string | null;
  shipped: string;
  current: string;
  size: number;
  shippedSize: number;
  added: number;
  removed: number;
  hunks: Hunk[] | null;
}

export interface Exported {
  dir: string;
  files: string[];
}

interface State {
  schema: typeof WORK_SCHEMA;
  pack: string;
  files: Record<string, { base: string | null }>;
}

export class WorkConflict extends ResearchError {
  constructor(readonly current: string) {
    super("the file changed since it was opened", 409);
  }
}

const HASH = /^[0-9a-f]{64}$/;

function writeAtomic(file: string, bytes: Uint8Array, rename: (from: string, to: string) => void = renameSync): void {
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
  const fd = openSync(tmp, "wx", 0o600);
  try {
    writeSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    rename(tmp, file);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
  const dir = openSync(dirname(file), "r");
  try {
    fsyncSync(dir);
  } finally {
    closeSync(dir);
  }
}

function plainDir(path: string): void {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    mkdirSync(path, { mode: 0o700 });
    return;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new ResearchError("the working copy crosses a symlink or a file, so nothing is written", 403);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function isText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

function walkFiles(root: string, rel = ""): string[] {
  if (!existsSync(join(root, rel))) return [];
  return readdirSync(join(root, rel), { withFileTypes: true }).flatMap((entry) => {
    const path = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink() || entry.name.includes(".tmp-")) return [];
    if (entry.isDirectory()) return walkFiles(root, path);
    return entry.isFile() ? [path] : [];
  });
}

export interface WorkOptions {
  now?: () => number;
  open?: (dir: string) => void;
  caps?: { files: number; bytes: number };
  rename?: (from: string, to: string) => void;
}

export class ResearchWork {
  private locks = new Map<string, Promise<unknown>>();
  private states = new Map<string, State>();
  private root: string;

  constructor(
    private research: Research,
    private dataDir: string,
    private o: WorkOptions = {},
  ) {
    this.root = join(dataDir, "research");
    research.setWork({ overlay: (slug, path) => this.overlay(slug, path), changed: (slug) => this.changed(slug) });
  }

  private outDir(slug: string): string {
    return join(this.root, "outputs", slug);
  }

  private workDir(slug: string): string {
    return join(this.outDir(slug), "work");
  }

  private locked<T>(slug: string, run: () => Promise<T>): Promise<T> {
    const next = (this.locks.get(slug) ?? Promise.resolve()).then(run, run);
    this.locks.set(slug, next.catch(() => undefined));
    return next;
  }

  private load(slug: string): State {
    const stateFile = join(this.outDir(slug), "state.json");
    let state: State = { schema: WORK_SCHEMA, pack: this.research.version, files: {} };
    let stored = "";
    try {
      if (existsSync(stateFile) && lstatSync(stateFile).isFile()) {
        stored = readFileSync(stateFile, "utf8");
        const parsed = JSON.parse(stored) as State;
        if (parsed && parsed.schema === WORK_SCHEMA && parsed.files && typeof parsed.files === "object") state = { schema: WORK_SCHEMA, pack: String(parsed.pack), files: {} };
        for (const [path, entry] of Object.entries(parsed?.files ?? {})) if (pathProblem(path) === null) state.files[path] = { base: typeof entry?.base === "string" && HASH.test(entry.base) ? entry.base : null };
      }
    } catch {
      state = { schema: WORK_SCHEMA, pack: this.research.version, files: {} };
    }
    const present = new Set(walkFiles(this.workDir(slug)).filter((path) => pathProblem(path) === null));
    for (const path of Object.keys(state.files)) if (!present.has(path)) delete state.files[path];
    for (const path of present) if (!state.files[path]) state.files[path] = { base: null };
    this.states.set(slug, state);
    if (existsSync(this.outDir(slug)) && canonical(state) !== stored && (present.size > 0 || stored !== "")) this.save(slug, state);
    return state;
  }

  private save(slug: string, state: State): void {
    plainDir(this.root);
    plainDir(join(this.root, "outputs"));
    plainDir(this.outDir(slug));
    const stateFile = join(this.outDir(slug), "state.json");
    if (existsSync(stateFile) && !lstatSync(stateFile).isFile()) throw new ResearchError("the working copy state is a symlink or a folder", 403);
    writeAtomic(stateFile, Buffer.from(canonical(state)));
    this.states.set(slug, state);
  }

  private state(slug: string): State {
    return this.states.get(slug) ?? this.load(slug);
  }

  changed(slug: string): number {
    if (!SLUG.test(slug)) return 0;
    try {
      return Object.keys(this.state(slug).files).length;
    } catch {
      return 0;
    }
  }

  backup(slug: string, path: string): Buffer | null {
    if (!SLUG.test(slug) || pathProblem(path) !== null) return null;
    try {
      return readFileSync(guardPath(join(this.outDir(slug), "backup"), path));
    } catch {
      return null;
    }
  }

  changedPaths(slug: string): string[] {
    if (!SLUG.test(slug)) return [];
    try {
      return Object.keys(this.state(slug).files).sort();
    } catch {
      return [];
    }
  }

  builtDir(slug: string): string {
    return join(this.outDir(slug), "built");
  }

  built(slug: string, path: string): Buffer | null {
    if (!SLUG.test(slug) || pathProblem(path) !== null) return null;
    try {
      return readFileSync(guardPath(this.builtDir(slug), path));
    } catch (e) {
      if (e instanceof ResearchError) return null;
      throw e;
    }
  }

  overlay(slug: string, path: string): Buffer | null {
    if (!SLUG.test(slug) || pathProblem(path) !== null) return null;
    if (!this.state(slug).files[path]) return this.built(slug, path);
    try {
      return readFileSync(guardPath(this.workDir(slug), path));
    } catch (e) {
      if (e instanceof ResearchError && e.status === 404) return this.built(slug, path);
      throw e;
    }
  }

  private check(slug: string | null, path: string | null): { slug: string; path: string; shipped: string; shippedSize: number } {
    const detail = this.research.detail(slug);
    if (detail.unreadable) throw new ResearchError(detail.unreadable, 409);
    if (path === null) throw new ResearchError("the path is empty", 400);
    const problem = pathProblem(path);
    if (problem) throw new ResearchError(problem, 400);
    const entry = detail.files.find((f) => f.path === path);
    if (!entry) throw new ResearchError("the output does not list that file", 404);
    if (path.split("/").pop() === "report.json") throw new ResearchError("the record of a shipped output is read-only", 403);
    if (!EDIT_EXTS.includes(extname(path).toLowerCase())) throw new ResearchError(`files of this kind are read-only; edits take ${EDIT_EXTS.join(" ")}`, 415);
    return { slug: detail.slug, path, shipped: entry.sha256, shippedSize: entry.size };
  }

  private target(slug: string, path: string): string {
    plainDir(this.root);
    plainDir(join(this.root, "outputs"));
    plainDir(this.outDir(slug));
    let at = this.workDir(slug);
    plainDir(at);
    const parts = path.split("/");
    for (const part of parts.slice(0, -1)) {
      at = join(at, part);
      plainDir(at);
    }
    const file = join(at, parts[parts.length - 1]);
    if (lstatExists(file)) {
      const stat = lstatSync(file);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new ResearchError("the working copy holds a symlink or a folder at that path", 403);
    }
    return file;
  }

  private workBytes(slug: string, except: string): number {
    return Object.keys(this.state(slug).files)
      .filter((p) => p !== except)
      .reduce((sum, p) => sum + (this.overlay(slug, p)?.length ?? 0), 0);
  }

  write(slugIn: string | null, pathIn: string | null, baseRev: string | null, bytes: Uint8Array): Promise<{ path: string; rev: string; changed: boolean }> {
    const { slug, path, shipped } = this.check(slugIn, pathIn);
    if (baseRev === null || !HASH.test(baseRev)) throw new ResearchError("the edit names no version of the file it started from", 400);
    if (bytes.length > EDIT_BYTES) throw new ResearchError("the edit is over the 4 MB limit", 413);
    if (!isText(bytes)) throw new ResearchError("an edit is text; this one holds bytes that are no text", 415);
    return this.locked(slug, async () => {
      const state = this.load(slug);
      const current = this.overlay(slug, path) ?? (await this.research.read(slug, path, { baseline: true })).bytes;
      const rev = sha256(current);
      if (rev !== baseRev) throw new WorkConflict(rev);
      const next = sha256(bytes);
      if (next === shipped) {
        if (state.files[path]) this.drop(slug, state, path);
        return { path, rev: next, changed: false };
      }
      const caps = this.o.caps ?? { files: WORK_FILES, bytes: WORK_BYTES };
      if (!state.files[path] && Object.keys(state.files).length >= caps.files) throw new ResearchError("the working copy holds 2,000 files, which is its limit", 413);
      if (this.workBytes(slug, path) + bytes.length > caps.bytes) throw new ResearchError("the working copy is over the 256 MB limit", 413);
      const before = this.overlay(slug, path);
      if (before) {
        let at = join(this.outDir(slug), "backup");
        plainDir(at);
        const parts = path.split("/");
        for (const part of parts.slice(0, -1)) {
          at = join(at, part);
          plainDir(at);
        }
        writeAtomic(join(at, parts[parts.length - 1]), before);
      }
      writeAtomic(this.target(slug, path), bytes, this.o.rename);
      this.save(slug, { schema: WORK_SCHEMA, pack: this.research.version, files: { ...state.files, [path]: { base: state.files[path] ? state.files[path].base : shipped } } });
      return { path, rev: next, changed: true };
    });
  }

  private drop(slug: string, state: State, path: string): void {
    const file = this.target(slug, path);
    if (lstatExists(file)) unlinkSync(file);
    const files = { ...state.files };
    delete files[path];
    this.save(slug, { ...state, files });
  }

  revert(slugIn: string | null, pathIn: string | null, keep = false): Promise<{ path: string; changed: number }> {
    const { slug, path, shipped } = this.check(slugIn, pathIn);
    return this.locked(slug, async () => {
      const state = this.load(slug);
      if (!state.files[path]) throw new ResearchError("that file has no edit", 404);
      if (keep) this.save(slug, { ...state, files: { ...state.files, [path]: { base: shipped } } });
      else this.drop(slug, state, path);
      return { path, changed: this.changed(slug) };
    });
  }

  async changes(slugIn: string | null): Promise<Change[]> {
    const detail = this.research.detail(slugIn);
    const state = this.load(detail.slug);
    const out: Change[] = [];
    for (const path of Object.keys(state.files).sort()) {
      const entry = detail.files.find((f) => f.path === path);
      const current = this.overlay(detail.slug, path);
      if (!entry || !current) continue;
      const base = state.files[path].base;
      const change: Change = { path, state: base === null ? "base-unknown" : base !== entry.sha256 ? "shipped-changed" : "edited", base, shipped: entry.sha256, current: sha256(current), size: current.length, shippedSize: entry.size, added: 0, removed: 0, hunks: null };
      if (current.length <= DIFF_BYTES && entry.size <= DIFF_BYTES && isText(current)) {
        const before = (await this.research.read(detail.slug, path, { baseline: true })).bytes;
        if (isText(before)) {
          const d = diffLines(before.toString("utf8"), current.toString("utf8"));
          change.added = d.added;
          change.removed = d.removed;
          change.hunks = d.hunks;
        }
      }
      out.push(change);
    }
    return out;
  }

  private exportDir(slug: string): string {
    plainDir(this.root);
    plainDir(join(this.root, "exports"));
    const stamp = new Date((this.o.now ?? Date.now)()).toISOString().replace(/[-:]/g, "").slice(0, 15);
    let dir = join(this.root, "exports", `${slug}-${stamp}`);
    for (let n = 2; lstatExists(dir); n++) dir = join(this.root, "exports", `${slug}-${stamp}-${n}`);
    mkdirSync(dir, { mode: 0o700 });
    return dir;
  }

  private async exportOwn(detail: ReturnType<Research["detail"]>): Promise<Exported> {
    const dir = this.exportDir(detail.slug);
    const record: ReportRecord = { ...detail.manifest };
    for (const file of detail.files) {
      const bytes = (await this.research.read(detail.slug, file.path)).bytes;
      let at = dir;
      const parts = file.path.split("/");
      for (const part of parts.slice(0, -1)) {
        at = join(at, part);
        plainDir(at);
      }
      writeAtomic(join(at, parts[parts.length - 1]), bytes);
      if (file.path === record.source_path) record.source_hash = sha256(bytes);
      if (file.path === record.pdf_path) record.pdf_hash = sha256(bytes);
    }
    plainDir(join(dir, "reports"));
    plainDir(join(dir, "reports", detail.slug));
    writeAtomic(join(dir, "reports", detail.slug, "report.json"), Buffer.from(`${canonical(record)}\n`));
    const files = walkFiles(dir).sort();
    this.o.open?.(dir);
    return { dir, files };
  }

  exportOutput(slugIn: string | null): Promise<Exported> {
    const detail = this.research.detail(slugIn);
    if (detail.origin === "local") return this.locked(detail.slug, () => this.exportOwn(detail));
    return this.locked(detail.slug, async () => {
      const changes = await this.changes(detail.slug);
      if (changes.length === 0) throw new ResearchError("this output has no edit to export", 409);
      const texts = new Map<string, string>();
      for (const c of changes) texts.set(c.path, (this.overlay(detail.slug, c.path) as Buffer).toString("utf8"));
      for (const table of detail.manifest.tables ?? []) {
        const text = texts.get(table.path);
        if (text === undefined || (table.format !== "tsv" && table.format !== "csv")) continue;
        const parsed = parseTable(table.format, text);
        for (const column of [table.licence_column, table.source_column]) {
          if (!column) continue;
          const at = parsed.columns.indexOf(column);
          if (at < 0) throw new ResearchError(`${table.label} lost its ${column} column, and each row must keep its licence and source`, 422);
          const blank = parsed.rows.findIndex((row) => row[at].trim() === "");
          if (blank >= 0) throw new ResearchError(`${table.label} has no ${column} on row ${blank + 1}, and each row must keep its licence and source`, 422);
        }
      }
      plainDir(this.root);
      plainDir(join(this.root, "exports"));
      const stamp = new Date((this.o.now ?? Date.now)()).toISOString().replace(/[-:]/g, "").slice(0, 15);
      let dir = join(this.root, "exports", `${detail.slug}-${stamp}`);
      for (let n = 2; lstatExists(dir); n++) dir = join(this.root, "exports", `${detail.slug}-${stamp}-${n}`);
      mkdirSync(dir, { mode: 0o700 });
      const put = (rel: string, body: string | Uint8Array) => {
        let at = dir;
        const parts = rel.split("/");
        for (const part of parts.slice(0, -1)) {
          at = join(at, part);
          plainDir(at);
        }
        writeAtomic(join(at, parts[parts.length - 1]), typeof body === "string" ? Buffer.from(body) : body);
      };
      let patch = "";
      for (const c of changes) {
        put(c.path, this.overlay(detail.slug, c.path) as Buffer);
        if (c.hunks) patch += unifiedPatch(c.path, { hunks: c.hunks, added: c.added, removed: c.removed });
      }
      put("CHANGES.patch", patch);
      put("LICENCES.md", licences(detail.manifest, changes));
      const record: ReportRecord = { ...detail.manifest };
      const source = changes.find((c) => c.path === record.source_path);
      if (source) record.source_hash = source.current;
      put("report.json", `${canonical(record)}\n`);
      const files = walkFiles(dir).sort();
      this.o.open?.(dir);
      return { dir, files };
    });
  }
}

function lstatExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export function licences(manifest: ReportRecord, changes: Change[]): string {
  const rows = manifest.attributions ?? [];
  const shareAlike = rows.some((r) => /SA/.test(r.licence)) || (manifest.tables ?? []).some((t) => /SA/.test(t.licence));
  const lines = [`# Licences for ${manifest.title}`, "", `The paper and its figures: ${manifest.licence ?? "see the record"}.`, "", "## Changed files", "", ...changes.map((c) => `- \`${c.path}\``), ""];
  if (rows.length) {
    lines.push("## Attribution", "", "| Source | Link | Licence | Rows | Notice |", "|---|---|---|---|---|");
    for (const r of rows) lines.push(`| ${r.source} | ${r.url} | ${r.licence} | ${r.rows} | ${r.notice} |`);
    lines.push("");
  }
  if (shareAlike) lines.push("## Share-alike", "", "Rows under CC BY-SA 4.0 keep that licence in every copy and every edit. Credit the source on each row and share your changes under the same licence.", "");
  return lines.join("\n");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = (await req.json()) as unknown;
    if (b && typeof b === "object" && !Array.isArray(b)) return b as Record<string, unknown>;
  } catch {
    throw new ResearchError("the request is not a JSON object", 400);
  }
  throw new ResearchError("the request is not a JSON object", 400);
}

const text = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function researchWorkRoutes(work: ResearchWork, onError: (e: Error) => void = () => {}, local: LocalOutputs | null = null): Record<string, Route> {
  const guarded = async (run: () => Promise<Response>) => {
    try {
      return await run();
    } catch (e) {
      if (e instanceof WorkConflict) return json({ error: e.message, current: e.current }, 409);
      if (e instanceof ResearchError) return json({ error: e.message }, e.status);
      onError(e as Error);
      return json({ error: "the working copy could not be written" }, 500);
    }
  };
  return {
    "GET /local/research/changes": (_req, url) => guarded(async () => json({ notice: PLAIN_STORE, changes: await work.changes(url.searchParams.get("slug")) })),
    "POST /local/research/file": (req, url) =>
      guarded(async () => {
        const bytes = new Uint8Array(await req.arrayBuffer());
        return json(await work.write(url.searchParams.get("slug"), url.searchParams.get("path"), url.searchParams.get("base_rev"), bytes));
      }),
    "POST /local/research/revert": (req) =>
      guarded(async () => {
        const b = await jsonBody(req);
        return json(await work.revert(text(b.slug), text(b.path), b.keep === true));
      }),
    "POST /local/research/new": (req) =>
      guarded(async () => {
        if (!local) throw new ResearchError("this server keeps no outputs of your own", 409);
        const b = await jsonBody(req);
        return json(local.create({ title: text(b.title) ?? undefined, slug: text(b.slug) ?? undefined, kind: text(b.kind) ?? undefined, author: text(b.author) ?? undefined }));
      }),
    "POST /local/research/upload": (req, url) =>
      guarded(async () => {
        if (!local) throw new ResearchError("this server keeps no outputs of your own", 409);
        const bytes = new Uint8Array(await req.arrayBuffer());
        return json(local.upload(url.searchParams.get("slug"), url.searchParams.get("role"), url.searchParams.get("name"), bytes));
      }),
    "POST /local/research/export": (req) =>
      guarded(async () => {
        const b = await jsonBody(req);
        return json(await work.exportOutput(text(b.slug)));
      }),
  };
}

export const UPLOAD_BYTES = 16 * MB;
export const UPLOAD_BODY_BYTES = 24 * MB;
export const IMAGE_EXTS = [".png", ".webp", ".jpg", ".svg"];
export const TABLE_EXTS = [".csv", ".tsv", ".json", ".jsonl"];
export const UPLOAD_EXTS = [...EDIT_EXTS, ...IMAGE_EXTS, ".pdf"];
export const KINDS = ["paper", "brief", "memo", "dataset-report"];
export const ROLES = ["report", "figure", "data", "paper"] as const;
export type Role = (typeof ROLES)[number];
export const NOT_STATED = "Not stated";
export const LOCAL_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const ROLE_EXTS: Record<Role, string[]> = { report: [".md"], figure: IMAGE_EXTS, data: TABLE_EXTS, paper: [".pdf"] };

export interface NewOutput {
  title: string;
  slug: string;
  kind: string;
  author?: string;
}

export interface Added {
  slug: string;
  files: number;
  figures: number;
  tables: number;
  builds: boolean;
}

function looksLike(ext: string, bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, 16));
  if (ext === ".png") return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === ".jpg") return head[0] === 0xff && head[1] === 0xd8;
  if (ext === ".webp") return head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 12).toString("latin1") === "WEBP";
  if (ext === ".pdf") return head.subarray(0, 5).toString("latin1") === "%PDF-";
  if (ext === ".svg") return isText(bytes) && Buffer.from(bytes).toString("utf8").includes("<svg");
  return isText(bytes);
}

function words(name: string): string {
  const stem = name.replace(/\.[A-Za-z0-9]+$/, "").replace(/[-_.]+/g, " ").trim();
  return stem ? `${stem[0].toUpperCase()}${stem.slice(1)}` : name;
}

function idOf(name: string, taken: Set<string>): string {
  const base = name.replace(/\.[A-Za-z0-9]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "file";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

function stampOf(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export interface LocalOptions {
  taken?: (slug: string) => boolean;
  now?: () => number;
  caps?: { files: number; bytes: number };
  rename?: (from: string, to: string) => void;
}

export const FOLDER_CAP = 200;
export const FOLDER_DEPTH = 5;

export class LocalOutputs {
  private root: string;

  constructor(
    private dataDir: string,
    private o: LocalOptions = {},
  ) {
    this.root = join(dataDir, "research", "local");
  }

  private now(): number {
    return (this.o.now ?? Date.now)();
  }

  dir(slug: string): string {
    return join(this.root, slug);
  }

  prefix(slug: string): string {
    return `reports/${slug}/`;
  }

  relative(slug: string, path: string): string {
    const prefix = this.prefix(slug);
    if (!path.startsWith(prefix)) throw new ResearchError("the path sits outside this output", 400);
    return path.slice(prefix.length);
  }

  private slugs(): string[] {
    if (!lstatExists(this.root) || lstatSync(this.root).isSymbolicLink()) return [];
    return readdirSync(this.root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && LOCAL_SLUG.test(e.name) && e.name.length <= 64)
      .map((e) => e.name)
      .sort();
  }

  signature(): string {
    return this.slugs()
      .map((slug) => {
        try {
          const file = join(this.dir(slug), "report.json");
          if (!lstatSync(file).isFile()) return `${slug}:none`;
          return `${slug}:${sha256(readFileSync(file))}`;
        } catch {
          return `${slug}:none`;
        }
      })
      .join("|");
  }

  private manifest(slug: string): ReportRecord | null {
    const file = join(this.dir(slug), "report.json");
    try {
      if (!lstatSync(file).isFile()) return null;
      const record = JSON.parse(readFileSync(file, "utf8")) as ReportRecord;
      return record && typeof record === "object" && record.slug === slug ? record : null;
    } catch {
      return null;
    }
  }

  outputs(): ResearchOutput[] {
    const out: ResearchOutput[] = [];
    for (const slug of this.slugs()) {
      const manifest = this.manifest(slug);
      if (!manifest) continue;
      const roles = new Map<string, string>([[manifest.source_path, "source"]]);
      if (manifest.pdf_path) roles.set(manifest.pdf_path, "pdf");
      for (const a of manifest.assets ?? []) roles.set(a.path, "asset");
      for (const t of manifest.tables ?? []) roles.set(t.path, "table");
      const files = walkFiles(this.dir(slug))
        .filter((rel) => rel !== "report.json")
        .map((rel) => ({ rel, path: `${this.prefix(slug)}${rel}` }))
        .filter((f) => pathProblem(f.path) === null)
        .map((f) => {
          const bytes = readFileSync(join(this.dir(slug), f.rel));
          return { path: f.path, sha256: sha256(bytes), size: bytes.length, audience: "staff" as const, role: roles.get(f.path) ?? "file" };
        })
        .sort((a, b) => (a.path < b.path ? -1 : 1));
      out.push({ slug, origin: "local", manifest, files, withheld: 0 });
    }
    return out;
  }

  private ensureRoot(): void {
    if (!existsSync(this.dataDir)) throw new ResearchError("the data folder is missing; run bkt init", 409);
    plainDir(join(this.dataDir, "research"));
    plainDir(this.root);
  }

  private checkSlug(slug: unknown): string {
    if (typeof slug !== "string" || slug.length > 64 || !LOCAL_SLUG.test(slug)) throw new ResearchError("the short name takes lower-case letters, digits and single hyphens, 64 characters at most", 400);
    return slug;
  }

  private writeManifest(slug: string, manifest: ReportRecord): void {
    writeAtomic(join(this.dir(slug), "report.json"), Buffer.from(`${canonical(manifest)}\n`));
  }

  private blank(o: { slug: string; title: string; kind: string; author: string; licence?: string; abstract?: string; date?: string }, source: Uint8Array): ReportRecord {
    const at = stampOf(this.now());
    return {
      schema: "bucket.report/2",
      slug: o.slug,
      title: o.title,
      authors: [o.author],
      date: o.date ?? at.slice(0, 10),
      status: "draft",
      kind: o.kind,
      abstract: o.abstract ?? "",
      ...(o.licence ? { licence: o.licence } : {}),
      bead: null,
      source_path: `${this.prefix(o.slug)}REPORT.md`,
      source_hash: sha256(source),
      pdf_path: null,
      pdf_hash: null,
      built_at: null,
      published_at: null,
      updated_at: at,
      assets: [],
      tables: [],
    };
  }

  create(input: Partial<NewOutput>): { slug: string } {
    const slug = this.checkSlug(input.slug);
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (title.length === 0 || title.length > 500) throw new ResearchError("the title takes 1 to 500 characters", 400);
    if (typeof input.kind !== "string" || !KINDS.includes(input.kind)) throw new ResearchError(`the kind is one of ${KINDS.join(", ")}`, 400);
    const author = typeof input.author === "string" && input.author.trim() ? input.author.trim().slice(0, 200) : "Author not set";
    if (this.o.taken?.(slug) || lstatExists(this.dir(slug))) throw new ResearchError("an output already has that short name", 409);
    this.ensureRoot();
    this.setState(slug, { builds: true, origin: "new" });
    mkdirSync(this.dir(slug), { mode: 0o700 });
    const source = Buffer.from(`# ${title}\n`);
    writeAtomic(join(this.dir(slug), "REPORT.md"), source);
    this.writeManifest(slug, this.blank({ slug, title, kind: input.kind, author }, source));
    return { slug };
  }

  private own(slug: string | null): { slug: string; manifest: ReportRecord } {
    if (slug === null || !SLUG.test(slug)) throw new ResearchError("the output name is refused", 400);
    const manifest = lstatExists(this.dir(slug)) && !lstatSync(this.dir(slug)).isSymbolicLink() ? this.manifest(slug) : null;
    if (!manifest) throw new ResearchError(this.o.taken?.(slug) ? "files are added to your own outputs alone" : "no such output of yours", this.o.taken?.(slug) ? 403 : 404);
    return { slug, manifest };
  }

  private place(slug: string, rel: string): string {
    let at = this.dir(slug);
    plainDir(at);
    const parts = rel.split("/");
    for (const part of parts.slice(0, -1)) {
      at = join(at, part);
      plainDir(at);
    }
    const file = join(at, parts[parts.length - 1]);
    if (lstatExists(file) && (lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile())) throw new ResearchError("that place holds a symlink or a folder", 403);
    return file;
  }

  private usage(slug: string): { files: number; bytes: number } {
    const files = walkFiles(this.dir(slug));
    return { files: files.length, bytes: files.reduce((sum, rel) => sum + lstatSync(join(this.dir(slug), rel)).size, 0) };
  }

  upload(slugIn: string | null, role: string | null, name: string | null, bytes: Uint8Array): { slug: string; path: string } {
    const { slug, manifest } = this.own(slugIn);
    if (role === null || !(ROLES as readonly string[]).includes(role)) throw new ResearchError(`the role is one of ${ROLES.join(", ")}`, 400);
    if (name === null || !FILE_NAME.test(name) || name === "report.json") throw new ResearchError("the file name is refused", 400);
    const ext = extname(name).toLowerCase();
    const allowed = ROLE_EXTS[role as Role];
    if (!allowed.includes(ext)) throw new ResearchError(`a ${role} file is one of ${allowed.join(" ")}`, 415);
    if (bytes.length === 0) throw new ResearchError("the file is empty", 400);
    if (bytes.length > UPLOAD_BYTES) throw new ResearchError("the file is over the 16 MB limit", 413);
    if (!looksLike(ext, bytes)) throw new ResearchError(`the file does not read as ${ext.slice(1)}`, 415);
    const rel = role === "report" ? "REPORT.md" : role === "paper" ? "paper.pdf" : `${role === "figure" ? "figures" : "data"}/${name}`;
    const path = `${this.prefix(slug)}${rel}`;
    const problem = pathProblem(path);
    if (problem) throw new ResearchError(problem, 400);
    const caps = this.o.caps ?? { files: WORK_FILES, bytes: WORK_BYTES };
    const used = this.usage(slug);
    if (used.files >= caps.files) throw new ResearchError("the output holds 2,000 files, which is its limit", 413);
    if (used.bytes + bytes.length > caps.bytes) throw new ResearchError("the output is over the 256 MB limit", 413);
    writeAtomic(this.place(slug, rel), bytes);
    const next: ReportRecord = { ...manifest, updated_at: stampOf(this.now()) };
    if (role === "report") next.source_hash = sha256(bytes);
    if (role === "paper") {
      next.pdf_path = path;
      next.pdf_hash = sha256(bytes);
    }
    if (role === "figure" && !(next.assets ?? []).some((a) => a.path === path)) next.assets = [...(next.assets ?? []), { id: idOf(name, new Set((next.assets ?? []).map((a) => a.id))), path, caption: words(name), licence: NOT_STATED, audience: "staff" }];
    if (role === "data" && !(next.tables ?? []).some((t) => t.path === path))
      next.tables = [...(next.tables ?? []), { id: idOf(name, new Set((next.tables ?? []).map((t) => t.id))), path, format: ext.slice(1) as "csv" | "tsv" | "json" | "jsonl", label: words(name), licence: NOT_STATED, audience: "staff", editable: true }];
    this.writeManifest(slug, next);
    return { slug, path };
  }

  private statePath(): string {
    return join(this.dataDir, "research", "local-state.json");
  }

  private states(): Record<string, { builds: boolean; origin: string }> {
    try {
      const file = this.statePath();
      if (!lstatSync(file).isFile()) return {};
      const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, { builds?: unknown; origin?: unknown }>;
      return Object.fromEntries(Object.entries(parsed).filter(([slug]) => LOCAL_SLUG.test(slug)).map(([slug, v]) => [slug, { builds: v?.builds === true, origin: typeof v?.origin === "string" ? v.origin : "new" }]));
    } catch {
      return {};
    }
  }

  private setState(slug: string, state: { builds: boolean; origin: string }): void {
    writeAtomic(this.statePath(), Buffer.from(canonical({ ...this.states(), [slug]: state })));
  }

  setBuilds(slug: string, on: boolean): boolean {
    if (!LOCAL_SLUG.test(slug) || this.manifest(slug) === null) return false;
    this.setState(slug, { builds: on, origin: this.states()[slug]?.origin ?? "new" });
    return true;
  }

  buildsOn(slug: string): boolean {
    return this.states()[slug]?.builds === true;
  }

  addFolder(folder: string): Added {
    let top;
    try {
      top = lstatSync(folder);
    } catch {
      throw new ResearchError(`${folder} is missing`, 404);
    }
    if (top.isSymbolicLink() || !top.isDirectory()) throw new ResearchError("the path is a symlink or a file; give a folder", 400);
    const caps = this.o.caps ?? { files: WORK_FILES, bytes: WORK_BYTES };
    const found: { rel: string; bytes: Buffer }[] = [];
    let total = 0;
    let folders = 0;
    const walk = (rel: string) => {
      if (rel !== "" && rel.split("/").length > FOLDER_DEPTH) throw new ResearchError(`${rel} sits deeper than ${FOLDER_DEPTH} folders`, 400);
      for (const entry of readdirSync(join(folder, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const path = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink()) throw new ResearchError(`${path} is a symlink, so the folder is refused`, 403);
        if (entry.isDirectory()) {
          if (!FILE_NAME.test(entry.name)) throw new ResearchError(`the folder name ${path} is refused`, 400);
          folders += 1;
          if (folders > FOLDER_CAP) throw new ResearchError(`the folder holds over ${FOLDER_CAP} folders`, 413);
          walk(path);
          continue;
        }
        if (!entry.isFile()) throw new ResearchError(`${path} is a special file, so the folder is refused`, 403);
        if (!FILE_NAME.test(entry.name)) throw new ResearchError(`the file name ${path} is refused`, 400);
        const ext = extname(entry.name).toLowerCase();
        if (!UPLOAD_EXTS.includes(ext)) throw new ResearchError(`${path} is of a kind this screen does not take; it takes ${UPLOAD_EXTS.join(" ")}`, 415);
        const size = lstatSync(join(folder, path)).size;
        if (size > UPLOAD_BYTES) throw new ResearchError(`${path} is over the 16 MB limit`, 413);
        total += size;
        if (found.length + 1 > caps.files) throw new ResearchError("the folder holds over 2,000 files", 413);
        if (total > caps.bytes) throw new ResearchError("the folder is over the 256 MB limit", 413);
        const bytes = readFileSync(join(folder, path));
        if (path !== "report.json" && !looksLike(ext, bytes)) throw new ResearchError(`${path} does not read as ${ext.slice(1)}`, 415);
        found.push({ rel: path, bytes });
      }
    };
    walk("");
    const record = found.find((f) => f.rel === "report.json");
    if (!record) throw new ResearchError("the folder holds no report.json", 400);
    let given: Record<string, unknown>;
    try {
      given = JSON.parse(record.bytes.toString("utf8")) as Record<string, unknown>;
    } catch {
      throw new ResearchError("report.json does not parse", 422);
    }
    if (given === null || typeof given !== "object" || Array.isArray(given)) throw new ResearchError("report.json holds no record", 422);
    const slug = this.checkSlug(given.slug);
    const title = typeof given.title === "string" ? given.title.trim() : "";
    if (title.length === 0 || title.length > 500) throw new ResearchError("report.json needs a title of 1 to 500 characters", 422);
    const kind = typeof given.kind === "string" && KINDS.includes(given.kind) ? given.kind : "memo";
    const authors = Array.isArray(given.authors) && given.authors.length > 0 && given.authors.every((a) => typeof a === "string" && a.length > 0) ? (given.authors as string[]) : ["Author not set"];
    for (const f of found) {
      const problem = pathProblem(`${this.prefix(slug)}${f.rel}`);
      if (problem) throw new ResearchError(`${f.rel}: ${problem}`, 400);
    }
    if (this.o.taken?.(slug) || lstatExists(this.dir(slug))) throw new ResearchError("an output already has that short name", 409);
    this.ensureRoot();
    const files = found.filter((f) => f.rel !== "report.json");
    const tmp = `${this.dir(slug)}.tmp-${process.pid}`;
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { mode: 0o700 });
    try {
      for (const f of files) {
        let at = tmp;
        const parts = f.rel.split("/");
        for (const part of parts.slice(0, -1)) {
          at = join(at, part);
          plainDir(at);
        }
        writeAtomic(join(at, parts[parts.length - 1]), f.bytes);
      }
      let source = files.find((f) => f.rel === "REPORT.md")?.bytes;
      if (!source) {
        source = Buffer.from(`# ${title}\n`);
        writeAtomic(join(tmp, "REPORT.md"), source);
      }
      const manifest = this.blank(
        {
          slug,
          title,
          kind,
          author: authors[0],
          licence: typeof given.licence === "string" && given.licence ? given.licence : undefined,
          abstract: typeof given.abstract === "string" ? given.abstract : undefined,
          date: typeof given.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(given.date) ? given.date : undefined,
        },
        source,
      );
      manifest.authors = authors;
      const licence = typeof given.licence === "string" && given.licence ? given.licence : NOT_STATED;
      const assetIds = new Set<string>();
      const tableIds = new Set<string>();
      const stems = new Map(files.filter((f) => f.rel.toLowerCase().endsWith(".pdf")).map((f) => [f.rel.replace(/\.pdf$/i, ""), `${this.prefix(slug)}${f.rel}`]));
      manifest.assets = files
        .filter((f) => IMAGE_EXTS.includes(extname(f.rel).toLowerCase()))
        .map((f) => {
          const name = f.rel.split("/").pop() as string;
          const beside = stems.get(f.rel.replace(/\.[A-Za-z0-9]+$/, ""));
          return { id: idOf(name, assetIds), path: `${this.prefix(slug)}${f.rel}`, caption: words(name), licence, audience: "staff" as const, ...(beside ? { source: beside } : {}) };
        });
      manifest.tables = files
        .filter((f) => TABLE_EXTS.includes(extname(f.rel).toLowerCase()))
        .map((f) => {
          const name = f.rel.split("/").pop() as string;
          return { id: idOf(name, tableIds), path: `${this.prefix(slug)}${f.rel}`, format: extname(name).toLowerCase().slice(1) as "csv" | "tsv" | "json" | "jsonl", label: words(name), licence, audience: "staff" as const, editable: true };
        });
      const paper = files.find((f) => f.rel === "paper.pdf");
      if (paper) {
        manifest.pdf_path = `${this.prefix(slug)}paper.pdf`;
        manifest.pdf_hash = sha256(paper.bytes);
      }
      writeAtomic(join(tmp, "report.json"), Buffer.from(`${canonical(manifest)}\n`));
      this.setState(slug, { builds: false, origin: "added" });
      (this.o.rename ?? renameSync)(tmp, this.dir(slug));
      return { slug, files: files.length, figures: manifest.assets.length, tables: manifest.tables.length, builds: false };
    } catch (e) {
      rmSync(tmp, { recursive: true, force: true });
      throw e;
    }
  }
}
