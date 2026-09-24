import test from "node:test";
import assert from "node:assert/strict";
import { coverageReport, dominantUnplacedCause, garwood, regularizedGammaP, type BucketCell, type ReferenceCell } from "../src/lib/history/coverage";
import { formatReport } from "./research-os/history/gap-report";

const close = (a: number, b: number, tol = 1e-4) => assert.ok(Math.abs(a - b) < tol, `${a} is not ${b}`);

test("Garwood exact Poisson 95% bounds match the chi-square table", () => {
  close(garwood(0).low, 0);
  close(garwood(0).high, 3.688879);
  close(garwood(1).low, 0.025318);
  close(garwood(1).high, 5.571643);
  close(garwood(5).low, 1.623486);
  close(garwood(5).high, 11.668332);
  close(garwood(10).low, 4.795389);
  close(garwood(10).high, 18.390356);
  close(garwood(20).low, 12.216520);
  close(garwood(20).high, 30.888378);
  close(regularizedGammaP(1, 1), 1 - Math.exp(-1), 1e-12);
  assert.throws(() => garwood(-1));
  assert.throws(() => garwood(1.5));
});

const reference: ReferenceCell[] = [
  { kind: "human", region: "Europe", period: "1500 to 2100", n: 50 },
  { kind: "human", region: "Latin America and Caribbean", period: "1500 to 2100", n: 150 },
  { kind: "human", region: "unplaced", period: "1500 to 2100", n: 999 },
  { kind: "site", region: "Western Asia and Northern Africa", period: "0 to 999", n: 30 },
  { kind: "site", region: "Europe", period: "0 to 999", n: 10 },
];

const bucket: BucketCell[] = [
  { kind: "human", region: "Europe", period: "1500 to 2100", subjects: 20, sources: 2, conflicted: 5, yearOrFiner: 10 },
  { kind: "human", region: "unplaced", period: "1500 to 2100", subjects: 3, sources: 1, conflicted: 0, yearOrFiner: 3, unplacedReason: "no place on the anchor factoid" },
  { kind: "site", region: "Europe", period: "0 to 999", subjects: 1, sources: 1, conflicted: 0, yearOrFiner: 1 },
  { kind: "site", region: "Western Asia and Northern Africa", period: "0 to 999", subjects: 7, sources: 1, conflicted: 1, yearOrFiner: 0 },
  { kind: "site", region: "Europe", period: "unresolved", subjects: 2, sources: 1, conflicted: 0, yearOrFiner: 2 },
];

test("expected counts, coverage, gaps and the Eurocentrism index on a hand-computed fixture", () => {
  const r = coverageReport(bucket, reference);
  assert.deepEqual(r.totals.B, { human: 20, site: 8, event: 0 });
  assert.deepEqual(r.totals.W, { human: 200, site: 40, event: 0 });
  assert.deepEqual(r.unplaced, { human: 3, site: 0, event: 0 });
  assert.deepEqual(r.unresolved, { human: 0, site: 2, event: 0 });
  assert.equal(r.cells.length, 42);

  const cell = (region: string, period: string) => r.cells.find((c) => c.region === region && c.period === period)!;
  close(cell("Europe", "1500 to 2100").E, 5);
  close(cell("Latin America and Caribbean", "1500 to 2100").E, 15);
  close(cell("Europe", "0 to 999").E, 2);
  close(cell("Western Asia and Northern Africa", "0 to 999").E, 6);
  close(r.cells.reduce((a, c) => a + c.E, 0), 28);

  assert.deepEqual(
    r.printed.map((c) => `${c.region}|${c.period}`).sort(),
    ["Europe|1500 to 2100", "Latin America and Caribbean|1500 to 2100", "Western Asia and Northern Africa|0 to 999"],
  );
  const eu = cell("Europe", "1500 to 2100");
  close(eu.C, 4);
  close(eu.interval.low, 12.216520 / 5);
  close(eu.interval.high, 30.888378 / 5);
  close(eu.conflictRate!, 0.25);
  assert.equal(eu.sources, 2);
  const latam = cell("Latin America and Caribbean", "1500 to 2100");
  close(latam.interval.high, 3.688879 / 15);
  assert.equal(latam.gap, true);
  assert.equal(latam.conflictRate, null);
  assert.deepEqual(r.gaps.map((g) => g.region), ["Latin America and Caribbean"]);
  close(cell("Western Asia and Northern Africa", "0 to 999").C, 7 / 6);
  assert.equal(cell("Western Asia and Northern Africa", "0 to 999").gap, false);

  const ei = (p: string) => r.eurocentrism.find((e) => e.period === p)!;
  close(ei("1500 to 2100").EI, 4);
  close(ei("1500 to 2100").interval.high, 30.888378 / 5);
  close(ei("0 to 999").EI, 0.5);
  assert.ok(Number.isNaN(ei("before -3000").EI));

  const europe = r.precisionShare.find((p) => p.region === "Europe")!;
  assert.equal(europe.subjects, 21);
  close(europe.share!, 11 / 21);
});

test("a zero count needs E above 7.38 to be a gap", () => {
  const ref = (n: number): ReferenceCell[] => [
    { kind: "human", region: "Europe", period: "0 to 999", n },
    { kind: "human", region: "Sub-Saharan Africa", period: "0 to 999", n: 100 - n },
  ];
  const b: BucketCell[] = [{ kind: "human", region: "Europe", period: "0 to 999", subjects: 10, sources: 1, conflicted: 0, yearOrFiner: 10 }];
  const at = (n: number) => coverageReport(b, ref(n)).cells.find((c) => c.region === "Sub-Saharan Africa" && c.period === "0 to 999")!;
  assert.equal(at(27).gap, false);
  close(at(27).E, 7.3);
  assert.equal(at(25).gap, true);
  close(at(25).E, 7.5);
});

test("the report names the main cause when unplaced subjects outnumber placed ones", () => {
  const few = coverageReport(bucket, reference);
  assert.equal(dominantUnplacedCause(few), null);
  assert.ok(!formatReport(few, "2026-09-24").includes("main cause"));
  const many = coverageReport(
    [
      ...bucket,
      { kind: "human", region: "unplaced", period: "0 to 999", subjects: 30, sources: 1, conflicted: 0, yearOrFiner: 30, unplacedReason: "no place on the anchor factoid" },
      { kind: "site", region: "unplaced", period: "0 to 999", subjects: 4, sources: 1, conflicted: 0, yearOrFiner: 4, unplacedReason: "the anchor place lies outside every region" },
    ],
    reference,
  );
  assert.deepEqual(many.unplacedReasons, [
    { reason: "no place on the anchor factoid", subjects: 33 },
    { reason: "the anchor place lies outside every region", subjects: 4 },
  ]);
  const line = "Unplaced subjects outnumber placed ones, 37 to 28; the main cause is no place on the anchor factoid, 33 of 37.";
  assert.equal(dominantUnplacedCause(many), line);
  assert.ok(formatReport(many, "2026-09-24").split("\n").includes(line));
});
