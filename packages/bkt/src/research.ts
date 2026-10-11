import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, sep } from "node:path";
import { decodeBlob, MB, pathProblem, sha256, SLUG, type PackedFile, type ReportRecord, type ResearchBlobs, type ResearchIndex, type ResearchOutput } from "./pack/research";
import { platformFor } from "./platform";
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
  private outputs: Map<string, ResearchOutput>;
  private unreadable = new Map<string, string>();
  private unpacked: Promise<string> | null = null;

  constructor(
    private source: ResearchSource,
    private cache: string = researchCacheRoot(),
  ) {
    this.outputs = new Map(source.index.outputs.map((output) => [output.slug, output]));
    for (const output of source.index.outputs) {
      const problem = hashProblem(output);
      if (problem) this.unreadable.set(output.slug, problem);
    }
  }

  list(): ResearchRow[] {
    return this.source.index.outputs.map((output) => ({
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
    return { slug: output.slug, origin: output.origin, staff: this.source.index.staff, manifest: output.manifest, files: output.files, withheld: output.withheld, unreadable: this.unreadable.get(output.slug) ?? null };
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
    const root = await this.root();
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
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function researchRoutes(research: Research, onError: (e: Error) => void = () => {}): Record<string, Route> {
  const guarded = async (run: () => Response | Promise<Response>) => {
    try {
      return await run();
    } catch (e) {
      if (e instanceof ResearchError) return json({ error: e.message }, e.status);
      onError(e as Error);
      return json({ error: "the research files could not be read" }, 500);
    }
  };
  return {
    "GET /local/research/list": () => guarded(() => json({ outputs: research.list() })),
    "GET /local/research/manifest": (_req, url) => guarded(() => json(research.detail(url.searchParams.get("slug")))),
    "GET /local/research/file": (_req, url) =>
      guarded(async () => {
        const file = await research.read(url.searchParams.get("slug"), url.searchParams.get("path"));
        const headers: Record<string, string> = { "content-type": file.type, "cache-control": "no-store", "x-content-type-options": "nosniff", "x-bkt-sha256": file.entry.sha256 };
        if (file.type === "image/svg+xml") headers["content-security-policy"] = "sandbox";
        return new Response(new Blob([file.bytes as Uint8Array<ArrayBuffer>]), { headers });
      }),
  };
}
