import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  EDTF_SUBSET,
  EDTF_SUBSET_SOURCE,
  SPAN_CALENDARS,
  SPAN_PRECISIONS,
  SPAN_QUALIFIERS,
  gregorianDayNumber,
  julianOffsetDays,
  parseEdtf,
  parseLifespan,
  parseSpan,
  parseYear,
  fromWikidata,
} from "../src/lib/history/span";
import type { CalendarHint, LifespanResult, Span, SpanResult, WikidataTime, YearConvention } from "../src/lib/history/span";

const ROOT = path.resolve(__dirname, "..");
const GOLDEN_PATH = path.join(ROOT, "scripts/fixtures/history-span-golden.json");

interface GoldenCase {
  id: string;
  category: string;
  call: "edtf" | "span" | "year" | "lifespan" | "wikidata";
  input: string | number | WikidataTime;
  options?: { calendar?: CalendarHint; convention?: YearConvention };
  expect: { span?: Span; roles?: Record<string, Span>; refusal?: string };
  offset_days?: number;
  subject?: string;
}

const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf8")) as { schema: string; edtf_pattern: string; cases: GoldenCase[] };

function run(c: GoldenCase): SpanResult | LifespanResult {
  const calendar = c.options?.calendar;
  if (c.call === "year") return parseYear(c.input as number, c.options!.convention!);
  if (c.call === "edtf") return parseEdtf(c.input as string, { calendar });
  if (c.call === "span") return parseSpan(c.input as string, { calendar });
  if (c.call === "wikidata") return fromWikidata(c.input as WikidataTime);
  return parseLifespan(c.input as string);
}

function spansOf(c: GoldenCase): Span[] {
  if (c.expect.span) return [c.expect.span];
  return Object.values(c.expect.roles ?? {});
}

function span(r: SpanResult): Span {
  assert.ok(r.ok, JSON.stringify(r));
  return r.span;
}

function roles(r: LifespanResult) {
  assert.ok(r.ok, JSON.stringify(r));
  return r.roles;
}

test("the golden file holds at least 70 unique cases across every category", () => {
  assert.equal(golden.schema, "history-span-golden/1");
  assert.ok(golden.cases.length >= 70, `${golden.cases.length} cases`);
  assert.equal(new Set(golden.cases.map((c) => c.id)).size, golden.cases.length);
  const categories = new Set(golden.cases.map((c) => c.category));
  for (const name of ["edtf", "unknown-calendar", "rejected", "integer-year", "era-text", "century", "julian", "old-style", "figure", "wikidata"]) {
    assert.ok(categories.has(name), name);
  }
});

test("every golden case reproduces exactly", () => {
  for (const c of golden.cases) {
    const r = run(c);
    if (c.expect.refusal) {
      assert.equal(r.ok, false, `${c.id} should be refused`);
      if (!r.ok) assert.equal(r.refusal, c.expect.refusal, c.id);
    } else if (c.expect.roles) {
      assert.deepEqual(roles(r as LifespanResult), c.expect.roles, c.id);
    } else {
      assert.deepEqual(span(r as SpanResult), c.expect.span, c.id);
    }
  }
});

test("the parser pattern is the column CHECK pattern in HISTORY-PLAN.md 3.5", () => {
  const plan = fs.readFileSync(path.join(ROOT, "learning/research-os/HISTORY-PLAN.md"), "utf8");
  const line = plan.split("\n").find((l) => l.startsWith("`^(Y-?"));
  assert.ok(line, "regex line missing from the plan");
  assert.equal(line!.replace(/^`|`$/g, ""), EDTF_SUBSET_SOURCE);
  assert.equal(golden.edtf_pattern, EDTF_SUBSET_SOURCE);
});

test("every emitted span satisfies the factoid CHECKs and reparses to the same nominal years", () => {
  for (const c of golden.cases) {
    for (const s of spansOf(c)) {
      assert.ok(EDTF_SUBSET.test(s.edtf), `${c.id}: ${s.edtf}`);
      assert.ok(s.start_min <= s.start_year && s.start_year <= s.start_max, c.id);
      assert.ok(s.end_min <= s.end_year && s.end_year <= s.end_max, c.id);
      assert.ok(s.start_year <= s.end_year && s.start_min <= s.end_min && s.start_max <= s.end_max, c.id);
      assert.ok((SPAN_PRECISIONS as readonly string[]).includes(s.precision), c.id);
      assert.ok((SPAN_CALENDARS as readonly string[]).includes(s.calendar), c.id);
      assert.ok((SPAN_QUALIFIERS as readonly string[]).includes(s.qualifier), c.id);
      const again = span(parseEdtf(s.edtf, { calendar: "gregorian" }));
      assert.equal(again.start_year, s.start_year, c.id);
      assert.equal(again.end_year, s.end_year, c.id);
    }
  }
});

test("HISTORY-PLAN.md 3.5 table rows", () => {
  const bad = parseEdtf("2020-13-45");
  assert.ok(!bad.ok && bad.refusal === "impossible-date");

  const pythagoras = span(parseYear(-570, "historical"));
  assert.equal(pythagoras.edtf, "-0569");
  assert.deepEqual([pythagoras.start_min, pythagoras.start_max, pythagoras.end_min, pythagoras.end_max], [-569, -569, -569, -569]);

  const lascaux = span(parseYear(-17000, "historical"));
  assert.equal(lascaux.edtf, "Y-16999");

  const euclid = roles(parseLifespan("c.325-c.265 BCE"));
  assert.equal(euclid.born!.edtf, "-0324~");
  assert.deepEqual([euclid.born!.start_min, euclid.born!.end_max], [-334, -314]);
  assert.equal(euclid.died!.edtf, "-0264~");
  assert.deepEqual([euclid.died!.start_min, euclid.died!.end_max], [-274, -254]);

  assert.equal(span(parseSpan("6th century")).edtf, "0501/0600");
  assert.equal(span(parseSpan("6th century BCE")).edtf, "-0599/-0500");

  const x = span(parseEdtf("05XX"));
  assert.deepEqual([x.start_min, x.end_max], [500, 599]);

  const gregory = span(parseEdtf("1582-10-04", { calendar: "julian" }));
  assert.equal(gregory.edtf, "1582-10-14");
  assert.equal(julianOffsetDays(1582, 10), 10);

  const christmas = span(parseEdtf("1900-12-25", { calendar: "julian" }));
  assert.equal(christmas.edtf, "1901-01-07");
  assert.equal(christmas.start_year, 1901);
  assert.equal(julianOffsetDays(1900, 12), 13);

  const deep = span(parseEdtf("-5399-01-01", { calendar: "julian" }));
  assert.equal(julianOffsetDays(-5399, 1), -42);
  assert.equal(deep.start_year, -5400);

  const newtonBorn = span(parseSpan("25 Dec 1642 OS"));
  assert.equal(newtonBorn.edtf, "1643-01-04");
  assert.deepEqual([newtonBorn.start_min, newtonBorn.start_max], [1642, 1643]);
  assert.equal(newtonBorn.calendar, "julian-os");

  const newtonDied = span(parseSpan("20 Mar 1727 OS"));
  assert.equal(newtonDied.edtf, "1727-03-31");
  assert.deepEqual([newtonDied.end_min, newtonDied.end_max], [1727, 1728]);

  const dual = span(parseSpan("20 Mar 1726/27"));
  assert.equal(dual.edtf, "1727-03-31");
  assert.deepEqual([dual.end_min, dual.end_max], [1727, 1727]);

  assert.deepEqual(Object.keys(roles(parseLifespan("1939-"))), ["born"]);
  assert.equal(roles(parseLifespan("1939-")).born!.edtf, "1939");

  const composite = parseLifespan("Watson 1928-, Crick 1916-2004");
  assert.ok(!composite.ok && composite.refusal === "composite");
});

test("Julian conversion agrees with the D(Y) formula across 7,400 years", () => {
  for (let year = -5400; year <= 2100; year += 7) {
    for (const [month, day] of [[1, 1], [2, 28], [3, 1], [6, 15], [12, 31]]) {
      const r = span(parseEdtf(`${year < 0 ? "-" : ""}${String(Math.abs(year)).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, { calendar: "julian" }));
      const [gy, gm, gd] = r.edtf.replace(/^-/, "~").split("-").map((p) => Number(p.replace("~", "-")));
      const shift = gregorianDayNumber({ year: gy, month: gm, day: gd }) - gregorianDayNumber({ year, month, day });
      assert.equal(shift, julianOffsetDays(year, month), `${year}-${month}-${day}`);
    }
  }
});

test("julian golden cases carry the offset the conversion applies", () => {
  for (const c of golden.cases.filter((g) => g.offset_days !== undefined && g.expect.span)) {
    const [, y, m, d] = /^(-?\d{4})-(\d{2})-(\d{2})$/.exec(c.input as string)!;
    const out = c.expect.span!.edtf;
    const [, gy, gm, gd] = /^(-?\d{4})-(\d{2})-(\d{2})$/.exec(out)!;
    const shift = gregorianDayNumber({ year: +gy, month: +gm, day: +gd }) - gregorianDayNumber({ year: +y, month: +m, day: +d });
    assert.equal(shift, c.offset_days, c.id);
    assert.equal(julianOffsetDays(+y, +m), c.offset_days, c.id);
  }
});

test("figures.json: 97 targets yield 95 born, 85 died and 2 flourished", () => {
  const figures = JSON.parse(fs.readFileSync(path.join(ROOT, "canon-figures/figures.json"), "utf8")).figures as { id: string; lifespan: string }[];
  const golden_figures = new Map(golden.cases.filter((c) => c.category === "figure").map((c) => [c.subject, c]));
  const counts = { born: 0, died: 0, flourished: 0 };
  const refused: string[] = [];
  const living: string[] = [];
  const floruit: string[] = [];
  for (const f of figures) {
    assert.equal(golden_figures.get(f.id)?.input, f.lifespan, f.id);
    const r = parseLifespan(f.lifespan);
    if (!r.ok) {
      refused.push(f.id);
      continue;
    }
    if (r.roles.born) counts.born++;
    if (r.roles.died) counts.died++;
    if (r.roles.flourished) {
      counts.flourished++;
      floruit.push(f.id);
    }
    if (r.roles.born && !r.roles.died) living.push(f.id);
  }
  assert.deepEqual(counts, { born: 95, died: 85, flourished: 2 });
  assert.deepEqual(refused.sort(), ["hodgkin-huxley", "watson-crick"]);
  assert.deepEqual(floruit.sort(), ["homer", "laozi"]);
  assert.deepEqual(
    living.sort(),
    ["carlson-randall", "chomsky", "khavinson", "lane", "levin", "marino", "pollack", "schoch", "solis-herrera", "wallace-doug"],
  );
});

test("every canon-sites and canon-timeline year parses as a historical year", () => {
  const sites = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/canon-sites.json"), "utf8")).sites as { id: string; year: number }[];
  const events = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/canon-timeline.json"), "utf8")).events as { id: string; year: number }[];
  for (const row of [...sites, ...events]) {
    const s = span(parseYear(row.year, "historical"));
    assert.equal(s.start_year, row.year < 0 ? row.year + 1 : row.year, row.id);
  }
});

test("Wikidata time values reach every precision from day to 100ka, in both calendar models", () => {
  const G = "http://www.wikidata.org/entity/Q1985727";
  const J = "http://www.wikidata.org/entity/Q1985786";
  const w = (time: string, precision: number, calendar = G, source?: "rdf" | "json") => span(fromWikidata({ time, precision, calendar, source }));
  const bounds = (s: Span) => [s.edtf, s.start_min, s.end_max, s.precision, s.calendar];

  assert.deepEqual(bounds(w("1879-03-14T00:00:00Z", 11)), ["1879-03-14", 1879, 1879, "day", "gregorian"]);
  assert.deepEqual(bounds(w("1642-12-25T00:00:00Z", 11, J, "json")), ["1643-01-04", 1643, 1643, "day", "julian"]);
  assert.deepEqual(bounds(w("1643-01-04T00:00:00Z", 11, J)), ["1643-01-04", 1643, 1643, "day", "julian"]);
  assert.deepEqual(bounds(w("1879-03-00T00:00:00Z", 10)), ["1879-03", 1879, 1879, "month", "gregorian"]);
  assert.deepEqual(bounds(w("1879-00-00T00:00:00Z", 9)), ["1879", 1879, 1879, "year", "gregorian"]);
  assert.deepEqual(bounds(w("-0500-00-00T00:00:00Z", 9, J, "json")).slice(0, 1), ["-0499"]);
  assert.deepEqual(bounds(w("1870-00-00T00:00:00Z", 8)), ["1870/1879", 1870, 1879, "decade", "gregorian"]);
  assert.deepEqual(bounds(w("1900-01-01T00:00:00Z", 7)), ["1801/1900", 1801, 1900, "century", "gregorian"]);
  assert.deepEqual(bounds(w("1201-01-01T00:00:00Z", 7)), ["1201/1300", 1201, 1300, "century", "gregorian"]);
  assert.deepEqual(bounds(w("-4300-01-01T00:00:00Z", 7, J)), ["-4399/-4300", -4399, -4300, "century", "julian"]);
  assert.deepEqual(bounds(w("2000-01-01T00:00:00Z", 6)), ["1001/2000", 1001, 2000, "millennium", "gregorian"]);
  assert.deepEqual(bounds(w("-5000-01-01T00:00:00Z", 6, J)), ["-5999/-5000", -5999, -5000, "millennium", "julian"]);
  assert.deepEqual(bounds(w("-12000-01-01T00:00:00", 6, J)), ["Y-12500/Y-11501", -12500, -11501, "ka", "julian"]);
  assert.deepEqual(bounds(w("-20000-01-01T00:00:00", 5, J)), ["Y-25000/Y-15001", -25000, -15001, "10ka", "julian"]);
  assert.deepEqual(bounds(w("-800000-01-01T00:00:00", 4)), ["Y-850000/Y-750001", -850000, -750001, "100ka", "gregorian"]);

  const refused = (v: WikidataTime) => {
    const r = fromWikidata(v);
    return r.ok ? null : r.refusal;
  };
  assert.equal(refused({ time: "-3400000-01-01T00:00:00", precision: 3, calendar: J }), "out-of-range");
  assert.equal(refused({ time: "1900-01-01T00:00:00Z", precision: 9, calendar: "http://www.wikidata.org/entity/Q12138" }), "calendar");
  assert.equal(refused({ time: "0000-01-01T00:00:00Z", precision: 9, calendar: G, source: "json" }), "impossible-date");
  assert.equal(refused({ time: "1900-02-29T00:00:00Z", precision: 11, calendar: G }), "impossible-date");
  assert.equal(refused({ time: "not a time", precision: 9, calendar: G }), "syntax");

  const precisions = new Set(golden.cases.filter((c) => c.category === "wikidata").flatMap(spansOf).map((s) => s.precision));
  assert.deepEqual(Array.from(precisions).sort(), Array.from(SPAN_PRECISIONS).sort());
});
