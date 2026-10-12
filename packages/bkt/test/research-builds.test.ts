import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { answerKey, approvalLines, researchBuilds } from "../src/cli/research";
import { jobRoutes } from "../src/job-routes";
import { JobError, JobRunner, type JobSpec, type JobView } from "../src/jobs";
import { encodeBlob, RESEARCH_SCHEMA, sha256, SIDE_SCHEMA, type PackedFile, type ReportBuild, type ReportRecord, type ResearchBlobs, type ResearchIndex, type ResearchSidePack } from "../src/pack/research";
import { installSidePack, Research, ResearchError, researchRoutes } from "../src/research";
import { answer, BuildSwitch, CONSENT_BODY_CHARS, CONSENT_PREFIX, CONSENT_TITLE_CHARS, CONSENT_TTL_MS, ConsentError, consentLine, ConsentStore, DENY_COOLDOWN_MS, emitConsent, frozenDigest, Grant, guardConsentText, guardStdout, shellDecides, shellRequest, TERMINAL_ALONE, terminalNote, visibleText } from "../src/research-consent";
import { approvalHidden, approvalText, bcfProblem, BUILD_OVER, FIGURE_KIND, kindOf, LATEX_FLAGS, LATEX_TIMEOUT_MS, PDF_KIND, PYTHON_TIMEOUT_MS, researchBuildRoutes, ResearchBuilds, researchSpecs, TABLES_KIND, treeBytes } from "../src/research-jobs";
import { ResearchPages } from "../src/research-pdf";
import { LocalOutputs, ResearchWork, researchWorkRoutes } from "../src/research-work";
import { startServe, type Serve } from "../src/serve";

const scratch: string[] = [];
const runners: JobRunner[] = [];
function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bkt-builds-${name}-`));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  for (const r of runners.splice(0)) r.stopAll();
});
afterAll(async () => {
  await Bun.sleep(80);
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const TEX = "\\documentclass{article}\n\\begin{document}\nFirst paragraph.\n\nSecond paragraph.\n\\end{document}\n";
const BIB = "@book{a, title={A}}\n";
const FIG = "import os\nopen('fig.txt', 'w').write(os.environ.get('HF_HUB_OFFLINE', 'unset'))\n";
const CSV = "id,value\n1,2\n";
const MAIN = "papers/demo/main.tex";
const SCRIPT = "papers/demo/fig.py";
const BUILDS: ReportBuild[] = [
  { id: "pdf", label: "Paper PDF", runner: "latex", entry: MAIN, inputs: ["papers/demo/refs.bib"], outputs: ["papers/demo/main.pdf"], needs: ["pdflatex", "biber"], audience: "public" },
  { id: "figures", label: "Figures", runner: "python", entry: SCRIPT, inputs: ["papers/demo/data.csv"], outputs: ["papers/demo/fig.txt"], needs: ["python3"], audience: "staff" },
];
const FILES: Record<string, string> = { [MAIN]: TEX, "papers/demo/refs.bib": BIB, [SCRIPT]: FIG, "papers/demo/data.csv": CSV, "papers/demo/main.pdf": "%PDF-1.4 shipped" };

function manifest(builds: ReportBuild[], files: Record<string, string>): ReportRecord {
  return { schema: "bucket.report/2", slug: "demo", title: "A demo paper", authors: ["Demo Author"], date: "2026-10-12", status: "public", kind: "paper", source_path: MAIN, source_hash: sha256(Buffer.from(files[MAIN])), pdf_path: "papers/demo/main.pdf", pdf_hash: sha256(Buffer.from(files["papers/demo/main.pdf"])), builds };
}

function pack(files: Record<string, string> = FILES, builds: ReportBuild[] = BUILDS): { index: ResearchIndex; blobs: ResearchBlobs } {
  const blobs: ResearchBlobs["blobs"] = {};
  const listed: PackedFile[] = Object.entries(files).map(([path, body]) => {
    const bytes = Buffer.from(body);
    blobs[sha256(bytes)] = encodeBlob(bytes);
    return { path, sha256: sha256(bytes), size: bytes.length, audience: "public", role: path.endsWith(".pdf") ? "pdf" : "file" };
  });
  const version = sha256(JSON.stringify([listed, builds])).slice(0, 16);
  return { index: { schema: RESEARCH_SCHEMA, version, staff: true, outputs: [{ slug: "demo", origin: "shipped", manifest: manifest(builds, files), files: listed.sort((a, b) => (a.path < b.path ? -1 : 1)), withheld: 0 }] }, blobs: { version, blobs } };
}

function tools(o: { missing?: string[]; pdflatex?: string } = {}): { which: (bin: string) => string | null; log: string } {
  const dir = temp("tools");
  const log = join(dir, "calls.log");
  const stub = (name: string, body: string) => {
    writeFileSync(join(dir, name), `#!/bin/sh\necho "${name} $* | openin=$openin_any openout=$openout_any texmf=$TEXMFOUTPUT | cwd=$(pwd)" >> "${log}"\n${body}\n`);
    chmodSync(join(dir, name), 0o755);
  };
  stub("pdflatex", o.pdflatex ?? 'for last; do :; done\nstem="${last%.tex}"\nsha256sum "$last" | cut -c1-64 >> "' + log + '.sha"\nprintf "%%PDF-1.4 built from %s" "$(cat "$last" | wc -c)" > "$stem.pdf"');
  stub("biber", "exit 0");
  return { which: (bin) => ((o.missing ?? []).includes(bin) ? null : bin === "pdflatex" || bin === "biber" ? join(dir, bin) : bin === "python3" ? Bun.which("python3") : null), log };
}

function setup(o: { files?: Record<string, string>; builds?: ReportBuild[]; home?: string; tools?: ReturnType<typeof tools>; index?: ResearchIndex; buildBytes?: number } = {}) {
  const p = pack(o.files, o.builds);
  const home = o.home ?? temp("home");
  let clock = Date.UTC(2026, 9, 12, 10, 0, 0);
  const t = o.tools ?? tools();
  const research = new Research({ index: o.index ?? p.index, blobs: async () => p.blobs }, temp("cache"), home);
  const local = new LocalOutputs(home, { taken: (slug) => slug === "demo" });
  research.setLocal(local);
  const work = new ResearchWork(research, home);
  const runner = new JobRunner({ root: join(home, "research", "jobs", "build"), specs: researchSpecs({ os: "linux", which: t.which, dataDir: home, watchMs: 40, buildBytes: o.buildBytes }), frozenOnly: true, killGraceMs: 50 });
  runners.push(runner);
  const gate = new BuildSwitch(home);
  const consent = new ConsentStore({ now: () => clock, switch: gate, onDrop: (pending) => runner.discard(pending.frozenDir) });
  const builds = new ResearchBuilds({ research, runner, consent, gate, os: "linux", which: t.which, ownBuilds: (slug) => local.buildsOn(slug) });
  return { home, research, work, runner, gate, consent, builds, local, log: t.log, tick: (ms: number) => (clock += ms), pack: p };
}

async function finished(s: ReturnType<typeof setup>, id: string): Promise<JobView> {
  for (let i = 0; i < 200; i++) {
    const job = s.builds.job(id);
    if (job.state !== "running") return job;
    await Bun.sleep(40);
  }
  throw new Error("the build never ended");
}

async function refused(run: () => unknown): Promise<[number, string]> {
  try {
    await run();
  } catch (e) {
    if (e instanceof ResearchError || e instanceof ConsentError || e instanceof JobError) return [e.status, e.message];
    throw e;
  }
  return [0, ""];
}

const frozenDirs = (s: ReturnType<typeof setup>) => (existsSync(s.runner.rootDir) ? readdirSync(s.runner.rootDir) : []);
const rev = (text: string) => sha256(Buffer.from(text));
const EDITED = TEX.replace("Second paragraph.", "Second paragraph, rewritten here.");

describe("research build specs", () => {
  test("argument list holds -no-shell-escape and --noconf, the environment holds the paranoid TeX settings, and limits are set", () => {
    const t = tools();
    const specs = researchSpecs({ os: "linux", which: t.which, dataDir: temp("home") });
    expect(Object.keys(specs).sort()).toEqual([FIGURE_KIND, "research-pages", PDF_KIND, TABLES_KIND].sort());
    const plan = specs[PDF_KIND].plan({ dir: "/job", inputs: {}, out: "/job/out" }, {}, { entry: MAIN }) as { steps: { argv: string[]; env?: Record<string, string>; cwd?: string }[] };
    expect(plan.steps.map((s) => s.argv.slice(1))).toEqual([[...LATEX_FLAGS, "main.tex"], ["--noconf", "main"], [...LATEX_FLAGS, "main.tex"], [...LATEX_FLAGS, "main.tex"]]);
    expect(LATEX_FLAGS).toEqual(["-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape"]);
    expect(plan.steps[0].env).toMatchObject({ openin_any: "p", openout_any: "p", TEXMFOUTPUT: "/job/src/papers/demo" });
    expect(plan.steps.every((s) => s.cwd === "/job/src/papers/demo")).toBe(true);
    expect(plan.steps.every((s) => s.argv.every((a) => typeof a === "string" && !a.includes(";") && !a.includes("&&")))).toBe(true);
    expect([specs[PDF_KIND].timeoutMs, specs[FIGURE_KIND].timeoutMs, specs[TABLES_KIND].timeoutMs]).toEqual([LATEX_TIMEOUT_MS, PYTHON_TIMEOUT_MS, PYTHON_TIMEOUT_MS]);
    expect([LATEX_TIMEOUT_MS, PYTHON_TIMEOUT_MS]).toEqual([300_000, 600_000]);
    const py = specs[FIGURE_KIND].plan({ dir: "/job", inputs: {}, out: "/job/out" }, {}, { entry: SCRIPT, outputs: "[]" }) as { steps: { argv: string[]; env?: Record<string, string> }[] };
    expect(py.steps[0].argv.slice(-2)).toEqual(["-B", "/job/src/papers/demo/fig.py"]);
    expect(py.steps[0].env).toMatchObject({ HF_HUB_OFFLINE: "1", BKT_REPORT_DIR: "/job", BKT_PAGE_DATA: "/job" });
    expect(Number(py.steps[0].env!.OMP_NUM_THREADS)).toBeGreaterThan(0);
    expect([kindOf(BUILDS[0]), kindOf(BUILDS[1]), kindOf({ ...BUILDS[1], id: "tables" })]).toEqual([PDF_KIND, FIGURE_KIND, TABLES_KIND]);
    expect(Object.keys(researchSpecs({ os: "linux" }))).toEqual(["research-pages"]);
    const none = researchSpecs({ os: "linux", which: () => null, dataDir: temp("home") });
    expect(none[PDF_KIND].plan({ dir: "/job", inputs: {}, out: "/job/out" }, {}, { entry: MAIN })).toEqual({ error: "pdflatex is missing, so the paper cannot be compiled", install: "sudo dnf install texlive-scheme-medium, or sudo apt install texlive-latex-extra" });
  });

  test("a .bcf path outside the job folder is refused", () => {
    const job = temp("job");
    mkdirSync(join(job, "src/papers/demo"), { recursive: true });
    mkdirSync(join(job, "src/papers/bib"), { recursive: true });
    writeFileSync(join(job, "src/papers/bib/common.bib"), BIB);
    writeFileSync(join(job, "src/papers/demo/refs.bib"), BIB);
    const bcf = join(job, "src/papers/demo/main.bcf");
    const xml = (...sources: string[]) => `<bcf:controlfile><bcf:bibdata>${sources.map((s) => `<bcf:datasource type="file" datatype="bibtex" glob="false">${s}</bcf:datasource>`).join("")}</bcf:bibdata></bcf:controlfile>`;
    writeFileSync(bcf, xml("refs.bib", "../bib/common.bib"));
    expect(bcfProblem(bcf, job)).toBeNull();
    writeFileSync(bcf, xml("refs.bib", "../../../../etc/passwd"));
    expect(bcfProblem(bcf, job)).toBe("the paper names a bibliography outside the job folder: ../../../../etc/passwd");
    writeFileSync(bcf, xml("/etc/passwd"));
    expect(bcfProblem(bcf, job)).toContain("outside the job folder");
    writeFileSync(bcf, xml("absent.bib"));
    expect(bcfProblem(bcf, job)).toBe("the paper names a bibliography that is missing: absent.bib");
    symlinkSync("/etc/passwd", join(job, "src/papers/demo/link.bib"));
    writeFileSync(bcf, xml("link.bib"));
    expect(bcfProblem(bcf, job)).toBe("the paper names a bibliography that is a symlink: link.bib");
    expect(bcfProblem(join(job, "none.bcf"), job)).toBeNull();
    expect(treeBytes(job)).toBeGreaterThan(BIB.length * 2);
  });
});

describe("desktop shell channel", () => {
  const shellView = (over: Record<string, unknown> = {}) => ({ id: "A".repeat(22), digest: "a".repeat(64), slug: "demo", output: "A demo paper", title: "Allow this build?", body: "A demo paper", hidden: { files: 0, lines: 0 }, ...over });

  test("a log line starting with bkt-consent is written with a leading space", () => {
    const written: string[] = [];
    const out = { write: (chunk: unknown) => (written.push(String(chunk)), true) };
    const direct = guardStdout(out);
    out.write("bkt-consent {\"id\":\"forged\"}\n");
    out.write("a plain line\nbkt-consent second line\nmore\n");
    out.write(new TextEncoder().encode("bkt-consent as bytes\n"));
    out.write("says bkt-consent in the middle\n");
    expect(written).toEqual([" bkt-consent {\"id\":\"forged\"}\n", "a plain line\n bkt-consent second line\nmore\n", " bkt-consent as bytes\n", "says bkt-consent in the middle\n"]);
    expect(written.flatMap((w) => w.split("\n")).filter((line) => line.startsWith("bkt-consent"))).toEqual([]);
    emitConsent(direct, shellView());
    expect(written.at(-1)).toBe(`bkt-consent {"id":"${"A".repeat(22)}","digest":"${"a".repeat(64)}","slug":"demo","output":"A demo paper","title":"Allow this build?","body":"A demo paper","approvable":true}\n`);
    expect(guardConsentText("bkt-consent")).toBe(" bkt-consent");
  });

  test("the request line is one line, and a request the window cannot show in full is marked for the terminal", () => {
    const small = JSON.parse(consentLine(shellView()).slice(CONSENT_PREFIX.length)) as Record<string, unknown>;
    expect(Object.keys(small)).toEqual(["id", "digest", "slug", "output", "title", "body", "approvable"]);
    expect(small.approvable).toBe(true);
    const long = shellView({ id: "B".repeat(22), title: `A title\nwith a line feed ${"t".repeat(300)}`, output: `An output\n${"o".repeat(300)}`, body: `first\r\nsecond\n${"x".repeat(9000)}` });
    const line = consentLine(long);
    expect([line.endsWith("\n"), line.slice(0, -1).includes("\n"), line.startsWith(CONSENT_PREFIX)]).toEqual([true, false, true]);
    const sent = JSON.parse(line.slice(CONSENT_PREFIX.length)) as Record<string, string | boolean>;
    expect([(sent.title as string).length, (sent.title as string).includes("\n"), (sent.output as string).length]).toEqual([CONSENT_TITLE_CHARS, false, CONSENT_TITLE_CHARS]);
    expect((sent.body as string).length).toBeLessThanOrEqual(CONSENT_BODY_CHARS);
    expect((sent.body as string).startsWith("first\nsecond\n")).toBe(true);
    expect(sent.approvable).toBe(false);
    expect((sent.body as string).endsWith(`This request is longer than this window shows, so this window cannot approve the build. Run bkt research approve in a terminal: it shows every change and prints the line that allows request ${"B".repeat(22)}.`)).toBe(true);
    const hidden = shellRequest(shellView({ hidden: { files: 2, lines: 31 } }));
    expect(hidden.approvable).toBe(false);
    expect(hidden.body).toContain("2 files are not shown in full here, with 31 changed lines left out, so this window cannot approve the build.");
    expect(terminalNote({ files: 1, lines: 1 }, "x")).toContain("1 file is not shown in full here, with 1 changed line left out");
    expect([CONSENT_TITLE_CHARS, CONSENT_BODY_CHARS]).toEqual([200, 4000]);
  });

  test("control and direction characters show as their code points in every string sent", () => {
    const rlo = "\u202E";
    expect(visibleText(`evil${rlo}txt.exe`)).toBe("evil<U+202E>txt.exe");
    for (const c of ["\u0000", "\u0007", "\u001B", "\u007F", "\u0085", "\u061C", "\u200B", "\u200E", "\u200F", "\u202A", "\u202D", "\u2066", "\u2069", "\uFEFF"]) expect(visibleText(`a${c}b`)).toMatch(/^a<U\+[0-9A-F]{4}>b$/);
    expect(visibleText("tab\tand line\nfeed, é, 数, …")).toBe("tab\tand line\nfeed, é, 数, …");
    expect(visibleText("a\r\nb\rc")).toBe("a\nb\nc");
    const sent = shellRequest(shellView({ title: `Allow${rlo}?`, output: `Paper${rlo}`, body: `papers/demo/${rlo}gpj.py\u0007` }));
    expect([sent.title, sent.output, sent.body]).toEqual(["Allow<U+202E>?", "Paper<U+202E>", "papers/demo/<U+202E>gpj.py<U+0007>"]);
    const text = approvalText({ title: `T${rlo}`, build: BUILDS[0], cls: "edited", digest: "c".repeat(64), files: [{ path: `p/${rlo}a.tex`, base: null, now: "b".repeat(64), added: 1, removed: 0, lines: [`+line${rlo}`] }] });
    expect(text.includes(rlo)).toBe(false);
    expect(text).toContain("p/<U+202E>a.tex: new file");
  });

  test("a small change can be approved from the shell, and a large one is refused there and approved in the terminal", async () => {
    const make = () => {
      const lines: string[] = [];
      const s = setup();
      const consent = new ConsentStore({ now: () => 1000, switch: s.gate, onDrop: (p) => s.runner.discard(p.frozenDir), onOpen: (view) => emitConsent((text) => lines.push(text), view) });
      const builds = new ResearchBuilds({ research: s.research, runner: s.runner, consent, gate: s.gate, os: "linux", which: tools().which, ownBuilds: (slug) => s.local.buildsOn(slug) });
      const refused: string[] = [];
      const say = (line: string) => answer(line, shellDecides(() => consent.view(), (id, digest, allow) => builds.answer(id, digest, allow)), (e) => refused.push(e.message));
      return { s, lines, consent, builds, refused, say };
    };
    const small = make();
    await small.s.work.write("demo", MAIN, rev(TEX), Buffer.from(EDITED));
    const view = await small.builds.request("demo", "pdf");
    expect(small.lines.length).toBe(1);
    const sent = JSON.parse(small.lines[0].slice(CONSENT_PREFIX.length)) as { id: string; digest: string; slug: string; output: string; body: string; approvable: boolean };
    expect([sent.id, sent.digest, sent.slug, sent.output, sent.approvable]).toEqual([view.id, view.digest, "demo", "A demo paper", true]);
    expect(sent.body).toContain("-Second paragraph.");
    expect(small.consent.view()!.hidden).toEqual({ files: 0, lines: 0 });
    expect(small.say(`consent ${"C".repeat(22)} ${view.digest} allow`)).toBe(false);
    expect(small.say(`consent ${view.id} ${"0".repeat(64)} allow`)).toBe(false);
    expect(small.refused).toEqual(["no build request matches that answer", "no build request matches that answer"]);
    expect(small.s.runner.list()).toEqual([]);
    expect(small.say(`consent ${view.id} ${view.digest} allow`)).toBe(true);
    expect(small.say(`consent ${view.id} ${view.digest} allow`)).toBe(false);

    const large = make();
    const rewritten = `${Array.from({ length: 30 }, (_, i) => `A rewritten paragraph ${i}.`).join("\n\n")}\n`;
    await large.s.work.write("demo", MAIN, rev(TEX), Buffer.from(rewritten));
    const big = await large.builds.request("demo", "pdf");
    const hidden = large.consent.view()!.hidden;
    expect(hidden.files).toBe(1);
    expect(hidden.lines).toBeGreaterThan(20);
    const asked = JSON.parse(large.lines[0].slice(CONSENT_PREFIX.length)) as { body: string; approvable: boolean };
    expect(asked.approvable).toBe(false);
    expect(asked.body).toContain(`1 file is not shown in full here, with ${hidden.lines} changed lines left out, so this window cannot approve the build.`);
    expect(asked.body).toContain(`prints the line that allows request ${big.id}.`);
    expect(large.say(`consent ${big.id} ${big.digest} allow`)).toBe(false);
    expect(large.refused).toEqual([TERMINAL_ALONE]);
    expect([large.s.runner.list(), large.consent.pending()!.id]).toEqual([[], big.id]);
    const terminal = approvalLines({ pending: big, full: large.consent.pending()!.full });
    expect(terminal.filter((l) => l.startsWith("+A rewritten paragraph")).length).toBe(30);
    expect(terminal).toContain(`Allow it: bkt research approve --yes --request ${big.id}`);
    expect((large.builds.answer(big.id, null, true) as JobView).state).toBe("running");

    const denied = make();
    await denied.s.work.write("demo", MAIN, rev(TEX), Buffer.from(rewritten));
    const v3 = await denied.builds.request("demo", "pdf");
    expect(denied.say(`consent ${v3.id} ${v3.digest} deny`)).toBe(true);
    expect([denied.consent.pending(), denied.s.runner.list()]).toEqual([null, []]);
  });

  test("what is hidden counts files past five, lines past six a file and forty in all, long lines, new files and files shown as sizes", () => {
    const file = (n: number, over: Partial<{ base: string | null; added: number; removed: number; lines: string[] }> = {}) => ({ path: `p/${n}.tex`, base: "a".repeat(64), now: "b".repeat(64), added: 2, removed: 0, lines: ["+one", "+two"], ...over });
    expect(approvalHidden([])).toEqual({ files: 0, lines: 0 });
    expect(approvalHidden([file(1), file(2), file(3), file(4), file(5)])).toEqual({ files: 0, lines: 0 });
    expect(approvalHidden([file(1), file(2), file(3), file(4), file(5), file(6)])).toEqual({ files: 1, lines: 2 });
    expect(approvalHidden([file(1, { added: 9, lines: Array.from({ length: 9 }, (_, i) => `+${i}`) })])).toEqual({ files: 1, lines: 3 });
    expect(approvalHidden([file(1, { lines: ["+short", `+${"x".repeat(101)}`] })])).toEqual({ files: 1, lines: 1 });
    expect(approvalHidden([file(1, { base: null, added: 30, lines: ["a", "b", "c", "d", "e", "f"] })])).toEqual({ files: 1, lines: 24 });
    expect(approvalHidden([file(1, { base: null, added: 3, lines: ["a", "b", "c"] })])).toEqual({ files: 0, lines: 0 });
    expect(approvalHidden([file(1, { added: 0, removed: 0, lines: ["2097153 bytes, shown as sizes alone"] })])).toEqual({ files: 1, lines: 0 });
  });
});

describe("build consent", () => {
  test("build does not spawn before a grant", async () => {
    const s = setup();
    const view = await s.builds.request("demo", "pdf");
    expect(view).toMatchObject({ slug: "demo", build: "pdf", class: "shipped", title: "Allow this build?" });
    expect(view.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(view.expiresAt - s.consent.pending()!.created).toBe(CONSENT_TTL_MS);
    expect(s.runner.list()).toEqual([]);
    expect(s.runner.busy()).toBe(false);
    expect(existsSync(s.log)).toBe(false);
    const dir = s.consent.pending()!.frozenDir;
    expect(readFileSync(join(dir, "src", MAIN), "utf8")).toBe(TEX);
    expect(statSync(join(dir, "src", MAIN)).mode & 0o777).toBe(0o400);
    expect(readdirSync(join(dir, "src/papers/demo")).sort()).toEqual(["main.tex", "refs.bib"]);
    expect(JSON.parse(readFileSync(join(dir, "build.json"), "utf8"))).toEqual({ v: 1, kind: PDF_KIND, runner: "latex", slug: "demo", build: "pdf", entry: MAIN, outputs: '["papers/demo/main.pdf"]' });
    expect(view.digest).toBe(frozenDigest(dir));
    expect(await refused(() => s.builds.request("demo", "pdf"))).toEqual([409, "another build is waiting for approval"]);
    expect(existsSync(join(s.home, "research/outputs/demo/built"))).toBe(false);
  });

  test("a build id absent from the manifest answers 404", async () => {
    const s = setup();
    expect(await refused(() => s.builds.request("demo", "nope"))).toEqual([404, "the output has no such build"]);
    expect((await refused(() => s.builds.request("demo", "../pdf")))[0]).toBe(400);
    expect((await refused(() => s.builds.request("demo", null)))[0]).toBe(400);
    expect((await refused(() => s.builds.request("other", "pdf")))[0]).toBe(404);
    expect((await refused(() => s.builds.request("../demo", "pdf")))[0]).toBe(400);
    expect(s.consent.pending()).toBeNull();
    expect(frozenDirs(s)).toEqual([]);
    const unlisted = setup({ builds: [{ ...BUILDS[0], inputs: ["papers/demo/absent.bib"] }] });
    expect(await refused(() => unlisted.builds.request("demo", "pdf"))).toEqual([409, "this build of Bucket lacks papers/demo/absent.bib, which the build reads"]);
    expect(frozenDirs(unlisted)).toEqual([]);
  });

  test("a grant is consumed at spawn and a replay is refused", async () => {
    const s = setup();
    const view = await s.builds.request("demo", "pdf");
    const job = s.builds.answer(view.id, view.digest, true) as JobView;
    expect([job.state, job.kind]).toEqual(["running", PDF_KIND]);
    expect(await refused(() => s.builds.answer(view.id, view.digest, true))).toEqual([403, "no build request matches that answer"]);
    expect(s.consent.pending()).toBeNull();
    const done = await finished(s, job.id);
    expect([done.state, done.error, done.result]).toEqual(["done", null, { outputs: ["papers/demo/main.pdf"] }]);
    expect(await refused(() => s.builds.answer(view.id, view.digest, true))).toEqual([403, "no build request matches that answer"]);
    const built = join(s.home, "research/outputs/demo/built/papers/demo/main.pdf");
    expect(readFileSync(built, "utf8")).toBe(`%PDF-1.4 built from ${TEX.length}`);
    expect(statSync(built).mode & 0o777).toBe(0o600);
    expect(frozenDirs(s)).toEqual([]);
    const calls = readFileSync(s.log, "utf8").trim().split("\n");
    expect(calls.map((c) => c.split(" ")[0])).toEqual(["pdflatex", "pdflatex", "pdflatex"]);
    expect(calls[0]).toContain("-interaction=nonstopmode -halt-on-error -no-shell-escape main.tex | openin=p openout=p");
    expect(calls[0]).toMatch(/cwd=.*\/src\/papers\/demo$/);
    expect((await s.research.read("demo", "papers/demo/main.pdf")).bytes.toString("utf8")).toBe(`%PDF-1.4 built from ${TEX.length}`);
    expect((await s.research.read("demo", "papers/demo/main.pdf", { baseline: true })).bytes.toString("utf8")).toBe("%PDF-1.4 shipped");
    expect(s.research.list()[0].changed).toBe(0);
  });

  test("a grant for another digest is refused", async () => {
    const s = setup();
    const view = await s.builds.request("demo", "pdf");
    expect(await refused(() => s.builds.answer(view.id, "0".repeat(64), true))).toEqual([403, "no build request matches that answer"]);
    expect(await refused(() => s.builds.answer("A".repeat(22), view.digest, true))).toEqual([403, "no build request matches that answer"]);
    expect(await refused(() => s.builds.answer(null, null, true))).toEqual([400, "an answer names the request by its id"]);
    expect(await refused(() => s.builds.answer(null, view.digest, true))).toEqual([400, "an answer names the request by its id"]);
    expect((await refused(() => s.builds.answer(view.id, view.digest.toUpperCase(), true)))[0]).toBe(403);
    expect(await refused(() => s.builds.answer(view.id, view.digest.slice(0, 12), true))).toEqual([403, "no build request matches that answer"]);
    expect((await refused(() => s.builds.answer(view.id, view.digest.slice(0, 31), true)))[0]).toBe(403);
    expect((await refused(() => s.builds.answer(view.id, `${view.digest.slice(0, 31)}${view.digest[31] === "0" ? "1" : "0"}`, true)))[0]).toBe(403);
    expect((await refused(() => s.builds.answer(view.id, `${view.digest}0`, true)))[0]).toBe(403);
    expect((await refused(() => s.builds.answer(view.id.slice(0, 21), null, true)))[0]).toBe(403);
    expect((await refused(() => s.builds.answer(view.id, 12, true)))[0]).toBe(403);
    expect((await refused(() => s.builds.answer(view.id, "", true)))[0]).toBe(403);
    expect(s.runner.list()).toEqual([]);
    expect(s.consent.pending()!.id).toBe(view.id);
    const other = setup();
    const theirs = await other.builds.request("demo", "pdf");
    expect((await refused(() => s.builds.answer(theirs.id, theirs.digest, true)))[0]).toBe(403);
  });

  test("approve with a stale digest is refused", async () => {
    const s = setup();
    const read = await s.builds.request("demo", "pdf");
    s.tick(CONSENT_TTL_MS);
    expect(s.builds.pending()).toBeNull();
    s.tick(DENY_COOLDOWN_MS);
    await s.work.write("demo", MAIN, rev(TEX), Buffer.from(`${TEX}\\input{/etc/passwd}\n`));
    const swapped = await s.builds.request("demo", "pdf");
    expect(swapped.digest).not.toBe(read.digest);
    expect(await refused(() => s.builds.answer(swapped.id, read.digest, true))).toEqual([403, "no build request matches that answer"]);
    expect(await refused(() => s.builds.answer(swapped.id, read.digest.slice(0, 32), true))).toEqual([403, "no build request matches that answer"]);
    expect(await refused(() => s.builds.answer(read.id, read.digest, true))).toEqual([403, "no build request matches that answer"]);
    expect(await refused(() => s.builds.answer(read.id, null, true))).toEqual([403, "no build request matches that answer"]);
    expect(s.runner.list()).toEqual([]);
    expect(existsSync(s.log)).toBe(false);
    expect(s.consent.pending()!.id).toBe(swapped.id);
  });

  test("a request replaced after display is refused", async () => {
    const s = setup();
    const shown = await s.builds.request("demo", "pdf");
    s.tick(CONSENT_TTL_MS + DENY_COOLDOWN_MS);
    expect(s.builds.pending()).toBeNull();
    s.tick(DENY_COOLDOWN_MS);
    const same = await s.builds.request("demo", "pdf");
    expect(same.digest).toBe(shown.digest);
    expect(same.id).not.toBe(shown.id);
    expect(await refused(() => s.builds.answer(shown.id, null, true))).toEqual([403, "no build request matches that answer"]);
    expect(await refused(() => s.builds.answer(shown.id, shown.digest, true))).toEqual([403, "no build request matches that answer"]);
    expect(s.runner.list()).toEqual([]);
    expect(() => answerKey({})).toThrow("name the request you read");
    expect(() => answerKey({ digest: shown.digest })).toThrow("name the request you read");
    expect(() => answerKey({ request: shown.id, digest: shown.digest.slice(0, 12) })).toThrow("32 to 64 hex characters");
    expect(() => answerKey({ request: shown.id, digest: shown.digest.slice(0, 31) })).toThrow("32 to 64 hex characters");
    expect(() => answerKey({ request: "short" })).toThrow("22 characters");
    expect(answerKey({ request: shown.id, digest: shown.digest.slice(0, 32).toUpperCase() })).toEqual({ id: shown.id, digest: shown.digest.slice(0, 32) });
    expect(answerKey({ request: shown.id })).toEqual({ id: shown.id });
  });

  test("the right id is accepted once, alone or beside its digest", async () => {
    const s = setup();
    const view = await s.builds.request("demo", "pdf");
    const job = s.builds.answer(view.id, null, true) as JobView;
    expect(job.state).toBe("running");
    expect(await refused(() => s.builds.answer(view.id, null, true))).toEqual([403, "no build request matches that answer"]);
    expect(await refused(() => s.builds.answer(view.id, view.digest, true))).toEqual([403, "no build request matches that answer"]);
    expect((await finished(s, job.id)).state).toBe("done");
    for (const length of [32, 48, 64]) {
      const both = setup();
      const v = await both.builds.request("demo", "pdf");
      expect((both.builds.answer(v.id, v.digest.slice(0, length), true) as JobView).state).toBe("running");
      expect((await refused(() => both.builds.answer(v.id, v.digest.slice(0, length), true)))[0]).toBe(403);
    }
  });

  test("two requests that share 12 characters of digest cannot be confused", () => {
    let clock = 1_000_000;
    const consent = new ConsentStore({ now: () => clock });
    const input = (digest: string, build: string) => ({ slug: "demo", build, kind: PDF_KIND, digest, cls: "edited" as const, files: [], frozenDir: join(temp("frozen"), build), title: "T", body: "B", full: "", params: {} });
    const shared = "abcdef012345";
    const benign = consent.open(input(`${shared}${"0".repeat(52)}`, "benign"));
    clock += CONSENT_TTL_MS + DENY_COOLDOWN_MS;
    expect(consent.pending()).toBeNull();
    clock += DENY_COOLDOWN_MS;
    const hostile = consent.open(input(`${shared}${"1".repeat(52)}`, "hostile"));
    expect(hostile.digest.slice(0, 12)).toBe(benign.digest.slice(0, 12));
    expect(hostile.id).not.toBe(benign.id);
    const tries: [unknown, unknown][] = [
      [null, shared],
      [null, benign.digest],
      [benign.id, null],
      [benign.id, shared],
      [benign.id, benign.digest],
      [hostile.id, shared],
      [hostile.id, benign.digest],
      [hostile.id, benign.digest.slice(0, 32)],
      [hostile.id, `${shared}${"0".repeat(20)}`],
    ];
    for (const [id, digest] of tries) {
      expect(() => consent.consume(id, digest)).toThrow();
      expect(() => consent.deny(id, digest)).toThrow();
    }
    expect(consent.pending()!.id).toBe(hostile.id);
    expect(consent.consume(hostile.id, hostile.digest).pending.build).toBe("hostile");
    expect(() => consent.consume(hostile.id, hostile.digest)).toThrow("no build request matches that answer");
  });

  test("a declared output outside the built folder is refused", async () => {
    for (const out of ["../../escape.txt", "/etc/escape.txt", "papers/../../escape.txt"]) {
      const s = setup({ builds: [{ ...BUILDS[0], outputs: [out] }] });
      expect((await refused(() => s.builds.request("demo", "pdf")))[0]).toBeGreaterThanOrEqual(400);
      expect(s.consent.pending()).toBeNull();
      expect(frozenDirs(s)).toEqual([]);
    }
    const linked = setup({ builds: [{ ...BUILDS[1], audience: "public", outputs: ["fig.txt"] }] });
    const elsewhere = temp("elsewhere");
    mkdirSync(join(linked.home, "research/outputs/demo"), { recursive: true });
    symlinkSync(elsewhere, join(linked.home, "research/outputs/demo/built"));
    const view = await linked.builds.request("demo", "figures");
    const job = linked.builds.answer(view.id, view.digest, true) as JobView;
    expect((await finished(linked, job.id)).state).toBe("failed");
    expect(readdirSync(elsewhere)).toEqual([]);
  });

  test("a request expires on its own timer and its folder goes", async () => {
    const home = temp("home");
    const runner = new JobRunner({ root: join(home, "jobs"), specs: {}, frozenOnly: true });
    runners.push(runner);
    const dropped: string[] = [];
    const consent = new ConsentStore({ ttlMs: 30, onDrop: (p, why) => dropped.push(`${p.id} ${why}`) });
    const p = consent.open({ slug: "demo", build: "pdf", kind: PDF_KIND, digest: "a".repeat(64), cls: "shipped", files: [], frozenDir: join(home, "jobs", "x"), title: "T", body: "B", full: "", params: {} });
    await new Promise((done) => setTimeout(done, 200));
    expect(dropped).toEqual([`${p.id} expired`]);
    expect(() => consent.consume(p.id, p.digest)).toThrow("no build request matches that answer");
    expect(consent.cooldown("demo")).toBeGreaterThan(0);
  });

  test("startFrozen refuses a spent grant, a grant for another kind, a plain object and a folder outside the runner root", async () => {
    const s = setup();
    const view = await s.builds.request("demo", "pdf");
    const dir = s.consent.pending()!.frozenDir;
    expect((await refused(() => s.runner.startFrozen(PDF_KIND, dir, { kind: PDF_KIND, digest: view.digest, spent: false }, {})))[1]).toBe("a frozen job needs a grant from the consent store");
    expect(() => new Grant(Symbol("bkt.research.grant"), PDF_KIND, view.digest)).toThrow("a grant comes from the consent store alone");
    expect(() => s.consent.internal(PDF_KIND, view.digest)).toThrow("takes no internal grant");
    expect((await refused(() => s.runner.startFrozen(PDF_KIND, dir, s.consent.internal("research-pages", view.digest), {})))[1]).toBe("the grant is for another kind of job");
    const { grant } = s.consent.consume(view.id, view.digest);
    expect((await refused(() => s.runner.startFrozen(FIGURE_KIND, dir, grant, {})))[1]).toBe("the grant is for another kind of job");
    expect((await refused(() => s.runner.startFrozen(PDF_KIND, temp("outside"), grant, {})))[1]).toBe("the frozen folder sits outside this runner");
    expect(grant.spent).toBe(false);
    const job = s.runner.startFrozen(PDF_KIND, dir, grant, { slug: "demo", build: "pdf", entry: MAIN, outputs: "[]" });
    expect([job.state, grant.spent]).toEqual(["running", true]);
    expect((await refused(() => s.runner.startFrozen(PDF_KIND, dir, grant, {})))[1]).toBe("the grant is spent");
    expect(await refused(() => s.runner.start(PDF_KIND, {}))).toEqual([404, `unknown job ${PDF_KIND}`]);
    expect(s.runner.kinds()).toEqual([]);
  });

  test("an edit after the freeze does not reach the job", async () => {
    const s = setup();
    const view = await s.builds.request("demo", "pdf");
    await s.work.write("demo", MAIN, rev(TEX), Buffer.from(`${TEX}% injected after the freeze\n\\input{/etc/passwd}\n`));
    const job = s.builds.answer(view.id, view.digest, true) as JobView;
    expect((await finished(s, job.id)).state).toBe("done");
    expect(readFileSync(`${s.log}.sha`, "utf8").trim().split("\n")).toEqual([rev(TEX), rev(TEX), rev(TEX)]);
    expect(readFileSync(join(s.home, "research/outputs/demo/built/papers/demo/main.pdf"), "utf8")).toBe(`%PDF-1.4 built from ${TEX.length}`);
    const tampered = setup();
    const v2 = await tampered.builds.request("demo", "pdf");
    const dir = tampered.consent.pending()!.frozenDir;
    writeFileSync(join(dir, "src/papers/demo/extra.tex"), "\\input{/etc/passwd}");
    expect(await refused(() => tampered.builds.answer(v2.id, v2.digest, true))).toEqual([403, "the frozen folder does not match the grant"]);
    expect(frozenDirs(tampered)).toEqual([]);
    expect(tampered.runner.list()).toEqual([]);
  });

  test("an edited script gets class edited and a new digest", async () => {
    const shipped = setup();
    const a = await shipped.builds.request("demo", "pdf");
    const edited = setup();
    await edited.work.write("demo", MAIN, rev(TEX), Buffer.from(EDITED));
    const b = await edited.builds.request("demo", "pdf");
    expect([a.class, b.class]).toEqual(["shipped", "edited"]);
    expect(a.digest).not.toBe(b.digest);
    expect(await refused(() => edited.builds.answer(b.id, a.digest, true))).toEqual([403, "no build request matches that answer"]);
    expect(edited.consent.pending()!.files).toEqual([{ path: MAIN, base: rev(TEX), now: rev(EDITED), added: 1, removed: 1, lines: ["-Second paragraph.", "+Second paragraph, rewritten here."] }]);
    const data = setup({ builds: [{ ...BUILDS[1], audience: "public" }] });
    await data.work.write("demo", "papers/demo/data.csv", rev(CSV), Buffer.from("id,value\n1,3\n"));
    const c = await data.builds.request("demo", "figures");
    expect([c.class, data.consent.pending()!.files]).toEqual(["edited", [{ path: "papers/demo/data.csv", base: rev(CSV), now: rev("id,value\n1,3\n"), added: 1, removed: 1, lines: ["-1,2", "+1,3"] }]]);
    expect(c.body).toContain(`papers/demo/data.csv: ${rev(CSV).slice(0, 12)} to ${rev("id,value\n1,3\n").slice(0, 12)}, 1 added, 1 removed`);
    expect(data.consent.pending()!.full).toContain("--- a/papers/demo/data.csv");
    const binary = setup({ builds: [{ ...BUILDS[1], audience: "public" }] });
    await binary.work.write("demo", "papers/demo/data.csv", rev(CSV), Buffer.alloc(2 * 1024 * 1024 + 1, "a"));
    const d = await binary.builds.request("demo", "figures");
    expect([d.class, binary.consent.pending()!.files[0].lines]).toEqual(["edited", ["2097153 bytes, shown as sizes alone"]]);
    expect(binary.consent.pending()!.full).toContain("2097153 bytes, shown as sizes alone");
    const plain = setup({ builds: [{ ...BUILDS[1], audience: "public" }] });
    expect((await plain.builds.request("demo", "figures")).digest).not.toBe(c.digest);
  });

  test("the approval text holds both digests and the changed lines", async () => {
    const s = setup();
    await s.work.write("demo", MAIN, rev(TEX), Buffer.from(EDITED));
    const view = await s.builds.request("demo", "pdf");
    expect(view.body.split("\n")).toEqual([
      "A demo paper",
      `Build: Paper PDF (latex), entry ${MAIN}`,
      "Version: edited on this computer",
      `Digest: ${view.digest.slice(0, 12)}`,
      "",
      `${MAIN}: ${rev(TEX).slice(0, 12)} to ${rev(EDITED).slice(0, 12)}, 1 added, 1 removed`,
      "  -Second paragraph.",
      "  +Second paragraph, rewritten here.",
    ]);
    const many = Array.from({ length: 7 }, (_, i) => ({ path: `p/${i}.tex`, base: "a".repeat(64), now: "b".repeat(64), added: 9, removed: 0, lines: Array.from({ length: 9 }, (_, j) => `+${"x".repeat(130)}${j}`) }));
    const text = approvalText({ title: "T", build: BUILDS[0], cls: "edited", digest: "c".repeat(64), files: many }).split("\n");
    expect(text.filter((l) => l.startsWith("p/")).length).toBe(7);
    expect(text.filter((l) => l.startsWith("  +")).length).toBe(30);
    expect(text.filter((l) => l.startsWith("  +")).every((l) => l.length === 103 && l.endsWith("…"))).toBe(true);
    expect(text.at(-1)).toBe("7 files changed. Run bkt research approve in a terminal to read the full diff.");
    expect(approvalText({ title: "T", build: BUILDS[0], cls: "shipped", digest: "c".repeat(64), files: [] })).toBe(`T\nBuild: Paper PDF (latex), entry ${MAIN}\nVersion: shipped version\nDigest: cccccccccccc`);
    const lines = approvalLines({ pending: view, full: s.consent.pending()!.full });
    expect(lines[0]).toBe("Allow this build?");
    expect(lines).toContain(`Full digest: ${view.digest}`);
    expect(lines).toContain("-Second paragraph.");
    expect(lines).toContain("+Second paragraph, rewritten here.");
    expect(lines).toContain(`--- a/${MAIN}`);
    expect(lines).toContain(`Request: ${view.id}`);
    expect(lines.slice(-2)).toEqual([`Allow it: bkt research approve --yes --request ${view.id}`, `Refuse it: bkt research approve --deny --request ${view.id}`]);
    expect(lines.join("\n")).not.toContain("--digest");
    expect(approvalLines({ pending: null })).toEqual(["No build is waiting for approval."]);
  });

  test("a pending request expires at 120 s", async () => {
    const s = setup();
    const view = await s.builds.request("demo", "pdf");
    const dir = s.consent.pending()!.frozenDir;
    s.tick(CONSENT_TTL_MS - 1);
    expect(s.builds.pending()!.id).toBe(view.id);
    expect(existsSync(dir)).toBe(true);
    s.tick(1);
    expect(s.builds.pending()).toBeNull();
    expect(existsSync(dir)).toBe(false);
    expect(frozenDirs(s)).toEqual([]);
    expect(await refused(() => s.builds.answer(view.id, view.digest, true))).toEqual([403, "no build request matches that answer"]);
    expect(s.runner.list()).toEqual([]);
    expect(CONSENT_TTL_MS).toBe(120_000);
  });

  test("expiry starts the wait and never turns builds off", async () => {
    const s = setup();
    for (let i = 0; i < 6; i++) {
      await s.builds.request("demo", "pdf");
      s.tick(CONSENT_TTL_MS);
      expect(s.builds.pending()).toBeNull();
      expect(s.consent.cooldown("demo")).toBe(DENY_COOLDOWN_MS);
      expect((await refused(() => s.builds.request("demo", "pdf")))[0]).toBe(429);
      s.tick(DENY_COOLDOWN_MS);
    }
    expect(s.gate.off("demo")).toBeNull();
    expect(frozenDirs(s)).toEqual([]);
    expect((await s.builds.request("demo", "pdf")).class).toBe("shipped");
  });

  test("three denials turn builds off", async () => {
    const s = setup();
    for (let i = 0; i < 3; i++) {
      const view = await s.builds.request("demo", "pdf");
      const dir = s.consent.pending()!.frozenDir;
      expect(s.builds.answer(view.id, view.digest, false)).toEqual({ denied: true });
      expect(existsSync(dir)).toBe(false);
      s.tick(DENY_COOLDOWN_MS);
    }
    expect(frozenDirs(s)).toEqual([]);
    expect(s.gate.off("demo")).toBe("three build requests were denied in ten minutes");
    expect(await refused(() => s.builds.request("demo", "pdf"))).toEqual([403, "builds are off for this output: three build requests were denied in ten minutes. Run bkt research builds on demo in a terminal"]);
    expect(researchBuilds(s.home, "on", "demo")).toBe("Builds are on for demo. Each build still asks for approval.");
    expect(s.gate.off("demo")).toBeNull();
    expect((await s.builds.request("demo", "pdf")).class).toBe("shipped");
    expect(researchBuilds(s.home, "off", "demo")).toBe("Builds are off for demo.");
    expect(s.gate.off("demo")).toBe("turned off from the terminal");
    expect(() => researchBuilds(s.home, "maybe", "demo")).toThrow("say on or off");
    expect(() => researchBuilds(s.home, "on", "../demo")).toThrow("refused");
    const spaced = setup();
    for (let i = 0; i < 4; i++) {
      const view = await spaced.builds.request("demo", "pdf");
      spaced.builds.answer(view.id, view.digest, false);
      spaced.tick(6 * 60_000);
    }
    expect(spaced.gate.off("demo")).toBeNull();
    const broken = setup();
    mkdirSync(join(broken.home, "research"), { recursive: true });
    writeFileSync(join(broken.home, "research/builds-off.json"), "{broken");
    expect((await refused(() => broken.builds.request("demo", "pdf")))[1]).toContain("the build switch file cannot be read, so builds stay off");
  });

  test("missing tools give the install line and no job", async () => {
    const s = setup({ tools: tools({ missing: ["biber"] }) });
    let caught: (ResearchError & { install?: string }) | null = null;
    try {
      await s.builds.request("demo", "pdf");
    } catch (e) {
      caught = e as ResearchError & { install?: string };
    }
    expect([caught!.status, caught!.message, caught!.install]).toEqual([409, "biber is missing, so the paper cannot be compiled", "sudo dnf install biber, or sudo apt install biber"]);
    expect(s.consent.pending()).toBeNull();
    expect(s.runner.list()).toEqual([]);
    expect(frozenDirs(s)).toEqual([]);
    const none = setup({ tools: tools({ missing: ["pdflatex", "biber"] }) });
    expect((await refused(() => none.builds.request("demo", "pdf")))[1]).toBe("pdflatex is missing, so the paper cannot be compiled");
  });

  test("a failing compile ends failed with its log, leaves no folder, and keeps the shipped PDF", async () => {
    const s = setup({ tools: tools({ pdflatex: 'echo "! Undefined control sequence."\nexit 1' }) });
    const view = await s.builds.request("demo", "pdf");
    const job = s.builds.answer(view.id, view.digest, true) as JobView;
    const done = await finished(s, job.id);
    expect([done.state, done.error]).toEqual(["failed", "exited with code 1"]);
    expect(done.log).toContain("! Undefined control sequence.");
    expect(frozenDirs(s)).toEqual([]);
    expect(existsSync(join(s.home, "research/outputs/demo/built/papers/demo/main.pdf"))).toBe(false);
    expect((await s.research.read("demo", "papers/demo/main.pdf")).bytes.toString("utf8")).toBe("%PDF-1.4 shipped");
    expect(s.builds.job(job.id).state).toBe("failed");
    expect((await refused(() => s.builds.job("nope")))[0]).toBe(404);
    const empty = setup({ tools: tools({ pdflatex: "exit 0" }) });
    const v = await empty.builds.request("demo", "pdf");
    const j = empty.builds.answer(v.id, v.digest, true) as JobView;
    expect([(await finished(empty, j.id)).state, empty.builds.job(j.id).error]).toEqual(["failed", "the compile wrote no PDF"]);
  });

  test("one build runs at a time, a build can be cancelled, and output past the cap stops it while it runs", async () => {
    const slow = setup({ tools: tools({ pdflatex: "sleep 20" }) });
    const view = await slow.builds.request("demo", "pdf");
    const job = slow.builds.answer(view.id, view.digest, true) as JobView;
    expect(await refused(() => slow.builds.request("demo", "pdf"))).toEqual([409, "another build is running; cancel it or wait"]);
    expect(slow.builds.cancel(job.id).id).toBe(job.id);
    expect((await finished(slow, job.id)).state).toBe("cancelled");
    expect(frozenDirs(slow)).toEqual([]);
    expect((await refused(() => slow.builds.cancel(job.id)))[0]).toBe(404);
    const big = setup({ buildBytes: 50_000, tools: tools({ pdflatex: "head -c 400000 /dev/zero > big.log\nsleep 20" }) });
    const v = await big.builds.request("demo", "pdf");
    const at = performance.now();
    const j = big.builds.answer(v.id, v.digest, true) as JobView;
    const done = await finished(big, j.id);
    expect([done.state, done.error]).toEqual(["failed", BUILD_OVER]);
    expect(performance.now() - at).toBeLessThan(6000);
    expect(frozenDirs(big)).toEqual([]);
  });
});

describe("python builds, own outputs and the side pack", () => {
  test("a python build runs with HF_HUB_OFFLINE=1 and its outputs land in built", async () => {
    const s = setup({ builds: [{ ...BUILDS[1], audience: "public" }] });
    const view = await s.builds.request("demo", "figures");
    expect(readdirSync(join(s.consent.pending()!.frozenDir, "src/papers/demo")).sort()).toEqual(["data.csv", "fig.py"]);
    const job = s.builds.answer(view.id, view.digest, true) as JobView;
    expect(job.kind).toBe(FIGURE_KIND);
    const done = await finished(s, job.id);
    expect([done.state, done.error, done.result]).toEqual(["done", null, { outputs: ["papers/demo/fig.txt"] }]);
    expect(readFileSync(join(s.home, "research/outputs/demo/built/papers/demo/fig.txt"), "utf8")).toBe("1");
    expect(frozenDirs(s)).toEqual([]);
    const silent = setup({ files: { ...FILES, [SCRIPT]: "print('nothing written')\n" }, builds: [{ ...BUILDS[1], audience: "public" }] });
    const v = await silent.builds.request("demo", "figures");
    const j = silent.builds.answer(v.id, v.digest, true) as JobView;
    expect([(await finished(silent, j.id)).state, silent.builds.job(j.id).error]).toEqual(["failed", "the script wrote none of the files the build names"]);
  });

  test("the staff build exists after the side pack installs, and runs from it", async () => {
    const publicFiles = Object.fromEntries(Object.entries(FILES).filter(([p]) => p !== SCRIPT && p !== "papers/demo/data.csv"));
    const open = pack(publicFiles, [BUILDS[0]]);
    const home = temp("home");
    const s = setup({ home, files: publicFiles, builds: [BUILDS[0]], index: open.index });
    expect(await refused(() => s.builds.request("demo", "figures"))).toEqual([404, "the output has no such build"]);
    const staffFiles: PackedFile[] = [SCRIPT, "papers/demo/data.csv"].map((path) => ({ path, sha256: rev(FILES[path]), size: FILES[path].length, audience: "staff", role: "file" }));
    const outputs = [{ slug: "demo", origin: "shipped" as const, manifest: manifest(BUILDS, FILES), files: staffFiles, withheld: 0 }];
    const side: ResearchSidePack = { schema: SIDE_SCHEMA, version: sha256(JSON.stringify(outputs)).slice(0, 16), outputs, blobs: Object.fromEntries(staffFiles.map((f) => [f.sha256, encodeBlob(Buffer.from(FILES[f.path]))])) };
    installSidePack(home, Buffer.from(JSON.stringify(side)));
    s.research.reload();
    const view = await s.builds.request("demo", "figures");
    expect(view.class).toBe("shipped");
    const job = s.builds.answer(view.id, view.digest, true) as JobView;
    expect((await finished(s, job.id)).state).toBe("done");
    expect(readFileSync(join(home, "research/outputs/demo/built/papers/demo/fig.txt"), "utf8")).toBe("1");
    await s.work.write("demo", SCRIPT, rev(FIG), Buffer.from(`${FIG}print('edited')\n`));
    const again = await s.builds.request("demo", "figures");
    expect([again.class, again.body.includes("edited on this computer"), again.body.includes("+print('edited')")]).toEqual(["edited", true, true]);
  });

  test("an added output has builds off until the terminal turns them on, and each of its builds reads as edited", async () => {
    const s = setup();
    const dir = join(temp("folder"), "mine");
    mkdirSync(dir);
    writeFileSync(join(dir, "report.json"), JSON.stringify({ slug: "mine", title: "Mine" }));
    writeFileSync(join(dir, "draw.py"), "open('out.txt', 'w').write('drawn')\n");
    s.local.addFolder(dir);
    const file = join(s.home, "research/local/mine/report.json");
    const record = JSON.parse(readFileSync(file, "utf8")) as ReportRecord;
    record.builds = [{ id: "draw", label: "Draw", runner: "python", entry: "reports/mine/draw.py", inputs: [], outputs: ["reports/mine/out.txt"], needs: [], audience: "staff" }];
    writeFileSync(file, JSON.stringify(record));
    expect(await refused(() => s.builds.request("mine", "draw"))).toEqual([403, "builds are off for this output until you run bkt research builds on mine in a terminal"]);
    rmSync(join(s.home, "research/local-state.json"));
    expect((await refused(() => s.builds.request("mine", "draw")))[0]).toBe(403);
    expect(frozenDirs(s)).toEqual([]);
    researchBuilds(s.home, "on", "mine");
    const view = await s.builds.request("mine", "draw");
    expect(view.class).toBe("edited");
    expect(view.body).toContain("reports/mine/draw.py: new file");
    expect(view.body).toContain("  open('out.txt', 'w').write('drawn')");
    const job = s.builds.answer(view.id, view.digest, true) as JobView;
    expect((await finished(s, job.id)).state).toBe("done");
    expect(readFileSync(join(s.home, "research/outputs/mine/built/reports/mine/out.txt"), "utf8")).toBe("drawn");
    researchBuilds(s.home, "off", "mine");
    expect((await refused(() => s.builds.request("mine", "draw")))[0]).toBe(403);
  });

  test("the page images follow the rebuilt PDF", async () => {
    const s = setup();
    const seen: string[] = [];
    const pagesRunner = new JobRunner({ root: join(temp("pages"), "jobs"), specs: { "research-pages": { label: "Stub", inputs: {}, plan: (dirs) => (seen.push(readFileSync(join(dirs.dir, "paper.pdf"), "utf8")), { error: "stop here" }) } satisfies JobSpec }, frozenOnly: true });
    runners.push(pagesRunner);
    const pages = new ResearchPages({ research: s.research, runner: pagesRunner, consent: new ConsentStore(), cache: join(temp("page-cache"), "pages"), os: "linux", which: () => "/usr/bin/pdftoppm", built: (slug, path) => s.work.built(slug, path) });
    await pages.status("demo");
    const view = await s.builds.request("demo", "pdf");
    const job = s.builds.answer(view.id, view.digest, true) as JobView;
    await finished(s, job.id);
    await pages.status("demo");
    expect(seen).toEqual(["%PDF-1.4 shipped", `%PDF-1.4 built from ${TEX.length}`]);
    expect(s.work.built("demo", "../../x")).toBeNull();
    expect(s.work.built("demo", "papers/demo/absent.pdf")).toBeNull();
  });

  test.skipIf(!Bun.which("pdflatex") || !Bun.which("biber"))(
    "a real pdflatex compile of a small paper lands a PDF in built",
    async () => {
      const paper = "\\documentclass{article}\n\\usepackage[backend=biber]{biblatex}\n\\addbibresource{refs.bib}\n\\begin{document}\nA small paper \\cite{a}.\n\\printbibliography\n\\end{document}\n";
      const real = { which: (bin: string) => Bun.which(bin), log: join(temp("log"), "none") };
      const s = setup({ files: { ...FILES, [MAIN]: paper }, tools: real });
      const view = await s.builds.request("demo", "pdf");
      const job = s.builds.answer(view.id, view.digest, true) as JobView;
      let done = s.builds.job(job.id);
      for (let i = 0; i < 1400 && done.state === "running"; i++) {
        await Bun.sleep(100);
        done = s.builds.job(job.id);
      }
      expect([done.state, done.error]).toEqual(["done", null]);
      const pdf = readFileSync(join(s.home, "research/outputs/demo/built/papers/demo/main.pdf"));
      expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(5000);
      expect(frozenDirs(s)).toEqual([]);
      const shell = setup({ files: { ...FILES, [MAIN]: "\\documentclass{article}\n\\begin{document}\n\\immediate\\write18{touch shell-ran}\n\\input{/etc/hostname}\nx\n\\end{document}\n" }, tools: real });
      const v = await shell.builds.request("demo", "pdf");
      const dir = shell.consent.pending()!.frozenDir;
      const j = shell.builds.answer(v.id, v.digest, true) as JobView;
      let ended = shell.builds.job(j.id);
      for (let i = 0; i < 600 && ended.state === "running"; i++) {
        await Bun.sleep(100);
        ended = shell.builds.job(j.id);
      }
      expect(ended.state).toBe("failed");
      expect(existsSync(join(dir, "src/papers/demo/shell-ran"))).toBe(false);
    },
    180_000,
  );
});

describe("build routes", () => {
  let srv: Serve | null = null;
  afterEach(() => {
    srv?.stop();
    srv = null;
  });

  async function served() {
    const s = setup();
    const analysis = new JobRunner({ root: join(temp("analysis"), "jobs"), specs: { analyze: { label: "Analyze a data file", inputs: { data: { label: "Data file", maxBytes: 1024, exts: [".csv"] } }, plan: () => ({ argv: ["true"] }) } }, killGraceMs: 50 });
    runners.push(analysis);
    const ME = 4242;
    const cli = "c".repeat(43);
    const routes = { ...jobRoutes(analysis), ...researchRoutes(s.research), ...researchWorkRoutes(s.work, () => {}, s.local), ...researchBuildRoutes(s.builds) };
    srv = startServe({ uid: ME, resolvePeerUid: () => ME, cliToken: cli, routes });
    const base = `http://127.0.0.1:${srv.port}`;
    const host = `127.0.0.1:${srv.port}`;
    const nonce = (await (await fetch(`${base}/`, { headers: { host } })).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const { token } = (await (await fetch(`${base}/session`, { method: "POST", headers: { host, origin: base, "content-type": "application/json" }, body: JSON.stringify({ nonce }) })).json()) as { token: string };
    const call = (method: string, path: string, auth: string | null, body?: unknown) => {
      const text = body === undefined ? (method === "POST" ? "{}" : undefined) : JSON.stringify(body);
      return fetch(`${base}${path}`, { method, headers: { host, ...(auth ? { authorization: `Bucket ${auth}` } : {}), ...(text ? { "content-type": "application/json", "content-length": String(text.length) } : {}) }, body: text });
    };
    return { s, analysis, routes, call, token, cli };
  }

  test("POST /local/jobs with kind research-pdf answers 404", async () => {
    const { call, token, s } = await served();
    const r = await call("POST", "/local/jobs", token, { kind: PDF_KIND, files: {} });
    expect([r.status, await r.json()]).toEqual([404, { error: `unknown job ${PDF_KIND}` }]);
    expect((await call("POST", "/local/jobs", token, { kind: PDF_KIND, files: { data: "a\n1\n" }, options: { slug: 1 } })).status).toBe(404);
    expect(s.runner.list()).toEqual([]);
  });

  test("POST /local/jobs with kind research-figure answers 404", async () => {
    const { call, token, cli, s } = await served();
    for (const kind of [FIGURE_KIND, TABLES_KIND]) for (const auth of [token, cli]) expect((await call("POST", "/local/jobs", auth, { kind, files: {} })).status).toBe(404);
    expect(s.runner.list()).toEqual([]);
  });

  test("GET /local/jobs lists no research kind", async () => {
    const { call, token } = await served();
    const body = (await (await call("GET", "/local/jobs", token)).json()) as { kinds: { kind: string }[]; jobs: unknown[] };
    expect(body.kinds.map((k) => k.kind)).toEqual(["analyze"]);
    expect(body.jobs).toEqual([]);
  });

  test("no route table holds the build runner", async () => {
    const { call, token, routes, s } = await served();
    const posts = Object.keys(routes).filter((k) => k.startsWith("POST "));
    expect(posts.length).toBeGreaterThan(8);
    for (const key of posts) {
      const path = key.slice(5);
      for (const kind of [PDF_KIND, FIGURE_KIND, TABLES_KIND]) {
        await call("POST", `${path}?kind=${kind}&slug=demo&build=pdf&id=x`, token, { kind, files: {}, slug: "demo", build: "pdf", allow: true, id: "x", digest: "0".repeat(64), entry: "/bin/sh", frozenDir: "/tmp", grant: { kind, digest: "0".repeat(64), spent: false } });
        expect({ key, kind, jobs: s.runner.list().length, busy: s.runner.busy() }).toEqual({ key, kind, jobs: 0, busy: false });
      }
    }
    expect(existsSync(s.log)).toBe(false);
  });

  test("slug and build reach plan through params and never through the request body", async () => {
    const { call, token, cli, s } = await served();
    const asked = await call("POST", "/local/research/build?slug=demo&build=pdf", token, { entry: "/bin/sh", slug: "other", build: "figures", outputs: ["/etc/passwd"], kind: FIGURE_KIND });
    expect(asked.status).toBe(202);
    const view = (await asked.json()) as { id: string; digest: string; build: string; slug: string };
    expect([view.slug, view.build]).toEqual(["demo", "pdf"]);
    expect(s.consent.pending()!.params).toEqual({ slug: "demo", build: "pdf", entry: MAIN, outputs: '["papers/demo/main.pdf"]' });
    const ok = await call("POST", "/local/research/consent", cli, { id: view.id, digest: view.digest, allow: true, entry: "/bin/sh", kind: FIGURE_KIND, slug: "other" });
    const job = (await ok.json()) as JobView;
    expect([ok.status, job.kind]).toEqual([200, PDF_KIND]);
    const done = await finished(s, job.id);
    expect(done.state).toBe("done");
    expect(readFileSync(s.log, "utf8")).toContain("main.tex");
    expect(existsSync(join(s.home, "research/outputs/demo/built/papers/demo/main.pdf"))).toBe(true);
    expect(existsSync(join(s.home, "research/outputs/other"))).toBe(false);
    const seen = (await (await call("GET", `/local/research/job?id=${job.id}`, token)).json()) as JobView;
    expect(seen.state).toBe("done");
  });

  test("consent route answers 403 to a session token", async () => {
    const { call, token, cli, s } = await served();
    const view = (await (await call("POST", "/local/research/build?slug=demo&build=pdf", token)).json()) as { id: string; digest: string };
    const refusedAnswer = await call("POST", "/local/research/consent", token, { id: view.id, digest: view.digest, allow: true });
    expect([refusedAnswer.status, await refusedAnswer.json()]).toEqual([403, { error: "a build is approved from the terminal alone" }]);
    expect((await call("POST", "/local/research/consent", null, { id: view.id, digest: view.digest, allow: true })).status).toBe(401);
    expect(s.runner.list()).toEqual([]);
    expect(s.consent.pending()!.id).toBe(view.id);
    const window = (await (await call("GET", "/local/research/consent/pending", token)).json()) as { pending: { id: string; body: string }; full?: string };
    expect([window.pending.id, window.full]).toEqual([view.id, undefined]);
    const terminal = (await (await call("GET", "/local/research/consent/pending", cli)).json()) as { full?: string };
    expect(terminal.full).toBe("");
    expect((await call("POST", "/local/research/consent", cli, { id: view.id, digest: "0".repeat(64), allow: true })).status).toBe(403);
    const denied = await call("POST", "/local/research/consent", cli, { id: view.id, digest: view.digest, allow: false });
    expect([denied.status, await denied.json()]).toEqual([200, { denied: true }]);
    expect(frozenDirs(s)).toEqual([]);
    expect(((await (await call("GET", "/local/research/consent/pending", token)).json()) as { pending: unknown }).pending).toBeNull();
    const cooling = await call("POST", "/local/research/build?slug=demo&build=pdf", token);
    expect(cooling.status).toBe(429);
    expect((await call("POST", "/local/research/build?slug=demo&build=nope", token)).status).toBe(404);
    expect((await call("POST", "/local/research/build?slug=demo&build=pdf", null)).status).toBe(401);
    expect((await call("POST", "/local/research/job/cancel", token, { id: "nope" })).status).toBe(404);
  });
});
