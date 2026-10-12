import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JobError, type JobRunner, type JobView } from "./jobs";
import type { Os } from "./platform";
import { guardPath, type Research, ResearchError } from "./research";
import { ConsentStore, frozenDigest } from "./research-consent";
import { FROZEN_PDF, pageFiles, PAGES_KIND, PAGES_MAX, toolInstall, type Which } from "./research-jobs";
import type { Route } from "./serve";

export type PagesState =
  | { state: "ready"; pages: number; pdf: string }
  | { state: "rendering"; pdf: string }
  | { state: "preview"; reason: string; install: string | null }
  | { state: "failed"; reason: string };

export interface PagesOptions {
  research: Research;
  runner: JobRunner;
  consent: ConsentStore;
  cache: string;
  os: Os;
  which?: Which;
}

export const PAGES_KEEP = 4;
const HASH = /^[0-9a-f]{64}$/;
const PDF_ROLES = ["public-pdf", "pdf"];

export class ResearchPages {
  private running = new Map<string, string>();
  private failed = new Map<string, string>();
  private which: Which;

  constructor(private o: PagesOptions) {
    this.which = o.which ?? ((bin: string) => Bun.which(bin));
    mkdirSync(o.cache, { recursive: true, mode: 0o700 });
    chmodSync(o.cache, 0o700);
  }

  private pdfOf(slug: string | null): { slug: string; path: string; sha256: string } {
    const detail = this.o.research.detail(slug);
    if (detail.unreadable) throw new ResearchError(detail.unreadable, 409);
    const file = PDF_ROLES.map((role) => detail.files.find((f) => f.role === role && f.path.endsWith(".pdf"))).find((f) => f !== undefined);
    if (!file || !HASH.test(file.sha256)) throw new ResearchError("the output holds no paper", 404);
    return { slug: detail.slug, path: file.path, sha256: file.sha256 };
  }

  private dir(sha: string): string {
    return join(this.o.cache, sha);
  }

  private cached(sha: string): number | null {
    const marker = join(this.dir(sha), ".complete");
    if (!existsSync(marker) || lstatSync(marker).isSymbolicLink()) return null;
    const n = Number(readFileSync(marker, "utf8").trim());
    return Number.isInteger(n) && n >= 1 && n <= PAGES_MAX ? n : null;
  }

  private collect(sha: string, job: JobView): PagesState {
    this.running.delete(sha);
    const jobDir = join(this.o.runner.rootDir, job.id);
    try {
      if (job.state !== "done") {
        const reason = job.state === "timeout" ? "the paper took over 60 seconds to render" : (job.error ?? "the pages did not render");
        if (job.install) return { state: "preview", reason, install: job.install };
        this.failed.set(sha, reason);
        return { state: "failed", reason };
      }
      const pages = pageFiles(join(jobDir, "out"));
      const tmp = `${this.dir(sha)}.tmp-${process.pid}`;
      rmSync(tmp, { recursive: true, force: true });
      mkdirSync(tmp, { mode: 0o700 });
      pages.forEach((p, i) => {
        copyFileSync(p.file, join(tmp, `${i + 1}.png`));
        chmodSync(join(tmp, `${i + 1}.png`), 0o600);
      });
      writeFileSync(join(tmp, ".complete"), String(pages.length), { mode: 0o600 });
      rmSync(this.dir(sha), { recursive: true, force: true });
      renameSync(tmp, this.dir(sha));
      return { state: "ready", pages: pages.length, pdf: sha };
    } finally {
      try {
        this.o.runner.remove(job.id);
      } catch (e) {
        if (!(e instanceof JobError)) throw e;
      }
    }
  }

  async status(slug: string | null): Promise<PagesState> {
    const pdf = this.pdfOf(slug);
    const have = this.cached(pdf.sha256);
    if (have !== null) return { state: "ready", pages: have, pdf: pdf.sha256 };
    const id = this.running.get(pdf.sha256);
    if (id) {
      const job = this.o.runner.get(id);
      if (job?.state === "running") return { state: "rendering", pdf: pdf.sha256 };
      if (job) return this.collect(pdf.sha256, job);
      this.running.delete(pdf.sha256);
    }
    const before = this.failed.get(pdf.sha256);
    if (before) return { state: "failed", reason: before };
    if (!this.which("pdftoppm")) return { state: "preview", reason: "pdftoppm is missing, so the paper shows as a preview", install: toolInstall("pdftoppm", this.o.os) };
    if (this.o.runner.busy()) return { state: "rendering", pdf: pdf.sha256 };
    const bytes = (await this.o.research.read(pdf.slug, pdf.path)).bytes;
    const frozen = this.o.runner.freeze({ [FROZEN_PDF]: bytes });
    const grant = this.o.consent.internal(PAGES_KIND, frozenDigest(frozen.dir));
    const job = this.o.runner.startFrozen(PAGES_KIND, frozen.dir, grant, { slug: pdf.slug, pdf: pdf.sha256 });
    this.running.set(pdf.sha256, job.id);
    if (job.state !== "running") return this.collect(pdf.sha256, job);
    return { state: "rendering", pdf: pdf.sha256 };
  }

  async page(slug: string | null, n: string | null): Promise<{ state: PagesState; bytes: Buffer | null }> {
    if (n === null || !/^[1-9]\d{0,2}$/.test(n) || Number(n) > PAGES_MAX) throw new ResearchError("the page number is refused", 400);
    const state = await this.status(slug);
    if (state.state !== "ready") return { state, bytes: null };
    if (Number(n) > state.pages) throw new ResearchError("the paper has no such page", 404);
    return { state, bytes: readFileSync(guardPath(this.o.cache, `${state.pdf}/${n}.png`)) };
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function researchPageRoutes(pages: ResearchPages, onError: (e: Error) => void = () => {}): Record<string, Route> {
  return {
    "GET /local/research/page": async (_req, url) => {
      try {
        const { state, bytes } = await pages.page(url.searchParams.get("slug"), url.searchParams.get("n"));
        if (state.state !== "ready" || bytes === null) return json(state, state.state === "rendering" ? 202 : 409);
        return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]), { headers: { "content-type": "image/png", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-bkt-pages": String(state.pages), "x-bkt-pdf": state.pdf } });
      } catch (e) {
        if (e instanceof ResearchError || e instanceof JobError) return json({ error: e.message }, e.status);
        onError(e as Error);
        return json({ error: "the pages could not be read" }, 500);
      }
    },
  };
}
