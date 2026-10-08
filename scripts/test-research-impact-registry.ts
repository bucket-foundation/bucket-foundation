import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { PAPERS } from "../src/lib/papers";
import { buildImpactItems, IMPACT_LINES, KINDS } from "../src/lib/research/impact-registry";
import { loadReportRecords } from "../src/lib/research/reports-loader";

const ROOT = process.cwd();
const APP = path.join(ROOT, "src", "app");
const reports = loadReportRecords();
const items = buildImpactItems(reports);

function routeExists(dir: string, segments: string[]): boolean {
  if (segments.length === 0) return fs.existsSync(path.join(dir, "page.tsx"));
  if (!fs.existsSync(dir)) return false;
  const [head, ...rest] = segments;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const grouped = e.name.startsWith("(") && e.name.endsWith(")");
    const dynamic = e.name.startsWith("[") && e.name.endsWith("]");
    const sub = path.join(dir, e.name);
    if (grouped && routeExists(sub, segments)) return true;
    if ((e.name === head || dynamic) && routeExists(sub, rest)) return true;
  }
  return false;
}

function resolves(href: string): boolean {
  if (!href.startsWith("/")) return false;
  if (fs.existsSync(path.join(ROOT, "public", href))) return true;
  return routeExists(APP, href.split("/").filter(Boolean));
}

test("every item has a title, a known kind, a known impact line and an href that resolves", () => {
  const lines = new Set<string>(IMPACT_LINES.map((l) => l.id));
  for (const i of items) {
    assert.ok(i.title && i.summary, i.id);
    assert.ok((KINDS as readonly string[]).includes(i.kind), i.id);
    assert.ok(lines.has(i.impact), i.id);
    assert.ok(resolves(i.href), `${i.id} -> ${i.href}`);
  }
});

test("item ids are unique", () => {
  const ids = items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every paper appears exactly once", () => {
  for (const p of PAPERS) {
    assert.equal(items.filter((i) => i.kind === "paper" && i.href === `/research/papers/${p.slug}`).length, 1, p.slug);
  }
});

test("every public report appears once, as a paper or a report", () => {
  const publicRecords = reports.filter((r) => r.status === "public");
  assert.ok(publicRecords.length > 0);
  for (const r of publicRecords) {
    const hits = items.filter((i) => (i.kind === "paper" || i.kind === "report") && i.href === `/research/papers/${r.slug}`);
    assert.equal(hits.length, 1, r.slug);
  }
});

test("private reports stay out of the registry", () => {
  for (const r of reports.filter((x) => x.status !== "public" && !PAPERS.some((p) => p.slug === x.slug))) {
    assert.ok(!items.some((i) => i.href.endsWith(`/${r.slug}`) && i.kind !== "figure"), r.slug);
  }
});

test("each impact line holds four items and every kind but report appears", () => {
  for (const l of IMPACT_LINES) {
    const here = items.filter((i) => i.impact === l.id);
    assert.ok(here.length >= 4, l.id);
  }
  for (const k of KINDS.filter((x) => x !== "report")) {
    assert.ok(items.some((i) => i.kind === k), k);
  }
});
