import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { href, parseHash } from "../../bkt-ui/src/router";
import type { DatasetInfo } from "./data";
import { encodeBlob, RESEARCH_SCHEMA, sha256, type PackedFile, type ReportRecord, type ResearchBlobs, type ResearchIndex } from "./pack/research";
import { Research } from "./research";
import { LocalOutputs, ResearchWork } from "./research-work";
import { startServe, type Serve } from "./serve";
import { WORKSPACE_PAGE, WORKSPACE_TYPES, workspaceItems, workspacePage, workspaceRoutes, type WorkspaceItem, type WorkspaceSources } from "./workspace";

const scratch: string[] = [];
function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bkt-workspace-${name}-`));
  scratch.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const CSV = "id,title,licence,source\n1,Goldbach,CC BY-SA 4.0,https://example.org/a\n";
const RECORD = '{"id":"p1","title":"Goldbach"}\n';
const ROWS = "public/papers/demo/data/rows.csv";
const MORE = "public/papers/demo/data/more.csv";
const RECORD_PATH = "reports/demo/records/p1.json";

function output(slug: string, title: string, staff: boolean, tables: number): { manifest: ReportRecord; files: Record<string, string> } {
  const files: Record<string, string> = { [`papers/${slug}/main.tex`]: `\\title{${title}}\n`, [`reports/${slug}/records/p1.json`]: RECORD };
  const list: ReportRecord["tables"] = [];
  for (let i = 0; i < tables; i++) {
    const path = i === 0 ? `public/papers/${slug}/data/rows.csv` : i === 1 ? `public/papers/${slug}/data/more.csv` : `public/papers/${slug}/data/t${i}.csv`;
    files[path] = CSV;
    list.push({ id: i === 0 ? "rows" : i === 1 ? "more" : `t${i}`, path, format: "csv", label: `${title} table ${i + 1}`, licence: i === 0 ? "mixed" : "CC0-1.0", audience: "public" });
  }
  if (staff) {
    files[`tools/${slug}/staff.tsv`] = "id\tname\n1\tA staff row\n";
    list.push({ id: "staff-rows", path: `tools/${slug}/staff.tsv`, format: "tsv", label: "Staff rows", licence: "mixed", audience: "staff" });
  }
  const manifest: ReportRecord = {
    schema: "bucket.report/2",
    slug,
    title,
    authors: ["Demo Author <demo.author@example.org>"],
    date: "2026-10-11",
    status: "public",
    kind: "paper",
    licence: "CC-BY-4.0",
    source_path: `papers/${slug}/main.tex`,
    source_hash: sha256(Buffer.from(files[`papers/${slug}/main.tex`])),
    tables: list,
    record_sets: [{ id: "problems", dir: `reports/${slug}/records`, schema: "bucket.problem/1", label: `${title} problems`, licence: "CC BY-SA 4.0", audience: "public" }],
  };
  return { manifest, files };
}

const DATASETS: DatasetInfo[] = [
  { id: "canon", name: "The canon", about: "", browsable: true, version: "1", builtAt: null, checksum: null, counts: [], kinds: [], parts: [{ name: "Sources", count: 2, unit: "sources", terms: "CC0-1.0", link: null, openable: false }], leftOut: null },
  { id: "occupations-time", name: "Occupations through time", about: "", browsable: true, version: "1", builtAt: null, checksum: null, counts: [], kinds: [], parts: [{ name: "A", count: 1, unit: "rows", terms: "US federal work", link: null, openable: false }, { name: "B", count: 1, unit: "rows", terms: "CC BY 4.0", link: null, openable: false }], leftOut: null },
  { id: "yours", name: "Your work", about: "", browsable: true, version: null, builtAt: null, checksum: null, counts: [], kinds: [], parts: [], leftOut: null },
];

function setup(o: { staff?: boolean; tables?: number; outputs?: number } = {}) {
  const blobs: ResearchBlobs["blobs"] = {};
  const outputs = Array.from({ length: o.outputs ?? 2 }, (_, n) => {
    const made = output(n === 0 ? "demo" : `other-${n}`, n === 0 ? "A demo output" : `Another output ${n}`, o.staff === true, o.tables ?? 2);
    const files: PackedFile[] = Object.entries(made.files).map(([path, body]) => {
      const bytes = Buffer.from(body);
      blobs[sha256(bytes)] = encodeBlob(bytes);
      return { path, sha256: sha256(bytes), size: bytes.length, audience: path.startsWith("tools/") ? ("staff" as const) : ("public" as const), role: "table" };
    });
    return { slug: made.manifest.slug, origin: "shipped" as const, manifest: made.manifest, files: files.sort((a, b) => (a.path < b.path ? -1 : 1)), withheld: 0 };
  });
  const version = sha256(JSON.stringify(outputs)).slice(0, 16);
  const index: ResearchIndex = { schema: RESEARCH_SCHEMA, version, staff: o.staff === true, outputs };
  const home = temp("home");
  const research = new Research({ index, blobs: async () => ({ version, blobs }) }, temp("cache"), home);
  const local = new LocalOutputs(home, { taken: (slug) => outputs.some((x) => x.slug === slug) });
  research.setLocal(local);
  const work = new ResearchWork(research, home);
  const src: WorkspaceSources = { research, changedPaths: (slug) => work.changedPaths(slug), datasets: () => DATASETS, rowSets: () => ["occupations-time"] };
  return { research, work, local, src, home };
}

const rev = (text: string) => sha256(Buffer.from(text));

describe("workspace index", () => {
  test("one item per manifest entry with unique keys", () => {
    const { src } = setup();
    const tables = workspaceItems(src, "tables");
    expect(tables.map((i) => [i.key, i.title, i.from.title, i.origin, i.licence, i.changed, i.opens])).toEqual([
      ["output:demo:rows", "A demo output table 1", "A demo output", "shipped", "mixed", false, "#/research/demo/data/rows"],
      ["output:demo:more", "A demo output table 2", "A demo output", "shipped", "CC0-1.0", false, "#/research/demo/data/more"],
      ["output:other-1:rows", "Another output 1 table 1", "Another output 1", "shipped", "mixed", false, "#/research/other-1/data/rows"],
      ["output:other-1:more", "Another output 1 table 2", "Another output 1", "shipped", "CC0-1.0", false, "#/research/other-1/data/more"],
    ]);
    const records = workspaceItems(src, "records");
    expect(records.map((i) => [i.key, i.from.kind, i.origin, i.licence, i.opens])).toEqual([
      ["output:demo:problems", "output", "shipped", "CC BY-SA 4.0", "#/research/demo/records/problems"],
      ["output:other-1:problems", "output", "shipped", "CC BY-SA 4.0", "#/research/other-1/records/problems"],
      ["dataset:canon:all", "dataset", "shipped", "CC0-1.0", "#/data"],
      ["rowset:occupations-time:all", "rowset", "shipped", "mixed", "#/data"],
      ["dataset:yours:all", "dataset", "local", "", "#/data"],
    ]);
    const all = [...tables, ...records];
    expect(new Set(all.map((i) => i.key)).size).toBe(all.length);
    expect(all.every((i) => i.explore === null)).toBe(true);
    for (const type of WORKSPACE_TYPES.filter((t) => t !== "tables" && t !== "records")) expect(workspaceItems(src, type)).toEqual([]);
  });

  test("every opens address parses in the window router", () => {
    const { src } = setup();
    for (const item of [...workspaceItems(src, "tables"), ...workspaceItems(src, "records")]) {
      const route = parseHash(item.opens);
      expect(href(route)).toBe(item.opens);
      if (item.from.kind === "output") expect(route).toEqual({ name: "research", slug: item.from.id, tab: item.type === "tables" ? "data" : "records", item: item.key.split(":")[2] });
      else expect(route).toEqual({ name: "data" });
    }
  });

  test("a public build lists no staff item and a staff build lists them as staff entries of their output", () => {
    const open = setup();
    expect(workspaceItems(open.src, "tables").some((i) => i.title === "Staff rows")).toBe(false);
    const staff = setup({ staff: true });
    expect(workspaceItems(staff.src, "tables").filter((i) => i.title === "Staff rows").map((i) => i.key)).toEqual(["output:demo:staff-rows", "output:other-1:staff-rows"]);
  });

  test("an output a person added lists its table with origin local", () => {
    const { src, local } = setup();
    local.create({ slug: "mine", title: "My own output", kind: "memo", author: "A Private Person" });
    local.upload("mine", "data", "counts.csv", Buffer.from(CSV));
    const mine = workspaceItems(src, "tables").filter((i) => i.from.id === "mine");
    expect(mine.map((i) => [i.origin, i.from.title, i.changed])).toEqual([["local", "My own output", false]]);
    expect(parseHash(mine[0].opens)).toMatchObject({ name: "research", slug: "mine", tab: "data" });
    expect(JSON.stringify(workspaceItems(src, "tables"))).not.toContain("A Private Person");
  });

  test("no author, contact or file path enters the index", () => {
    const { src } = setup({ staff: true });
    const text = JSON.stringify([...workspaceItems(src, "tables"), ...workspaceItems(src, "records")]);
    expect(text).not.toContain("Demo Author");
    expect(text).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/);
    expect(text).not.toContain("public/papers");
    expect(text).not.toContain("tools/");
    const keys = new Set(workspaceItems(src, "tables").flatMap((i) => Object.keys(i)));
    expect([...keys].sort()).toEqual(["changed", "explore", "from", "key", "licence", "opens", "origin", "title", "type"]);
  });

  test("an edit flips changed on the next request and a revert flips it back", async () => {
    const { src, work } = setup();
    const changed = () => Object.fromEntries([...workspaceItems(src, "tables"), ...workspaceItems(src, "records")].filter((i) => i.changed).map((i) => [i.key, true]));
    expect(changed()).toEqual({});
    await work.write("demo", ROWS, rev(CSV), Buffer.from(`${CSV}2,Twin primes,CC0-1.0,https://example.org/b\n`));
    expect(changed()).toEqual({ "output:demo:rows": true });
    await work.write("demo", RECORD_PATH, rev(RECORD), Buffer.from('{"id":"p1","title":"Goldbach, strong form"}\n'));
    expect(changed()).toEqual({ "output:demo:rows": true, "output:demo:problems": true });
    await work.revert("demo", ROWS);
    expect(changed()).toEqual({ "output:demo:problems": true });
    await work.revert("demo", RECORD_PATH);
    expect(changed()).toEqual({});
    expect(work.changedPaths("../demo")).toEqual([]);
    expect(work.changedPaths("demo")).toEqual([]);
    await work.write("demo", MORE, rev(CSV), Buffer.from(`${CSV}3,x,CC0-1.0,https://example.org/c\n`));
    expect(work.changedPaths("demo")).toEqual([MORE]);
  });

  test("the list reads no file body", async () => {
    const { src, research, work } = setup();
    await work.write("demo", ROWS, rev(CSV), Buffer.from(`${CSV}2,b,CC0-1.0,https://example.org/b\n`));
    let reads = 0;
    const read = research.read.bind(research);
    research.read = (...args: Parameters<Research["read"]>) => {
      reads += 1;
      return read(...args);
    };
    const overlay = work.overlay.bind(work);
    work.overlay = (...args: Parameters<ResearchWork["overlay"]>) => {
      reads += 1;
      return overlay(...args);
    };
    expect(workspaceItems(src, "tables").filter((i) => i.changed).length).toBe(1);
    expect(workspaceItems(src, "records").length).toBe(5);
    expect(reads).toBe(0);
  });

  test("pages hold 50 items and the filter matches a title or an output", () => {
    const { src } = setup({ tables: 60, outputs: 2 });
    const first = workspacePage(src, "tables", null, null);
    expect([first.items.length, first.total, first.page, first.size]).toEqual([WORKSPACE_PAGE, 120, 1, 50]);
    const third = workspacePage(src, "tables", null, "3");
    expect([third.items.length, third.items[0].key]).toEqual([20, "output:other-1:t40"]);
    expect(workspacePage(src, "tables", null, "4").items).toEqual([]);
    expect(workspacePage(src, "tables", "  TABLE 60 ", null).items.map((i) => i.key)).toEqual(["output:demo:t59", "output:other-1:t59"]);
    expect(workspacePage(src, "tables", "another output", null).total).toBe(60);
    expect(workspacePage(src, "records", "occupations", null).items.map((i) => i.key)).toEqual(["rowset:occupations-time:all"]);
    for (const [type, q, page] of [["desks", null, null], [null, null, null], ["tables", "x".repeat(201), null], ["tables", null, "0"], ["tables", null, "1.5"], ["tables", null, "-1"]] as const) expect(() => workspacePage(src, type, q, page)).toThrow();
  });
});

describe("workspace route", () => {
  let s: Serve | null = null;
  afterEach(() => {
    s?.stop();
    s = null;
  });

  test("answers 401 with no token and the page with one", async () => {
    const { src } = setup();
    const ME = 4242;
    const token = "c".repeat(43);
    s = startServe({ uid: ME, resolvePeerUid: () => ME, cliToken: token, routes: workspaceRoutes(src) });
    const base = `http://127.0.0.1:${s.port}`;
    const host = `127.0.0.1:${s.port}`;
    expect((await fetch(`${base}/local/workspace/items?type=tables`, { headers: { host } })).status).toBe(401);
    const ok = await fetch(`${base}/local/workspace/items?type=tables&q=demo`, { headers: { host, authorization: `Bucket ${token}` } });
    const body = (await ok.json()) as { items: WorkspaceItem[]; total: number };
    expect([ok.status, body.total, body.items.map((i) => i.key)]).toEqual([200, 2, ["output:demo:rows", "output:demo:more"]]);
    const bad = await fetch(`${base}/local/workspace/items?type=desk`, { headers: { host, authorization: `Bucket ${token}` } });
    expect([bad.status, ((await bad.json()) as { error: string }).error]).toEqual([400, "the workspace names no kind of item Bucket holds"]);
    expect((await fetch(`${base}/local/workspace/items?type=tables`, { method: "POST", headers: { host, authorization: `Bucket ${token}`, "content-length": "0" } })).status).toBeGreaterThanOrEqual(400);
  });
});
