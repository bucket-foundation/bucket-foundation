import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { allMarkers, findStaff, MIN_RESEARCH_MARKERS, publicResearchText, RESEARCH_MARKERS, researchCandidates, researchMarkers, staffMarkers } from "../scripts/check-no-staff";
import { buildResearchPack, decodeBlob, encodeBlob, licenceProblems, loadReportLib, manifestView, MB, PACK_CAPS, pathProblem, readRecords, sha256, type ReportLib, type ReportRecord, type ResearchPack } from "../src/pack/research";
import { DENIED_PREFIXES, type Denylist } from "../src/pack/rights";
import { guardPath, Research, ResearchError, researchRoutes, VIEW_BYTES } from "../src/research";
import { startServe, type Serve } from "../src/serve";

const REPO = resolve(import.meta.dir, "../../..");
const DENY: Denylist = { videoIds: new Set(["abcdefghijk"]), prefixes: DENIED_PREFIXES, files: new Set(), unreadable: new Set() };
const DENIED = ["k", "r", "u", "s", "e"].join("");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

let lib: ReportLib;
let records: ReportRecord[];
let open: ResearchPack;
let staff: ResearchPack;
const scratch: string[] = [];

function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bkt-research-${name}-`));
  scratch.push(dir);
  return dir;
}

beforeAll(async () => {
  lib = await loadReportLib(REPO);
  records = readRecords(REPO);
  open = buildResearchPack(REPO, records, { lib, env: {} });
  staff = buildResearchPack(REPO, records, { lib, env: { BKT_INCLUDE_STAFF_DATA: "1" } });
});

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function fixture(change: (record: ReportRecord, files: Record<string, string | Buffer>) => void = () => {}): { repo: string; record: ReportRecord } {
  const repo = temp("repo");
  const files: Record<string, string | Buffer> = {
    "reports/demo/REPORT.md": "# Demo\n\nBody with $x^2$.\n",
    "public/papers/demo/paper.pdf": "%PDF-1.4 demo",
    "public/papers/demo/fig1.webp": PNG,
    "public/papers/demo/drawing.svg": SVG,
    "public/papers/demo/data/rows.csv": "id,title\n1,One\n",
    "tools/demo/rows.tsv": "id\tlicence\tsource\tstatement\n1\tCC0-1.0\thttps://example.org/a\tA staff statement that is long enough to mark.\n",
    "tools/demo/README.md": "# Demo tool\n",
    "tools/demo/records/a.json": '{"statement":{"text":"A record sentence that only staff builds may carry."}}',
  };
  const record: ReportRecord = {
    schema: "bucket.report/2",
    slug: "demo",
    title: "A demo output",
    authors: ["Demo Author"],
    date: "2026-10-11",
    status: "public",
    kind: "paper",
    abstract: "One paragraph.",
    licence: "CC-BY-4.0",
    source_path: "reports/demo/REPORT.md",
    source_hash: "",
    pdf_path: "public/papers/demo/paper.pdf",
    pdf_hash: "",
    published_at: "2026-10-11T00:00:00Z",
    figures: [{ path: "reports/demo/figures/fig1.png", caption: "Figure 1.", licence: "CC-BY-4.0" }],
    assets: [
      { id: "fig-one", path: "public/papers/demo/fig1.webp", caption: "Figure 1.", licence: "CC-BY-4.0", audience: "public", source: "tools/demo/fig1.py" },
      { id: "drawing", path: "public/papers/demo/drawing.svg", caption: "A drawing.", licence: "CC-BY-4.0", audience: "public" },
    ],
    tables: [
      { id: "rows", path: "public/papers/demo/data/rows.csv", format: "csv", label: "Rows", licence: "CC0-1.0", audience: "public" },
      { id: "staff-rows", path: "tools/demo/rows.tsv", format: "tsv", label: "Staff rows", licence: "mixed", licence_column: "licence", source_column: "source", audience: "staff" },
    ],
    record_sets: [{ id: "records", dir: "tools/demo/records", schema: "demo.record/1", label: "Records", licence: "CC BY-SA 4.0", audience: "staff" }],
    tool: { path: "tools/demo", readme: "tools/demo/README.md", audience: "staff" },
    attributions: [{ source: "Demo source", url: "https://example.org/demo", licence: "CC0-1.0", rows: 1, notice: "Demo rows." }],
  };
  files["tools/demo/fig1.py"] = "print('figure')\n";
  change(record, files);
  record.source_hash = sha256(Buffer.from(files[record.source_path] ?? ""));
  record.pdf_hash = sha256(Buffer.from(files[record.pdf_path ?? ""] ?? ""));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), body);
  }
  return { repo, record };
}

const pack = (f: { repo: string; record: ReportRecord }, env: Record<string, string> = {}, caps = PACK_CAPS) => buildResearchPack(f.repo, [f.record], { lib, env, deny: DENY, caps });
const paths = (p: ResearchPack) => p.index.outputs.flatMap((o) => o.files.map((file) => file.path));

describe("research pack", () => {
  test("pack without the flag holds no staff path", () => {
    expect(open.index.staff).toBe(false);
    expect(open.index.outputs.flatMap((o) => o.files).filter((file) => file.audience !== "public")).toEqual([]);
    expect(paths(open).filter((p) => p.startsWith("tools/"))).toEqual([]);
    expect(open.index.outputs.map((o) => o.manifest.status)).toEqual(open.index.outputs.map(() => "public"));
    const atlas = open.index.outputs.find((o) => o.slug === "solvability-frontier")!;
    expect(atlas.manifest.tool).toBeUndefined();
    expect(atlas.manifest.record_sets).toEqual([]);
    expect((atlas.manifest.tables ?? []).map((t) => t.audience)).toEqual(["public", "public", "public", "public"]);
    expect((atlas.manifest.assets ?? []).some((a) => a.source !== undefined)).toBe(false);
    expect(atlas.withheld).toBeGreaterThan(0);
    expect(JSON.stringify(open.index)).not.toContain("problems-sourced.tsv");
    const small = pack(fixture());
    expect(paths(small).sort()).toEqual(["public/papers/demo/data/rows.csv", "public/papers/demo/drawing.svg", "public/papers/demo/fig1.webp", "public/papers/demo/paper.pdf", "reports/demo/REPORT.md"]);
    expect(small.index.outputs[0].withheld).toBe(3);
    expect(pack(fixture((r) => (r.status = "private"))).index.outputs).toEqual([]);
  });

  test("pack with the flag holds problems-sourced.tsv", () => {
    expect(staff.index.staff).toBe(true);
    const atlas = staff.index.outputs.find((o) => o.slug === "solvability-frontier")!;
    const file = atlas.files.find((f) => f.path === "tools/solvability-atlas/problems-sourced.tsv")!;
    expect(file.audience).toBe("staff");
    expect(decodeBlob(staff.blobs.blobs[file.sha256]).toString("utf8").split("\n")[0]).toContain("statement");
    expect(atlas.files.filter((f) => f.path.startsWith("tools/solvability-atlas/records/")).length).toBe(74);
    expect(staff.index.outputs.map((o) => o.slug)).toContain("solver-gap-engine");
    expect(staff.index.outputs.find((o) => o.slug === "solver-gap-engine")!.origin).toBe("staff");
    expect(paths(pack(fixture(), { BKT_INCLUDE_STAFF_DATA: "1" }))).toContain("tools/demo/records/a.json");
    expect(pack(fixture(), { BKT_INCLUDE_STAFF_DATA: "true" }).index.staff).toBe(false);
  });

  test("pack fails on a denied path", () => {
    const f = fixture((r, files) => {
      r.assets!.push({ id: "bad", path: `public/papers/demo/${DENIED}-fig.webp`, caption: "Figure.", licence: "CC-BY-4.0", audience: "public" });
      files[`public/papers/demo/${DENIED}-fig.webp`] = PNG;
    });
    expect(() => pack(f)).toThrow("rights:");
    const g = fixture((r, files) => {
      r.tables!.push({ id: "bad", path: `public/papers/demo/data/${DENIED}.csv`, format: "csv", label: "Rows", licence: "CC0-1.0", audience: "public" });
      files[`public/papers/demo/data/${DENIED}.csv`] = "id\n1\n";
      r.attributions = [];
    });
    expect(() => pack(g)).toThrow();
    const h = fixture((_r, files) => {
      files["tools/demo/records/.hidden.json"] = "{}";
      files["tools/demo/out/skip.json"] = "{}";
    });
    expect(paths(pack(h, { BKT_INCLUDE_STAFF_DATA: "1" })).filter((p) => p.includes("hidden") || p.includes("/out/"))).toEqual([]);
    const bad = fixture((r, files) => {
      r.assets!.push({ id: "odd", path: "public/papers/demo/a b.webp", caption: "Figure.", licence: "CC-BY-4.0", audience: "public" });
      files["public/papers/demo/a b.webp"] = PNG;
    });
    expect(() => pack(bad)).toThrow("refused");
    const gone = fixture((r) => r.assets!.push({ id: "gone", path: "public/papers/demo/gone.webp", caption: "Figure.", licence: "CC-BY-4.0", audience: "public" }));
    expect(() => pack(gone)).toThrow("is missing");
  });

  test("pack fails on denied text", () => {
    const f = fixture((_r, files) => {
      files["public/papers/demo/data/rows.csv"] = `id,title\n1,${DENIED.toUpperCase()} notes\n`;
    });
    expect(() => pack(f)).toThrow("rights:");
    const g = fixture((r) => (r.assets![0].caption = `From ${DENIED}.`));
    expect(() => pack(g)).toThrow("the research manifest of demo");
    const staffOnly = fixture((_r, files) => {
      files["tools/demo/README.md"] = `# ${DENIED}\n`;
    });
    expect(() => pack(staffOnly, { BKT_INCLUDE_STAFF_DATA: "1" })).toThrow("rights:");
    expect(paths(pack(staffOnly))).not.toContain("tools/demo/README.md");
  });

  test("pack fails on a row licence with no attribution", () => {
    const f = fixture((_r, files) => {
      files["tools/demo/rows.tsv"] = "id\tlicence\tsource\tstatement\n1\tCC0-1.0\tu\ts\n2\tCC BY-SA 4.0\tu\ts\n";
    });
    expect(() => pack(f, { BKT_INCLUDE_STAFF_DATA: "1" })).toThrow('row licence "CC BY-SA 4.0" has no attribution');
    expect(pack(f).index.outputs.length).toBe(1);
    const noColumn = fixture((r) => delete r.tables![1].licence_column);
    expect(licenceProblems(noColumn.record, noColumn.record.tables![1], "")).toEqual(["tools/demo/rows.tsv: licence is mixed and no licence_column is set"]);
    const gfdl = fixture((r, files) => {
      files["tools/demo/rows.tsv"] = "id\tlicence\tsource\tstatement\n1\tGFDL-1.3\tu\ts\n";
      r.attributions = [{ source: "Garden", url: "https://example.org/g", licence: "GFDL-1.3", rows: 1, notice: "Garden rows." }];
    });
    expect(() => pack(gfdl, { BKT_INCLUDE_STAFF_DATA: "1" })).toThrow("GFDL rows need an attribution with a licence_text path");
    gfdl.record.attributions![0].licence_text = "tools/demo/GFDL.txt";
    expect(pack(gfdl, { BKT_INCLUDE_STAFF_DATA: "1" }).index.outputs.length).toBe(1);
    const atlas = records.find((r) => r.slug === "solvability-frontier")!;
    const sourced = atlas.tables!.find((t) => t.id === "problems-sourced")!;
    const text = decodeBlob(staff.blobs.blobs[staff.index.outputs.find((o) => o.slug === atlas.slug)!.files.find((x) => x.path === sourced.path)!.sha256]).toString("utf8");
    expect(licenceProblems(atlas, sourced, text)).toEqual([]);
    expect(licenceProblems({ ...atlas, attributions: atlas.attributions!.slice(1) }, sourced, text).length).toBe(1);
  });

  test("the pack stays under its size caps and a larger one fails", () => {
    expect(Math.max(...Object.values(open.encoded))).toBeLessThanOrEqual(PACK_CAPS.public);
    expect(Math.max(...Object.values(staff.encoded))).toBeLessThanOrEqual(PACK_CAPS.staff);
    expect(Object.values(staff.blobs.blobs).reduce((n, b) => n + b.data.length, 0)).toBeLessThanOrEqual(PACK_CAPS.total);
    expect(() => pack(fixture(), {}, { ...PACK_CAPS, public: 10 })).toThrow("over the 10 byte cap");
    expect(() => pack(fixture(), {}, { ...PACK_CAPS, total: 10 })).toThrow("over the 10 byte cap");
  });

  test("blobs round-trip text and binary, and the version follows the content", () => {
    expect(encodeBlob(Buffer.from("plain text")).enc).toBe("utf8");
    expect(encodeBlob(PNG).enc).toBe("base64");
    expect(decodeBlob(encodeBlob(PNG)).equals(PNG)).toBe(true);
    expect(encodeBlob(Buffer.from([0x61, 0x00, 0x62])).enc).toBe("base64");
    const a = pack(fixture());
    const b = pack(fixture((_r, files) => (files["public/papers/demo/data/rows.csv"] = "id,title\n2,Two\n")));
    expect(a.index.version).not.toBe(b.index.version);
    expect(a.index.version).toBe(a.blobs.version);
    for (const o of open.index.outputs) for (const f of o.files) expect(sha256(decodeBlob(open.blobs.blobs[f.sha256]))).toBe(f.sha256);
  });

  test("a public view drops staff entries and counts them", () => {
    const f = fixture();
    const view = manifestView(f.record, lib, false);
    expect(view.manifest.tool).toBeUndefined();
    expect(view.manifest.assets!.map((a) => a.source)).toEqual([undefined, undefined]);
    expect(view.withheld).toBe(3);
    expect(manifestView(f.record, lib, true)).toEqual({ manifest: f.record, withheld: 0 });
  });
});

describe("research staff check", () => {
  test("check-no-staff finds a research marker in a staff pack", () => {
    const published = publicResearchText(REPO, records, lib);
    const markers = researchMarkers(REPO, published, records);
    expect(markers.length).toBe(RESEARCH_MARKERS);
    const dir = temp("staff-pack");
    writeFileSync(join(dir, "research-index.json"), JSON.stringify(staff.index));
    writeFileSync(join(dir, "research-blobs.json"), JSON.stringify(staff.blobs));
    const hits = findStaff([dir], markers);
    expect(hits.length).toBeGreaterThanOrEqual(MIN_RESEARCH_MARKERS);
    expect(new Set(hits.map((h) => h.file))).toEqual(new Set([join(dir, "research-blobs.json")]));
    expect(() => researchMarkers(REPO, published, [], RESEARCH_MARKERS)).toThrow("too few research markers");
  });

  test("no research marker appears in a public entry", () => {
    const published = publicResearchText(REPO, records, lib);
    for (const m of researchMarkers(REPO, published, records)) {
      expect(published.includes(m)).toBe(false);
      expect(m.length).toBeGreaterThanOrEqual(25);
      expect(m.length).toBeLessThanOrEqual(160);
      expect(m).toContain(" ");
    }
    const titles = new Set(records.flatMap((r) => (r.record_sets ?? []).map((s) => s.dir)));
    expect(titles.size).toBeGreaterThan(0);
    expect(researchCandidates(REPO, records).length).toBeGreaterThan(1000);
    for (const m of staffMarkers(12, published)) expect(published.includes(m)).toBe(false);
  });

  test.skipIf(process.env.BKT_INCLUDE_STAFF_DATA === "1")(
    "check-no-staff passes the public pack and the public binary",
    () => {
      const dir = temp("public-pack");
      writeFileSync(join(dir, "research-index.json"), JSON.stringify(open.index));
      writeFileSync(join(dir, "research-blobs.json"), JSON.stringify(open.blobs));
      const markers = allMarkers(REPO, lib);
      expect(findStaff([dir], markers)).toEqual([]);
      const pkg = resolve(import.meta.dir, "..");
      const bin = join(dir, "bkt");
      const built = Bun.spawnSync(["bun", "build", "--compile", "--minify", "src/cli.tsx", "--outfile", bin], { cwd: pkg, stdout: "ignore", stderr: "pipe" });
      expect(built.stderr.toString() + String(built.exitCode)).toEndWith("0");
      expect(findStaff([bin], markers)).toEqual([]);
      const leak = join(dir, "leak.bin");
      writeFileSync(leak, JSON.stringify(staff.blobs));
      expect(findStaff([leak], markers).length).toBeGreaterThan(0);
    },
    120_000,
  );
});

describe("research engine", () => {
  let s: Serve | null = null;
  afterEach(() => {
    s?.stop();
    s = null;
  });

  const engine = (p: ResearchPack, cache = temp("cache")) => new Research({ index: p.index, blobs: async () => p.blobs }, cache);

  test("a v1 record lists with its PDF and public figures", async () => {
    const r = engine(open);
    const row = r.list().find((x) => x.slug === "funding-landscape")!;
    expect(row).toEqual({ slug: "funding-landscape", title: row.title, kind: "paper", status: "public", date: row.date, origin: "shipped", changed: 0, unreadable: null });
    const d = r.detail("funding-landscape");
    expect(d.manifest.schema).toBe("bucket.report/1");
    expect(d.manifest.assets).toBeUndefined();
    expect(d.files.filter((f) => f.role === "figure").length).toBe(5);
    expect(d.files.some((f) => f.path === "public/papers/01-funding-landscape/paper.pdf")).toBe(true);
    expect(d.files.every((f) => f.audience === "public")).toBe(true);
    const pdf = await r.read("funding-landscape", "public/papers/01-funding-landscape/paper.pdf");
    expect(pdf.type).toBe("application/pdf");
    expect(sha256(pdf.bytes)).toBe(d.manifest.pdf_hash!);
    expect(r.list().length).toBe(open.index.outputs.length);
  });

  async function served(p: ResearchPack) {
    const ME = 4242;
    s = startServe({ uid: ME, resolvePeerUid: () => ME, routes: researchRoutes(engine(p)) });
    const base = `http://127.0.0.1:${s.port}`;
    const host = `127.0.0.1:${s.port}`;
    const page = await fetch(`${base}/`, { headers: { host } });
    const nonce = (await page.text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const session = await fetch(`${base}/session`, { method: "POST", headers: { host, origin: base, "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
    const { token } = (await session.json()) as { token: string };
    const get = (path: string, auth = true) => fetch(`${base}${path}`, { headers: { host, ...(auth ? { authorization: `Bucket ${token}` } : {}) } });
    return { get, token };
  }

  const fileUrl = (slug: string, path: string) => `/local/research/file?slug=${encodeURIComponent(slug)}&path=${encodeURIComponent(path)}`;

  test("image route answers 401 without the header", async () => {
    const { get, token } = await served(pack(fixture()));
    const url = fileUrl("demo", "public/papers/demo/fig1.webp");
    expect((await get(url, false)).status).toBe(401);
    expect((await get(`${url}&token=${token}`, false)).status).toBe(401);
    expect((await get("/local/research/list", false)).status).toBe(401);
    expect((await get("/local/research/manifest?slug=demo", false)).status).toBe(401);
    const ok = await get(url);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/webp");
    expect(ok.headers.get("x-content-type-options")).toBe("nosniff");
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(ok.headers.get("set-cookie")).toBeNull();
    expect(Buffer.from(await ok.arrayBuffer()).equals(PNG)).toBe(true);
    const svg = await get(fileUrl("demo", "public/papers/demo/drawing.svg"));
    expect(svg.headers.get("content-type")).toBe("image/svg+xml");
    expect(svg.headers.get("content-security-policy")).toBe("sandbox");
    const list = (await (await get("/local/research/list")).json()) as { outputs: { slug: string }[] };
    expect(list.outputs.map((o) => o.slug)).toEqual(["demo"]);
    const detail = (await (await get("/local/research/manifest?slug=demo")).json()) as { withheld: number; staff: boolean; files: unknown[] };
    expect([detail.withheld, detail.staff, detail.files.length]).toEqual([3, false, 5]);
  });

  test("the file route refuses every path outside the output's file table", async () => {
    const { get } = await served(pack(fixture()));
    const status = async (slug: string, path: string) => (await get(fileUrl(slug, path))).status;
    expect(await status("demo", "public/papers/demo/../demo/fig1.webp")).toBe(400);
    expect(await status("demo", "../../etc/passwd")).toBe(400);
    expect(await status("demo", "/etc/passwd")).toBe(400);
    expect(await status("demo", "public/papers/demo/.hidden")).toBe(400);
    expect(await status("demo", "public\\papers\\demo\\fig1.webp")).toBe(400);
    expect(await status("demo", "public/papers/demo/fig1.webp\0.png")).toBe(400);
    expect(await status("demo", "a/b/c/d/e/f/g/h/i.png")).toBe(400);
    expect(await status("demo", "public/papers/demo/a b.webp")).toBe(400);
    expect(await status("demo", "")).toBe(400);
    expect(await status("demo", "tools/demo/rows.tsv")).toBe(404);
    expect(await status("demo", "public/papers/demo")).toBe(404);
    expect(await status("demo", "reports/demo/report.json")).toBe(404);
    expect(await status("Demo", "public/papers/demo/fig1.webp")).toBe(400);
    expect(await status("../demo", "public/papers/demo/fig1.webp")).toBe(400);
    expect(await status("other", "public/papers/demo/fig1.webp")).toBe(404);
    expect((await get("/local/research/file?slug=demo")).status).toBe(400);
    expect((await get("/local/research/manifest")).status).toBe(400);
    expect((await get("/local/research/manifest?slug=other")).status).toBe(404);
    expect((await (await get(fileUrl("demo", "tools/demo/rows.tsv"))).json()) as { error: string }).toEqual({ error: "the output does not list that file" });
  });

  test("the path guard refuses symlinks, folders, devices and escapes", () => {
    const root = temp("guard");
    mkdirSync(join(root, "a/b"), { recursive: true });
    writeFileSync(join(root, "a/b/file.txt"), "ok");
    const outside = temp("outside");
    writeFileSync(join(outside, "secret.txt"), "secret");
    symlinkSync(join(outside, "secret.txt"), join(root, "a/link.txt"));
    symlinkSync(outside, join(root, "a/dir"));
    symlinkSync(join(root, "a/b/file.txt"), join(root, "a/inside.txt"));
    const refusal = (rel: string) => {
      try {
        guardPath(root, rel);
        return 0;
      } catch (e) {
        expect(e).toBeInstanceOf(ResearchError);
        return (e as ResearchError).status;
      }
    };
    expect(guardPath(root, "a/b/file.txt").endsWith(join("a", "b", "file.txt"))).toBe(true);
    expect(refusal("a/link.txt")).toBe(403);
    expect(refusal("a/inside.txt")).toBe(403);
    expect(refusal("a/dir/secret.txt")).toBe(403);
    expect(refusal("a/b")).toBe(403);
    expect(refusal("a/b/file.txt/more")).toBe(403);
    expect(refusal("a/b/missing.txt")).toBe(404);
    expect(refusal("../outside/secret.txt")).toBe(400);
    expect(refusal("a/../a/b/file.txt")).toBe(400);
    expect(refusal("/a/b/file.txt")).toBe(400);
    expect(refusal(".git/config")).toBe(400);
    expect(refusal("a\\b\\file.txt")).toBe(400);
    expect(refusal("a/b/file.txt\0")).toBe(400);
    expect(refusal("a//b/file.txt")).toBe(400);
    expect(refusal("")).toBe(400);
    expect(pathProblem("a/b/c/d/e/f/g/h")).toBeNull();
    expect(pathProblem("a/b/c/d/e/f/g/h/i")).toBe("the path is deeper than 8 folders");
    expect(pathProblem(`${"x".repeat(129)}.txt`)).not.toBeNull();
    expect(pathProblem(7)).toBe("the path is empty");
  });

  test("files unpack once at 0600, and a changed or wrong file marks the output unreadable", async () => {
    const p = pack(fixture());
    const cache = temp("cache");
    const r = engine(p, cache);
    const first = await r.read("demo", "public/papers/demo/data/rows.csv");
    expect(first.bytes.toString("utf8")).toBe("id,title\n1,One\n");
    expect(first.type).toBe("text/csv; charset=utf-8");
    const dir = join(cache, p.index.version);
    const { statSync } = await import("node:fs");
    expect(statSync(join(dir, "public/papers/demo/data/rows.csv")).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    let loads = 0;
    const again = new Research({ index: p.index, blobs: async () => (loads++, p.blobs) }, cache);
    await again.read("demo", "public/papers/demo/fig1.webp");
    expect(loads).toBe(0);
    writeFileSync(join(dir, "public/papers/demo/data/rows.csv"), "id,title\n1,Changed\n");
    await expect(again.read("demo", "public/papers/demo/data/rows.csv")).rejects.toThrow("changed on disk");
    expect(again.list()[0].unreadable).toContain("changed on disk");
    await expect(again.read("demo", "public/papers/demo/fig1.webp")).rejects.toThrow("changed on disk");

    const hash = p.index.outputs[0].files.find((f) => f.path === "public/papers/demo/fig1.webp")!.sha256;
    const forged = { ...p.blobs, blobs: { ...p.blobs.blobs, [hash]: encodeBlob(Buffer.from("not the image")) } };
    const bad = new Research({ index: p.index, blobs: async () => forged }, temp("cache"));
    await expect(bad.read("demo", "public/papers/demo/data/rows.csv")).rejects.toThrow("does not match its hash in this build");
    expect(bad.detail("demo").unreadable).toContain("fig1.webp");

    const stale = new Research({ index: p.index, blobs: async () => ({ ...p.blobs, version: "other" }) }, temp("cache"));
    await expect(stale.read("demo", "public/papers/demo/fig1.webp")).rejects.toThrow("another build");

    const wrong = pack(fixture());
    wrong.index.outputs[0].manifest = { ...wrong.index.outputs[0].manifest, pdf_hash: "0".repeat(64) };
    expect(engine(wrong).list()[0].unreadable).toContain("does not match the PDF hash");
    wrong.index.outputs[0].manifest = { ...wrong.index.outputs[0].manifest, pdf_hash: p.index.outputs[0].manifest.pdf_hash, source_hash: "0".repeat(64) };
    expect(engine(wrong).detail("demo").unreadable).toContain("does not match the source hash");

    const big = pack(fixture());
    big.index.outputs[0].files = big.index.outputs[0].files.map((f) => (f.path.endsWith("fig1.webp") ? { ...f, size: VIEW_BYTES + 1 } : f));
    await expect(engine(big).read("demo", "public/papers/demo/fig1.webp")).rejects.toThrow("16 MB");
    expect(VIEW_BYTES).toBe(16 * MB);
  });
});
