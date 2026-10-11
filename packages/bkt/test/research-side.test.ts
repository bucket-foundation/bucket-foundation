import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { installLines, readSidePack, researchInstall } from "../src/cli/research";
import { buildResearchPack, encodeBlob, loadReportLib, PACK_CAPS, readRecords, sha256, SIDE_SCHEMA, sidePack, type ResearchPack, type ResearchSidePack } from "../src/pack/research";
import { checkSidePack, installSidePack, readInstalled, Research, ResearchError, researchRoutes, SIDE_PACK_BYTES, staffRoot } from "../src/research";
import { pageOf, PAGE_ROWS, parseQuery, parseTable, recordSetTable, TABLE_ROW_CAP, TableCache, TableError } from "../src/research-table";
import { startServe, type Serve } from "../src/serve";

const REPO = resolve(import.meta.dir, "../../..");
const ATLAS = "solvability-frontier";
const SOURCED = "tools/solvability-atlas/problems-sourced.tsv";
const DENIED = ["k", "r", "u", "s", "e"].join("");
let open: ResearchPack;
let full: ResearchPack;
let side: ResearchSidePack;
let sideBytes: Uint8Array;
const scratch: string[] = [];

function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bkt-side-${name}-`));
  scratch.push(dir);
  return dir;
}

beforeAll(async () => {
  const lib = await loadReportLib(REPO);
  const records = readRecords(REPO);
  open = buildResearchPack(REPO, records, { lib, env: {} });
  full = buildResearchPack(REPO, records, { lib, env: { BKT_INCLUDE_STAFF_DATA: "1" } });
  side = sidePack(full);
  sideBytes = Buffer.from(JSON.stringify(side));
});

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const bytesOf = (p: ResearchSidePack) => Buffer.from(JSON.stringify(p));
const restamp = (p: ResearchSidePack): ResearchSidePack => ({ ...p, version: sha256(JSON.stringify(p.outputs)).slice(0, 16) });
const clone = (): ResearchSidePack => JSON.parse(JSON.stringify(side)) as ResearchSidePack;
const engine = (pack: ResearchPack, home: string | null, errors: string[] = []) => new Research({ index: pack.index, blobs: async () => pack.blobs }, temp("cache"), home, (e) => errors.push(e.message));
const refusal = (run: () => unknown): [number, string] => {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(ResearchError);
    return [(e as ResearchError).status, (e as ResearchError).message];
  }
  return [0, ""];
};
const query = (o: { page?: number; q?: string; sort?: string | null } = {}) => ({ page: o.page ?? 1, q: o.q ?? "", sort: o.sort ?? null });

describe("research tables", () => {
  test("tsv, csv and JSON array parsing", () => {
    expect(parseTable("tsv", "id\tname\n1\tOne\n2\tTwo \"quoted\"\n")).toEqual({ columns: ["id", "name"], rows: [["1", "One"], ["2", 'Two "quoted"']], truncated: false });
    expect(parseTable("csv", "id,name\r\n1,One\r\n2,Two\r\n")).toEqual({ columns: ["id", "name"], rows: [["1", "One"], ["2", "Two"]], truncated: false });
    expect(parseTable("csv", "﻿id,name\n1,One")).toEqual({ columns: ["id", "name"], rows: [["1", "One"]], truncated: false });
    expect(parseTable("json", '[{"id":1,"name":"One"},{"id":2,"tags":["a","b"],"ok":true,"none":null}]')).toEqual({ columns: ["id", "name", "tags", "ok", "none"], rows: [["1", "One", "", "", ""], ["2", "", '["a","b"]', "true", ""]], truncated: false });
    expect(parseTable("json", "[1,\"two\",null]")).toEqual({ columns: ["value"], rows: [["1"], ["two"], [""]], truncated: false });
    expect(parseTable("json", '{"schema":"x","rows":3,"nested":{"a":1}}')).toEqual({ columns: ["key", "value"], rows: [["schema", "x"], ["rows", "3"], ["nested", '{"a":1}']], truncated: false });
    expect(parseTable("jsonl", '{"id":1}\n\n{"id":2,"x":"y"}\n')).toEqual({ columns: ["id", "x"], rows: [["1", ""], ["2", "y"]], truncated: false });
    expect(parseTable("tsv", "a\tb\n1\n2\t3\t4\n").rows).toEqual([["1", ""], ["2", "3"]]);
    expect(parseTable("tsv", "")).toEqual({ columns: [], rows: [], truncated: false });
    expect(() => parseTable("json", "{broken")).toThrow(TableError);
    expect(() => parseTable("jsonl", '{"id":1}\nnope')).toThrow("the table does not parse");
    const capped = parseTable("tsv", `n\n${Array.from({ length: 12 }, (_, i) => i).join("\n")}\n`, 10);
    expect([capped.rows.length, capped.truncated]).toEqual([10, true]);
    expect(parseTable("json", JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ i }))), 10).truncated).toBe(true);
    expect(TABLE_ROW_CAP).toBe(200_000);
  });

  test("quoted cells", () => {
    const t = parseTable("csv", 'id,title,note\n1,"Goldbach, weak form","said ""yes"""\n2,"two\nlines",plain\n3,,"trailing"\n4,mid"quote,x');
    expect(t.rows).toEqual([["1", "Goldbach, weak form", 'said "yes"'], ["2", "two\nlines", "plain"], ["3", "", "trailing"], ["4", 'mid"quote', "x"]]);
    const real = parseTable("csv", readFileSync(join(REPO, "public/papers/solvability-frontier/data/predictions.csv"), "utf8"));
    expect(real.columns.slice(0, 5)).toEqual(["id", "title", "branch", "status", "class"]);
    expect(real.rows.length).toBe(2085);
    expect(real.rows.every((r) => r.length === real.columns.length)).toBe(true);
    expect(real.rows.find((r) => r[0] === "fc-oeis-945-every-prime-occurs")![1]).toBe("OEIS A945, every prime occurs");
  });

  test("paging, filter, sort", () => {
    const rows = Array.from({ length: 120 }, (_, i) => [String(i), i % 2 ? "odd" : "even", i === 7 ? "" : String(1000 - i), `Row ${i}`]);
    const t = { columns: ["n", "parity", "score", "title"], rows, truncated: false };
    const first = pageOf(t, query());
    expect([first.rows.length, first.total, first.page, first.size, first.index[0]]).toEqual([PAGE_ROWS, 120, 1, 50, 0]);
    expect(pageOf(t, query({ page: 3 })).rows.map((r) => r[0])).toEqual(Array.from({ length: 20 }, (_, i) => String(100 + i)));
    expect(pageOf(t, query({ page: 4 })).rows).toEqual([]);
    const odd = pageOf(t, query({ q: "ODD" }));
    expect([odd.total, odd.rows[0][0], odd.index[1]]).toEqual([60, "1", 3]);
    expect(pageOf(t, query({ q: "row 11" })).rows.map((r) => r[0])).toEqual(["11", "110", "111", "112", "113", "114", "115", "116", "117", "118", "119"]);
    expect(pageOf(t, query({ q: "nothing here" })).total).toBe(0);
    expect(pageOf(t, query({ sort: "-n" })).rows[0][0]).toBe("119");
    expect(pageOf(t, query({ sort: "n" })).rows.slice(0, 3).map((r) => r[0])).toEqual(["0", "1", "2"]);
    expect(pageOf(t, query({ sort: "title" })).rows.slice(0, 3).map((r) => r[3])).toEqual(["Row 0", "Row 1", "Row 10"]);
    expect(pageOf(t, query({ sort: "score" })).rows[0][0]).toBe("119");
    expect(pageOf(t, query({ sort: "score", page: 3 })).rows.at(-1)![0]).toBe("7");
    expect(pageOf(t, query({ sort: "-score", page: 3 })).rows.at(-1)![0]).toBe("7");
    expect(pageOf(t, query({ sort: "parity", q: "row 1" })).rows[0][1]).toBe("even");
    expect(() => pageOf(t, query({ sort: "missing" }))).toThrow("the table has no such column");
    expect(parseQuery(new URLSearchParams("page=2&q=abc&sort=-n"))).toEqual({ page: 2, q: "abc", sort: "-n" });
    expect(parseQuery(new URLSearchParams(""))).toEqual({ page: 1, q: "", sort: null });
    for (const bad of ["page=0", "page=-1", "page=1.5", "page=abc", "page=12345678", `q=${"x".repeat(201)}`]) expect(() => parseQuery(new URLSearchParams(bad))).toThrow(TableError);
  });

  test("the table cache keeps four tables and parses each once", () => {
    const cache = new TableCache();
    let parses = 0;
    const make = () => (parses++, { columns: [], rows: [], truncated: false });
    for (const key of ["a", "b", "c", "d", "a", "e"]) cache.get(key, make);
    expect([parses, cache.size, cache.has("b"), cache.has("a")]).toEqual([5, 4, false, true]);
  });
});

describe("staff side pack", () => {
  test("the side pack holds the staff entries alone, and a public build cannot make one", () => {
    expect(side.schema).toBe(SIDE_SCHEMA);
    expect(side.outputs.flatMap((o) => o.files).every((f) => f.audience === "staff")).toBe(true);
    expect(side.outputs.map((o) => o.slug).sort()).toEqual(["learning-system-brief", ATLAS, "solver-gap-engine"].sort());
    const shipped = new Set(open.index.outputs.flatMap((o) => o.files.map((f) => f.path)));
    expect(side.outputs.flatMap((o) => o.files).filter((f) => shipped.has(f.path))).toEqual([]);
    expect(Object.keys(side.blobs).length).toBeLessThan(Object.keys(full.blobs.blobs).length);
    expect(sideBytes.length).toBeLessThan(SIDE_PACK_BYTES);
    expect(() => sidePack(open)).toThrow("BKT_INCLUDE_STAFF_DATA=1");
    expect(checkSidePack(sideBytes).version).toBe(side.version);
  });

  test("install writes under the data folder at 0600 and the engine then reads shipped plus side pack", async () => {
    const home = temp("home");
    const before = engine(open, home);
    expect(before.detail(ATLAS).staff).toBe(false);
    expect(before.detail(ATLAS).withheld).toBeGreaterThan(0);
    await expect(before.read(ATLAS, SOURCED)).rejects.toThrow("the output does not list that file");
    const done = installSidePack(home, sideBytes);
    expect(done).toEqual({ version: side.version, outputs: 3, files: side.outputs.reduce((n, o) => n + o.files.length, 0) });
    const dest = join(staffRoot(home), side.version);
    expect(statSync(dest).mode & 0o777).toBe(0o700);
    expect(statSync(join(dest, "files", SOURCED)).mode & 0o777).toBe(0o600);
    expect(statSync(join(dest, "index.json")).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(staffRoot(home), "current"), "utf8")).toBe(side.version);
    expect(readdirSync(staffRoot(home)).sort()).toEqual(["current", side.version].sort());
    before.reload();
    const merged = before.detail(ATLAS);
    const whole = full.index.outputs.find((o) => o.slug === ATLAS)!;
    expect([merged.staff, merged.withheld, merged.unreadable, merged.origin]).toEqual([true, 0, null, "shipped"]);
    expect(merged.files.map((f) => [f.path, f.sha256])).toEqual(whole.files.map((f) => [f.path, f.sha256]));
    expect(merged.manifest).toEqual(whole.manifest);
    expect(before.list().map((r) => [r.slug, r.origin]).sort()).toEqual(full.index.outputs.map((o) => [o.slug, o.origin]).sort());
    expect((await before.read(ATLAS, SOURCED)).bytes.length).toBe(statSync(join(REPO, SOURCED)).size);
    expect((await before.read(ATLAS, "public/atlas/04-helix.webp")).type).toBe("image/webp");
    expect(before.staffVersion).toBe(side.version);
    expect(installSidePack(home, sideBytes).version).toBe(side.version);
    const fresh = engine(open, home);
    expect(fresh.detail("solver-gap-engine").origin).toBe("staff");
    writeFileSync(join(dest, "files", SOURCED), "id\tlicence\n");
    await expect(fresh.read(ATLAS, SOURCED)).rejects.toThrow("changed on disk");
    expect(engine(open, null).detail(ATLAS).staff).toBe(false);
  });

  test("install refuses a side pack with a bad hash", () => {
    const home = temp("home");
    const forged = clone();
    const file = forged.outputs.find((o) => o.slug === ATLAS)!.files.find((f) => f.path === SOURCED)!;
    forged.blobs[file.sha256] = encodeBlob(Buffer.from("id\tstatement\n1\tswapped\n"));
    expect(refusal(() => installSidePack(home, bytesOf(forged)))).toEqual([422, `${ATLAS}: ${SOURCED} does not match its hash`]);
    const gone = clone();
    delete gone.blobs[file.sha256];
    expect(refusal(() => installSidePack(home, bytesOf(gone)))[1]).toBe(`${ATLAS}: ${SOURCED} is missing from the side pack`);
    const edited = clone();
    edited.outputs[0].manifest.title = "Another title";
    expect(refusal(() => installSidePack(home, bytesOf(edited)))[1]).toBe("the side pack does not match its version");
    const sized = clone();
    sized.outputs[0].files[0].size += 1;
    expect(refusal(() => installSidePack(home, bytesOf(restamp(sized))))[1]).toContain("does not match its hash");
    expect(refusal(() => installSidePack(home, Buffer.from("{not json")))[1]).toBe("the side pack does not parse");
    expect(refusal(() => installSidePack(home, Buffer.from(JSON.stringify({ ...side, schema: "bucket.research-pack/1" }))))[1]).toBe("the file is not a research side pack");
    expect(refusal(() => installSidePack(home, Buffer.from(JSON.stringify({ ...side, version: "../../etc" }))))[1]).toBe("the side pack has no valid version");
    expect(existsSync(join(home, "research"))).toBe(false);
  });

  test("install refuses an entry path that fails the guard", () => {
    const home = temp("home");
    for (const path of ["../../.ssh/authorized_keys", "/etc/cron.d/x", "tools/../../x", ".bashrc", "tools\\x", "tools/a\0b", "a/b/c/d/e/f/g/h/i.txt", "tools/a b.tsv", ""]) {
      const bad = clone();
      bad.outputs[0].files[0].path = path;
      const [status, message] = refusal(() => installSidePack(home, bytesOf(restamp(bad))));
      expect({ path, status, refused: message.length > 0 }).toEqual({ path, status: 422, refused: true });
    }
    const slug = clone();
    slug.outputs[0].slug = "../up";
    expect(refusal(() => installSidePack(home, bytesOf(restamp(slug))))[1]).toBe("the side pack holds an output name that is refused");
    const twice = clone();
    twice.outputs[0].files.push(twice.outputs[0].files[0]);
    expect(refusal(() => installSidePack(home, bytesOf(restamp(twice))))[1]).toContain("is listed twice");
    const shipped = clone();
    shipped.outputs[0].files[0].audience = "public";
    expect(refusal(() => installSidePack(home, bytesOf(restamp(shipped))))[1]).toContain("is not a staff entry");
    const named = clone();
    named.outputs[0].manifest.title = `Notes on ${DENIED}`;
    expect(refusal(() => installSidePack(home, bytesOf(restamp(named))))[1]).toBe("the side pack names a denied source");
    const quoted = clone();
    const target = quoted.outputs[0].files.find((f) => quoted.blobs[f.sha256].enc === "utf8")!;
    const body = Buffer.from(`${DENIED.toUpperCase()} text`);
    quoted.blobs[sha256(body)] = encodeBlob(body);
    target.sha256 = sha256(body);
    target.size = body.length;
    expect(refusal(() => installSidePack(home, bytesOf(restamp(quoted))))[1]).toContain("quotes a denied source");
    expect(existsSync(join(home, "research"))).toBe(false);
  });

  test("install refuses symlinks in the data folder and packs over the size caps", () => {
    const outside = temp("outside");
    const linkedResearch = temp("home");
    symlinkSync(outside, join(linkedResearch, "research"));
    expect(refusal(() => installSidePack(linkedResearch, sideBytes))[0]).toBe(403);
    const linkedStaff = temp("home");
    mkdirSync(join(linkedStaff, "research"));
    symlinkSync(outside, join(linkedStaff, "research", "staff"));
    expect(refusal(() => installSidePack(linkedStaff, sideBytes))[0]).toBe(403);
    const linkedVersion = temp("home");
    mkdirSync(staffRoot(linkedVersion), { recursive: true });
    symlinkSync(outside, join(staffRoot(linkedVersion), side.version));
    expect(refusal(() => installSidePack(linkedVersion, sideBytes))[0]).toBe(403);
    const linkedCurrent = temp("home");
    mkdirSync(staffRoot(linkedCurrent), { recursive: true });
    writeFileSync(join(outside, "current"), "keep");
    symlinkSync(join(outside, "current"), join(staffRoot(linkedCurrent), "current"));
    expect(refusal(() => installSidePack(linkedCurrent, sideBytes))[0]).toBe(403);
    expect(readFileSync(join(outside, "current"), "utf8")).toBe("keep");
    expect(readdirSync(outside)).toEqual(["current"]);
    expect(refusal(() => readInstalled(linkedCurrent))[0]).toBe(403);
    const errors: string[] = [];
    expect(engine(open, linkedCurrent, errors).detail(ATLAS).staff).toBe(false);
    expect(errors.length).toBe(1);
    expect(refusal(() => installSidePack(join(outside, "absent"), sideBytes))).toEqual([409, "the data folder is missing; run bkt init"]);

    expect(refusal(() => checkSidePack(new Uint8Array(SIDE_PACK_BYTES + 1)))).toEqual([413, "the side pack is over the 40 MB limit"]);
    const heavy = clone();
    const filler = Buffer.alloc(PACK_CAPS.staff + 1, "a");
    heavy.blobs[sha256(filler)] = encodeBlob(filler);
    heavy.outputs[0].files.push({ path: "tools/filler.txt", sha256: sha256(filler), size: filler.length, audience: "staff", role: "tool" });
    expect(refusal(() => checkSidePack(bytesOf(restamp(heavy))))[0]).toBe(413);
  });

  test("a tampered install is ignored at start and reported", () => {
    const home = temp("home");
    installSidePack(home, sideBytes);
    const index = join(staffRoot(home), side.version, "index.json");
    const held = JSON.parse(readFileSync(index, "utf8")) as { outputs: { files: { path: string }[] }[] };
    held.outputs[0].files[0].path = "../../escape.txt";
    writeFileSync(index, JSON.stringify(held));
    const errors: string[] = [];
    const r = engine(open, home, errors);
    expect(r.detail(ATLAS).staff).toBe(false);
    expect(errors.length).toBe(1);
    writeFileSync(join(staffRoot(home), "current"), "../../../etc");
    expect(refusal(() => readInstalled(home))[1]).toBe("the installed side pack has no valid version");
    expect(readInstalled(temp("home"))).toBeNull();
  });
});

describe("research routes with a side pack", () => {
  let s: Serve | null = null;
  afterEach(() => {
    s?.stop();
    s = null;
  });

  async function served(home: string) {
    const ME = 4242;
    const cliToken = "c".repeat(43);
    const research = engine(open, home);
    s = startServe({ uid: ME, resolvePeerUid: () => ME, cliToken, routes: researchRoutes(research), routeBodyBytes: { "POST /local/research/install": SIDE_PACK_BYTES } });
    const base = `http://127.0.0.1:${s.port}`;
    const host = `127.0.0.1:${s.port}`;
    const nonce = (await (await fetch(`${base}/`, { headers: { host } })).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const { token } = (await (await fetch(`${base}/session`, { method: "POST", headers: { host, origin: base, "content-type": "application/json" }, body: JSON.stringify({ nonce }) })).json()) as { token: string };
    const get = (path: string, auth: string | null = token) => fetch(`${base}${path}`, { headers: { host, ...(auth ? { authorization: `Bucket ${auth}` } : {}) } });
    const post = (bytes: Uint8Array, auth: string | null) => fetch(`${base}/local/research/install`, { method: "POST", headers: { host, "content-length": String(bytes.length), ...(auth ? { authorization: `Bucket ${auth}` } : {}) }, body: bytes as Uint8Array<ArrayBuffer> });
    return { get, post, token, cliToken, port: s.port, research };
  }

  const table = (id: string, rest = "") => `/local/research/table?slug=${ATLAS}&id=${id}${rest}`;

  test("install answers 403 to a session token", async () => {
    const home = temp("home");
    const { get, post, token, cliToken } = await served(home);
    const refused = await post(sideBytes, token);
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({ error: "a side pack installs from the terminal alone" });
    expect((await post(Buffer.from("{}"), null)).status).toBe(401);
    expect(existsSync(join(home, "research"))).toBe(false);
    expect((await get(table("problems-sourced"))).status).toBe(404);
    const bad = clone();
    bad.outputs[0].files[0].path = "../x";
    expect((await post(bytesOf(restamp(bad)), cliToken)).status).toBe(422);
    const ok = await post(sideBytes, cliToken);
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { version: string }).version).toBe(side.version);
    expect((await get(table("problems-sourced"))).status).toBe(200);
  });

  test("problems-sourced.tsv with 5,138 rows returns a page in under 200 ms after first parse", async () => {
    const home = temp("home");
    installSidePack(home, sideBytes);
    const { get } = await served(home);
    const first = (await (await get(table("problems-sourced"))).json()) as { total: number; rows: string[][]; columns: string[]; size: number };
    expect([first.total, first.rows.length, first.size]).toEqual([5138, 50, 50]);
    expect(first.columns).toContain("statement");
    const times: number[] = [];
    for (const rest of ["&page=2", "&page=103", "&q=riemann", "&sort=-posed", "&q=wikipedia&sort=name&page=3"]) {
      const at = performance.now();
      const r = await get(table("problems-sourced", rest));
      const body = (await r.json()) as { rows: string[][] };
      times.push(performance.now() - at);
      expect(r.status).toBe(200);
      expect(body.rows.length).toBeGreaterThan(0);
    }
    expect(Math.max(...times)).toBeLessThan(200);
    const last = (await (await get(table("problems-sourced", "&page=103"))).json()) as { rows: string[][] };
    expect(last.rows.length).toBe(5138 - 102 * 50);
    const none = (await (await get(table("problems-sourced", "&q=zzzz-no-such-row"))).json()) as { total: number; rows: string[][] };
    expect([none.total, none.rows]).toEqual([0, []]);
  });

  test("licence and source columns stay pinned", async () => {
    const home = temp("home");
    installSidePack(home, sideBytes);
    const { get } = await served(home);
    const sourced = (await (await get(table("problems-sourced", "&sort=-name&q=conjecture"))).json()) as { pinned: string[]; columns: string[]; rows: string[][] };
    expect(sourced.pinned).toEqual(["licence", "source"]);
    const at = sourced.columns.indexOf("licence");
    expect(sourced.rows.every((r) => r[at].length > 0)).toBe(true);
    const predictions = (await (await get(table("predictions"))).json()) as { pinned: string[]; total: number };
    expect([predictions.pinned, predictions.total]).toEqual([[], 2085]);
    const curated = (await (await get(table("problems"))).json()) as { pinned: string[]; total: number };
    expect([curated.pinned, curated.total]).toEqual([[], 71]);
  });

  test("record list and field view", async () => {
    const home = temp("home");
    installSidePack(home, sideBytes);
    const { get } = await served(home);
    const list = (await (await get(table("records", "&sort=title"))).json()) as { total: number; columns: string[]; rows: string[][] };
    expect(list.total).toBe(71);
    expect(list.columns).toEqual(["id", "title", "branch", "level", "posed", "resolved", "path"]);
    const found = (await (await get(table("records", "&q=riemann"))).json()) as { rows: string[][] };
    const row = found.rows.find((r) => r[0] === "riemann")!;
    expect(row.slice(0, 5)).toEqual(["riemann", "Riemann hypothesis", "mathematics", "5", "1859"]);
    expect(row[6]).toBe("tools/solvability-atlas/records/riemann.json");
    const record = (await (await get(`/local/research/file?slug=${ATLAS}&path=${encodeURIComponent(row[6])}`)).json()) as { title: string; key_works: unknown[]; statement: { licence: string } };
    expect([record.title, record.key_works.length, record.statement.licence]).toEqual(["Riemann hypothesis", 16, "CC BY-SA 4.0"]);
    expect(recordSetTable([{ path: "x/a.json", text: '{"name":"Alpha","branch":"physics"}' }]).rows).toEqual([["a", "Alpha", "physics", "", "", "", "x/a.json"]]);
    expect(() => recordSetTable([{ path: "x/a.json", text: "[1]" }])).toThrow("holds no record");
    expect(() => recordSetTable([{ path: "x/a.json", text: "{" }])).toThrow("does not parse");
  });

  test("a public build pages and filters its public tables and refuses the staff ones", async () => {
    const { get } = await served(temp("home"));
    const page = (await (await get(table("predictions", "&q=goldbach"))).json()) as { total: number; rows: string[][] };
    expect(page.total).toBeGreaterThan(0);
    expect(page.rows.some((r) => r[0] === "goldbach")).toBe(true);
    expect(((await (await get(table("predictions", "&page=42"))).json()) as { rows: string[][] }).rows.length).toBe(2085 - 41 * 50);
    expect(((await (await get(table("makeup"))).json()) as { columns: string[] }).columns).toEqual(["key", "value"]);
    for (const id of ["problems-sourced", "problems", "records", "forecast-2005"]) expect((await get(table(id))).status).toBe(404);
    expect((await get(table("predictions"), null)).status).toBe(401);
    for (const bad of ["/local/research/table?slug=../x&id=predictions", `/local/research/table?slug=${ATLAS}&id=../predictions`, `/local/research/table?slug=${ATLAS}`, table("predictions", "&page=0"), table("predictions", "&sort=nope"), table("predictions", `&q=${"x".repeat(201)}`)]) expect((await get(bad)).status).toBe(400);
    expect((await get("/local/research/table?slug=other&id=predictions")).status).toBe(404);
  });

  test("bkt research install writes into a temporary home, or hands the pack to the running server", async () => {
    const dir = temp("files");
    const file = join(dir, "staff.research.json");
    writeFileSync(file, sideBytes);
    const home = temp("home");
    const direct = await researchInstall(file, home, null);
    expect(direct).toEqual({ version: side.version, outputs: 3, files: direct.files, live: false });
    expect(existsSync(join(staffRoot(home), side.version, ".complete"))).toBe(true);
    expect(installLines(direct)).toEqual([`Installed staff research ${side.version}: 3 outputs, ${direct.files.toLocaleString("en-US")} files, every checksum matches.`, "Bucket shows it the next time it starts."]);
    const served2 = await served(temp("home"));
    const live = await researchInstall(file, "/nonexistent", { pid: process.pid, port: served2.port, token: served2.cliToken, secret: "" });
    expect(live.live).toBe(true);
    expect(served2.research.staffVersion).toBe(side.version);
    await expect(researchInstall(file, home, { pid: process.pid, port: served2.port, token: served2.token, secret: "" })).rejects.toThrow("a side pack installs from the terminal alone");
    expect(() => readSidePack(join(dir, "absent.json"))).toThrow("is missing");
    writeFileSync(join(dir, "bad.json"), "{}");
    await expect(researchInstall(join(dir, "bad.json"), home, null)).rejects.toThrow("the file is not a research side pack");
  });
});
