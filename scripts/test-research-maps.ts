import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sitemap from "../src/app/sitemap";
import MapsIndex from "../src/app/research/maps/page";
import { metadata as mapsMetadata } from "../src/app/research/maps/layout";
import { MAPS } from "../src/app/research/maps/maps";
import EdtechPage, { metadata as edtechMetadata } from "../src/app/research/maps/edtech/page";
import CoveragePage, { metadata as coverageMetadata } from "../src/app/research/maps/coverage/page";
import ProgressionsPage, { metadata as progressionsMetadata } from "../src/app/research/maps/progressions/page";
import FlowPage, { metadata as flowMetadata } from "../src/app/research/maps/flow/page";
import { EFFICACY_LABEL, SEGMENT_LABEL, filterPlayers, panelSpans } from "../src/lib/research-maps/edtech";
import { loadEdtech, logoFor } from "../src/lib/research-maps/edtech-data";
import { cipStatus, layoutCoverage, loadCoverage, socStatus, type CoverageUnit } from "../src/lib/research-maps/coverage";
import { squarify } from "../src/lib/research-maps/treemap";
import { edgeCounts, layoutPanel, loadProgressions, wrapLabel } from "../src/lib/research-maps/progressions";
import { layoutFlow, loadFlow } from "../src/lib/research-maps/flow";

const ROOT = path.join(__dirname, "..");
const LOGOS = path.join(ROOT, "public/research/maps/logos");
const manifest = JSON.parse(fs.readFileSync(path.join(LOGOS, "manifest.json"), "utf8")) as { logos: Record<string, { file?: string; source_url?: string; missing?: string }> };
const count = (html: string, needle: string): number => html.split(needle).length - 1;
const unit = (over: Partial<CoverageUnit>): CoverageUnit => ({ code: "00.00", title: "t", size: 1, rows: 0, verified: 0, edges: 0, programs: 0, books: 0, resources: 0, ...over });

test("edtech loader returns 187 players in 11 labelled segments ordered by count", () => {
  const data = loadEdtech();
  assert.equal(data.players.length, 187);
  assert.equal(data.segments.length, 11);
  const sizes = data.segments.map((s) => s.players.length);
  assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a));
  assert.equal(sizes.reduce((a, b) => a + b, 0), 187);
  for (const s of data.segments) assert.ok(SEGMENT_LABEL[s.id], s.id);
  for (const p of data.players) assert.ok(EFFICACY_LABEL[p.efficacy.level], p.id);
  assert.match(data.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("every logo file is on disk with the url it came from, and a player without one gets no logo", () => {
  const data = loadEdtech();
  assert.deepEqual(Object.keys(manifest.logos).sort(), data.players.map((p) => p.id).sort());
  const files = new Set(fs.readdirSync(LOGOS).filter((f) => f !== "manifest.json"));
  for (const [id, entry] of Object.entries(manifest.logos)) {
    if (!entry.file) {
      assert.ok(entry.missing, id);
      assert.equal(logoFor(id), null, id);
      continue;
    }
    assert.match(entry.source_url ?? "", /^https?:\/\//, id);
    assert.ok(files.has(entry.file), entry.file);
    assert.equal(logoFor(id)?.src, `/research/maps/logos/${entry.file}`);
  }
  assert.equal(files.size, new Set(Object.values(manifest.logos).flatMap((e) => (e.file ? [e.file] : []))).size);
  assert.equal(logoFor("anki", {}), null);
  assert.equal(logoFor("anki", { anki: { file: "anki.png" } }), null);
  assert.equal(loadEdtech({}).logoCount, 0);
});

test("panel spans fill a 24 column grid on every row", () => {
  const rows = panelSpans(loadEdtech().segments.map((s) => s.players.length));
  assert.equal(rows.length, 3);
  for (const row of rows) assert.equal(row.reduce((a, b) => a + b, 0), 24);
  assert.equal(rows.flat().length, 11);
  assert.deepEqual(panelSpans([5], 3, 24), [[24]]);
});

test("the table filter narrows by segment, evidence level and text", () => {
  const { players } = loadEdtech();
  assert.equal(filterPlayers(players, { segment: "", level: "", text: "" }).length, 187);
  assert.equal(filterPlayers(players, { segment: "language", level: "", text: "" }).length, 15);
  const independent = filterPlayers(players, { segment: "", level: "independent", text: "" });
  assert.ok(independent.length > 0 && independent.every((p) => p.efficacy.level === "independent"));
  assert.deepEqual(filterPlayers(players, { segment: "language", level: "", text: "duolingo" }).map((p) => p.id), ["duolingo"]);
  assert.equal(filterPlayers(players, { segment: "test-prep", level: "", text: "duolingo" }).length, 0);
});

test("squarify fills its bounds in proportion to value and drops empty items", () => {
  const out = squarify([{ v: 6 }, { v: 3 }, { v: 0 }, { v: 1 }], (i) => i.v, { x: 0, y: 0, w: 100, h: 50 });
  assert.equal(out.length, 3);
  const area = (v: number) => out.find((o) => o.item.v === v)!.rect.w * out.find((o) => o.item.v === v)!.rect.h;
  assert.ok(Math.abs(area(6) - 3000) < 1e-6 && Math.abs(area(3) - 1500) < 1e-6 && Math.abs(area(1) - 500) < 1e-6);
  for (const { rect } of out) assert.ok(rect.x >= -1e-9 && rect.y >= -1e-9 && rect.x + rect.w <= 100 + 1e-6 && rect.y + rect.h <= 50 + 1e-6);
  assert.deepEqual(squarify([], () => 1, { x: 0, y: 0, w: 10, h: 10 }), []);
});

test("coverage status rules and corpus totals", () => {
  assert.equal(cipStatus(unit({})), "empty");
  assert.equal(cipStatus(unit({ books: 2 })), "thin");
  assert.equal(cipStatus(unit({ rows: 9 })), "thin");
  assert.equal(cipStatus(unit({ rows: 10 })), "covered");
  assert.equal(socStatus(unit({})), "empty");
  assert.equal(socStatus(unit({ programs: 3 })), "thin");
  assert.equal(socStatus(unit({ rows: 1 })), "covered");
  const data = loadCoverage();
  assert.equal(data.cip.total, 457);
  assert.equal(data.soc.total, 98);
  assert.deepEqual(data.soc.counts, { empty: 5, thin: 18, covered: 75 });
  assert.equal(data.cip.counts.empty + data.cip.counts.thin + data.cip.counts.covered, 457);
  assert.equal(data.cip.groups.reduce((a, g) => a + g.units.length, 0), 457);
  assert.equal(data.soc.groups.length, 23);
  const cells = layoutCoverage(data.cip, 1000, 800).flatMap((g) => g.cells);
  assert.equal(cells.length, 457);
  assert.ok(cells.every((c) => c.rect.w > 0 && c.rect.h > 0));
});

test("progression panels hold only edges between their own topics and lay out without overlap", () => {
  const data = loadProgressions();
  assert.deepEqual(data.graphs.map((g) => g.id), ["mathematics", "algorithms"]);
  for (const g of data.graphs) {
    for (const p of g.panels) {
      const ids = new Set(p.nodes.map((n) => n.id));
      assert.equal(ids.size, p.nodes.length, p.id);
      for (const e of p.edges) assert.ok(ids.has(e.src) && ids.has(e.dst) && e.src !== e.dst, `${p.id} ${e.src} ${e.dst}`);
      const counts = edgeCounts(p);
      assert.equal(counts.stated + counts.inferred, p.edges.length);
      const layout = layoutPanel(p);
      assert.equal(layout.nodes.length, p.nodes.length);
      assert.equal(layout.edges.length, p.edges.length);
      assert.ok(layout.edges.every((e) => e.path.startsWith("M") && !e.path.includes("NaN")), p.id);
      for (const a of layout.nodes) {
        assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= layout.width + 1 && a.y + a.h <= layout.height + 1, a.id);
        for (const b of layout.nodes) {
          if (a.id >= b.id) continue;
          assert.ok(a.x + a.w <= b.x + 0.5 || b.x + b.w <= a.x + 0.5 || a.y + a.h <= b.y + 0.5 || b.y + b.h <= a.y + 0.5, `${a.id} overlaps ${b.id}`);
        }
      }
    }
  }
  const school = data.graphs[0].panels[0];
  assert.equal(school.nodes[0].id, "school-ccss-math-k-cc");
  const layout = layoutPanel(school);
  assert.equal(layout.bands.length, 10);
  const x = new Map(layout.nodes.map((n) => [n.id, n.x]));
  for (const e of school.edges) {
    const a = school.nodes.find((n) => n.id === e.src)!;
    const b = school.nodes.find((n) => n.id === e.dst)!;
    if (a.band! < b.band!) assert.ok(x.get(a.id)! < x.get(b.id)!, `${a.id} left of ${b.id}`);
  }
  assert.ok(edgeCounts(school).stated > 0 && edgeCounts(school).inferred > 0);
  assert.deepEqual(wrapLabel("one two three four", 9, 2), ["one two", "three…"]);
});

test("flow aggregate keeps all 5,723 crosswalk links", () => {
  const flow = loadFlow();
  assert.equal(flow.total, 5723);
  assert.equal(flow.links.reduce((a, l) => a + l.links, 0), 5723);
  assert.equal(flow.cip.reduce((a, n) => a + n.links, 0), 5723);
  assert.equal(flow.soc.reduce((a, n) => a + n.links, 0), 5723);
  assert.equal(flow.soc.length, 23);
  const layout = layoutFlow();
  assert.equal(layout.ribbons.length, flow.links.length);
  assert.equal(layout.ribbons.filter((r) => r.main).length >= flow.cip.length, true);
  for (const column of [layout.left, layout.right]) {
    column.slice(1).forEach((n, i) => assert.ok(n.y >= column[i].y + column[i].h, n.code));
  }
  assert.ok(layout.ribbons.every((r) => r.y0 >= 0 && r.y1 >= 0 && r.y0 <= layout.height && r.y1 <= layout.height));
});

test("the edtech map renders every player as a tile in its segment panel with the footer line", () => {
  const data = loadEdtech();
  const html = renderToStaticMarkup(createElement(EdtechPage, {}));
  assert.equal(count(html, "data-player="), 187);
  assert.equal(count(html, "data-segment="), 11);
  assert.equal(count(html, "data-text-tile"), 187 - data.logoCount);
  assert.equal(count(html, "<img "), data.logoCount);
  assert.ok(html.includes("data-map-legend") && html.includes("Independent study") && html.includes("Search pending"));
  assert.ok(html.includes(`${data.date}. 187 players in 11 categories. Logos are trademarks of their owners, shown for identification.`));
  assert.ok(html.indexOf('data-segment="researcher-knowledge-tools"') < html.indexOf('data-segment="moocs-credentials"'));
});

test("the edtech table view renders one row per player with the four fields", () => {
  const html = renderToStaticMarkup(createElement(EdtechPage, { searchParams: { view: "table" } }));
  assert.equal(count(html, "<tr"), 188);
  for (const head of ["Learner", "Mechanism", "Price", "Efficacy evidence"]) assert.ok(html.includes(`>${head}</th>`), head);
  assert.ok(html.includes("All categories") && html.includes("All evidence levels"));
  assert.ok(html.includes("187 of 187") || html.includes("187<!-- --> of <!-- -->187"));
  assert.equal(count(html, "data-player="), 0);
});

test("the coverage page renders both treemaps with a status and counts on every cell", () => {
  const html = renderToStaticMarkup(createElement(CoveragePage));
  assert.ok(html.includes('data-treemap="cip"') && html.includes('data-treemap="soc"'));
  assert.equal(count(html, "data-unit="), 457 + 98);
  assert.equal(count(html, 'data-status="empty"') + count(html, 'data-status="thin"') + count(html, 'data-status="covered"'), 457 + 98);
  assert.ok(html.includes("<title>11.07 Computer Science. Covered. 1 six-digit CIP programs, 807 rows"));
  assert.ok(html.includes("Empty, 5 of 98") && html.includes("Covered, 75 of 98"));
});

test("the progressions page draws stated edges solid and inferred edges dashed", () => {
  const data = loadProgressions();
  const html = renderToStaticMarkup(createElement(ProgressionsPage));
  const panels = data.graphs.flatMap((g) => g.panels);
  const stated = panels.reduce((a, p) => a + edgeCounts(p).stated, 0);
  const inferred = panels.reduce((a, p) => a + edgeCounts(p).inferred, 0);
  assert.equal(count(html, 'data-stated="true"'), stated);
  assert.equal(count(html, 'data-stated="false"'), inferred);
  assert.equal(count(html, "stroke-dasharray=\"4 3\""), inferred + panels.length);
  assert.equal(count(html, "data-node="), panels.reduce((a, p) => a + p.nodes.length, 0));
  assert.ok(html.includes('data-progression="mathematics"') && html.includes('data-progression="algorithms"'));
  assert.ok(html.includes("KINDERGARTEN") && html.includes("HIGH SCHOOL"));
});

test("the flow page draws one ribbon per aggregated link", () => {
  const flow = loadFlow();
  const html = renderToStaticMarkup(createElement(FlowPage));
  assert.equal(count(html, "data-ribbon="), flow.links.length);
  assert.equal(count(html, "data-cip="), flow.cip.length);
  assert.equal(count(html, "data-soc="), 23);
  assert.ok(html.includes("5,723 links"));
});

test("the maps stay unlisted: noindex on every page, absent from the sitemap and the site chrome", () => {
  for (const m of [mapsMetadata, edtechMetadata, coverageMetadata, progressionsMetadata, flowMetadata]) {
    assert.deepEqual((m.robots as { index: boolean; follow: boolean }).index, false);
  }
  assert.deepEqual(sitemap().filter((e) => e.url.includes("/research/maps")), []);
  for (const file of ["src/components/HeaderV3.tsx", "src/components/FooterV3.tsx", "src/app/research/page.tsx", "src/app/api/indexnow/ping/route.ts"]) {
    assert.ok(!fs.readFileSync(path.join(ROOT, file), "utf8").includes("research/maps"), file);
  }
  const html = renderToStaticMarkup(createElement(MapsIndex));
  for (const m of MAPS) {
    assert.ok(html.includes(`href="/research/maps/${m.slug}"`), m.slug);
    assert.ok(fs.existsSync(path.join(ROOT, "src/app/research/maps", m.slug, "page.tsx")), m.slug);
  }
});

test("page copy carries no dash characters or banned words", () => {
  const pages = [createElement(MapsIndex), createElement(EdtechPage, {}), createElement(CoveragePage), createElement(ProgressionsPage), createElement(FlowPage)];
  for (const page of pages) {
    const html = renderToStaticMarkup(page);
    const copy = Array.from(html.matchAll(/<(h1|h2|h3|p|figcaption)[^>]*>([\s\S]*?)<\/\1>/g), (m) => m[2].replace(/<[^>]+>/g, " ")).join(" ");
    assert.doesNotMatch(copy, /[–—]/);
    assert.doesNotMatch(copy, /\b(really|actually|simply|very|robust|seamless|landscape|leverage)\b/i);
  }
});
