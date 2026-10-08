import assert from "node:assert/strict";
import { canonicalBytes, checkHashes, findEntry, papersEntry, publicPaths, sha256, upsertPapersSource, validateRecord } from "./lib/report-record.mjs";

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

console.log("test-report-record: ok");
