import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PERIODS, periodOf, regionForSubregion, REGIONS, SUBREGION_TO_REGION, UNMAPPED_SUBREGIONS } from "../src/lib/history/regions";
import { admin0Rows, BRONZE_PATH, NATURAL_EARTH, sha256, verified } from "./research-os/history/natural-earth";
import { addHumanRows, emptyCounts, HUMAN_SLICES, humanQuery, humanSliceOf, intCell, parseTsv, pointCell, qid } from "./research-os/history/reference";

const ROOT = path.join(__dirname, "..");

test("the six period bins meet at their edges", () => {
  assert.equal(periodOf(-3001), "before -3000");
  assert.equal(periodOf(-3000), "-3000 to -1001");
  assert.equal(periodOf(-1001), "-3000 to -1001");
  assert.equal(periodOf(-1000), "-1000 to -1");
  assert.equal(periodOf(-1), "-1000 to -1");
  assert.equal(periodOf(0), "0 to 999");
  assert.equal(periodOf(999), "0 to 999");
  assert.equal(periodOf(1000), "1000 to 1499");
  assert.equal(periodOf(1499), "1000 to 1499");
  assert.equal(periodOf(1500), "1500 to 2100");
  assert.equal(periodOf(2100), "1500 to 2100");
  assert.equal(periodOf(2101), null);
  assert.equal(periodOf(1.5), null);
  assert.equal(PERIODS.length, 6);
  assert.equal(PERIODS.length * REGIONS.length, 42);
});

test("every mapped Natural Earth subregion lands in one of the 7 regions, and an unknown one throws", () => {
  assert.equal(REGIONS.length, 7);
  for (const r of Object.values(SUBREGION_TO_REGION)) assert.ok((REGIONS as readonly string[]).includes(r));
  for (const r of REGIONS) assert.ok(Object.values(SUBREGION_TO_REGION).includes(r), `${r} has no subregion`);
  for (const s of UNMAPPED_SUBREGIONS) assert.equal(regionForSubregion(s), null);
  assert.throws(() => regionForSubregion("Atlantis"), /no region/);
});

test("the pinned Natural Earth file, when present, matches its checksum and maps every subregion", { skip: existsSync(path.join(ROOT, BRONZE_PATH)) ? false : "no Natural Earth bronze; run natural-earth.ts" }, () => {
  const bytes = readFileSync(path.join(ROOT, BRONZE_PATH));
  verified(bytes);
  const rows = admin0Rows(bytes);
  assert.equal(rows.length, 242);
  assert.equal(rows.find((r) => r.adm0_a3 === "GRC")?.region, "Europe");
  assert.equal(rows.find((r) => r.adm0_a3 === "EGY")?.region, "Western Asia and Northern Africa");
  assert.equal(rows.find((r) => r.adm0_a3 === "ATA")?.region, null);
  assert.ok(rows.every((r) => r.wikidata_qid === null || /^Q[0-9]+$/.test(r.wikidata_qid)));
});

test("a file that is not the pinned Natural Earth release is refused", () => {
  assert.throws(() => verified(Buffer.from("{}")), /pinned/);
  assert.equal(sha256(Buffer.from("")), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.match(NATURAL_EARTH.url, /\/v5\.1\.2\//);
});

test("admin-0 rows carry name, subregion, region and QID from a GeoJSON feature", () => {
  const doc = {
    features: [
      { properties: { ADM0_A3: "GRC", ADMIN: "Greece", SUBREGION: "Southern Europe", WIKIDATAID: "Q41" }, geometry: { type: "Polygon", coordinates: [[[20, 35], [26, 35], [26, 41], [20, 35]]] } },
      { properties: { ADM0_A3: "ATA", ADMIN: "Antarctica", SUBREGION: "Antarctica", WIKIDATAID: "-99" }, geometry: { type: "Polygon", coordinates: [[[0, -80], [10, -80], [10, -85], [0, -80]]] } },
    ],
  };
  const rows = admin0Rows(Buffer.from(JSON.stringify(doc)));
  assert.deepEqual(
    rows.map((r) => [r.adm0_a3, r.region, r.wikidata_qid]),
    [
      ["GRC", "Europe", "Q41"],
      ["ATA", null, null],
    ],
  );
  assert.equal(JSON.parse(rows[0].geometry).type, "Polygon");
});

test("the human slices partition people by QID and bin each person once, after MIN over every birth date", () => {
  assert.deepEqual(HUMAN_SLICES.map((s) => s.digit), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const s of HUMAN_SLICES) {
    const q = humanQuery(s);
    assert.match(q, new RegExp(`STRENDS\\(STR\\(\\?p\\), "${s.digit}"\\)`));
    assert.doesNotMatch(q, /FILTER\(YEAR/);
    assert.match(q, /MIN\(YEAR\(\?b\)\) AS \?year\) \(MIN\(\?c\) AS \?country\)/);
  }
  const births = [
    { p: "Q12345", year: 999, country: "Q41" },
    { p: "Q12345", year: 1001, country: "Q41" },
    { p: "Q20", year: 1950, country: "Q41" },
  ];
  const counts = emptyCounts();
  for (const s of HUMAN_SLICES) {
    const people = new Map<string, { year: number; country: string }>();
    for (const b of births.filter((x) => humanSliceOf(x.p) === s.digit)) {
      const held = people.get(b.p);
      people.set(b.p, { year: Math.min(held?.year ?? Infinity, b.year), country: held && held.country < b.country ? held.country : b.country });
    }
    const grouped = new Map<string, number>();
    for (const v of Array.from(people.values())) grouped.set(`${v.year}\t<http://www.wikidata.org/entity/${v.country}>`, (grouped.get(`${v.year}\t<http://www.wikidata.org/entity/${v.country}>`) ?? 0) + 1);
    const tsv = ["?year\t?country\t?n", ...Array.from(grouped.entries()).map(([k, n]) => `${k}\t${n}`)].join("\n");
    addHumanRows(counts, parseTsv(tsv), new Map([["Q41", "Europe"]]));
  }
  assert.equal(counts.human["0 to 999"].Europe, 1);
  assert.equal(counts.human["1000 to 1499"].Europe, 0);
  assert.equal(counts.human["1500 to 2100"].Europe, 1);
  assert.throws(() => humanSliceOf("P31"), /not a QID/);
});

test("SPARQL TSV cells parse, and a coordinate on another globe is refused", () => {
  const rows = parseTsv("?year\t?country\t?n\n1900\t<http://www.wikidata.org/entity/Q41>\t3\n-500\t<http://www.wikidata.org/entity/Q999999>\t2\n2500\t<http://www.wikidata.org/entity/Q41>\t4\n");
  assert.equal(rows.length, 3);
  assert.equal(qid("<http://www.wikidata.org/entity/Q41>"), "Q41");
  assert.equal(intCell('"1646"^^<http://www.w3.org/2001/XMLSchema#int>'), 1646);
  assert.equal(intCell("-7090"), -7090);
  assert.deepEqual(pointCell('"POINT(44.930292 35.555797)"'), { lat: 35.555797, lng: 44.930292 });
  assert.deepEqual(pointCell("Point(-0.1 51.5)"), { lat: 51.5, lng: -0.1 });
  assert.equal(pointCell("<http://www.wikidata.org/entity/Q405> Point(10 20)"), null);
  assert.equal(pointCell("Point(200 20)"), null);

  const counts = emptyCounts();
  const skipped = addHumanRows(counts, rows, new Map([["Q41", "Europe"]]));
  assert.equal(counts.human["1500 to 2100"].Europe, 3);
  assert.equal(counts.human["-1000 to -1"].unplaced, 2);
  assert.equal(skipped, 4);
});
