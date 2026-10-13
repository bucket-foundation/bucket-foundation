import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MAPS } from "../src/app/research/maps/maps";
import BacktestPage, { metadata as backtestMetadata } from "../src/app/research/maps/forecast-backtest/page";
import EvidencePage, { metadata as evidenceMetadata } from "../src/app/research/maps/evidence-market/page";
import LifespanPage, { metadata as lifespanMetadata } from "../src/app/research/maps/lifespan/page";
import SchoolPage, { metadata as schoolMetadata } from "../src/app/research/maps/school-map/page";
import WavesPage, { metadata as wavesMetadata } from "../src/app/research/maps/technology-waves/page";
import CompletenessPage, { metadata as completenessMetadata } from "../src/app/research/maps/completeness/page";
import OccupationsPage, { metadata as occupationsMetadata } from "../src/app/research/maps/occupations-history/page";
import { ageLabel, backtestVerdict, heat, loadBacktest, loadEvidenceMarket, loadLifespan, loadSchoolMap, loadTechnologyWaves, wrapWords, yearLabel } from "../src/lib/research-maps/corpus-maps";

const ROOT = path.join(__dirname, "..");
const count = (html: string, needle: string): number => html.split(needle).length - 1;
const render = (page: () => JSX.Element): string => renderToStaticMarkup(createElement(page));

test("the backtest loader holds four origins and a failed verdict", () => {
  const b = loadBacktest();
  assert.deepEqual(b.origins.map((o) => o.origin), [1999, 2004, 2009, 2010]);
  assert.deepEqual(b.origins.map((o) => o.result), ["tie", "loss", "win", "win"]);
  assert.equal(b.bls.length, 3);
  assert.deepEqual(b.pass, { needed: 3, wins: 2, passed: false, forecastIssued: false });
  assert.equal(backtestVerdict(b), "The damped trend failed its test. It beat the no-change forecast at 2 of 4 ten-year origins, and the rule needs 3.");
  assert.equal(backtestVerdict({ date: null, source: "s", origins: [], bls: [], pass: null }), "No backtest results yet.");
  for (const o of b.origins) assert.equal(o.result === "win", o.damped < o.naive, String(o.origin));
});

test("the backtest page prints every error number and issues no forecast", () => {
  const html = render(BacktestPage);
  assert.equal(count(html, "data-origin="), 4);
  assert.equal(count(html, "data-bls="), 3);
  for (const n of ["19.06", "16.82", "17.82", "15.84", "14.70", "17.43", "16.61", "14.73", "16.52", "16.70"]) assert.ok(html.includes(n), n);
  assert.ok(html.includes("The damped trend failed its test."));
  assert.ok(html.includes("No 2034 forecast is issued."));
  assert.ok(html.includes('data-result="loss"') && html.includes('data-result="tie"'));
});

test("the evidence loader matches the stated 21 of 187 and the page shows counts without product names", () => {
  const d = loadEvidenceMarket();
  assert.equal(d.controlled, 21);
  assert.equal(d.players, 187);
  assert.equal(d.levels.length, 9);
  assert.equal(d.methods.length, 9);
  assert.equal(d.unused.length, 9);
  assert.ok(d.levels.every((l) => l.controlled <= l.players));
  assert.ok(d.methods.every((m) => m.controlled <= m.products));
  const html = render(EvidencePage);
  assert.ok(html.includes("21 of 187 learning products"));
  assert.equal(count(html, "data-row="), 18);
  assert.equal(count(html, "<li"), 9);
  for (const name of ["Duolingo", "Khan Academy", "Anki", "Coursera"]) assert.ok(!html.includes(name), name);
  assert.ok(!html.includes("<img"));
});

test("the lifespan loader bins every aged row once and the page prints each cell count", () => {
  const d = loadLifespan();
  assert.equal(d.cells.reduce((a, c) => a + c.rows, 0), d.aged);
  assert.ok(d.cells.every((c) => c.verified <= c.rows && d.kinds.includes(c.kind) && c.bin >= 0 && c.bin < d.bins.length - 1));
  assert.equal(d.kinds.length, 7);
  assert.equal(ageLabel(d.bins, 0), "Under 1");
  assert.equal(ageLabel(d.bins, d.bins.length - 2), "65 and over");
  const html = render(LifespanPage);
  assert.equal(count(html, "data-cell="), 7 * (d.bins.length - 1));
  assert.equal(count(html, "data-kind="), 7);
  assert.ok(html.includes(`${d.rows} rows, ${d.aged} with an age`));
});

test("the school map loader holds 15 panels and 42 AP courses and the page draws them", () => {
  const d = loadSchoolMap();
  assert.equal(d.panels.length, 15);
  assert.equal(d.ap.courses.length, 42);
  assert.equal(d.ap.courses.reduce((a, c) => a + c.units, 0), d.ap.units);
  for (const p of d.panels) assert.ok(p.cells.every(([s, g, n]) => s < d.subjects.length && g < d.grades.length && n > 0), p.id);
  const html = render(SchoolPage);
  assert.equal(count(html, "data-system="), 15);
  assert.equal(count(html, "data-ap="), 42);
  assert.ok(html.includes("42<!-- --> Advanced Placement courses sized by units") || html.includes("42 Advanced Placement courses sized by units"));
});

test("the technology waves loader holds 14 waves and the page prints its sample sizes", () => {
  const d = loadTechnologyWaves();
  assert.equal(d.waves.length, 14);
  assert.equal(d.counts.technologies + d.waves.length, 698);
  assert.equal(d.waves.reduce((a, w) => a + w.technologies, 0), d.counts.technologies);
  assert.ok(d.counts.wikidataOnly > d.counts.technologies / 2);
  assert.equal(d.waves.reduce((a, w) => a + w.trainingLags.length, 0), d.trainingLag.n);
  assert.equal(d.peakLags.length, d.peakLag.n);
  assert.ok(d.peakLags.every((l) => l.to - l.from === l.years));
  assert.equal(yearLabel(-3300000), "3.3 million BC");
  assert.equal(yearLabel(-10000), "10,000 BC");
  assert.equal(yearLabel(null), "now");
  const html = render(WavesPage).replace(/<!-- -->/g, "");
  assert.equal(count(html, "data-wave="), 14);
  assert.ok(html.includes("698 rows kept after filtering") && html.includes("unverified Wikidata rows") && !html.includes("6,977"));
  assert.equal(count(html, "data-peak="), d.peakLag.n);
  assert.ok(html.includes(`n = ${d.peakLag.n}, median ${d.peakLag.median} years`));
  assert.ok(html.includes(`n = ${d.trainingLag.n}, median ${d.trainingLag.median} years`));
  assert.equal(count(html, "<circle"), d.trainingLag.n);
});

test("the completeness data and page hold codes alone for the two withheld outlines", () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/research-maps/completeness.json"), "utf8")) as { dimensions: { groups: { id: string; cells: { code: string; label: string }[] }[] }[] };
  const groups = data.dimensions.flatMap((d) => d.groups);
  const withheld = groups.filter((g) => g.id === "ocm" || g.id === "propaedia");
  assert.deepEqual(withheld.map((g) => g.cells.length).sort(), [41, 83]);
  for (const g of withheld) for (const c of g.cells) assert.ok(c.code !== "" && c.label === "", `${g.id} ${c.code}`);
  assert.ok(groups.filter((g) => g.id !== "ocm" && g.id !== "propaedia").every((g) => g.cells.every((c) => c.label !== "")));
  const html = render(CompletenessPage);
  const titles = Array.from(html.matchAll(/<title>([^<]*)<\/title>/g), (m) => m[1]);
  const domain = titles.filter((t) => t.startsWith("Domain: "));
  assert.equal(domain.filter((t) => /^Domain: \d{3}\. /.test(t)).length, 83);
  assert.equal(domain.filter((t) => /^Domain: \d+\.\d+\. /.test(t)).length, 41);
  for (const word of ["Orientation", "Atoms"]) assert.ok(!html.includes(word), word);
});

test("every aggregate names its source files with a hash and a date, and no home path", () => {
  const dir = path.join(ROOT, "src/data/research-maps");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 11);
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const data = JSON.parse(text) as { sources?: { file: string; sha256: string; date: string }[] };
    assert.ok(Array.isArray(data.sources) && data.sources.length > 0, f);
    for (const s of data.sources) {
      assert.match(s.sha256, /^[0-9a-f]{64}$/, f);
      assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/, f);
      assert.ok(!s.file.startsWith("/") && !s.file.includes("home"), f);
    }
    assert.ok(!text.includes("/home/"), f);
  }
});

test("the maps and their logo files answer with a noindex header", () => {
  const config = fs.readFileSync(path.join(ROOT, "next.config.mjs"), "utf8");
  const general = config.indexOf('source: "/:path*"');
  for (const source of ["/research/maps/:path*", "/research/maps"]) {
    const at = config.indexOf(`source: "${source}",\n        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" }]`);
    assert.ok(at > general && general > 0, source);
  }
  assert.ok(fs.existsSync(path.join(ROOT, "public/research/maps/logos/manifest.json")));
});

test("shared helpers shade and wrap", () => {
  assert.equal(heat(0, 10).fill, "#EFE8D4");
  assert.equal(heat(10, 10).fill, "rgb(31,79,79)");
  assert.equal(heat(10, 10).ink, "#EFE8D4");
  assert.deepEqual(wrapWords("one two three four", 9), ["one two", "three", "four"]);
});

test("the completeness and occupations pages render with their figures", () => {
  const completeness = render(CompletenessPage);
  assert.ok(completeness.includes("data-map-figure") && completeness.includes("3.1"));
  const occupations = render(OccupationsPage);
  assert.ok(occupations.includes("data-map-figure") && count(occupations, "<svg") >= 2);
});

test("every map is listed on the index, has a page, sets noindex, and carries clean copy", () => {
  assert.equal(MAPS.length, 11);
  for (const m of MAPS) assert.ok(fs.existsSync(path.join(ROOT, "src/app/research/maps", m.slug, "page.tsx")), m.slug);
  for (const m of [backtestMetadata, evidenceMetadata, lifespanMetadata, schoolMetadata, wavesMetadata, completenessMetadata, occupationsMetadata]) {
    assert.equal((m.robots as { index: boolean }).index, false);
  }
  for (const page of [BacktestPage, EvidencePage, LifespanPage, SchoolPage, WavesPage, CompletenessPage, OccupationsPage]) {
    const html = render(page);
    const copy = Array.from(html.matchAll(/<(h1|h2|h3|p|figcaption)[^>]*>([\s\S]*?)<\/\1>/g), (m) => m[2].replace(/<[^>]+>/g, " ")).join(" ");
    assert.doesNotMatch(copy, /[–—]/);
    assert.doesNotMatch(copy, /\b(really|actually|simply|very|robust|seamless|landscape|leverage)\b/i);
  }
});
