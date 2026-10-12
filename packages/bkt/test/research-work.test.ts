import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { encodeBlob, RESEARCH_SCHEMA, sha256, type PackedFile, type ReportRecord, type ResearchBlobs, type ResearchIndex } from "../src/pack/research";
import { Research, ResearchError, researchRoutes } from "../src/research";
import { clip, CELL_CHARS, pageOf, RECORD_SET_CAP, recordSetTable } from "../src/research-table";
import { EDIT_BYTES, EDIT_EXTS, FILE_BODY_BYTES, licences, PLAIN_STORE, ResearchWork, researchWorkRoutes, WorkConflict, type Change } from "../src/research-work";
import { startServe, type Serve } from "../src/serve";

const scratch: string[] = [];
function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bkt-work-${name}-`));
  scratch.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const TEX = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} of the paper.`).join("\n\n") + "\n";
const CSV = "id,title,licence,source\n1,Goldbach,CC BY-SA 4.0,https://example.org/a\n2,Twin primes,Apache-2.0,https://example.org/b\n";
const TSV = "id\tlicence\tsource\tstatement\n1\tCC0-1.0\thttps://example.org/s\tA staff statement.\n";
const FILES: Record<string, string | Buffer> = {
  "papers/demo/main.tex": TEX,
  "papers/demo/refs.bib": "@book{a, title={A}}\n",
  "public/papers/demo/data/rows.csv": CSV,
  "tools/demo/rows.tsv": TSV,
  "tools/demo/run.sh": "echo run\n",
  "public/papers/demo/fig.webp": Buffer.from([82, 73, 70, 70, 0, 1, 2, 255]),
  "reports/demo/report.json": '{"slug":"demo"}\n',
};

function pack(files: Record<string, string | Buffer> = FILES): { index: ResearchIndex; blobs: ResearchBlobs } {
  const blobs: ResearchBlobs["blobs"] = {};
  const listed: PackedFile[] = Object.entries(files).map(([path, body]) => {
    const bytes = Buffer.from(body);
    blobs[sha256(bytes)] = encodeBlob(bytes);
    return { path, sha256: sha256(bytes), size: bytes.length, audience: path.startsWith("tools/") ? "staff" : "public", role: "table" };
  });
  const manifest: ReportRecord = {
    schema: "bucket.report/2",
    slug: "demo",
    title: "A demo output",
    authors: ["Demo Author"],
    date: "2026-10-11",
    status: "public",
    kind: "paper",
    licence: "CC-BY-4.0",
    source_path: "papers/demo/main.tex",
    source_hash: sha256(Buffer.from(files["papers/demo/main.tex"])),
    tables: [
      { id: "rows", path: "public/papers/demo/data/rows.csv", format: "csv", label: "Public rows", licence: "mixed", licence_column: "licence", source_column: "source", audience: "public" },
      { id: "staff-rows", path: "tools/demo/rows.tsv", format: "tsv", label: "Staff rows", licence: "mixed", licence_column: "licence", source_column: "source", audience: "staff" },
    ],
    attributions: [
      { source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Demo", licence: "CC BY-SA 4.0", rows: 1, notice: "Text from Wikipedia." },
      { source: "formal-conjectures", url: "https://example.org/fc", licence: "Apache-2.0", rows: 1, notice: "Statements under Apache License 2.0." },
    ],
  };
  const version = sha256(JSON.stringify(listed)).slice(0, 16);
  return { index: { schema: RESEARCH_SCHEMA, version, staff: true, outputs: [{ slug: "demo", origin: "shipped", manifest, files: listed.sort((a, b) => (a.path < b.path ? -1 : 1)), withheld: 0 }] }, blobs: { version, blobs } };
}

function setup(o: { home?: string; files?: Record<string, string | Buffer>; caps?: { files: number; bytes: number } } = {}) {
  const p = pack(o.files);
  const home = o.home ?? temp("home");
  const research = new Research({ index: p.index, blobs: async () => p.blobs }, temp("cache"), home);
  const opened: string[] = [];
  const work = new ResearchWork(research, home, { now: () => Date.UTC(2026, 9, 11, 12, 30, 5), open: (dir) => opened.push(dir), caps: o.caps });
  return { research, work, home, opened, pack: p };
}

const rev = (body: string | Buffer) => sha256(Buffer.from(body));
const bytes = (s: string) => Buffer.from(s);
const MAIN = "papers/demo/main.tex";
const ROWS = "public/papers/demo/data/rows.csv";
const EDITED = TEX.replace("Paragraph 7 of the paper.", "Paragraph seven, rewritten on this computer.");

async function refused(run: () => Promise<unknown> | unknown): Promise<[number, string]> {
  try {
    await run();
  } catch (e) {
    expect(e).toBeInstanceOf(ResearchError);
    return [(e as ResearchError).status, (e as ResearchError).message];
  }
  return [0, ""];
}

describe("working copy", () => {
  test("copy on write", async () => {
    const { research, work, home } = setup();
    expect(research.list()[0].changed).toBe(0);
    expect(existsSync(join(home, "research"))).toBe(false);
    const done = await work.write("demo", MAIN, rev(TEX), bytes(EDITED));
    expect(done).toEqual({ path: MAIN, rev: rev(EDITED), changed: true });
    const file = join(home, "research/outputs/demo/work", MAIN);
    expect(readFileSync(file, "utf8")).toBe(EDITED);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    for (const dir of ["research", "research/outputs", "research/outputs/demo", "research/outputs/demo/work", "research/outputs/demo/work/papers/demo"]) expect({ dir, mode: statSync(join(home, dir)).mode & 0o777 }).toEqual({ dir, mode: 0o700 });
    expect(statSync(join(home, "research/outputs/demo/state.json")).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(join(home, "research/outputs/demo/state.json"), "utf8"))).toEqual({ files: { [MAIN]: { base: rev(TEX) } }, pack: research.version, schema: "bucket.research-work/1" });
    const read = await research.read("demo", MAIN);
    expect([read.bytes.toString("utf8"), read.entry.sha256, read.entry.size]).toEqual([EDITED, rev(EDITED), Buffer.byteLength(EDITED)]);
    expect((await research.read("demo", MAIN, { baseline: true })).bytes.toString("utf8")).toBe(TEX);
    expect((await research.read("demo", "papers/demo/refs.bib")).bytes.toString("utf8")).toBe("@book{a, title={A}}\n");
    expect(research.list()[0].changed).toBe(1);
    expect(readdirSync(join(home, "research/outputs/demo/work/papers/demo"))).toEqual(["main.tex"]);
    await work.write("demo", ROWS, rev(CSV), bytes(CSV.replace("Twin primes", "Twin prime conjecture")));
    const page = await research.table("demo", "rows", { page: 1, q: "", sort: null });
    expect(page.rows[1][1]).toBe("Twin prime conjecture");
    expect(research.list()[0].changed).toBe(2);
    const again = await work.write("demo", MAIN, rev(EDITED), bytes(`${EDITED}More.\n`));
    expect(again.rev).toBe(rev(`${EDITED}More.\n`));
    expect(JSON.parse(readFileSync(join(home, "research/outputs/demo/state.json"), "utf8")).files[MAIN]).toEqual({ base: rev(TEX) });
    const back = await work.write("demo", MAIN, again.rev, bytes(TEX));
    expect(back).toEqual({ path: MAIN, rev: rev(TEX), changed: false });
    expect(existsSync(file)).toBe(false);
    expect(research.list()[0].changed).toBe(1);
  });

  test("revert", async () => {
    const { research, work, home } = setup();
    await work.write("demo", MAIN, rev(TEX), bytes(EDITED));
    expect(await work.revert("demo", MAIN)).toEqual({ path: MAIN, changed: 0 });
    expect(existsSync(join(home, "research/outputs/demo/work", MAIN))).toBe(false);
    expect((await research.read("demo", MAIN)).bytes.toString("utf8")).toBe(TEX);
    expect(await work.changes("demo")).toEqual([]);
    expect(await refused(() => work.revert("demo", MAIN))).toEqual([404, "that file has no edit"]);
    expect((await refused(() => work.revert("demo", "../x")))[0]).toBe(400);
  });

  test("diff hunks", async () => {
    const { work } = setup();
    await work.write("demo", MAIN, rev(TEX), bytes(EDITED));
    await work.write("demo", ROWS, rev(CSV), bytes(`${CSV}3,Collatz,CC BY-SA 4.0,https://example.org/c\n`));
    const changes = await work.changes("demo");
    expect(changes.map((c) => [c.path, c.state, c.added, c.removed])).toEqual([[MAIN, "edited", 1, 1], [ROWS, "edited", 1, 0]]);
    const main = changes[0];
    expect([main.base, main.shipped, main.current, main.size, main.shippedSize]).toEqual([rev(TEX), rev(TEX), rev(EDITED), Buffer.byteLength(EDITED), Buffer.byteLength(TEX)]);
    expect(main.hunks!.length).toBe(1);
    expect(main.hunks![0].lines.filter((l) => l.op !== " ").map((l) => `${l.op}${l.text}`)).toEqual(["-Paragraph 7 of the paper.", "+Paragraph seven, rewritten on this computer."]);
    const big = setup({ files: { ...FILES, "papers/demo/main.tex": `${"x".repeat(99)}\n`.repeat(21_500) } });
    const base = `${"x".repeat(99)}\n`.repeat(21_500);
    await big.work.write("demo", MAIN, rev(base), bytes(`${base}tail\n`));
    const large = (await big.work.changes("demo"))[0];
    expect([large.hunks, large.added, large.removed, large.current === rev(`${base}tail\n`)]).toEqual([null, 0, 0, true]);
  });

  test("stale base_rev answers 409", async () => {
    const { work } = setup();
    const first = bytes(EDITED);
    await work.write("demo", MAIN, rev(TEX), first);
    const stale = work.write("demo", MAIN, rev(TEX), bytes(`${TEX}window two\n`));
    await expect(stale).rejects.toBeInstanceOf(WorkConflict);
    await stale.catch((e: WorkConflict) => expect([e.status, e.current]).toEqual([409, rev(EDITED)]));
    const [a, b] = await Promise.allSettled([work.write("demo", ROWS, rev(CSV), bytes(`${CSV}a\n`)), work.write("demo", ROWS, rev(CSV), bytes(`${CSV}b\n`))]);
    expect([a.status, b.status]).toEqual(["fulfilled", "rejected"]);
    expect((await work.changes("demo")).find((c) => c.path === ROWS)!.current).toBe(rev(`${CSV}a\n`));
    expect((await refused(() => work.write("demo", MAIN, null, first)))[0]).toBe(400);
    expect((await refused(() => work.write("demo", MAIN, "abc", first)))[0]).toBe(400);
    const forced = await work.write("demo", MAIN, rev(EDITED), bytes(`${TEX}window two\n`));
    expect(forced.changed).toBe(true);
  });

  test("a crash between file and state reconciles on open", async () => {
    const { home, work } = setup();
    await work.write("demo", MAIN, rev(TEX), bytes(EDITED));
    const dir = join(home, "research/outputs/demo");
    mkdirSync(join(dir, "work/public/papers/demo/data"), { recursive: true });
    writeFileSync(join(dir, "work", ROWS), `${CSV}orphan\n`);
    writeFileSync(join(dir, "work/papers/demo/main.tex.tmp-123-abcd"), "half written");
    const state = JSON.parse(readFileSync(join(dir, "state.json"), "utf8")) as { files: Record<string, unknown> };
    state.files["papers/demo/refs.bib"] = { base: "0".repeat(64) };
    state.files["../../escape"] = { base: null };
    writeFileSync(join(dir, "state.json"), JSON.stringify(state));
    const again = setup({ home });
    const changes = await again.work.changes("demo");
    expect(changes.map((c) => [c.path, c.state, c.base])).toEqual([[MAIN, "edited", rev(TEX)], [ROWS, "base-unknown", null]]);
    expect(Object.keys((JSON.parse(readFileSync(join(dir, "state.json"), "utf8")) as { files: object }).files).sort()).toEqual([MAIN, ROWS]);
    expect(again.research.list()[0].changed).toBe(2);
    writeFileSync(join(dir, "state.json"), "{broken");
    const third = setup({ home });
    expect((await third.work.changes("demo")).map((c) => c.state)).toEqual(["base-unknown", "base-unknown"]);
    expect(await third.work.revert("demo", ROWS, true)).toEqual({ path: ROWS, changed: 2 });
    expect((await third.work.changes("demo")).map((c) => c.state)).toEqual(["base-unknown", "edited"]);
  });

  test("shipped report.json is refused", async () => {
    const { work, home } = setup();
    expect(await refused(() => work.write("demo", "reports/demo/report.json", rev('{"slug":"demo"}\n'), bytes("{}")))).toEqual([403, "the record of a shipped output is read-only"]);
    expect(await refused(() => work.revert("demo", "reports/demo/report.json"))).toEqual([403, "the record of a shipped output is read-only"]);
    expect(existsSync(join(home, "research"))).toBe(false);
  });

  test("drift after a new pack version", async () => {
    const first = setup();
    await first.work.write("demo", MAIN, rev(TEX), bytes(EDITED));
    await first.work.write("demo", ROWS, rev(CSV), bytes(`${CSV}mine\n`));
    const shippedNow = `${TEX}A paragraph the next release added.\n`;
    const next = setup({ home: first.home, files: { ...FILES, [MAIN]: shippedNow } });
    expect(next.research.version).not.toBe(first.research.version);
    const changes = await next.work.changes("demo");
    expect(changes.map((c) => [c.path, c.state])).toEqual([[MAIN, "shipped-changed"], [ROWS, "edited"]]);
    expect([changes[0].base, changes[0].shipped]).toEqual([rev(TEX), rev(shippedNow)]);
    expect((await next.research.read("demo", MAIN)).bytes.toString("utf8")).toBe(EDITED);
    expect(await next.work.revert("demo", MAIN, true)).toEqual({ path: MAIN, changed: 2 });
    const kept = (await next.work.changes("demo"))[0];
    expect([kept.state, kept.base, kept.added > 0 || kept.removed > 0]).toEqual(["edited", rev(shippedNow), true]);
    expect((await next.research.read("demo", MAIN)).bytes.toString("utf8")).toBe(EDITED);
    const other = setup({ home: first.home, files: { ...FILES, [MAIN]: `${shippedNow}And one more.\n` } });
    expect((await other.work.changes("demo"))[0].state).toBe("shipped-changed");
    await other.work.revert("demo", MAIN);
    expect((await other.research.read("demo", MAIN)).bytes.toString("utf8")).toBe(`${shippedNow}And one more.\n`);
    expect((await other.work.changes("demo")).map((c) => c.path)).toEqual([ROWS]);
  });

  test("write refusals: file kinds, traversal, symlinks, bytes that are no text, and the working copy caps", async () => {
    const { work, home } = setup();
    const ok = bytes("x\n");
    expect((await refused(() => work.write("demo", "tools/demo/run.sh", rev("echo run\n"), ok)))[0]).toBe(415);
    expect((await refused(() => work.write("demo", "public/papers/demo/fig.webp", "0".repeat(64), ok)))[0]).toBe(415);
    expect(await refused(() => work.write("demo", "papers/demo/absent.tex", rev(TEX), ok))).toEqual([404, "the output does not list that file"]);
    for (const path of ["../../.bashrc", "/etc/passwd", "papers/../papers/demo/main.tex", "papers\\demo\\main.tex", ".git/config", "papers/demo/main.tex\0", "", "a/b/c/d/e/f/g/h/i.tex"]) expect({ path, status: (await refused(() => work.write("demo", path, rev(TEX), ok)))[0] }).toEqual({ path, status: 400 });
    expect((await refused(() => work.write("demo", null, rev(TEX), ok)))[0]).toBe(400);
    expect((await refused(() => work.write("../demo", MAIN, rev(TEX), ok)))[0]).toBe(400);
    expect((await refused(() => work.write("other", MAIN, rev(TEX), ok)))[0]).toBe(404);
    expect(await refused(() => work.write("demo", MAIN, rev(TEX), Buffer.from([0xff, 0xfe, 0x00])))).toEqual([415, "an edit is text; this one holds bytes that are no text"]);
    expect((await refused(() => work.write("demo", MAIN, rev(TEX), Buffer.from("a\0b"))))[0]).toBe(415);
    expect(await refused(() => work.write("demo", MAIN, rev(TEX), Buffer.alloc(EDIT_BYTES + 1, "a")))).toEqual([413, "the edit is over the 4 MB limit"]);
    expect(existsSync(join(home, "research"))).toBe(false);
    expect(EDIT_EXTS).toEqual([".md", ".tex", ".bib", ".sty", ".tsv", ".csv", ".json", ".jsonl", ".py", ".txt", ".lean"]);

    const outside = temp("outside");
    const linkedRoot = setup();
    symlinkSync(outside, join(linkedRoot.home, "research"));
    expect((await refused(() => linkedRoot.work.write("demo", MAIN, rev(TEX), bytes(EDITED))))[0]).toBe(403);
    const linkedDir = setup();
    mkdirSync(join(linkedDir.home, "research/outputs/demo/work"), { recursive: true });
    symlinkSync(outside, join(linkedDir.home, "research/outputs/demo/work/papers"));
    expect((await refused(() => linkedDir.work.write("demo", MAIN, rev(TEX), bytes(EDITED))))[0]).toBe(403);
    const linkedFile = setup();
    mkdirSync(join(linkedFile.home, "research/outputs/demo/work/papers/demo"), { recursive: true });
    writeFileSync(join(outside, "victim.tex"), "keep me");
    symlinkSync(join(outside, "victim.tex"), join(linkedFile.home, "research/outputs/demo/work", MAIN));
    expect((await refused(() => linkedFile.work.write("demo", MAIN, rev(TEX), bytes(EDITED))))[0]).toBe(403);
    expect(readFileSync(join(outside, "victim.tex"), "utf8")).toBe("keep me");
    expect(readdirSync(outside)).toEqual(["victim.tex"]);
    expect((await linkedFile.research.read("demo", MAIN)).bytes.toString("utf8")).toBe(TEX);
    expect(await linkedFile.work.changes("demo")).toEqual([]);

    const small = setup({ caps: { files: 1, bytes: 3000 } });
    await small.work.write("demo", MAIN, rev(TEX), bytes(EDITED));
    expect(await refused(() => small.work.write("demo", ROWS, rev(CSV), bytes(`${CSV}x\n`)))).toEqual([413, "the working copy holds 2,000 files, which is its limit"]);
    expect(await refused(() => small.work.write("demo", MAIN, rev(EDITED), Buffer.alloc(3001, "a")))).toEqual([413, "the working copy is over the 256 MB limit"]);
  });
});

describe("export", () => {
  function tree(files: Record<string, string | Buffer>): string {
    const dir = temp("tree");
    Bun.spawnSync(["git", "init", "-q"], { cwd: dir });
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), body);
    }
    return dir;
  }

  test("CHANGES.patch applies with git apply --check to a fixture tree", async () => {
    const { work, home, opened } = setup();
    const rowsNow = CSV.replace("2,Twin primes", "2,Twin prime conjecture");
    await work.write("demo", MAIN, rev(TEX), bytes(EDITED));
    await work.write("demo", ROWS, rev(CSV), bytes(rowsNow));
    const out = await work.exportOutput("demo");
    expect(out.dir).toBe(join(home, "research/exports/demo-20261011T123005"));
    expect(out.files).toEqual(["CHANGES.patch", "LICENCES.md", MAIN, ROWS, "report.json"].sort());
    expect(opened).toEqual([out.dir]);
    for (const f of out.files) expect({ f, mode: statSync(join(out.dir, f)).mode & 0o777 }).toEqual({ f, mode: 0o600 });
    expect(statSync(out.dir).mode & 0o777).toBe(0o700);
    expect(readFileSync(join(out.dir, MAIN), "utf8")).toBe(EDITED);
    const repo = tree(FILES);
    const patch = join(out.dir, "CHANGES.patch");
    const check = Bun.spawnSync(["git", "apply", "--check", patch], { cwd: repo, stderr: "pipe" });
    expect(check.stderr.toString() + check.exitCode).toBe("0");
    expect(Bun.spawnSync(["git", "apply", patch], { cwd: repo }).exitCode).toBe(0);
    expect(readFileSync(join(repo, MAIN), "utf8")).toBe(EDITED);
    expect(readFileSync(join(repo, ROWS), "utf8")).toBe(rowsNow);
    expect(readFileSync(join(repo, "tools/demo/rows.tsv"), "utf8")).toBe(TSV);
    const record = readFileSync(join(out.dir, "report.json"), "utf8");
    const parsed = JSON.parse(record) as ReportRecord;
    expect(parsed.source_hash).toBe(rev(EDITED));
    expect(record.endsWith("}\n")).toBe(true);
    expect(Object.keys(parsed)).toEqual(Object.keys(parsed).sort());
    const text = readFileSync(join(out.dir, "LICENCES.md"), "utf8");
    expect(text).toContain("| Wikipedia | https://en.wikipedia.org/wiki/Demo | CC BY-SA 4.0 | 1 | Text from Wikipedia. |");
    expect(text).toContain("Rows under CC BY-SA 4.0 keep that licence in every copy and every edit.");
    expect(text).toContain(`- \`${ROWS}\``);
    expect(readFileSync(patch, "utf8")).toContain("-2,Twin primes,Apache-2.0,https://example.org/b\n+2,Twin prime conjecture,Apache-2.0,https://example.org/b");
    const second = await work.exportOutput("demo");
    expect(second.dir).toBe(`${out.dir}-2`);
    expect(licences({ ...parsed, attributions: [], tables: [] }, [])).not.toContain("Share-alike");
  });

  test("export refuses a table with the licence column removed", async () => {
    const { work, home } = setup();
    await work.write("demo", ROWS, rev(CSV), bytes("id,title,source\n1,Goldbach,https://example.org/a\n"));
    expect(await refused(() => work.exportOutput("demo"))).toEqual([422, "Public rows lost its licence column, and each row must keep its licence and source"]);
    await work.write("demo", ROWS, rev("id,title,source\n1,Goldbach,https://example.org/a\n"), bytes("id,title,licence\n1,Goldbach,CC0-1.0\n"));
    expect((await refused(() => work.exportOutput("demo")))[1]).toContain("lost its source column");
    expect(existsSync(join(home, "research/exports"))).toBe(false);
    await work.write("demo", ROWS, rev("id,title,licence\n1,Goldbach,CC0-1.0\n"), bytes('"id","licence","source","title"\n1,CC0-1.0,u,Goldbach\n'));
    expect((await work.exportOutput("demo")).files).toContain(ROWS);
    const staff = setup();
    await staff.work.write("demo", "tools/demo/rows.tsv", rev(TSV), bytes("id\tstatement\n1\tx\n"));
    expect((await refused(() => staff.work.exportOutput("demo")))[1]).toBe("Staff rows lost its licence column, and each row must keep its licence and source");
    const none = setup();
    expect(await refused(() => none.work.exportOutput("demo"))).toEqual([409, "this output has no edit to export"]);
  });
});

describe("working copy routes", () => {
  let s: Serve | null = null;
  afterEach(() => {
    s?.stop();
    s = null;
  });

  async function served() {
    const made = setup();
    const ME = 4242;
    const token = "c".repeat(43);
    s = startServe({ uid: ME, resolvePeerUid: () => ME, cliToken: token, routes: { ...researchRoutes(made.research), ...researchWorkRoutes(made.work) }, routeBodyBytes: { "POST /local/research/file": FILE_BODY_BYTES } });
    const base = `http://127.0.0.1:${s.port}`;
    const headers = { host: `127.0.0.1:${s.port}`, authorization: `Bucket ${token}` };
    const put = (path: string, baseRev: string, body: Uint8Array, auth = true) =>
      fetch(`${base}/local/research/file?slug=demo&path=${encodeURIComponent(path)}&base_rev=${baseRev}`, { method: "POST", headers: { ...(auth ? headers : { host: headers.host }), "content-length": String(body.length) }, body: body as Uint8Array<ArrayBuffer> });
    const post = (route: string, body: unknown) => fetch(`${base}/local/research/${route}`, { method: "POST", headers: { ...headers, "content-type": "application/json", "content-length": String(JSON.stringify(body).length) }, body: JSON.stringify(body) });
    const get = (path: string) => fetch(`${base}${path}`, { headers });
    return { ...made, put, post, get };
  }

  test("a 4 MB edit is accepted and a 5 MB edit answers 413", async () => {
    const { put, get } = await served();
    const four = Buffer.alloc(EDIT_BYTES, "a");
    const ok = await put(MAIN, rev(TEX), four);
    expect([ok.status, ((await ok.json()) as { rev: string }).rev]).toEqual([200, rev(four)]);
    expect((await put(MAIN, rev(four), Buffer.alloc(5 * 1024 * 1024, "a"))).status).toBe(413);
    expect((await put(MAIN, rev(four), Buffer.alloc(EDIT_BYTES + 1, "a"))).status).toBe(413);
    const changes = (await (await get("/local/research/changes?slug=demo")).json()) as { notice: string; changes: Change[] };
    expect([changes.notice, changes.changes.length, changes.changes[0].hunks]).toEqual([PLAIN_STORE, 1, null]);
    expect(FILE_BODY_BYTES).toBe(4 * 1024 * 1024 + 64 * 1024);
  });

  test("the routes save, answer 409 with the current version, revert and export", async () => {
    const { put, post, get, home } = await served();
    expect((await put(MAIN, rev(TEX), bytes(EDITED), false)).status).toBe(401);
    expect((await put(MAIN, rev(TEX), bytes(EDITED))).status).toBe(200);
    const stale = await put(MAIN, rev(TEX), bytes("other window"));
    expect([stale.status, await stale.json()]).toEqual([409, { error: "the file changed since it was opened", current: rev(EDITED) }]);
    expect((await put("reports/demo/report.json", "0".repeat(64), bytes("{}"))).status).toBe(403);
    expect((await put("tools/demo/run.sh", "0".repeat(64), bytes("x"))).status).toBe(415);
    expect((await put("../x.tex", "0".repeat(64), bytes("x"))).status).toBe(400);
    expect(await (await get(`/local/research/file?slug=demo&path=${encodeURIComponent(MAIN)}`)).text()).toBe(EDITED);
    const list = (await (await get("/local/research/list")).json()) as { outputs: { changed: number }[] };
    expect(list.outputs[0].changed).toBe(1);
    const exported = await post("export", { slug: "demo" });
    expect(exported.status).toBe(200);
    expect(((await exported.json()) as { files: string[] }).files).toContain("CHANGES.patch");
    expect((await post("export", { slug: "nope" })).status).toBe(404);
    expect((await post("revert", { slug: "demo", path: MAIN })).status).toBe(200);
    expect((await post("revert", { slug: "demo", path: MAIN })).status).toBe(404);
    expect((await post("revert", { path: MAIN })).status).toBe(400);
    expect((await post("export", { slug: "demo" })).status).toBe(409);
    expect(((await (await get("/local/research/changes?slug=demo")).json()) as { changes: Change[] }).changes).toEqual([]);
    expect((await get("/local/research/changes?slug=../x")).status).toBe(400);
    expect(readdirSync(join(home, "research/exports")).length).toBe(1);
  });
});

describe("table caps", () => {
  test("a record set stops at 2,000 members and a page clips long cells", () => {
    const files = Array.from({ length: RECORD_SET_CAP + 5 }, (_, i) => ({ path: `r/${i}.json`, text: `{"title":"T${i}"}` }));
    const set = recordSetTable(files);
    expect([set.rows.length, set.truncated]).toEqual([RECORD_SET_CAP, true]);
    expect(recordSetTable(files.slice(0, 3)).truncated).toBe(false);
    const long = "s".repeat(CELL_CHARS + 500);
    const page = pageOf({ columns: ["a"], rows: [[long], ["needle at the end"]], truncated: false }, { page: 1, q: "", sort: null });
    expect([page.rows[0][0].length, page.rows[0][0].endsWith("…"), page.rows[1][0]]).toEqual([CELL_CHARS + 1, true, "needle at the end"]);
    expect(pageOf({ columns: ["a"], rows: [[`${long}tail`]], truncated: false }, { page: 1, q: "tail", sort: null }).total).toBe(1);
    expect(clip("short")).toBe("short");
  });
});
