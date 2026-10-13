import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { addLines, researchAdd } from "../src/cli/research";
import { RESEARCH_SCHEMA, sha256, type ReportRecord, type ResearchIndex } from "../src/pack/research";
import { Research, ResearchError, researchRoutes } from "../src/research";
import { FOLDER_CAP, FOLDER_DEPTH, KINDS, LocalOutputs, NOT_STATED, ResearchWork, researchWorkRoutes, ROLES, UPLOAD_BODY_BYTES, UPLOAD_BYTES, UPLOAD_EXTS } from "../src/research-work";
import { startServe, type Serve } from "../src/serve";

const REPO = resolve(import.meta.dir, "../../..");
const scratch: string[] = [];
function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bkt-local-${name}-`));
  scratch.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([4, 0, 0, 0]), Buffer.from("WEBP")]);
const CSV = "id,title\n1,One\n2,Two\n";
const SHIPPED: ResearchIndex = { schema: RESEARCH_SCHEMA, version: "0".repeat(16), staff: false, outputs: [{ slug: "shipped-paper", origin: "shipped", manifest: { schema: "bucket.report/1", slug: "shipped-paper", title: "Shipped", authors: ["A"], date: "2026-10-01", status: "public", kind: "paper", source_path: "x.pdf", source_hash: "a".repeat(64) }, files: [], withheld: 0 }] };

function setup(o: { home?: string; caps?: { files: number; bytes: number } } = {}) {
  const home = o.home ?? temp("home");
  const errors: string[] = [];
  const research = new Research({ index: SHIPPED, blobs: async () => ({ version: SHIPPED.version, blobs: {} }) }, temp("cache"), home, (e) => errors.push(e.message));
  const local = new LocalOutputs(home, { taken: (slug) => SHIPPED.outputs.some((x) => x.slug === slug), now: () => Date.UTC(2026, 9, 12, 9, 0, 0), caps: o.caps });
  research.setLocal(local);
  const work = new ResearchWork(research, home, { now: () => Date.UTC(2026, 9, 12, 9, 30, 0) });
  return { home, research, local, work, errors };
}

function refused(run: () => unknown): [number, string] {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(ResearchError);
    return [(e as ResearchError).status, (e as ResearchError).message];
  }
  return [0, ""];
}

function folder(files: Record<string, string | Buffer>): string {
  const dir = join(temp("folder"), "renders");
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), body);
  }
  return dir;
}

function fixtureRepo(): string {
  const repo = temp("repo");
  mkdirSync(join(repo, "scripts/lib"), { recursive: true });
  mkdirSync(join(repo, "src/lib"), { recursive: true });
  cpSync(join(REPO, "scripts/report.mjs"), join(repo, "scripts/report.mjs"));
  cpSync(join(REPO, "scripts/lib/report-record.mjs"), join(repo, "scripts/lib/report-record.mjs"));
  writeFileSync(join(repo, "src/lib/papers.ts"), "export const PAPERS = [\n];\n");
  return repo;
}

function check(repo: string): { code: number; out: string } {
  const r = Bun.spawnSync(["node", "scripts/report.mjs", "check"], { cwd: repo, stdout: "pipe", stderr: "pipe" });
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

describe("own outputs", () => {
  test("slug rules", () => {
    const { local, home } = setup();
    for (const slug of ["Bad", "has space", "under_score", "-lead", "trail-", "double--dash", "../up", "a/b", "", "x".repeat(65), ".hidden"]) expect({ slug, status: refused(() => local.create({ title: "T", slug, kind: "memo" }))[0] }).toEqual({ slug, status: 400 });
    expect(refused(() => local.create({ title: "T", kind: "memo" }))[0]).toBe(400);
    expect(refused(() => local.create({ title: "", slug: "ok", kind: "memo" }))).toEqual([400, "the title takes 1 to 500 characters"]);
    expect(refused(() => local.create({ title: "t".repeat(501), slug: "ok", kind: "memo" }))[0]).toBe(400);
    expect(refused(() => local.create({ title: "T", slug: "ok", kind: "novel" }))).toEqual([400, `the kind is one of ${KINDS.join(", ")}`]);
    expect(refused(() => local.create({ title: "T", slug: "shipped-paper", kind: "memo" }))).toEqual([409, "an output already has that short name"]);
    expect(existsSync(join(home, "research"))).toBe(false);
    expect(local.create({ title: "  My first output  ", slug: "my-first-output", kind: "memo" })).toEqual({ slug: "my-first-output" });
    expect(refused(() => local.create({ title: "Again", slug: "my-first-output", kind: "memo" }))[0]).toBe(409);
    expect(local.create({ title: "Two", slug: "a2", kind: "paper", author: "Ada Lovelace" })).toEqual({ slug: "a2" });
  });

  test("New output writes a draft record and a REPORT.md, and it lists like a shipped one", async () => {
    const { local, home, research } = setup();
    local.create({ title: "My first output", slug: "my-first-output", kind: "brief", author: "Ada Lovelace" });
    const dir = join(home, "research/local/my-first-output");
    expect(readdirSync(dir).sort()).toEqual(["REPORT.md", "report.json"]);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(statSync(join(dir, "report.json")).mode & 0o777).toBe(0o600);
    const record = JSON.parse(readFileSync(join(dir, "report.json"), "utf8")) as ReportRecord;
    expect(record).toMatchObject({ schema: "bucket.report/2", slug: "my-first-output", title: "My first output", authors: ["Ada Lovelace"], date: "2026-10-12", status: "draft", kind: "brief", source_path: "reports/my-first-output/REPORT.md", source_hash: sha256(Buffer.from("# My first output\n")), pdf_path: null, assets: [], tables: [] });
    expect(readFileSync(join(dir, "report.json"), "utf8").endsWith("}\n")).toBe(true);
    expect(research.list().map((r) => [r.slug, r.origin, r.status, r.kind])).toEqual([["shipped-paper", "shipped", "public", "paper"], ["my-first-output", "local", "draft", "brief"]]);
    const detail = research.detail("my-first-output");
    expect([detail.origin, detail.unreadable, detail.files.map((f) => [f.path, f.role])]).toEqual(["local", null, [["reports/my-first-output/REPORT.md", "source"]]]);
    expect((await research.read("my-first-output", "reports/my-first-output/REPORT.md")).bytes.toString("utf8")).toBe("# My first output\n");
    await expect(research.read("my-first-output", "reports/my-first-output/report.json")).rejects.toThrow("the output does not list that file");
    expect(local.buildsOn("my-first-output")).toBe(true);
    expect(JSON.parse(readFileSync(join(home, "research/local-state.json"), "utf8"))).toEqual({ "my-first-output": { builds: true, origin: "new" } });
  });

  test("upload type and size refusals", () => {
    const { local } = setup();
    local.create({ title: "Mine", slug: "mine", kind: "memo" });
    const up = (role: string | null, name: string | null, bytes: Uint8Array, slug: string | null = "mine") => refused(() => local.upload(slug, role, name, bytes));
    expect(up("figure", "plot.png", Buffer.from("not a png"))).toEqual([415, "the file does not read as png"]);
    expect(up("figure", "plot.gif", PNG)).toEqual([415, "a figure file is one of .png .webp .jpg .svg"]);
    expect(up("figure", "plot.exe", PNG)[0]).toBe(415);
    expect(up("figure", "notes.md", Buffer.from("# x"))[0]).toBe(415);
    expect(up("data", "plot.png", PNG)).toEqual([415, "a data file is one of .csv .tsv .json .jsonl"]);
    expect(up("data", "rows.csv", Buffer.from([0xff, 0xfe, 0]))[0]).toBe(415);
    expect(up("paper", "paper.pdf", Buffer.from("plain text"))).toEqual([415, "the file does not read as pdf"]);
    expect(up("report", "REPORT.txt", Buffer.from("x"))[0]).toBe(415);
    expect(up("figure", "drawing.svg", Buffer.from("<html></html>"))[0]).toBe(415);
    expect(up("script", "run.py", Buffer.from("print(1)"))).toEqual([400, `the role is one of ${ROLES.join(", ")}`]);
    expect(up(null, "plot.png", PNG)[0]).toBe(400);
    expect(up("figure", "plot.png", Buffer.concat([PNG, Buffer.alloc(UPLOAD_BYTES)]))).toEqual([413, "the file is over the 16 MB limit"]);
    expect(up("figure", "plot.png", Buffer.alloc(0))[0]).toBe(400);
    for (const name of ["../plot.png", "a/plot.png", ".plot.png", "plot .png", "plot.png\0", "report.json", "", `${"n".repeat(140)}.png`]) expect({ name, status: up("figure", name, PNG)[0] }).toEqual({ name, status: 400 });
    expect(up("figure", "plot.png", PNG, "shipped-paper")).toEqual([403, "files are added to your own outputs alone"]);
    expect(up("figure", "plot.png", PNG, "absent")).toEqual([404, "no such output of yours"]);
    expect(up("figure", "plot.png", PNG, "../mine")[0]).toBe(400);
    expect(UPLOAD_EXTS).toEqual([".md", ".tex", ".bib", ".sty", ".tsv", ".csv", ".json", ".jsonl", ".py", ".txt", ".lean", ".png", ".webp", ".jpg", ".svg", ".pdf"]);
    expect([UPLOAD_BYTES, UPLOAD_BODY_BYTES]).toEqual([16 * 1024 * 1024, 24 * 1024 * 1024]);
    const small = setup({ caps: { files: 3, bytes: 1000 } });
    small.local.create({ title: "Small", slug: "small", kind: "memo" });
    expect(refused(() => small.local.upload("small", "data", "rows.csv", Buffer.alloc(2000, "a")))).toEqual([413, "the output is over the 256 MB limit"]);
    small.local.upload("small", "data", "rows.csv", Buffer.from(CSV));
    expect(refused(() => small.local.upload("small", "figure", "plot.png", PNG))).toEqual([413, "the output holds 2,000 files, which is its limit"]);
  });

  test("a markdown report, a CSV, a PNG and a PDF land in the same tabs", async () => {
    const { local, research, home } = setup();
    local.create({ title: "Mine", slug: "mine", kind: "memo" });
    expect(local.upload("mine", "report", "notes.md", Buffer.from("# Mine\n\nWith $x^2$.\n"))).toEqual({ slug: "mine", path: "reports/mine/REPORT.md" });
    expect(local.upload("mine", "data", "rows.csv", Buffer.from(CSV)).path).toBe("reports/mine/data/rows.csv");
    expect(local.upload("mine", "figure", "first_plot.png", PNG).path).toBe("reports/mine/figures/first_plot.png");
    local.upload("mine", "figure", "second.webp", WEBP);
    local.upload("mine", "figure", "first_plot.png", PNG);
    local.upload("mine", "paper", "anything.pdf", PDF);
    const d = research.detail("mine");
    expect(d.manifest.assets).toEqual([
      { id: "first-plot", path: "reports/mine/figures/first_plot.png", caption: "First plot", licence: NOT_STATED, audience: "staff" },
      { id: "second", path: "reports/mine/figures/second.webp", caption: "Second", licence: NOT_STATED, audience: "staff" },
    ]);
    expect(d.manifest.tables).toEqual([{ id: "rows", path: "reports/mine/data/rows.csv", format: "csv", label: "Rows", licence: NOT_STATED, audience: "staff", editable: true }]);
    expect([d.manifest.pdf_path, d.manifest.pdf_hash, d.manifest.source_hash]).toEqual(["reports/mine/paper.pdf", sha256(PDF), sha256(Buffer.from("# Mine\n\nWith $x^2$.\n"))]);
    expect(d.files.map((f) => [f.path.replace("reports/mine/", ""), f.role])).toEqual([["REPORT.md", "source"], ["data/rows.csv", "table"], ["figures/first_plot.png", "asset"], ["figures/second.webp", "asset"], ["paper.pdf", "pdf"]]);
    expect(d.unreadable).toBeNull();
    const page = await research.table("mine", "rows", { page: 1, q: "", sort: null });
    expect([page.columns, page.total]).toEqual([["id", "title"], 2]);
    const img = await research.read("mine", "reports/mine/figures/first_plot.png");
    expect([img.type, img.bytes.equals(PNG)]).toEqual(["image/png", true]);
    expect(statSync(join(home, "research/local/mine/figures/first_plot.png")).mode & 0o777).toBe(0o600);
    await expect(research.read("mine", "reports/other/figures/first_plot.png")).rejects.toThrow("the output does not list that file");
    await expect(research.read("mine", "reports/mine/../mine/REPORT.md")).rejects.toThrow();
    const outside = temp("outside");
    writeFileSync(join(outside, "secret.png"), PNG);
    mkdirSync(join(home, "research/local/linked"));
    symlinkSync(join(outside, "secret.png"), join(home, "research/local/mine/figures/first_plot.png.tmp-x"));
    rmSync(join(home, "research/local/mine/figures"), { recursive: true });
    symlinkSync(outside, join(home, "research/local/mine/figures"));
    expect(refused(() => local.upload("mine", "figure", "third.png", PNG))[0]).toBe(403);
    expect(readdirSync(outside)).toEqual(["secret.png"]);
  });

  test("an edit to an own file goes through the working copy and export writes the reports layout that report.mjs check passes", async () => {
    const { local, research, work, home } = setup();
    local.create({ title: "Mine", slug: "mine", kind: "memo", author: "Ada Lovelace" });
    local.upload("mine", "data", "rows.csv", Buffer.from(CSV));
    local.upload("mine", "figure", "plot.png", PNG);
    local.upload("mine", "paper", "paper.pdf", PDF);
    const source = "reports/mine/REPORT.md";
    await work.write("mine", source, sha256(Buffer.from("# Mine\n")), Buffer.from("# Mine\n\nA second paragraph.\n"));
    expect(research.list().find((r) => r.slug === "mine")!.changed).toBe(1);
    const out = await work.exportOutput("mine");
    expect(out.dir).toBe(join(home, "research/exports/mine-20261012T093000"));
    expect(out.files).toEqual(["reports/mine/REPORT.md", "reports/mine/data/rows.csv", "reports/mine/figures/plot.png", "reports/mine/paper.pdf", "reports/mine/report.json"]);
    expect(readFileSync(join(out.dir, source), "utf8")).toBe("# Mine\n\nA second paragraph.\n");
    const record = JSON.parse(readFileSync(join(out.dir, "reports/mine/report.json"), "utf8")) as ReportRecord;
    expect([record.source_hash, record.pdf_hash, record.status]).toEqual([sha256(Buffer.from("# Mine\n\nA second paragraph.\n")), sha256(PDF), "draft"]);
    const repo = fixtureRepo();
    cpSync(join(out.dir, "reports"), join(repo, "reports"), { recursive: true });
    const first = check(repo);
    expect(first.out.trim()).toBe("ok   mine");
    expect(first.code).toBe(0);
    writeFileSync(join(repo, "reports/mine/REPORT.md"), "tampered");
    expect(check(repo).code).toBe(1);
    const bare = setup();
    bare.local.create({ title: "Bare", slug: "bare", kind: "paper" });
    const plain = await bare.work.exportOutput("bare");
    const other = fixtureRepo();
    cpSync(join(plain.dir, "reports"), join(other, "reports"), { recursive: true });
    expect(check(other)).toEqual({ code: 0, out: "ok   bare\n" });
  });
});

describe("bkt research add", () => {
  test("a folder of three images with a PDF beside each and a minimal report.json becomes one output with its figures", async () => {
    const dir = folder({
      "report.json": JSON.stringify({ slug: "renders", title: "Twelve renders", licence: "CC-BY-4.0" }),
      "01-helix.png": PNG,
      "01-helix.pdf": PDF,
      "02-sphere.png": PNG,
      "02-sphere.pdf": PDF,
      "03-network.png": PNG,
      "03-network.pdf": PDF,
    });
    const { home, research, local, work } = setup();
    const done = researchAdd(dir, home, ["shipped-paper"]);
    expect(done).toEqual({ slug: "renders", files: 6, figures: 3, tables: 0, builds: false });
    expect(addLines(done)).toEqual(["Added renders: 6 files, 3 figures, 0 tables.", "It opens under Research as a draft. Builds are off for it until you turn them on."]);
    const d = research.detail("renders");
    expect([d.origin, d.manifest.status, d.manifest.kind, d.manifest.title, d.manifest.licence, d.unreadable]).toEqual(["local", "draft", "memo", "Twelve renders", "CC-BY-4.0", null]);
    expect(d.manifest.assets).toEqual([
      { id: "01-helix", path: "reports/renders/01-helix.png", caption: "01 helix", licence: "CC-BY-4.0", audience: "staff", source: "reports/renders/01-helix.pdf" },
      { id: "02-sphere", path: "reports/renders/02-sphere.png", caption: "02 sphere", licence: "CC-BY-4.0", audience: "staff", source: "reports/renders/02-sphere.pdf" },
      { id: "03-network", path: "reports/renders/03-network.png", caption: "03 network", licence: "CC-BY-4.0", audience: "staff", source: "reports/renders/03-network.pdf" },
    ]);
    expect(d.files.length).toBe(7);
    for (const a of d.manifest.assets!) expect((await research.read("renders", a.path)).bytes.equals(PNG)).toBe(true);
    expect((await research.read("renders", "reports/renders/02-sphere.pdf")).type).toBe("application/pdf");
    expect((await research.read("renders", "reports/renders/REPORT.md")).bytes.toString("utf8")).toBe("# Twelve renders\n");
    expect(local.buildsOn("renders")).toBe(false);
    expect(JSON.parse(readFileSync(join(home, "research/local-state.json"), "utf8"))).toEqual({ renders: { builds: false, origin: "added" } });
    expect(readFileSync(join(dir, "01-helix.png")).equals(PNG)).toBe(true);
    expect(refused(() => researchAdd(dir, home, []))).toEqual([409, "an output already has that short name"]);
    const out = await work.exportOutput("renders");
    const repo = fixtureRepo();
    cpSync(join(out.dir, "reports"), join(repo, "reports"), { recursive: true });
    expect(check(repo)).toEqual({ code: 0, out: "ok   renders\n" });
  });

  test("builds stay off when the state is missing, unreadable, or the add stops between its two steps", () => {
    const dir = folder({ "report.json": JSON.stringify({ slug: "renders", title: "Renders" }), "a.png": PNG });
    const first = setup();
    researchAdd(dir, first.home, []);
    const state = join(first.home, "research/local-state.json");
    expect(first.local.buildsOn("renders")).toBe(false);
    rmSync(state);
    expect(first.local.buildsOn("renders")).toBe(false);
    expect(first.research.detail("renders").origin).toBe("local");
    writeFileSync(state, "{broken");
    expect(first.local.buildsOn("renders")).toBe(false);
    writeFileSync(state, JSON.stringify({ renders: { builds: "yes" }, other: { builds: true } }));
    expect([first.local.buildsOn("renders"), first.local.buildsOn("other"), first.local.buildsOn("never-seen")]).toEqual([false, true, false]);
    rmSync(state);
    symlinkSync(join(first.home, "research/elsewhere.json"), state);
    writeFileSync(join(first.home, "research/elsewhere.json"), JSON.stringify({ renders: { builds: true } }));
    expect(first.local.buildsOn("renders")).toBe(false);

    const home = temp("home");
    const crashing = new LocalOutputs(home, {
      rename: () => {
        throw new Error("power lost");
      },
    });
    expect(() => crashing.addFolder(dir)).toThrow("power lost");
    expect(JSON.parse(readFileSync(join(home, "research/local-state.json"), "utf8"))).toEqual({ renders: { builds: false, origin: "added" } });
    expect(existsSync(join(home, "research/local/renders"))).toBe(false);
    expect(readdirSync(join(home, "research/local"))).toEqual([]);
    const after = new LocalOutputs(home);
    expect(after.buildsOn("renders")).toBe(false);
    expect(after.addFolder(dir).builds).toBe(false);
    expect(after.buildsOn("renders")).toBe(false);
    after.create({ title: "Made here", slug: "made-here", kind: "memo" });
    expect([after.buildsOn("made-here"), after.buildsOn("renders")]).toEqual([true, false]);
  });

  test("the list notices a record rewritten with the same size and time, and a folder too deep or with too many folders is refused", () => {
    const { local, home, research } = setup();
    local.create({ title: "Alpha", slug: "alpha", kind: "memo" });
    const file = join(home, "research/local/alpha/report.json");
    const before = local.signature();
    const stat = statSync(file);
    writeFileSync(file, readFileSync(file, "utf8").replace('"title":"Alpha"', '"title":"Omega"'));
    utimesSync(file, stat.atime, stat.mtime);
    expect(statSync(file).size).toBe(stat.size);
    expect(local.signature()).not.toBe(before);
    expect(research.detail("alpha").manifest.title).toBe("Omega");
    expect(refused(() => researchAdd(folder({ "report.json": JSON.stringify({ slug: "deep", title: "Deep" }), "a/b/c/d/e/f/g.png": PNG }), home, []))).toEqual([400, "a/b/c/d/e/f sits deeper than 5 folders"]);
    expect(researchAdd(folder({ "report.json": JSON.stringify({ slug: "level", title: "Level" }), "a/b/c/d/e/f.png": PNG }), home, []).figures).toBe(1);
    const many = Object.fromEntries(Array.from({ length: FOLDER_CAP + 1 }, (_, i) => [`d${i}/a.png`, PNG]));
    expect(refused(() => researchAdd(folder({ "report.json": JSON.stringify({ slug: "wide", title: "Wide" }), ...many }), home, []))).toEqual([413, "the folder holds over 200 folders"]);
    expect([FOLDER_CAP, FOLDER_DEPTH]).toEqual([200, 5]);
  });

  test("bkt research add refuses a symlink inside the folder", () => {
    const { home } = setup();
    const outside = temp("outside");
    writeFileSync(join(outside, "secret.png"), PNG);
    const linkedFile = folder({ "report.json": JSON.stringify({ slug: "one", title: "One" }), "a.png": PNG });
    symlinkSync(join(outside, "secret.png"), join(linkedFile, "b.png"));
    expect(refused(() => researchAdd(linkedFile, home, []))).toEqual([403, "b.png is a symlink, so the folder is refused"]);
    const linkedDir = folder({ "report.json": JSON.stringify({ slug: "two", title: "Two" }), "figures/a.png": PNG });
    symlinkSync(outside, join(linkedDir, "figures/more"));
    expect(refused(() => researchAdd(linkedDir, home, []))).toEqual([403, "figures/more is a symlink, so the folder is refused"]);
    const linkedRecord = folder({ "a.png": PNG });
    writeFileSync(join(outside, "report.json"), JSON.stringify({ slug: "three", title: "Three" }));
    symlinkSync(join(outside, "report.json"), join(linkedRecord, "report.json"));
    expect(refused(() => researchAdd(linkedRecord, home, []))[0]).toBe(403);
    const top = join(temp("link"), "renders");
    symlinkSync(linkedFile, top);
    expect(refused(() => researchAdd(top, home, []))).toEqual([400, "the path is a symlink or a file; give a folder"]);
    expect(existsSync(join(home, "research"))).toBe(false);
  });

  test("a folder with no record, a bad record, a refused file or a taken name is refused and nothing is copied", () => {
    const { home } = setup();
    const add = (files: Record<string, string | Buffer>, shipped: string[] = ["shipped-paper"]) => refused(() => researchAdd(folder(files), home, shipped));
    expect(add({ "a.png": PNG })).toEqual([400, "the folder holds no report.json"]);
    expect(add({ "report.json": "{broken" })).toEqual([422, "report.json does not parse"]);
    expect(add({ "report.json": "[1]" })).toEqual([422, "report.json holds no record"]);
    expect(add({ "report.json": JSON.stringify({ slug: "x" }) })).toEqual([422, "report.json needs a title of 1 to 500 characters"]);
    expect(add({ "report.json": JSON.stringify({ slug: "Bad Slug", title: "T" }) })[0]).toBe(400);
    expect(add({ "report.json": JSON.stringify({ slug: "../../up", title: "T" }) })[0]).toBe(400);
    expect(add({ "report.json": JSON.stringify({ slug: "shipped-paper", title: "T" }) })).toEqual([409, "an output already has that short name"]);
    expect(add({ "report.json": JSON.stringify({ slug: "x", title: "T" }), "run.sh": "echo" })[0]).toBe(415);
    expect(add({ "report.json": JSON.stringify({ slug: "x", title: "T" }), "fake.png": "text" })).toEqual([415, "fake.png does not read as png"]);
    expect(add({ "report.json": JSON.stringify({ slug: "x", title: "T" }), "a b.png": PNG })[0]).toBe(400);
    expect(add({ "report.json": JSON.stringify({ slug: "x", title: "T" }), ".hidden.png": PNG })[0]).toBe(400);
    expect(add({ "report.json": JSON.stringify({ slug: "x", title: "T" }), "a/b/c/d/e/f/g.png": PNG })[0]).toBe(400);
    expect(refused(() => researchAdd(join(home, "absent"), home, []))[0]).toBe(404);
    expect(existsSync(join(home, "research/local"))).toBe(false);
    const withData = folder({ "report.json": JSON.stringify({ slug: "with-data", title: "With data", kind: "dataset-report", authors: ["Ada Lovelace"], date: "2026-09-01", abstract: "Rows.", extra_key: { nested: 1.5 } }), "REPORT.md": "# Given\n", "data/rows.csv": CSV, "paper.pdf": PDF });
    expect(researchAdd(withData, home, [])).toEqual({ slug: "with-data", files: 3, figures: 0, tables: 1, builds: false });
    const record = JSON.parse(readFileSync(join(home, "research/local/with-data/report.json"), "utf8")) as ReportRecord & { extra_key?: unknown };
    expect([record.kind, record.authors, record.date, record.abstract, record.status, record.extra_key, record.pdf_hash, record.source_hash]).toEqual(["dataset-report", ["Ada Lovelace"], "2026-09-01", "Rows.", "draft", undefined, sha256(PDF), sha256(Buffer.from("# Given\n"))]);
    expect(readdirSync(join(home, "research/local")).sort()).toEqual(["with-data"]);
  });
});

describe("own output routes", () => {
  let s: Serve | null = null;
  afterEach(() => {
    s?.stop();
    s = null;
  });

  test("the window creates an output, adds a figure and reads it back; a shipped output takes no upload", async () => {
    const made = setup();
    const ME = 4242;
    const token = "c".repeat(43);
    s = startServe({ uid: ME, resolvePeerUid: () => ME, cliToken: token, routes: { ...researchRoutes(made.research), ...researchWorkRoutes(made.work, () => {}, made.local) }, routeBodyBytes: { "POST /local/research/upload": UPLOAD_BODY_BYTES } });
    const base = `http://127.0.0.1:${s.port}`;
    const headers = { host: `127.0.0.1:${s.port}`, authorization: `Bucket ${token}` };
    const post = (path: string, body: Uint8Array | string, auth = true) => fetch(`${base}${path}`, { method: "POST", headers: { ...(auth ? headers : { host: headers.host }), "content-length": String(Buffer.byteLength(body as string)) }, body: body as string });
    expect((await post("/local/research/new", JSON.stringify({ title: "Mine", slug: "mine", kind: "memo" }), false)).status).toBe(401);
    const created = await post("/local/research/new", JSON.stringify({ title: "Mine", slug: "mine", kind: "memo" }));
    expect([created.status, await created.json()]).toEqual([200, { slug: "mine" }]);
    expect((await post("/local/research/new", JSON.stringify({ title: "Mine", slug: "Mine", kind: "memo" }))).status).toBe(400);
    expect((await post("/local/research/new", JSON.stringify({ title: "Mine", slug: "mine", kind: "memo" }))).status).toBe(409);
    expect((await post("/local/research/new", "nope")).status).toBe(400);
    const up = await post("/local/research/upload?slug=mine&role=figure&name=plot.png", PNG);
    expect([up.status, await up.json()]).toEqual([200, { slug: "mine", path: "reports/mine/figures/plot.png" }]);
    expect((await post("/local/research/upload?slug=mine&role=figure&name=plot.gif", PNG)).status).toBe(415);
    expect((await post("/local/research/upload?slug=mine&role=figure&name=..%2Fplot.png", PNG)).status).toBe(400);
    expect((await post("/local/research/upload?slug=shipped-paper&role=figure&name=plot.png", PNG)).status).toBe(403);
    expect((await post("/local/research/upload?slug=mine&role=figure&name=big.png", Buffer.concat([PNG, Buffer.alloc(UPLOAD_BYTES)]))).status).toBe(413);
    expect((await post("/local/research/upload?slug=mine&role=figure&name=huge.png", Buffer.alloc(UPLOAD_BODY_BYTES + 1))).status).toBe(413);
    const list = (await (await fetch(`${base}/local/research/list`, { headers })).json()) as { outputs: { slug: string; origin: string }[] };
    expect(list.outputs.map((o) => [o.slug, o.origin])).toEqual([["shipped-paper", "shipped"], ["mine", "local"]]);
    const img = await fetch(`${base}/local/research/file?slug=mine&path=${encodeURIComponent("reports/mine/figures/plot.png")}`, { headers });
    expect([img.status, img.headers.get("content-type")]).toEqual([200, "image/png"]);
    const plain = researchWorkRoutes(made.work);
    expect(((await plain["POST /local/research/new"](new Request("http://x/local/research/new", { method: "POST", body: "{}" }), new URL("http://x/local/research/new"))) as Response).status).toBe(409);
  });
});
