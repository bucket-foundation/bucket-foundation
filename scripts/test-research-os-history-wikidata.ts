import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import { bronzeRecord } from "../src/lib/research-os/medallion/bronze";
import { verifySilver } from "../src/lib/research-os/medallion/silver";
import { rightsFor } from "../src/lib/history/importer";
import { datesQuery, eventsQuery, identityProposals, matchQuery, nameVariants, periodDrafts, planEventDates, planFigureDates, pointOf, type Figure } from "../src/lib/history/wikidata";

const ROOT = path.join(__dirname, "..");
const POLICY = parsePolicy(JSON.parse(readFileSync(path.join(ROOT, "learning", "research-os", "ai", "rights-policy.json"), "utf8")));
const RIGHTS = rightsFor(POLICY, "wikidata-figures-cc0");
const E = (q: string) => `<http://www.wikidata.org/entity/${q}>`;
const G = E("Q1985727");
const J = E("Q1985786");

const figures: Figure[] = [
  { slug: "figure-newton", id: "newton", name: "Isaac Newton", born: { start_min: 1642, end_max: 1643 } },
  { slug: "figure-laozi", id: "laozi", name: "Lao Tzu (Laozi)", born: { start_min: -599, end_max: -500 } },
  { slug: "figure-euclid", id: "euclid", name: "Euclid of Alexandria", born: { start_min: -334, end_max: -314 } },
  { slug: "figure-nobody", id: "nobody", name: "Nobody Known", born: { start_min: 1900, end_max: 1900 } },
];

const MATCH = [
  "?name\t?p\t?label\t?desc\t?born\t?died",
  `"Isaac Newton"@en\t${E("Q935")}\t"Isaac Newton"@en\t"English physicist"@en\t1643\t1727`,
  `"Isaac Newton"@en\t${E("Q1000001")}\t"Isaac Newton"@en\t"footballer"@en\t1970\t`,
  `"Laozi"@en\t${E("Q9333")}\t"Laozi"@en\t"Chinese philosopher"@en\t-570\t`,
  `"Lao Tzu"@en\t${E("Q9333")}\t"Laozi"@en\t"Chinese philosopher"@en\t-570\t`,
  `"Euclid"@en\t${E("Q8747")}\t"Euclid"@en\t"Greek mathematician"@en\t-322\t`,
  `"Euclid"@en\t${E("Q2000002")}\t"Euclid"@en\t"namesake"@en\t-330\t`,
].join("\n");

test("name variants cover the parenthetical and the part before 'of'", () => {
  assert.deepEqual(nameVariants("Lao Tzu (Laozi)"), ["Lao Tzu", "Lao Tzu (Laozi)", "Laozi"]);
  assert.deepEqual(nameVariants("Euclid of Alexandria"), ["Euclid", "Euclid of Alexandria"]);
  assert.match(matchQuery(figures), /VALUES \?name \{ "Euclid"@en "Euclid of Alexandria"@en/);
});

test("identity proposals keep candidates whose birth year fits the figure, and label one, several or none", () => {
  const p = identityProposals(figures, MATCH);
  const by = new Map(p.map((x) => [x.figure.id, x]));
  assert.equal(by.get("newton")!.reason, "one_candidate");
  assert.deepEqual(by.get("newton")!.candidates.map((c) => [c.qid, c.label, c.description, c.url]), [["Q935", "Isaac Newton", "English physicist", "https://www.wikidata.org/wiki/Q935"]]);
  assert.equal(by.get("laozi")!.reason, "one_candidate");
  assert.equal(by.get("euclid")!.reason, "several_candidates");
  assert.deepEqual(by.get("euclid")!.candidates.map((c) => c.qid), ["Q8747", "Q2000002"]);
  assert.equal(by.get("nobody")!.reason, "no_candidate");
});

test("date queries skip deprecated statements and carry the place property", () => {
  const q = datesQuery(["Q935", "Q9333"], "P569", "P19");
  assert.match(q, /VALUES \?p \{ wd:Q935 wd:Q9333 \}/);
  assert.match(q, /FILTER\(\?rank != wikibase:DeprecatedRank\)/);
  assert.match(q, /wdt:P19 \?place/);
  assert.match(eventsQuery(["Q1"]), /psv:P585/);
});

const BORN = [
  "?p\t?t\t?prec\t?cal\t?place\t?placeLabel\t?coord",
  `${E("Q935")}\t"1643-01-04T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>\t"11"^^<http://www.w3.org/2001/XMLSchema#int>\t${J}\t${E("Q1000002")}\t"Woolsthorpe"@en\t"Point(-0.63 52.81)"^^<http://www.opengis.net/ont/geosparql#wktLiteral>`,
  `${E("Q935")}\t"1643-01-04T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime>\t"11"^^<http://www.w3.org/2001/XMLSchema#int>\t${J}\t${E("Q999")}\t"No coordinate"@en\t`,
  `${E("Q9333")}\t"-0600-01-01T00:00:00Z"\t7\t${G}\t\t\t`,
  `${E("Q8747")}\t"-0322-01-01T00:00:00Z"\t3\t${J}\t\t\t`,
].join("\n");

test("figure dates become one silver item per statement, with the birthplace that has coordinates", () => {
  const bronze = bronzeRecord("_intake/history/wikidata-figures/2026-09-24/born.tsv", Buffer.from(BORN), RIGHTS);
  const plan = planFigureDates(bronze, "born", new Map([["Q935", ["figure-newton"]], ["Q9333", ["figure-laozi"]], ["Q8747", ["figure-euclid"]]]));
  assert.equal(plan.silver.length, 2);
  const newton = plan.silver.find((s) => s.subject === "figure-newton")!;
  assert.equal(newton.proposal.qid, "Q935");
  assert.equal(newton.proposal.roles.born?.edtf, "1643-01-04");
  assert.equal(newton.proposal.roles.born?.calendar, "julian");
  assert.equal(newton.proposal.roles.born?.place_slug, "wikidata-q1000002");
  assert.equal(newton.parser, "history-import");
  assert.equal(newton.confidence, 0.8);
  assert.ok(verifySilver(newton, bronze.text));
  const laozi = plan.silver.find((s) => s.subject === "figure-laozi")!;
  assert.deepEqual([laozi.proposal.roles.born?.edtf, laozi.proposal.roles.born?.precision], ["-0599/-0500", "century"]);
  assert.equal(laozi.proposal.roles.born?.place_slug, undefined);
  assert.deepEqual(plan.places.map((p) => [p.slug, p.title, p.lat, p.lng]), [["wikidata-q1000002", "Woolsthorpe", 52.81, -0.63]]);
  assert.equal(plan.refused.length, 1);
  assert.equal(plan.refused[0].qid, "Q8747");
  assert.equal(pointOf("<http://www.wikidata.org/entity/Q405> Point(1 2)"), null);
});

test("sacred event dates plan occurred silver on the proposed event node", () => {
  const text = ["?e\t?t\t?prec\t?cal", `${E("Q937328")}\t"1454-02-26T00:00:00Z"\t11\t${G}`, `${E("Q937328")}\t"1454-02-26T00:00:00Z"\t11\t${G}`].join("\n");
  const bronze = bronzeRecord("_intake/history/wikidata-figures/2026-09-24/events.tsv", Buffer.from(text), RIGHTS);
  const plan = planEventDates(bronze);
  assert.equal(plan.silver.length, 1);
  assert.equal(plan.silver[0].subject, "event-wikidata-q937328");
  assert.equal(plan.silver[0].proposal.roles.occurred?.edtf, "1454-02-26");
});

test("PeriodO periods load with astronomical bounds and their Wikidata places, and odd rows are skipped", () => {
  const doc = {
    authorities: {
      a1: {
        periods: {
          p1: { id: "p0f65r2qmh2", label: "Early Bronze", start: { in: { year: "-3499" } }, stop: { in: { year: "-2249" } }, spatialCoverage: [{ id: "http://www.wikidata.org/entity/Q801" }, { id: "http://www.wikidata.org/entity/Q79" }] },
          p2: { id: "p0range", label: "Ranged", start: { in: { earliestYear: -800, latestYear: "-750" } }, stop: { in: { earliestYear: "-500", latestYear: -480 } } },
          p3: { id: "p0open", label: "Open", start: { in: { year: "100" } } },
          p4: { id: "p0deep", label: "Deep", start: { in: { year: "-3700000000" } }, stop: { in: { year: "-1000" } } },
          p5: { id: "p0back", label: "Backwards", start: { in: { year: "500" } }, stop: { in: { year: "400" } } },
        },
      },
    },
  };
  const { periods, skipped } = periodDrafts(doc);
  assert.equal(skipped, 3);
  assert.deepEqual(periods, [
    { id: "periodo:p0f65r2qmh2", label: "Early Bronze", spatial_qids: ["Q79", "Q801"], start_min: -3499, start_max: -3499, end_min: -2249, end_max: -2249 },
    { id: "periodo:p0range", label: "Ranged", spatial_qids: [], start_min: -800, start_max: -750, end_min: -500, end_max: -480 },
  ]);
});

test("the committed Wikidata snapshot is tracked, dated, and plans without refusals", () => {
  const dir = path.join(ROOT, "_intake", "history", "wikidata-figures", "2026-09-24");
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8"));
  assert.equal(manifest.license, "Wikidata CC0");
  for (const q of manifest.queries) assert.ok(q.runtimeMs <= 30_000, q.name);
  const born = bronzeRecord("_intake/history/wikidata-figures/2026-09-24/born.tsv", readFileSync(path.join(dir, "born.tsv")), RIGHTS);
  const plan = planFigureDates(born, "born", new Map());
  assert.equal(plan.silver.length, 0);
  assert.ok(plan.places.length > 50);
});
