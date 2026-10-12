import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { diffLines, DIFF_BYTES, unifiedPatch, type Hunk } from "./diff";
import { MB, pathProblem, sha256, SLUG, type ReportRecord } from "./pack/research";
import { guardPath, type Research, ResearchError } from "./research";
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

function writeAtomic(file: string, bytes: Uint8Array): void {
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
  const fd = openSync(tmp, "wx", 0o600);
  try {
    writeSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, file);
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

  overlay(slug: string, path: string): Buffer | null {
    if (!SLUG.test(slug) || pathProblem(path) !== null) return null;
    if (!this.state(slug).files[path]) return null;
    try {
      return readFileSync(guardPath(this.workDir(slug), path));
    } catch (e) {
      if (e instanceof ResearchError && e.status === 404) return null;
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
      writeAtomic(this.target(slug, path), bytes);
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

  exportOutput(slugIn: string | null): Promise<Exported> {
    const detail = this.research.detail(slugIn);
    return this.locked(detail.slug, async () => {
      const changes = await this.changes(detail.slug);
      if (changes.length === 0) throw new ResearchError("this output has no edit to export", 409);
      const texts = new Map<string, string>();
      for (const c of changes) texts.set(c.path, (this.overlay(detail.slug, c.path) as Buffer).toString("utf8"));
      for (const table of detail.manifest.tables ?? []) {
        const text = texts.get(table.path);
        if (text === undefined || (table.format !== "tsv" && table.format !== "csv")) continue;
        const header = (text.split("\n")[0] ?? "").replace(/\r$/, "").split(table.format === "tsv" ? "\t" : ",").map((c) => c.replace(/^"|"$/g, ""));
        for (const column of [table.licence_column, table.source_column]) if (column && !header.includes(column)) throw new ResearchError(`${table.label} lost its ${column} column, and each row must keep its licence and source`, 422);
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

export function researchWorkRoutes(work: ResearchWork, onError: (e: Error) => void = () => {}): Record<string, Route> {
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
    "POST /local/research/export": (req) =>
      guarded(async () => {
        const b = await jsonBody(req);
        return json(await work.exportOutput(text(b.slug)));
      }),
  };
}
