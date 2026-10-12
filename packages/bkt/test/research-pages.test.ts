import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jobRoutes } from "../src/job-routes";
import { JobError, JobRunner, type JobSpec } from "../src/jobs";
import { encodeBlob, RESEARCH_SCHEMA, sha256, type ResearchBlobs, type ResearchIndex } from "../src/pack/research";
import { Research } from "../src/research";
import { ConsentStore, frozenDigest, Grant } from "../src/research-consent";
import { folderBytes, pagesArgv, PAGES_KIND, PAGES_OVER, PAGES_TIMEOUT_MS, PAGES_WATCH_MS, researchSpecs, toolInstall } from "../src/research-jobs";
import { PAGES_KEEP, researchPageRoutes, ResearchPages, type PagesState } from "../src/research-pdf";
import { startServe, type Serve } from "../src/serve";

const scratch: string[] = [];
const runners: JobRunner[] = [];
function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bkt-pages-${name}-`));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  for (const r of runners.splice(0)) r.stopAll();
});
afterAll(async () => {
  await Bun.sleep(50);
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function pdf(pages: number): Buffer {
  const kids = Array.from({ length: pages }, (_, i) => `${3 + i} 0 R`).join(" ");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`, ...Array.from({ length: pages }, () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 260] >>")];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

function pack(bytes: Buffer): { index: ResearchIndex; blobs: ResearchBlobs } {
  const hash = sha256(bytes);
  const path = "public/papers/demo/paper.pdf";
  const manifest = { schema: "bucket.report/1", slug: "demo", title: "Demo", authors: ["A"], date: "2026-10-11", status: "public" as const, kind: "paper", source_path: path, source_hash: hash, pdf_path: path, pdf_hash: hash };
  return {
    index: { schema: RESEARCH_SCHEMA, version: hash.slice(0, 16), staff: false, outputs: [{ slug: "demo", origin: "shipped", manifest, files: [{ path, sha256: hash, size: bytes.length, audience: "public", role: "public-pdf" }], withheld: 0 }, { slug: "bare", origin: "shipped", manifest: { ...manifest, slug: "bare", source_path: "reports/bare.md", pdf_path: null, pdf_hash: null }, files: [], withheld: 0 }] },
    blobs: { version: hash.slice(0, 16), blobs: { [hash]: encodeBlob(bytes) } },
  };
}

const sleeper = (ms: number, timeoutMs?: number): JobSpec => ({ label: "Sleep", inputs: {}, timeoutMs, plan: () => ({ argv: ["sleep", String(ms / 1000)] }) });
const analysis: JobSpec = { label: "Analyze a data file", inputs: { data: { label: "Data file", maxBytes: 1024, exts: [".csv"] } }, plan: () => ({ argv: ["sleep", "5"] }) };

function runner(specs: Record<string, JobSpec>, frozenOnly: boolean, keep?: number): JobRunner {
  const r = new JobRunner({ root: join(temp("jobs"), "jobs"), specs, frozenOnly, keep, killGraceMs: 50 });
  runners.push(r);
  return r;
}

function setup(o: { which?: (bin: string) => string | null; specs?: Record<string, JobSpec>; pages?: number } = {}) {
  const p = pack(pdf(o.pages ?? 3));
  const research = new Research({ index: p.index, blobs: async () => p.blobs }, temp("cache"));
  const pagesRunner = runner(o.specs ?? researchSpecs({ os: "linux", which: o.which }), true, PAGES_KEEP);
  const cache = join(temp("page-cache"), "pages");
  const pages = new ResearchPages({ research, runner: pagesRunner, consent: new ConsentStore(), cache, os: "linux", which: o.which });
  return { research, pagesRunner, pages, cache };
}

async function settled(pages: ResearchPages, slug = "demo"): Promise<PagesState> {
  for (let i = 0; i < 200; i++) {
    const s = await pages.status(slug);
    if (s.state !== "rendering") return s;
    await Bun.sleep(50);
  }
  throw new Error("the pages never settled");
}

const refusal = (run: () => unknown): [number, string] => {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(JobError);
    return [(e as JobError).status, (e as JobError).message];
  }
  return [0, ""];
};

describe("frozen-only runner", () => {
  test("start on a frozenOnly runner answers 404", () => {
    const r = runner(researchSpecs({ os: "linux" }), true);
    expect(refusal(() => r.start(PAGES_KIND, {}))).toEqual([404, `unknown job ${PAGES_KIND}`]);
    expect(refusal(() => r.start("analyze", {}))[0]).toBe(404);
    expect(r.kinds()).toEqual([]);
    expect(r.list()).toEqual([]);
    const open = runner({ analyze: analysis }, false);
    expect(refusal(() => open.freeze({ "paper.pdf": pdf(1) }))).toEqual([404, "this runner takes no frozen folder"]);
    expect(refusal(() => open.startFrozen("analyze", open.rootDir, new ConsentStore().internal(PAGES_KIND, "a".repeat(64)), {}))[0]).toBe(404);
  });

  test("startFrozen refuses a plain object as grant", () => {
    const r = runner({ [PAGES_KIND]: sleeper(100) }, true);
    const consent = new ConsentStore();
    const frozen = r.freeze({ "paper.pdf": pdf(1) });
    const digest = frozenDigest(frozen.dir);
    expect(statSync(join(frozen.dir, "paper.pdf")).mode & 0o777).toBe(0o400);
    expect(refusal(() => r.startFrozen(PAGES_KIND, frozen.dir, { kind: PAGES_KIND, digest, spent: false }, {}))).toEqual([403, "a frozen job needs a grant from the consent store"]);
    expect(refusal(() => r.startFrozen(PAGES_KIND, frozen.dir, null, {}))[0]).toBe(403);
    expect(() => new Grant(Symbol("bkt.research.grant"), PAGES_KIND, digest)).toThrow("a grant comes from the consent store alone");
    expect(refusal(() => r.startFrozen(PAGES_KIND, frozen.dir, consent.internal(PAGES_KIND, "b".repeat(64)), {}))).toEqual([403, "the frozen folder does not match the grant"]);
    expect(refusal(() => r.startFrozen("other-kind", frozen.dir, consent.internal(PAGES_KIND, digest), {}))[0]).toBe(404);
    const two = runner({ [PAGES_KIND]: sleeper(100), other: sleeper(100) }, true);
    const held = two.freeze({ "paper.pdf": pdf(1) });
    expect(refusal(() => two.startFrozen("other", held.dir, consent.internal(PAGES_KIND, frozenDigest(held.dir)), {}))).toEqual([403, "the grant is for another kind of job"]);
    const outside = temp("outside");
    writeFileSync(join(outside, ".bkt-job"), "x\n");
    expect(refusal(() => r.startFrozen(PAGES_KIND, outside, consent.internal(PAGES_KIND, digest), {}))).toEqual([403, "the frozen folder sits outside this runner"]);
    expect(refusal(() => r.startFrozen(PAGES_KIND, join(frozen.dir, ".."), consent.internal(PAGES_KIND, digest), {}))[0]).toBe(403);
    mkdirSync(join(r.rootDir, "20261011T000000-abcdef12"));
    expect(refusal(() => r.startFrozen(PAGES_KIND, join(r.rootDir, "20261011T000000-abcdef12"), consent.internal(PAGES_KIND, digest), {}))).toEqual([403, "the folder has no matching job marker"]);
    const grant = consent.internal(PAGES_KIND, digest);
    const job = r.startFrozen(PAGES_KIND, frozen.dir, grant, { slug: "demo" });
    expect([job.state, job.kind, grant.spent, job.id]).toEqual(["running", PAGES_KIND, true, frozen.id]);
    expect(refusal(() => r.startFrozen(PAGES_KIND, frozen.dir, grant, {}))).toEqual([403, "the grant is spent"]);
    expect(refusal(() => r.startFrozen(PAGES_KIND, frozen.dir, consent.internal(PAGES_KIND, digest), {}))).toEqual([409, "the frozen folder already ran"]);
  });

  test("an edit or a symlink after the freeze breaks the digest", () => {
    const r = runner({ [PAGES_KIND]: sleeper(100) }, true);
    const consent = new ConsentStore();
    const a = r.freeze({ "paper.pdf": pdf(1) });
    const grant = consent.internal(PAGES_KIND, frozenDigest(a.dir));
    writeFileSync(join(a.dir, "extra.tex"), "\\input{/etc/passwd}");
    expect(refusal(() => r.startFrozen(PAGES_KIND, a.dir, grant, {}))).toEqual([403, "the frozen folder does not match the grant"]);
    expect(grant.spent).toBe(false);
    const b = r.freeze({ "paper.pdf": pdf(1) });
    const clean = consent.internal(PAGES_KIND, frozenDigest(b.dir));
    symlinkSync("/etc/passwd", join(b.dir, "link"));
    expect(refusal(() => r.startFrozen(PAGES_KIND, b.dir, clean, {}))).toEqual([403, "the frozen folder holds a symlink at link"]);
    expect(refusal(() => r.freeze({ "../up.pdf": pdf(1) }))[0]).toBe(400);
    expect(refusal(() => r.freeze({ ".bkt-job": pdf(1) }))[0]).toBe(400);
    expect(frozenDigest(a.dir)).not.toBe(frozenDigest(r.freeze({ "paper.pdf": pdf(1) }).dir));
  });

  test("internal grant refuses a build kind", () => {
    const consent = new ConsentStore();
    for (const kind of ["research-pdf", "research-figure", "research-tables", "analyze", ""]) expect(() => consent.internal(kind, "a".repeat(64))).toThrow("takes no internal grant");
    expect(() => consent.internal(PAGES_KIND, "short")).toThrow("needs the digest");
    const grant = consent.internal(PAGES_KIND, "a".repeat(64));
    expect([grant instanceof Grant, grant.kind, grant.spent]).toEqual([true, PAGES_KIND, false]);
  });

  test("params reach plan and a spec's own time limit ends the job", async () => {
    const seen: (Record<string, string> | undefined)[] = [];
    const r = runner({ [PAGES_KIND]: { label: "Stub", inputs: {}, timeoutMs: 150, plan: (_d, _o, params) => (seen.push(params), { argv: ["sleep", "5"] }) } }, true);
    const frozen = r.freeze({ "paper.pdf": pdf(1) });
    const job = r.startFrozen(PAGES_KIND, frozen.dir, new ConsentStore().internal(PAGES_KIND, frozenDigest(frozen.dir)), { slug: "demo", pdf: "p" });
    expect(seen).toEqual([{ slug: "demo", pdf: "p" }]);
    for (let i = 0; i < 100 && r.get(job.id)!.state === "running"; i++) await Bun.sleep(50);
    expect([r.get(job.id)!.state, r.get(job.id)!.error]).toEqual(["timeout", "the job ran past its time limit"]);
    const plain = runner({ analyze: { ...analysis, plan: (_d, _o, params) => (seen.push(params), { error: "stop" }) } }, false);
    plain.start("analyze", { data: "a,b\n1,2\n" });
    expect(seen.at(-1)).toEqual({});
  });
});

describe("paper pages", () => {
  let s: Serve | null = null;
  afterEach(() => {
    s?.stop();
    s = null;
  });

  test("research-pages times out at 60 s", async () => {
    const spec = researchSpecs({ os: "linux", which: () => "/usr/bin/pdftoppm" })[PAGES_KIND];
    expect(spec.timeoutMs).toBe(60_000);
    expect(PAGES_TIMEOUT_MS).toBe(60_000);
    expect(pagesArgv("/usr/bin/pdftoppm", { dir: "/j", inputs: {}, out: "/j/out" })).toEqual(["/usr/bin/pdftoppm", "-png", "-r", "150", "-f", "1", "-l", "200", "/j/paper.pdf", "/j/out/page"]);
    const { pages, pagesRunner, cache } = setup({ which: () => "/usr/bin/pdftoppm", specs: { [PAGES_KIND]: sleeper(5000, 150) } });
    expect((await pages.status("demo")).state).toBe("rendering");
    expect(await settled(pages)).toEqual({ state: "failed", reason: "the paper took over 60 seconds to render" });
    expect(await pages.status("demo")).toEqual({ state: "failed", reason: "the paper took over 60 seconds to render" });
    expect(pagesRunner.list()).toEqual([]);
    expect(readdirSync(pagesRunner.rootDir)).toEqual([]);
    expect(existsSync(cache) ? readdirSync(cache) : []).toEqual([]);
  });

  test("a render that passes the output cap is stopped while it runs", async () => {
    const real = researchSpecs({ os: "linux", which: () => "/usr/bin/pdftoppm", outBytes: 100_000, watchMs: 40 })[PAGES_KIND];
    const filler: JobSpec = { ...real, plan: (dirs) => ({ argv: ["sh", "-c", `head -c 400000 /dev/zero > "${dirs.out}/page-001.png"; sleep 20`] }) };
    const { pages, pagesRunner, cache } = setup({ which: () => "/usr/bin/pdftoppm", specs: { [PAGES_KIND]: filler } });
    const at = performance.now();
    expect((await pages.status("demo")).state).toBe("rendering");
    expect(await settled(pages)).toEqual({ state: "failed", reason: PAGES_OVER });
    expect(performance.now() - at).toBeLessThan(5000);
    expect(pagesRunner.list()).toEqual([]);
    expect(readdirSync(pagesRunner.rootDir)).toEqual([]);
    expect(existsSync(cache) ? readdirSync(cache) : []).toEqual([]);
    expect([real.watch!.everyMs, PAGES_WATCH_MS, PAGES_OVER]).toEqual([40, 500, "the pages are over the 256 MB limit"]);
    const dir = temp("bytes");
    writeFileSync(join(dir, "a.png"), Buffer.alloc(70));
    writeFileSync(join(dir, "b.png"), Buffer.alloc(30));
    mkdirSync(join(dir, "sub"));
    expect(folderBytes(dir)).toBe(100);
    const under = researchSpecs({ os: "linux", which: () => "/usr/bin/pdftoppm" })[PAGES_KIND];
    expect(under.watch!.check({ dir, inputs: {}, out: dir })).toBeNull();
    expect(researchSpecs({ os: "linux", outBytes: 99 })[PAGES_KIND].watch!.check({ dir, inputs: {}, out: dir })).toBe(PAGES_OVER);
  });

  test("a missing tool yields the Preview tier with an install line", async () => {
    const { pages, pagesRunner } = setup({ which: () => null });
    const state = await pages.status("demo");
    expect(state).toEqual({ state: "preview", reason: "pdftoppm is missing, so the paper shows as a preview", install: "sudo dnf install poppler-utils, or sudo apt install poppler-utils" });
    expect(pagesRunner.list()).toEqual([]);
    expect(readdirSync(pagesRunner.rootDir)).toEqual([]);
    expect(toolInstall("pdftoppm", "darwin")).toBe("brew install poppler");
    const spec = researchSpecs({ os: "win32", which: () => null })[PAGES_KIND];
    expect(spec.plan({ dir: "/j", inputs: {}, out: "/j/out" }, {}, {})).toEqual({ error: "pdftoppm is missing, so the paper shows as a preview", install: "winget install oschwartz10612.Poppler" });
    await expect(pages.status("bare")).rejects.toThrow("the output holds no paper");
    await expect(pages.status("../x")).rejects.toThrow("the output name is refused");
  });

  test("POST /local/jobs with kind research-pages answers 404", async () => {
    const analysisRunner = runner({ analyze: analysis }, false);
    const { pages } = setup({ which: () => null });
    const ME = 4242;
    s = startServe({ uid: ME, resolvePeerUid: () => ME, cliToken: "c".repeat(43), routes: { ...jobRoutes(analysisRunner), ...researchPageRoutes(pages) } });
    const base = `http://127.0.0.1:${s.port}`;
    const headers = { host: `127.0.0.1:${s.port}`, authorization: `Bucket ${"c".repeat(43)}`, "content-type": "application/json" };
    const post = (body: unknown) => fetch(`${base}/local/jobs`, { method: "POST", headers: { ...headers, "content-length": String(JSON.stringify(body).length) }, body: JSON.stringify(body) });
    const r = await post({ kind: PAGES_KIND, files: {} });
    expect([r.status, await r.json()]).toEqual([404, { error: `unknown job ${PAGES_KIND}` }]);
    expect((await post({ kind: PAGES_KIND, files: { data: "a,b\n" }, options: { slug: 1 } })).status).toBe(404);
    const listed = (await (await fetch(`${base}/local/jobs`, { headers })).json()) as { kinds: { kind: string }[] };
    expect(listed.kinds.map((k) => k.kind)).toEqual(["analyze"]);
    expect(Object.keys(researchPageRoutes(pages))).toEqual(["GET /local/research/page"]);
    const page = await fetch(`${base}/local/research/page?slug=demo&n=1`, { headers });
    expect([page.status, ((await page.json()) as PagesState).state]).toEqual([409, "preview"]);
    expect((await fetch(`${base}/local/research/page?slug=demo&n=1`, { headers: { host: headers.host } })).status).toBe(401);
    for (const n of ["0", "201", "1.5", "abc", "-1", ""]) expect((await fetch(`${base}/local/research/page?slug=demo&n=${n}`, { headers })).status).toBe(400);
    expect((await fetch(`${base}/local/research/page?slug=nope&n=1`, { headers })).status).toBe(404);
    expect((await fetch(`${base}/local/research/page?slug=bare&n=1`, { headers })).status).toBe(404);
  });

  test("a page job during a running analysis starts", async () => {
    const analysisRunner = runner({ analyze: analysis }, false);
    const job = analysisRunner.start("analyze", { data: "a,b\n1,2\n" });
    expect(job.state).toBe("running");
    const { pages, pagesRunner } = setup({ which: () => "/usr/bin/pdftoppm", specs: { [PAGES_KIND]: sleeper(200) } });
    expect((await pages.status("demo")).state).toBe("rendering");
    expect(pagesRunner.busy()).toBe(true);
    expect(analysisRunner.get(job.id)!.state).toBe("running");
    expect(refusal(() => analysisRunner.start("analyze", { data: "a\n1\n" }))[0]).toBe(409);
  });

  test("page jobs leave the analysis history untouched", async () => {
    const analysisRunner = runner({ analyze: { ...analysis, plan: () => ({ argv: ["true"] }) } }, false);
    for (let i = 0; i < 3; i++) {
      const j = analysisRunner.start("analyze", { data: `a\n${i}\n` });
      for (let k = 0; k < 100 && analysisRunner.get(j.id)!.state === "running"; k++) await Bun.sleep(20);
    }
    const before = analysisRunner.list().map((j) => j.id);
    expect(before.length).toBe(3);
    const { pages, pagesRunner } = setup({ which: () => "/usr/bin/pdftoppm", specs: { [PAGES_KIND]: { label: "Stub", inputs: {}, plan: () => ({ argv: ["true"] }), after: () => ({ pages: 0 }) } } });
    for (let i = 0; i < 6; i++) {
      await pages.status("demo");
      await settled(pages).catch(() => null);
    }
    expect(analysisRunner.list().map((j) => j.id)).toEqual(before);
    expect(pagesRunner.list().length).toBeLessThanOrEqual(PAGES_KEEP);
    expect(PAGES_KEEP).toBe(4);
  });

  test.skipIf(!Bun.which("pdftoppm"))("pages render once, cache by the paper's hash, and serve as PNG", async () => {
    const { pages, pagesRunner, cache } = setup({ pages: 3 });
    const ME = 4242;
    s = startServe({ uid: ME, resolvePeerUid: () => ME, cliToken: "c".repeat(43), routes: researchPageRoutes(pages) });
    const headers = { host: `127.0.0.1:${s.port}`, authorization: `Bucket ${"c".repeat(43)}` };
    const get = (n: number) => fetch(`http://127.0.0.1:${s!.port}/local/research/page?slug=demo&n=${n}`, { headers });
    const first = await get(1);
    expect([first.status, ((await first.json()) as PagesState).state]).toEqual([202, "rendering"]);
    const done = await settled(pages);
    expect(done).toMatchObject({ state: "ready", pages: 3 });
    const page = await get(2);
    expect([page.status, page.headers.get("content-type"), page.headers.get("x-bkt-pages"), page.headers.get("x-content-type-options")]).toEqual([200, "image/png", "3", "nosniff"]);
    expect(Buffer.from(await page.arrayBuffer()).subarray(1, 4).toString("latin1")).toBe("PNG");
    expect((await get(4)).status).toBe(404);
    const pdfHash = (done as { pdf: string }).pdf;
    expect(readdirSync(join(cache, pdfHash)).sort()).toEqual([".complete", "1.png", "2.png", "3.png"]);
    expect(statSync(join(cache, pdfHash, "1.png")).mode & 0o777).toBe(0o600);
    expect(pagesRunner.list()).toEqual([]);
    expect(readdirSync(pagesRunner.rootDir)).toEqual([]);
    const jobsBefore = readdirSync(pagesRunner.rootDir).length;
    expect((await pages.status("demo")).state).toBe("ready");
    expect(readdirSync(pagesRunner.rootDir).length).toBe(jobsBefore);
  });
});
