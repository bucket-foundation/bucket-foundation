import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, sep } from "node:path";
import { decodeBlob, MB, PACK_CAPS, pathProblem, sha256, SIDE_SCHEMA, SLUG, type PackedFile, type ReportRecord, type ResearchBlobs, type ResearchIndex, type ResearchOutput, type ResearchSidePack } from "./pack/research";
import { platformFor } from "./platform";
import { pageOf, parseQuery, parseTable, recordSetTable, TableCache, TableError, type TablePage, type TableQuery } from "./research-table";
import type { Route } from "./serve";

export const VIEW_BYTES = 16 * MB;

export const CONTENT_TYPES: Record<string, string> = {
  ".md": "text/markdown; charset=utf-8",
  ".tex": "text/plain; charset=utf-8",
  ".bib": "text/plain; charset=utf-8",
  ".sty": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".py": "text/plain; charset=utf-8",
  ".lean": "text/plain; charset=utf-8",
  ".toml": "text/plain; charset=utf-8",
  ".sh": "text/plain; charset=utf-8",
  ".tsv": "text/tab-separated-values; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json",
  ".jsonl": "application/x-ndjson",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export class ResearchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface ResearchSource {
  index: ResearchIndex;
  blobs: () => Promise<ResearchBlobs>;
}

export interface ResearchRow {
  slug: string;
  title: string;
  kind: string;
  status: string;
  date: string;
  origin: "shipped" | "staff" | "local";
  changed: number;
  unreadable: string | null;
}

export interface ResearchDetail {
  slug: string;
  origin: "shipped" | "staff";
  staff: boolean;
  manifest: ReportRecord;
  files: PackedFile[];
  withheld: number;
  unreadable: string | null;
}

export interface ResearchFile {
  bytes: Buffer;
  type: string;
  entry: PackedFile;
}

export const SIDE_PACK_BYTES = 40 * MB;
const VERSION = /^[0-9a-f]{16}$/;
const HASH = /^[0-9a-f]{64}$/;

export interface Installed {
  version: string;
  outputs: number;
  files: number;
}

export interface SideIndex {
  root: string;
  version: string;
  outputs: ResearchOutput[];
}

export function staffRoot(dataDir: string): string {
  return join(dataDir, "research", "staff");
}

function refuse(message: string, status = 422): never {
  throw new ResearchError(message, status);
}

function checkOutputs(outputs: unknown): ResearchOutput[] {
  if (!Array.isArray(outputs)) refuse("the side pack lists no outputs");
  for (const output of outputs as ResearchOutput[]) {
    if (output === null || typeof output !== "object" || typeof output.slug !== "string" || !SLUG.test(output.slug)) refuse("the side pack holds an output name that is refused");
    if (output.manifest === null || typeof output.manifest !== "object" || output.manifest.slug !== output.slug) refuse(`${output.slug}: the record does not match its output`);
    if (!Array.isArray(output.files)) refuse(`${output.slug}: the file list is missing`);
    const seen = new Set<string>();
    for (const file of output.files) {
      const problem = file === null || typeof file !== "object" ? "the entry is not a file" : pathProblem(file.path);
      if (problem) refuse(`${output.slug}: ${problem}`);
      if (seen.has(file.path)) refuse(`${output.slug}: ${file.path} is listed twice`);
      seen.add(file.path);
      if (file.audience !== "staff") refuse(`${output.slug}: ${file.path} is not a staff entry`);
      if (typeof file.sha256 !== "string" || !HASH.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size < 0) refuse(`${output.slug}: ${file.path} has no valid hash or size`);
    }
  }
  return outputs as ResearchOutput[];
}

export function checkSidePack(bytes: Uint8Array): ResearchSidePack {
  if (bytes.length > SIDE_PACK_BYTES) refuse("the side pack is over the 40 MB limit", 413);
  let pack: ResearchSidePack;
  try {
    pack = JSON.parse(Buffer.from(bytes).toString("utf8")) as ResearchSidePack;
  } catch {
    refuse("the side pack does not parse");
  }
  if (pack === null || typeof pack !== "object" || pack.schema !== SIDE_SCHEMA) refuse("the file is not a research side pack");
  if (typeof pack.version !== "string" || !VERSION.test(pack.version)) refuse("the side pack has no valid version");
  const outputs = checkOutputs(pack.outputs);
  if (sha256(JSON.stringify(outputs)).slice(0, 16) !== pack.version) refuse("the side pack does not match its version");
  if (pack.blobs === null || typeof pack.blobs !== "object") refuse("the side pack holds no files");
  let total = 0;
  for (const output of outputs) {
    let size = 0;
    for (const file of output.files) {
      const blob = pack.blobs[file.sha256];
      if (!blob || typeof blob.data !== "string" || (blob.enc !== "utf8" && blob.enc !== "base64")) refuse(`${output.slug}: ${file.path} is missing from the side pack`);
      const body = decodeBlob(blob);
      if (body.length !== file.size || sha256(body) !== file.sha256) refuse(`${output.slug}: ${file.path} does not match its hash`);
      size += blob.data.length;
    }
    if (size > PACK_CAPS.staff) refuse(`${output.slug} is over the ${PACK_CAPS.staff} byte cap`, 413);
    total += size;
  }
  if (total > PACK_CAPS.total) refuse(`the side pack is over the ${PACK_CAPS.total} byte cap`, 413);
  return pack;
}

function plainDir(path: string): void {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    mkdirSync(path, { mode: 0o700 });
    return;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) refuse(`${path} is a symlink or a file, so nothing is installed`, 403);
}

function plainFile(path: string): boolean {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    return false;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) refuse(`${path} is a symlink or a folder, so it is refused`, 403);
  return true;
}

export function installSidePack(dataDir: string, bytes: Uint8Array): Installed {
  const pack = checkSidePack(bytes);
  if (!existsSync(dataDir)) refuse("the data folder is missing; run bkt init", 409);
  const staff = staffRoot(dataDir);
  plainDir(dirname(staff));
  plainDir(staff);
  const dest = join(staff, pack.version);
  if (existsSync(dest)) plainDir(dest);
  if (!existsSync(join(dest, ".complete"))) {
    const tmp = `${dest}.tmp-${process.pid}`;
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { mode: 0o700 });
    for (const output of pack.outputs) {
      for (const file of output.files) {
        const p = join(tmp, "files", file.path);
        mkdirSync(dirname(p), { recursive: true, mode: 0o700 });
        writeFileSync(p, decodeBlob(pack.blobs[file.sha256]), { mode: 0o600, flag: "wx" });
      }
    }
    writeFileSync(join(tmp, "index.json"), JSON.stringify({ schema: SIDE_SCHEMA, version: pack.version, outputs: pack.outputs }), { mode: 0o600 });
    writeFileSync(join(tmp, ".complete"), pack.version, { mode: 0o600 });
    rmSync(dest, { recursive: true, force: true });
    renameSync(tmp, dest);
  }
  const current = join(staff, "current");
  plainFile(current);
  writeFileSync(`${current}.tmp-${process.pid}`, pack.version, { mode: 0o600 });
  renameSync(`${current}.tmp-${process.pid}`, current);
  return { version: pack.version, outputs: pack.outputs.length, files: pack.outputs.reduce((n, output) => n + output.files.length, 0) };
}

export function readInstalled(dataDir: string): SideIndex | null {
  const staff = staffRoot(dataDir);
  const current = join(staff, "current");
  if (!existsSync(staff) || !plainFile(current)) return null;
  const version = readFileSync(current, "utf8").trim();
  if (!VERSION.test(version)) refuse("the installed side pack has no valid version");
  const dest = join(staff, version);
  plainDir(dest);
  if (!plainFile(join(dest, ".complete")) || !plainFile(join(dest, "index.json"))) refuse("the installed side pack is incomplete");
  const index = JSON.parse(readFileSync(join(dest, "index.json"), "utf8")) as { schema?: string; version?: string; outputs?: unknown };
  if (index.schema !== SIDE_SCHEMA || index.version !== version) refuse("the installed side pack does not match its folder");
  const outputs = checkOutputs(index.outputs);
  if (sha256(JSON.stringify(outputs)).slice(0, 16) !== version) refuse("the installed side pack does not match its version");
  return { root: join(dest, "files"), version, outputs };
}

export function researchCacheRoot(env = process.env): string {
  return join(platformFor(process.platform, { env }).cacheDir(), "bkt", "research");
}

export function guardPath(root: string, rel: string): string {
  const problem = pathProblem(rel);
  if (problem) throw new ResearchError(problem, 400);
  let at = root;
  const parts = rel.split("/");
  parts.forEach((part, i) => {
    at = join(at, part);
    let stat;
    try {
      stat = lstatSync(at);
    } catch {
      throw new ResearchError("no such file", 404);
    }
    if (stat.isSymbolicLink()) throw new ResearchError("the path crosses a symlink", 403);
    const last = i === parts.length - 1;
    if (!last && !stat.isDirectory()) throw new ResearchError("the path crosses a file", 403);
    if (last && !stat.isFile()) throw new ResearchError("the path is not a regular file", 403);
  });
  const real = realpathSync(at);
  if (!real.startsWith(`${realpathSync(root)}${sep}`)) throw new ResearchError("the path leaves the research folder", 403);
  return real;
}

function hashProblem(output: ResearchOutput): string | null {
  const byPath = new Map(output.files.map((file) => [file.path, file.sha256]));
  const m = output.manifest;
  const source = byPath.get(m.source_path);
  if (source !== undefined && source !== m.source_hash) return `${m.source_path} does not match the source hash in its record`;
  const pdf = m.pdf_path ? byPath.get(m.pdf_path) : undefined;
  if (pdf !== undefined && pdf !== m.pdf_hash) return `${m.pdf_path} does not match the PDF hash in its record`;
  return null;
}

export class Research {
  private outputs = new Map<string, ResearchOutput>();
  private unreadable = new Map<string, string>();
  private unpacked: Promise<string> | null = null;
  private side: SideIndex | null = null;
  private sideFiles = new Set<string>();
  private tables = new TableCache();

  constructor(
    private source: ResearchSource,
    private cache: string = researchCacheRoot(),
    private dataDir: string | null = null,
    private onError: (e: Error) => void = () => {},
  ) {
    this.reload();
  }

  reload(): void {
    let side: SideIndex | null = null;
    try {
      side = this.dataDir === null ? null : readInstalled(this.dataDir);
    } catch (e) {
      this.onError(e as Error);
    }
    const outputs = new Map(this.source.index.outputs.map((output) => [output.slug, output]));
    const sideFiles = new Set<string>();
    for (const extra of side?.outputs ?? []) {
      const shipped = outputs.get(extra.slug);
      const staffPaths = new Set(extra.files.map((file) => file.path));
      for (const path of staffPaths) sideFiles.add(`${extra.slug}\n${path}`);
      const files = [...(shipped?.files ?? []).filter((file) => !staffPaths.has(file.path)), ...extra.files].sort((x, y) => (x.path < y.path ? -1 : 1));
      outputs.set(extra.slug, { slug: extra.slug, origin: shipped ? shipped.origin : "staff", manifest: extra.manifest, files, withheld: 0 });
    }
    const unreadable = new Map<string, string>();
    for (const output of outputs.values()) {
      const problem = hashProblem(output);
      if (problem) unreadable.set(output.slug, problem);
    }
    this.side = side;
    this.sideFiles = sideFiles;
    this.outputs = outputs;
    this.unreadable = unreadable;
  }

  get home(): string | null {
    return this.dataDir;
  }

  get staffVersion(): string | null {
    return this.side?.version ?? null;
  }

  list(): ResearchRow[] {
    return [...this.outputs.values()].map((output) => ({
      slug: output.slug,
      title: output.manifest.title,
      kind: output.manifest.kind,
      status: output.manifest.status,
      date: output.manifest.date,
      origin: output.origin,
      changed: 0,
      unreadable: this.unreadable.get(output.slug) ?? null,
    }));
  }

  private output(slug: string | null): ResearchOutput {
    if (slug === null || !SLUG.test(slug)) throw new ResearchError("the output name is refused", 400);
    const output = this.outputs.get(slug);
    if (!output) throw new ResearchError("no such output", 404);
    return output;
  }

  detail(slug: string | null): ResearchDetail {
    const output = this.output(slug);
    return { slug: output.slug, origin: output.origin, staff: this.source.index.staff || this.side !== null, manifest: output.manifest, files: output.files, withheld: output.withheld, unreadable: this.unreadable.get(output.slug) ?? null };
  }

  root(): Promise<string> {
    this.unpacked ??= this.unpack().catch((e) => {
      this.unpacked = null;
      throw e;
    });
    return this.unpacked;
  }

  private async unpack(): Promise<string> {
    const { version, outputs } = this.source.index;
    const dest = join(this.cache, version);
    if (existsSync(join(dest, ".complete"))) return dest;
    const { blobs, version: held } = await this.source.blobs();
    if (held !== version) throw new ResearchError("the research files belong to another build", 500);
    platformFor().secureDir(this.cache);
    const tmp = `${dest}.tmp-${process.pid}`;
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true, mode: 0o700 });
    for (const output of outputs) {
      for (const file of output.files) {
        const blob = blobs[file.sha256];
        const bytes = blob ? decodeBlob(blob) : null;
        if (!bytes || bytes.length !== file.size || sha256(bytes) !== file.sha256) {
          this.unreadable.set(output.slug, `${file.path} does not match its hash in this build`);
          continue;
        }
        const p = join(tmp, file.path);
        mkdirSync(dirname(p), { recursive: true, mode: 0o700 });
        writeFileSync(p, bytes, { mode: 0o600 });
      }
    }
    writeFileSync(join(tmp, ".complete"), version, { mode: 0o600 });
    chmodSync(tmp, 0o700);
    try {
      renameSync(tmp, dest);
    } catch (e) {
      rmSync(tmp, { recursive: true, force: true });
      if (!existsSync(join(dest, ".complete"))) throw e;
    }
    return dest;
  }

  async read(slug: string | null, path: string | null): Promise<ResearchFile> {
    const output = this.output(slug);
    if (path === null) throw new ResearchError("the path is empty", 400);
    const problem = pathProblem(path);
    if (problem) throw new ResearchError(problem, 400);
    const entry = output.files.find((file) => file.path === path);
    if (!entry) throw new ResearchError("the output does not list that file", 404);
    const type = CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
    if (entry.size > VIEW_BYTES) throw new ResearchError("the file is over the 16 MB view limit", 413);
    const root = this.side && this.sideFiles.has(`${output.slug}\n${path}`) ? this.side.root : await this.root();
    const reason = this.unreadable.get(output.slug);
    if (reason) throw new ResearchError(reason, 409);
    const bytes = readFileSync(guardPath(root, path));
    if (sha256(bytes) !== entry.sha256) {
      const changed = `${path} changed on disk after it was unpacked`;
      this.unreadable.set(output.slug, changed);
      throw new ResearchError(changed, 409);
    }
    return { bytes, type, entry };
  }

  async table(slug: string | null, id: string | null, query: TableQuery): Promise<TablePage> {
    const output = this.output(slug);
    if (id === null || !SLUG.test(id)) throw new ResearchError("the table name is refused", 400);
    const table = (output.manifest.tables ?? []).find((t) => t.id === id);
    if (table) {
      const file = await this.read(slug, table.path);
      const parsed = this.tables.get(file.entry.sha256, () => parseTable(table.format, file.bytes.toString("utf8")));
      return pageOf(parsed, query, [table.licence_column, table.source_column].filter((c): c is string => typeof c === "string"));
    }
    const set = (output.manifest.record_sets ?? []).find((s) => s.id === id);
    if (!set) throw new ResearchError("the output has no such table", 404);
    const members = output.files.filter((file) => file.path.startsWith(`${set.dir}/`) && file.path.endsWith(".json") && !file.path.slice(set.dir.length + 1).includes("/"));
    const key = sha256(members.map((file) => file.sha256).join("\n"));
    const loaded: { path: string; text: string }[] = [];
    if (!this.tables.has(key)) for (const file of members) loaded.push({ path: file.path, text: (await this.read(slug, file.path)).bytes.toString("utf8") });
    return pageOf(this.tables.get(key, () => recordSetTable(loaded)), query);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function researchRoutes(research: Research, onError: (e: Error) => void = () => {}): Record<string, Route> {
  const guarded = async (run: () => Response | Promise<Response>) => {
    try {
      return await run();
    } catch (e) {
      if (e instanceof ResearchError || e instanceof TableError) return json({ error: e.message }, e.status);
      onError(e as Error);
      return json({ error: "the research files could not be read" }, 500);
    }
  };
  return {
    "GET /local/research/list": () => guarded(() => json({ outputs: research.list() })),
    "GET /local/research/manifest": (_req, url) => guarded(() => json(research.detail(url.searchParams.get("slug")))),
    "GET /local/research/table": (_req, url) => guarded(async () => json(await research.table(url.searchParams.get("slug"), url.searchParams.get("id"), parseQuery(url.searchParams)))),
    "POST /local/research/install": (req, _url, ctx) =>
      guarded(async () => {
        const bytes = new Uint8Array(await req.arrayBuffer());
        if (ctx?.cli !== true) return json({ error: "a side pack installs from the terminal alone" }, 403);
        const dir = research.home;
        if (dir === null) return json({ error: "this server has no data folder" }, 409);
        const done = installSidePack(dir, bytes);
        research.reload();
        return json(done);
      }),
    "GET /local/research/file": (_req, url) =>
      guarded(async () => {
        const file = await research.read(url.searchParams.get("slug"), url.searchParams.get("path"));
        const headers: Record<string, string> = { "content-type": file.type, "cache-control": "no-store", "x-content-type-options": "nosniff", "x-bkt-sha256": file.entry.sha256 };
        if (file.type === "image/svg+xml") headers["content-security-policy"] = "sandbox";
        return new Response(new Blob([file.bytes as Uint8Array<ArrayBuffer>]), { headers });
      }),
  };
}
