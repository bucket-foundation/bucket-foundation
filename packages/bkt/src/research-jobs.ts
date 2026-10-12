import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { diffLines, unifiedPatch } from "./diff";
import { capJob } from "./job-specs";
import { JobError, type JobDirs, type JobRunner, type JobSpec, type JobStep, type JobView } from "./jobs";
import { pathProblem, SLUG, sha256, type ReportBuild } from "./pack/research";
import type { Os } from "./platform";
import { type Research, ResearchError } from "./research";
import { BuildSwitch, ConsentError, type ChangedFile, type ConsentStore, frozenDigest, type Pending, type PendingView, visibleText, type Hidden } from "./research-consent";
import type { Route } from "./serve";

export type Which = (bin: string) => string | null;

export const PAGES_KIND = "research-pages";
export const PAGES_TIMEOUT_MS = 60_000;
export const PAGES_DPI = 150;
export const PAGES_MAX = 200;
export const PAGES_OUT_BYTES = 256 * 1024 * 1024;
export const FROZEN_PDF = "paper.pdf";
export const PAGE_FILE = /^page-(\d{1,3})\.png$/;

export const TOOLS = ["pdflatex", "biber", "pdftoppm"] as const;
export type Tool = (typeof TOOLS)[number];

export const TOOL_USE: Record<Tool, string> = {
  pdflatex: "Paper compiler",
  biber: "Bibliography",
  pdftoppm: "Paper pages",
};

const INSTALL: Record<Os, Record<Tool, string>> = {
  linux: {
    pdflatex: "sudo dnf install texlive-scheme-medium, or sudo apt install texlive-latex-extra",
    biber: "sudo dnf install biber, or sudo apt install biber",
    pdftoppm: "sudo dnf install poppler-utils, or sudo apt install poppler-utils",
  },
  darwin: {
    pdflatex: "brew install --cask mactex-no-gui",
    biber: "brew install --cask mactex-no-gui",
    pdftoppm: "brew install poppler",
  },
  win32: {
    pdflatex: "winget install MiKTeX.MiKTeX",
    biber: "winget install MiKTeX.MiKTeX",
    pdftoppm: "winget install oschwartz10612.Poppler",
  },
};

export function toolInstall(tool: Tool, os: Os): string {
  return INSTALL[os][tool];
}

export function pagesArgv(pdftoppm: string, dirs: JobDirs): string[] {
  return [pdftoppm, "-png", "-r", String(PAGES_DPI), "-f", "1", "-l", String(PAGES_MAX), join(dirs.dir, FROZEN_PDF), join(dirs.out, "page")];
}

export function pageFiles(out: string): { n: number; file: string }[] {
  return readdirSync(out)
    .map((name) => ({ name, m: PAGE_FILE.exec(name) }))
    .filter((x): x is { name: string; m: RegExpExecArray } => x.m !== null)
    .map((x) => ({ n: Number(x.m[1]), file: join(out, x.name) }))
    .sort((a, b) => a.n - b.n);
}

export const PAGES_WATCH_MS = 500;
export const PAGES_OVER = "the pages are over the 256 MB limit";

export function folderBytes(dir: string): number {
  let sum = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) if (entry.isFile()) sum += statSync(join(dir, entry.name)).size;
  return sum;
}

export const PDF_KIND = "research-pdf";
export const FIGURE_KIND = "research-figure";
export const TABLES_KIND = "research-tables";
export const LATEX_TIMEOUT_MS = 5 * 60_000;
export const PYTHON_TIMEOUT_MS = 10 * 60_000;
export const BUILD_OUT_BYTES = 256 * 1024 * 1024;
export const BUILD_OVER = "the build wrote over 256 MB";
export const SRC = "src";
export const LATEX_FLAGS = ["-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape"];
export const EXECUTABLE_EXTS = [".py", ".tex", ".sty", ".cls", ".bib"];
export const SPEC_VERSION = 1;

export function treeBytes(dir: string): number {
  let sum = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const p = join(dir, entry.name);
    sum += entry.isDirectory() ? treeBytes(p) : entry.isFile() ? statSync(p).size : 0;
  }
  return sum;
}

export function bcfProblem(bcf: string, jobDir: string): string | null {
  if (!existsSync(bcf)) return null;
  const root = `${resolve(jobDir)}/`;
  const text = readFileSync(bcf, "utf8");
  for (const m of text.matchAll(/<bcf:datasource[^>]*>([^<]*)<\/bcf:datasource>/g)) {
    const name = m[1].trim();
    const at = resolve(dirname(bcf), name);
    if (!at.startsWith(root)) return `the paper names a bibliography outside the job folder: ${name}`;
    try {
      if (lstatSync(at).isSymbolicLink()) return `the paper names a bibliography that is a symlink: ${name}`;
    } catch {
      return `the paper names a bibliography that is missing: ${name}`;
    }
  }
  return null;
}

function place(root: string, rel: string, from: string): void {
  const problem = pathProblem(rel);
  if (problem) throw new Error(`the build names an output that is refused: ${problem}`);
  let at = root;
  const parts = rel.split("/");
  for (const part of parts.slice(0, -1)) {
    at = join(at, part);
    if (!existsSync(at)) mkdirSync(at, { mode: 0o700 });
    if (lstatSync(at).isSymbolicLink() || !lstatSync(at).isDirectory()) throw new Error("the built folder crosses a symlink or a file");
  }
  const to = join(at, parts[parts.length - 1]);
  if (!`${realpathSync(at)}/`.startsWith(`${realpathSync(root)}/`)) throw new Error("the build names an output outside the built folder");
  if (existsSync(to) && (lstatSync(to).isSymbolicLink() || !lstatSync(to).isFile())) throw new Error("the built folder holds a symlink or a folder at that path");
  copyFileSync(from, to);
  chmodSync(to, 0o600);
}

function builtRoot(dataDir: string, slug: string): string {
  const parts = [dataDir, "research", "outputs", slug, "built"];
  let at = parts[0];
  for (const part of parts.slice(1)) {
    at = join(at, part);
    if (!existsSync(at)) mkdirSync(at, { mode: 0o700 });
    if (lstatSync(at).isSymbolicLink() || !lstatSync(at).isDirectory()) throw new Error("the built folder crosses a symlink or a file");
  }
  return at;
}

function declared(params: Record<string, string> | undefined): string[] {
  try {
    const list = JSON.parse(params?.outputs ?? "[]") as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export interface BuildSpecOptions {
  os: Os;
  which?: Which;
  outBytes?: number;
  watchMs?: number;
  dataDir?: string;
  python?: string;
  buildBytes?: number;
}

function buildSpecs(o: BuildSpecOptions, which: Which): Record<string, JobSpec> {
  const dataDir = o.dataDir;
  if (!dataDir) return {};
  const cap = o.buildBytes ?? BUILD_OUT_BYTES;
  const watch = { everyMs: o.watchMs ?? PAGES_WATCH_MS, check: (dirs: JobDirs) => (treeBytes(dirs.dir) > cap ? BUILD_OVER : null) };
  const limited = (argv: string[], env: Record<string, string>) => capJob(argv, env, which);
  const python = (label: string): JobSpec => ({
    label,
    inputs: {},
    timeoutMs: PYTHON_TIMEOUT_MS,
    watch,
    plan(dirs, _options, params) {
      const entry = params?.entry ?? "";
      const bin = which(o.python ?? "python3");
      if (!bin) return { error: "python3 is missing, so the script cannot run", install: "Install Python 3 from python.org." };
      const cwd = join(dirs.dir, SRC, dirname(entry));
      const run = limited([bin, "-B", join(dirs.dir, SRC, entry)], { HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1", MPLBACKEND: "Agg", BKT_REPORT_DIR: dirs.dir, BKT_PAGE_DATA: dirs.dir });
      const steps: JobStep[] = [{ ...run, cwd }];
      const pdftoppm = which("pdftoppm");
      for (const out of declared(params).filter((p) => p.endsWith(".pdf"))) {
        const pdf = join(dirs.dir, SRC, out);
        if (pdftoppm) steps.push({ argv: [pdftoppm, "-png", "-r", "160", "-singlefile", pdf, pdf.replace(/\.pdf$/, "")], cwd, skip: () => !existsSync(pdf) });
      }
      return { steps };
    },
    after(dirs, params) {
      const root = builtRoot(dataDir, params?.slug ?? "");
      const made: string[] = [];
      for (const out of declared(params)) {
        for (const rel of [out, out.replace(/\.pdf$/, ".png")]) {
          const from = join(dirs.dir, SRC, rel);
          if (made.includes(rel) || !existsSync(from) || lstatSync(from).isSymbolicLink() || !lstatSync(from).isFile()) continue;
          place(root, rel, from);
          made.push(rel);
        }
      }
      if (made.length === 0) throw new Error("the script wrote none of the files the build names");
      return { outputs: made };
    },
  });
  return {
    [PDF_KIND]: {
      label: "Compile a paper",
      inputs: {},
      timeoutMs: LATEX_TIMEOUT_MS,
      watch,
      plan(dirs, _options, params) {
        const entry = params?.entry ?? "";
        const pdflatex = which("pdflatex");
        const biber = which("biber");
        if (!pdflatex) return { error: "pdflatex is missing, so the paper cannot be compiled", install: toolInstall("pdflatex", o.os) };
        if (!biber) return { error: "biber is missing, so the paper cannot be compiled", install: toolInstall("biber", o.os) };
        const cwd = join(dirs.dir, SRC, dirname(entry));
        const stem = entry.split("/").pop()!.replace(/\.tex$/, "");
        const tex = limited([pdflatex, ...LATEX_FLAGS, `${stem}.tex`], { openin_any: "p", openout_any: "p", TEXMFOUTPUT: cwd });
        const bcf = join(cwd, `${stem}.bcf`);
        return {
          steps: [
            { ...tex, cwd },
            { ...limited([biber, "--noconf", stem], {}), cwd, skip: () => !existsSync(bcf), before: () => bcfProblem(bcf, dirs.dir) },
            { ...tex, cwd },
            { ...tex, cwd },
          ],
        };
      },
      after(dirs, params) {
        const entry = params?.entry ?? "";
        const made = join(dirs.dir, SRC, entry.replace(/\.tex$/, ".pdf"));
        if (!existsSync(made) || lstatSync(made).isSymbolicLink() || readFileSync(made).subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("the compile wrote no PDF");
        const rel = declared(params).find((p) => p.endsWith(".pdf")) ?? entry.replace(/\.tex$/, ".pdf");
        place(builtRoot(dataDir, params?.slug ?? ""), rel, made);
        return { outputs: [rel] };
      },
    },
    [FIGURE_KIND]: python("Redraw figures"),
    [TABLES_KIND]: python("Rebuild tables"),
  };
}

export function researchSpecs(o: BuildSpecOptions): Record<string, JobSpec> {
  const outBytes = o.outBytes ?? PAGES_OUT_BYTES;
  const which = o.which ?? ((bin: string) => Bun.which(bin));
  return {
    [PAGES_KIND]: {
      label: "Render the pages of a paper",
      inputs: {},
      timeoutMs: PAGES_TIMEOUT_MS,
      watch: { everyMs: o.watchMs ?? PAGES_WATCH_MS, check: (dirs) => (folderBytes(dirs.out) > outBytes ? PAGES_OVER : null) },
      plan(dirs) {
        const bin = which("pdftoppm");
        if (!bin) return { error: "pdftoppm is missing, so the paper shows as a preview", install: toolInstall("pdftoppm", o.os) };
        return { argv: pagesArgv(bin, dirs), env: {} };
      },
      after(dirs) {
        const pages = pageFiles(dirs.out);
        if (pages.length === 0) throw new Error("the paper produced no page");
        const bytes = folderBytes(dirs.out);
        if (bytes > outBytes) throw new Error(PAGES_OVER);
        return { pages: pages.length, bytes };
      },
    },
    ...buildSpecs(o, which),
  };
}

export function kindOf(build: ReportBuild): string {
  return build.runner === "latex" ? PDF_KIND : build.id === "tables" ? TABLES_KIND : FIGURE_KIND;
}

const cut = (line: string) => (line.length > 100 ? `${line.slice(0, 100)}…` : line);

const SIZES_ALONE = /bytes, shown as sizes alone$/;

export function approvalHidden(files: ChangedFile[]): Hidden {
  let shown = 0;
  const hidden = { files: 0, lines: 0 };
  files.forEach((f, i) => {
    const sizes = f.lines.length === 1 && f.added === 0 && f.removed === 0 && SIZES_ALONE.test(f.lines[0]);
    const total = sizes ? 0 : f.base === null ? Math.max(f.added, f.lines.length) : f.lines.length;
    const take = i < 5 ? Math.max(0, Math.min(6, 40 - shown, f.lines.length)) : 0;
    shown += take;
    const missing = sizes ? 0 : total - take + f.lines.slice(0, take).filter((l) => l.length > 100).length;
    if (missing > 0 || sizes) hidden.files += 1;
    hidden.lines += missing;
  });
  return hidden;
}

export function approvalText(o: { title: string; build: ReportBuild; cls: "shipped" | "edited"; digest: string; files: ChangedFile[] }): string {
  const lines = [o.title, `Build: ${o.build.label} (${o.build.runner}), entry ${o.build.entry}`, `Version: ${o.cls === "shipped" ? "shipped version" : "edited on this computer"}`, `Digest: ${o.digest.slice(0, 12)}`];
  let shown = 0;
  o.files.forEach((f, i) => {
    lines.push("", f.base === null ? `${f.path}: new file ${f.now.slice(0, 12)}` : `${f.path}: ${f.base.slice(0, 12)} to ${f.now.slice(0, 12)}, ${f.added} added, ${f.removed} removed`);
    for (const l of i < 5 ? f.lines.slice(0, Math.max(0, Math.min(6, 40 - shown))) : []) {
      lines.push(`  ${cut(l)}`);
      shown += 1;
    }
  });
  const total = o.files.reduce((n, f) => n + f.added + f.removed, 0);
  if (o.files.length > 5 || total > 40) lines.push("", `${o.files.length} files changed. Run bkt research approve in a terminal to read the full diff.`);
  return visibleText(lines.join("\n"));
}

export interface BuildsOptions {
  research: Research;
  runner: JobRunner;
  consent: ConsentStore;
  gate: BuildSwitch;
  os: Os;
  which?: Which;
  ownBuilds?: (slug: string) => boolean;
  now?: () => number;
}

export class ResearchBuilds {
  private active: { jobId: string; dir: string } | null = null;
  private done = new Map<string, JobView>();
  private which: Which;

  constructor(private o: BuildsOptions) {
    this.which = o.which ?? ((bin: string) => Bun.which(bin));
  }

  drop(pending: Pending): void {
    this.o.runner.discard(pending.frozenDir);
  }

  settle(): void {
    this.o.consent.pending();
    const a = this.active;
    if (!a) return;
    const job = this.o.runner.get(a.jobId);
    if (job && job.state === "running") return;
    if (job) this.done.set(a.jobId, job);
    for (const old of [...this.done.keys()].slice(0, -20)) this.done.delete(old);
    this.active = null;
    this.o.runner.discard(a.dir);
  }

  private blocked(slug: string, origin: string): string | null {
    const off = this.o.gate.off(slug);
    if (off) return `builds are off for this output: ${off}. Run bkt research builds on ${slug} in a terminal`;
    if (origin === "local" && !(this.o.ownBuilds?.(slug) ?? false)) return `builds are off for this output until you run bkt research builds on ${slug} in a terminal`;
    return null;
  }

  async request(slugIn: string | null, buildId: string | null): Promise<PendingView> {
    this.settle();
    if (slugIn === null || !SLUG.test(slugIn)) throw new ResearchError("the output name is refused", 400);
    const detail = this.o.research.detail(slugIn);
    if (detail.unreadable) throw new ResearchError(detail.unreadable, 409);
    if (buildId === null || !SLUG.test(buildId)) throw new ResearchError("the build name is refused", 400);
    const build = (detail.manifest.builds ?? []).find((b) => b.id === buildId);
    if (!build) throw new ResearchError("the output has no such build", 404);
    const block = this.blocked(detail.slug, detail.origin);
    if (block) throw new ResearchError(block, 403);
    const wait = this.o.consent.cooldown(detail.slug);
    if (wait > 0) throw new ResearchError(`a build request for this output just ended; ask again in ${Math.ceil(wait / 1000)} seconds`, 429);
    if (this.o.consent.pending()) throw new ResearchError("another build is waiting for approval", 409);
    if (this.active || this.o.runner.busy()) throw new ResearchError("another build is running; cancel it or wait", 409);
    const kind = kindOf(build);
    for (const tool of kind === PDF_KIND ? (["pdflatex", "biber"] as const) : [])
      if (!this.which(tool)) throw Object.assign(new ResearchError(`${tool} is missing, so the paper cannot be compiled`, 409), { install: toolInstall(tool, this.o.os) });
    for (const path of [build.entry, ...(build.inputs ?? []), ...(build.outputs ?? [])]) {
      const problem = pathProblem(path);
      if (problem) throw new ResearchError(`the build names a path that is refused: ${problem}`, 409);
    }
    const listed = new Map(detail.files.map((f) => [f.path, f]));
    const paths = [build.entry, ...(build.inputs ?? [])].filter((p, i, all) => all.indexOf(p) === i);
    const frozen: Record<string, Uint8Array> = {};
    const files: ChangedFile[] = [];
    let full = "";
    for (const path of paths) {
      const entry = listed.get(path);
      if (!entry) throw new ResearchError(`this build of Bucket lacks ${path}, which the build reads`, 409);
      const bytes = (await this.o.research.read(detail.slug, path)).bytes;
      frozen[`${SRC}/${path}`] = bytes;
      const now = sha256(bytes);
      const own = detail.origin === "local";
      const code = path === build.entry || EXECUTABLE_EXTS.includes(extname(path).toLowerCase());
      if (own ? !code : now === entry.sha256) continue;
      const text = !bytes.includes(0) && bytes.length <= 2 * 1024 * 1024;
      if (!text) {
        files.push({ path, base: own ? null : entry.sha256, now, added: 0, removed: 0, lines: [`${bytes.length} bytes, shown as sizes alone`] });
        full += `--- a/${path}\n+++ b/${path}\n${bytes.length} bytes, shown as sizes alone\n`;
        continue;
      }
      const before = own ? "" : (await this.o.research.read(detail.slug, path, { baseline: true })).bytes.toString("utf8");
      const d = diffLines(before, bytes.toString("utf8"));
      const lines = own ? bytes.toString("utf8").split("\n").slice(0, 6) : d.hunks.flatMap((h) => h.lines.filter((l) => l.op !== " ").map((l) => `${l.op}${l.text}`));
      files.push({ path, base: own ? null : entry.sha256, now, added: d.added, removed: d.removed, lines });
      full += unifiedPatch(path, d);
    }
    const params = { slug: detail.slug, build: build.id, entry: build.entry, outputs: JSON.stringify(build.outputs ?? []) };
    frozen["build.json"] = Buffer.from(JSON.stringify({ v: SPEC_VERSION, kind, runner: build.runner, ...params }));
    const made = this.o.runner.freeze(frozen);
    try {
      const digest = frozenDigest(made.dir);
      const cls = files.length === 0 ? "shipped" : "edited";
      const body = approvalText({ title: detail.manifest.title, build, cls, digest, files });
      this.o.consent.open({ slug: detail.slug, build: build.id, kind, digest, cls, files, frozenDir: made.dir, title: "Allow this build?", body, full, params, output: detail.manifest.title, hidden: approvalHidden(files) });
    } catch (e) {
      this.o.runner.discard(made.dir);
      throw e;
    }
    return this.o.consent.view() as PendingView;
  }

  pending(): PendingView | null {
    this.settle();
    return this.o.consent.view();
  }

  detail(): { view: PendingView; full: string; files: ChangedFile[] } | null {
    this.settle();
    const p = this.o.consent.pending();
    const view = this.o.consent.view();
    return p && view ? { view, full: p.full, files: p.files } : null;
  }

  answer(id: unknown, digest: unknown, allow: unknown): JobView | { denied: true } {
    this.settle();
    if (allow !== true) {
      this.o.consent.deny(id, digest);
      return { denied: true };
    }
    const { grant, pending } = this.o.consent.consume(id, digest);
    try {
      const job = this.o.runner.startFrozen(pending.kind, pending.frozenDir, grant, pending.params);
      this.active = { jobId: job.id, dir: pending.frozenDir };
      if (job.state !== "running") this.settle();
      return job;
    } catch (e) {
      this.o.runner.discard(pending.frozenDir);
      throw e;
    }
  }

  latest(): JobView | null {
    this.settle();
    if (this.active) return this.o.runner.get(this.active.jobId);
    return [...this.done.values()].at(-1) ?? null;
  }

  job(id: string | null): JobView {
    this.settle();
    const job = id === null ? null : (this.o.runner.get(id) ?? this.done.get(id) ?? null);
    if (!job) throw new ResearchError("no such build job", 404);
    return job;
  }

  cancel(id: unknown): JobView {
    if (typeof id !== "string") throw new ResearchError("the job name is missing", 400);
    const job = this.o.runner.cancel(id);
    return job;
  }

  relativeTo(dir: string): string {
    return relative(this.o.runner.rootDir, dir);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function researchBuildRoutes(builds: ResearchBuilds, onError: (e: Error) => void = () => {}): Record<string, Route> {
  const guarded = async (run: () => Response | Promise<Response>) => {
    try {
      return await run();
    } catch (e) {
      if (e instanceof ResearchError) return json({ error: e.message, install: (e as ResearchError & { install?: string }).install ?? null }, e.status);
      if (e instanceof ConsentError || e instanceof JobError) return json({ error: e.message }, e.status);
      onError(e as Error);
      return json({ error: "the build could not be handled" }, 500);
    }
  };
  const body = async (req: Request): Promise<Record<string, unknown>> => {
    try {
      const b = (await req.json()) as unknown;
      return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  };
  return {
    "POST /local/research/build": (_req, url) => guarded(async () => json(await builds.request(url.searchParams.get("slug"), url.searchParams.get("build")), 202)),
    "GET /local/research/consent/pending": (_req, _url, ctx) =>
      guarded(() => {
        const d = builds.detail();
        return json({ pending: d ? d.view : null, job: builds.latest(), ...(ctx?.cli === true && d ? { full: d.full } : {}) });
      }),
    "POST /local/research/consent": (req, _url, ctx) =>
      guarded(async () => {
        const b = await body(req);
        if (ctx?.cli !== true) return json({ error: "a build is approved from the terminal alone" }, 403);
        return json(builds.answer(b.id ?? null, b.digest ?? null, b.allow));
      }),
    "GET /local/research/job": (_req, url) => guarded(() => json(builds.job(url.searchParams.get("id")))),
    "POST /local/research/job/cancel": (req) => guarded(async () => json(builds.cancel((await body(req)).id))),
  };
}
