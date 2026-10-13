import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOCAL_KEYS, canonicalBytes, checkHashes, checkRecord, findEntry, localPaths, papersEntry, publicPaths, registerRow, sha256, upsertPapersSource, validateRecord } from "./lib/report-record.mjs";

const base = {
  schema: "bucket.report/1",
  slug: "demo-report",
  title: "A demo report",
  authors: ["Gianangelo Dichio"],
  date: "2026-10-07",
  status: "private",
  kind: "memo",
  abstract: "One paragraph.",
  bead: "bkt-eb6c",
  source_path: "reports/demo-report/REPORT.md",
  pdf_path: "output/reports/demo-report/paper.pdf",
  figures: [{ path: "reports/demo-report/figures/fig1.png", caption: "Figure 1.", licence: "CC-BY-4.0" }],
  data_sources: [{ path: "reports/demo-report/data/rows.csv", licence: "CC0-1.0", retrieved: "2026-10-01" }],
  source_hash: "a".repeat(64),
  pdf_hash: "b".repeat(64),
  built_at: "2026-10-07T10:00:00Z",
  published_at: null,
  updated_at: "2026-10-07T10:00:00Z",
};

assert.deepEqual(validateRecord(base), []);
assert.ok(validateRecord({ ...base, slug: "Demo_Report" }).some((e) => e.startsWith("slug")));
assert.ok(validateRecord({ ...base, status: "secret" }).some((e) => e.startsWith("status")));
assert.ok(validateRecord({ ...base, kind: "novel" }).some((e) => e.startsWith("kind")));
assert.ok(validateRecord({ ...base, authors: [] }).some((e) => e.startsWith("authors")));
assert.ok(validateRecord({ ...base, source_path: "/etc/passwd" }).some((e) => e.startsWith("source_path")));
assert.ok(validateRecord({ ...base, source_path: "reports/../x.md" }).some((e) => e.startsWith("source_path")));
assert.ok(validateRecord({ ...base, source_hash: "zz" }).some((e) => e.startsWith("source_hash")));
assert.ok(validateRecord({ ...base, pdf_hash: null }).some((e) => e.startsWith("pdf_hash")));
assert.ok(validateRecord({ ...base, status: "public" }).some((e) => e.startsWith("published_at")));
assert.ok(validateRecord({ ...base, built_at: "2026-10-07 10:00" }).some((e) => e.startsWith("built_at")));
assert.ok(validateRecord({ ...base, figures: [{ path: "x.png", caption: "c" }] }).some((e) => e.includes("licence")));
assert.ok(validateRecord({ ...base, data_sources: [{ licence: "MIT" }] }).some((e) => e.includes("path or url")));
assert.ok(validateRecord({ ...base, "Bad-Key": 1 }).some((e) => e.includes("Bad-Key")));
assert.ok(validateRecord({ ...base, score: 0.5 }).some((e) => e.includes("safe integer")));
assert.deepEqual(validateRecord({ ...base, status: "public", published_at: "2026-10-07T11:00:00Z" }), []);

const bytes = canonicalBytes({ b: 1, a: { d: "x", c: [2, 3] } });
assert.equal(bytes.toString("utf8"), '{"a":{"c":[2,3],"d":"x"},"b":1}\n');
assert.throws(() => canonicalBytes({ a: 1.5 }));
assert.throws(() => canonicalBytes({ "A b": 1 }));

const files = { "reports/demo-report/REPORT.md": Buffer.from("# Demo\n"), "output/reports/demo-report/paper.pdf": Buffer.from("%PDF-1.4") };
const hashed = { ...base, source_hash: sha256(files["reports/demo-report/REPORT.md"]), pdf_hash: sha256(files["output/reports/demo-report/paper.pdf"]) };
const read = (p) => files[p] ?? null;
assert.deepEqual(checkHashes(hashed, read), []);
assert.ok(checkHashes({ ...hashed, source_hash: "c".repeat(64) }, read).some((e) => e.startsWith("source_hash")));
assert.ok(checkHashes({ ...hashed, pdf_hash: "c".repeat(64) }, read).some((e) => e.startsWith("pdf_hash")));
assert.ok(checkHashes({ ...hashed, pdf_path: "output/reports/demo-report/missing.pdf" }, read).some((e) => e.includes("missing")));

assert.deepEqual(publicPaths(base), {
  base: "public/papers/demo-report",
  pdf: "public/papers/demo-report/paper.pdf",
  figures: ["public/papers/demo-report/fig1.webp"],
  data: ["public/papers/demo-report/data/rows.csv"],
});
assert.equal(publicPaths({ ...base, public_path: "public/papers/01-demo" }).pdf, "public/papers/01-demo/paper.pdf");

const entry = papersEntry({ ...base, doi: "10.5281/zenodo.1", highlights: ["H1"], abstract_paragraphs: ["P1", "P2"], bibtex: "@misc{x, title={`t`}}" });
assert.ok(entry.includes('slug: "demo-report",'));
assert.ok(entry.includes('pdfUrl: "/papers/demo-report/paper.pdf",'));
assert.ok(entry.includes('doiUrl: "https://doi.org/10.5281/zenodo.1",'));
assert.ok(entry.includes('src: "/papers/demo-report/fig1.webp",'));
assert.ok(entry.includes('href: "/papers/demo-report/data/rows.csv"'));
assert.ok(entry.includes("\\`t\\`"));
assert.ok(!papersEntry(base).includes("doi:"));
assert.ok(papersEntry(base).includes("@techreport{bucket2026demoreport"));

const source = `export const PAPERS: Paper[] = [
  {
    slug: "other",
    title: "Other",
    bibtex: \`@misc{o, title={x}}\`,
  },
];

export function listPapers() {}
`;
const added = upsertPapersSource(source, base);
assert.ok(added.includes('slug: "other"'));
assert.ok(added.includes('slug: "demo-report"'));
assert.ok(added.indexOf('slug: "demo-report"') > added.indexOf('slug: "other"'));
const replaced = upsertPapersSource(added, { ...base, title: "Renamed" });
assert.equal((replaced.match(/slug: "demo-report"/g) ?? []).length, 1);
assert.ok(replaced.includes('title: "Renamed"'));
assert.ok(replaced.includes("export function listPapers() {}"));
const span = findEntry(added, "other");
assert.equal(added.slice(span.start, span.end).trim().startsWith("{"), true);
assert.equal(findEntry(added, "nope"), null);

let named = 0;
function test(name, body) {
  try {
    body();
    named += 1;
  } catch (err) {
    err.message = `${name}: ${err.message}`;
    throw err;
  }
}

const atlasBytes = readFileSync(new URL("../reports/solvability-frontier/report.json", import.meta.url));
const atlas = JSON.parse(atlasBytes.toString("utf8"));
const atlasV1 = Object.fromEntries(Object.entries({ ...atlas, schema: "bucket.report/1" }).filter(([key]) => !LOCAL_KEYS.includes(key)));

const v2 = {
  ...hashed,
  schema: "bucket.report/2",
  assets: [{ id: "fig-one", path: "public/papers/demo-report/fig1.webp", caption: "Figure 1.", licence: "CC-BY-4.0", audience: "public", source: "reports/demo-report/figures/fig1.py" }],
  tables: [
    { id: "rows", path: "public/papers/demo-report/data/rows.csv", format: "csv", label: "Rows", licence: "CC0-1.0", audience: "public" },
    { id: "staff-rows", path: "tools/demo/rows.tsv", format: "tsv", label: "Staff rows", licence: "mixed", licence_column: "licence", source_column: "source", audience: "staff" },
  ],
  paper: { includes: ["reports/demo-report/tables/t1.tex"], bib: ["reports/demo-report/refs.bib"], style: [], audience: "public" },
  record_sets: [{ id: "records", dir: "tools/demo/records", schema: "demo.record/1", label: "Records", licence: "CC BY-SA 4.0", audience: "staff" }],
  tool: { path: "tools/demo", readme: "tools/demo/README.md", audience: "staff" },
  builds: [{ id: "figures", label: "Figures", runner: "python", entry: "reports/demo-report/figures/fig1.py", inputs: ["tools/demo/rows.tsv"], outputs: ["reports/demo-report/figures/fig1.png"], needs: ["python3"], audience: "staff" }],
  attributions: [{ source: "Demo source", url: "https://example.org/demo", licence: "CC0-1.0", rows: 3, notice: "Demo rows." }],
};
const v2Bytes = canonicalBytes(v2);
const v2Files = { ...files, "reports/demo-report/report.json": v2Bytes };
const present = new Set([...localPaths(v2).map((entry) => entry.path)]);
const checkWith = (record, exists) => checkRecord(record, { slug: "demo-report", bytes: (p) => (p === "reports/demo-report/report.json" ? canonicalBytes(record) : v2Files[p] ?? null), exists, papersSource: "" });

test("v2 record validates and v1 record with a new key fails", () => {
  assert.deepEqual(validateRecord(v2), []);
  assert.deepEqual(validateRecord(atlas), []);
  assert.equal(atlas.schema, "bucket.report/2");
  for (const key of LOCAL_KEYS) assert.ok(validateRecord({ ...base, [key]: v2[key] }).includes(`${key}: needs bucket.report/2`), key);
  assert.ok(validateRecord({ ...base, schema: "bucket.report/3" }).some((e) => e.startsWith("schema")));
  assert.ok(validateRecord({ ...v2, assets: [v2.assets[0], v2.assets[0]] }).some((e) => e.includes("fig-one repeats")));
  assert.ok(validateRecord({ ...v2, tables: [{ ...v2.tables[1], licence_column: undefined }] }).some((e) => e.includes("licence_column")));
  assert.ok(validateRecord({ ...v2, tables: [{ ...v2.tables[0], licence: "" }] }).some((e) => e.includes("licence")));
  assert.ok(validateRecord({ ...v2, tables: [{ ...v2.tables[0], audience: undefined }] }).some((e) => e.includes("audience")));
  assert.ok(validateRecord({ ...v2, tables: [{ ...v2.tables[0], path: "../rows.csv" }] }).some((e) => e.includes("tables[0].path")));
  assert.ok(validateRecord({ ...v2, assets: [{ ...v2.assets[0], build: "nope" }] }).some((e) => e.includes("is not a build id")));
});

test("publicPaths of the v2 atlas record equals publicPaths of its v1 form", () => {
  assert.deepEqual(validateRecord(atlasV1), []);
  assert.deepEqual(publicPaths(atlas), publicPaths(atlasV1));
  assert.equal(publicPaths(atlas).figures.length, 4);
});

test("papersEntry of the v2 atlas record emits 4 figures and 1 data link", () => {
  const text = papersEntry(atlas);
  assert.equal(text, papersEntry(atlasV1));
  assert.equal((text.match(/^ {8}src: /gm) ?? []).length, 4);
  assert.equal((text.match(/href: "\/papers\/solvability-frontier\/data\//g) ?? []).length, 1);
  for (const key of LOCAL_KEYS) assert.ok(!text.includes(`${key}:`), key);
});

test("registerRow has the same keys for v1 and v2", () => {
  const now = "2026-10-11T00:00:00Z";
  assert.deepEqual(Object.keys(registerRow(atlas, now)), Object.keys(registerRow(atlasV1, now)));
  assert.deepEqual(registerRow(atlas, now), registerRow(atlasV1, now));
  assert.deepEqual(Object.keys(registerRow(v2, now)), ["slug", "title", "authors", "date", "status", "kind", "abstract", "bead", "source_path", "pdf_path", "figures", "data_sources", "source_hash", "pdf_hash", "built_at", "published_at", "updated_at"]);
  assert.equal(registerRow(v2, now).updated_at, now);
});

test("checkRecord passes a staff table with no public copy", () => {
  assert.deepEqual(checkWith(v2, (p) => present.has(p)), []);
  assert.ok(!present.has("public/papers/demo-report/data/rows.tsv"));
  assert.deepEqual(localPaths(v2).find((entry) => entry.path === "tools/demo/rows.tsv"), { path: "tools/demo/rows.tsv", audience: "staff", role: "table" });
  assert.equal(localPaths(v2).find((entry) => entry.role === "asset-source").audience, "staff");
  assert.equal(localPaths({ ...v2, tables: [{ ...v2.tables[0], audience: undefined }] }).find((entry) => entry.role === "table").audience, "staff");
});

test("checkRecord fails a missing local file", () => {
  assert.deepEqual(checkWith(v2, (p) => present.has(p) && p !== "tools/demo/rows.tsv"), ["local file missing: tools/demo/rows.tsv"]);
  assert.ok(checkWith({ ...v2, slug: "other-report" }, () => true).some((e) => e.startsWith("slug")));
  assert.ok(checkRecord(v2, { slug: v2.slug, bytes: (p) => (p.endsWith("report.json") ? Buffer.from(`${JSON.stringify(v2)}\n`) : v2Files[p] ?? null), exists: () => true, papersSource: "" }).includes("report.json: not in canonical byte form"));
  const live = { ...v2, status: "public", published_at: "2026-10-07T11:00:00Z" };
  assert.deepEqual(checkWith(live, (p) => present.has(p)).filter((e) => e.startsWith("public copy missing")), ["public copy missing: public/papers/demo-report/paper.pdf"]);
  assert.ok(checkWith(live, () => true).includes("src/lib/papers.ts: no entry"));
});

test("audience public on a tools path is rejected", () => {
  assert.ok(validateRecord({ ...v2, tables: [{ ...v2.tables[1], audience: "public" }] }).includes("tables[0].audience: tools/demo/rows.tsv cannot be public"));
  assert.ok(validateRecord({ ...v2, tool: { ...v2.tool, audience: "public" } }).some((e) => e.startsWith("tool.audience")));
  assert.ok(validateRecord({ ...v2, record_sets: [{ ...v2.record_sets[0], audience: "public" }] }).some((e) => e.startsWith("record_sets[0].audience")));
  assert.ok(validateRecord({ ...v2, builds: [{ ...v2.builds[0], audience: "public" }] }).some((e) => e.startsWith("builds[0].audience")));
  assert.deepEqual(validateRecord({ ...v2, tables: [{ ...v2.tables[0], path: "reports/demo-report/data/rows.csv" }] }), []);
  for (const entry of localPaths(atlas)) if (entry.path.startsWith("tools/")) assert.equal(entry.audience, "staff", entry.path);
});

test("build entry outside the manifest is rejected", () => {
  assert.ok(validateRecord({ ...v2, builds: [{ ...v2.builds[0], entry: "scripts/other.py" }] }).includes("builds[0].entry: scripts/other.py is not listed in the manifest"));
  assert.ok(validateRecord({ ...v2, builds: [{ ...v2.builds[0], inputs: ["data/other.csv"] }] }).includes("builds[0].inputs[0]: data/other.csv is not listed in the manifest"));
  assert.ok(validateRecord({ ...v2, builds: [{ ...v2.builds[0], runner: "bash" }] }).some((e) => e.includes("runner")));
  assert.deepEqual(validateRecord({ ...v2, builds: [{ ...v2.builds[0], entry: "tools/demo/build.py", inputs: ["tools/demo/records/a.json", v2.source_path] }] }), []);
});

test("canonical bytes hold for v2", () => {
  assert.ok(atlasBytes.equals(canonicalBytes(atlas)));
  assert.ok(v2Bytes.equals(canonicalBytes(JSON.parse(v2Bytes.toString("utf8")))));
  assert.ok(v2Bytes.toString("utf8").endsWith("}\n"));
  assert.ok(validateRecord({ ...v2, attributions: [{ ...v2.attributions[0], rows: 1.5 }] }).some((e) => e.includes("rows")));
});

test("a staff path cannot be made public through paper", () => {
  const leak = { id: "leak", path: "tools/solvability-atlas/problems-sourced.tsv", format: "tsv", label: "Leak", licence: "mixed", licence_column: "licence", audience: "public" };
  const critic = { ...atlas, paper: { ...atlas.paper, lean: "tools/solvability-atlas" }, tables: [...atlas.tables.filter((t) => t.path !== leak.path), leak] };
  const found = validateRecord(critic);
  assert.ok(found.includes("paper.lean: must sit inside papers/solvability-frontier"));
  assert.ok(found.some((e) => e.endsWith(`.audience: ${leak.path} cannot be public`)));
  assert.equal(localPaths(critic).find((entry) => entry.path === leak.path).audience, "staff");
  const viaIncludes = { ...atlas, paper: { ...atlas.paper, includes: [...atlas.paper.includes, leak.path] }, tables: [...atlas.tables.filter((t) => t.path !== leak.path), leak] };
  const includeErrors = validateRecord(viaIncludes);
  assert.ok(includeErrors.includes(`paper.audience: ${leak.path} cannot be public`));
  assert.ok(includeErrors.some((e) => e.startsWith("tables[") && e.endsWith(`${leak.path} cannot be public`)));
  assert.equal(localPaths(viaIncludes).find((entry) => entry.path === leak.path).audience, "staff");
  const wide = { ...atlas, paper: { ...atlas.paper, lean: "papers" }, tables: [...atlas.tables, { ...leak, id: "other", path: "papers/other-paper/private.tsv" }] };
  const wideErrors = validateRecord(wide);
  assert.ok(wideErrors.includes("paper.lean: must sit inside papers/solvability-frontier"));
  assert.ok(wideErrors.some((e) => e.endsWith("papers/other-paper/private.tsv cannot be public")));
  const viaSources = { ...atlas, tables: [...atlas.tables, { ...leak, id: "openalex-tool", path: "tools/solvability-atlas/openalex-sourced.json", format: "json", licence: "CC0-1.0" }] };
  assert.ok(validateRecord(viaSources).some((e) => e.endsWith("tools/solvability-atlas/openalex-sourced.json cannot be public")));
  assert.ok(validateRecord({ ...v2, paper: { ...v2.paper, lean: "reports/demo-report" } }).some((e) => e.startsWith("paper.lean")));
  assert.deepEqual(validateRecord({ ...v2, paper: { ...v2.paper, lean: "reports/demo-report/lean" } }), []);
  assert.ok(validateRecord({ ...v2, paper: { ...v2.paper, bib: ["data/outside.bib"] } }).includes("paper.audience: data/outside.bib cannot be public"));
});

test("localPaths gives one audience per path and staff wins", () => {
  const shared = "public/papers/demo-report/data/rows.csv";
  const twice = { ...v2, tables: [v2.tables[0], { ...v2.tables[0], id: "rows-staff", audience: "staff" }] };
  assert.deepEqual(localPaths(twice).filter((entry) => entry.path === shared), [{ path: shared, audience: "staff", role: "table" }]);
  const reversed = { ...v2, tables: [{ ...v2.tables[0], id: "rows-staff", audience: "staff" }, v2.tables[0]] };
  assert.deepEqual(localPaths(reversed).filter((entry) => entry.path === shared), [{ path: shared, audience: "staff", role: "table" }]);
  for (const record of [atlas, v2, twice]) assert.equal(new Set(localPaths(record).map((entry) => entry.path)).size, localPaths(record).length);
  assert.equal(localPaths(v2).find((entry) => entry.path === shared).audience, "public");
});

assert.equal(named, 11);
console.log("test-report-record: ok");
