import test from "node:test";
import assert from "node:assert/strict";
import { parseAdvisorReview, parsePrimeDirections } from "../src/lib/research-os/advisor-review";
import sampleReview from "../src/lib/explore/fixtures/advisors.sample.json";
import samplePrime from "../src/lib/explore/fixtures/prime.sample.json";
import { CIRCLE_RADIUS, polygonPoints, smoothLoop, wrapLabel } from "../src/lib/explore/circle";
import {
  MAX_COMPONENTS,
  MAX_OBSERVATIONS,
  SPACE_SCHEMA,
  bandAverages,
  circleProfile,
  fromAdvisorReview,
  fromPrimeDirections,
  meanScores,
  parseDataset,
  radiusOf,
  smooth,
  type Dataset,
} from "../src/lib/explore/space";

const prime = parsePrimeDirections(samplePrime);
const review = parseAdvisorReview(sampleReview);
const sample = fromAdvisorReview(review, prime, true);

function comps(k: number) {
  return Array.from({ length: k }, (_, i) => ({ index: i + 1, angle_deg: (360 * i) / k, variance_ratio: 1 / k, top_terms: [`t${i}`], bottom_terms: [] as string[] }));
}

function raw(over: Record<string, unknown> = {}) {
  return { schema: SPACE_SCHEMA, id: "x", label: "x", fields: [], components: comps(4), obs: [{ id: "a", title: "A", scores: [0, 1, 2, -1], meta: {}, links: [] }], ...over };
}

test("the advisor adapter keeps every row, component and raw own-basis score", () => {
  assert.equal(sample.obs.length, review.rows.length);
  assert.equal(sample.components.length, prime.components.length);
  assert.equal(sample.sample, true);
  review.rows.forEach((r, i) => assert.deepEqual(sample.obs[i].scores, r.star_prime));
  assert.equal(sample.scale, "unit");
  assert.equal(sample.basis, "own");
});

test("a dataset survives a JSON round trip through the contract", () => {
  const back = parseDataset(JSON.parse(JSON.stringify(sample)));
  assert.deepEqual(back.components.map((c) => c.angle_deg), sample.components.map((c) => c.angle_deg));
  assert.deepEqual(back.obs.map((o) => o.scores), sample.obs.map((o) => o.scores));
  assert.deepEqual(back.obs.map((o) => o.id), sample.obs.map((o) => o.id));
  assert.equal(back.sweep?.bins.length, sample.sweep?.bins.length);
  assert.deepEqual(back.mean, sample.mean);
});

test("the contract rejects a bad schema, NaN, short score rows and oversize sets", () => {
  assert.throws(() => parseDataset({ ...raw(), schema: "other/1" }));
  assert.throws(() => parseDataset(null));
  assert.throws(() => parseDataset(raw({ components: comps(2) })));
  assert.throws(() => parseDataset(raw({ components: comps(MAX_COMPONENTS + 1) })));
  assert.throws(() => parseDataset(raw({ obs: [{ id: "a", title: "A", scores: [0, 1, 2], meta: {}, links: [] }] })));
  assert.throws(() => parseDataset(raw({ obs: [{ id: "a", title: "A", scores: [0, 1, NaN, 0], meta: {}, links: [] }] })));
  assert.throws(() => parseDataset(raw({ obs: [{ id: "a", title: "A", scores: [0, 1, Infinity, 0], meta: {}, links: [] }] })));
  const many = Array.from({ length: MAX_OBSERVATIONS + 1 }, (_, i) => ({ id: `o${i}`, title: "t", scores: [0, 0, 0, 0], meta: {}, links: [] }));
  assert.throws(() => parseDataset(raw({ obs: many })));
  assert.doesNotThrow(() => parseDataset(raw()));
});

test("the average of constant data is that constant", () => {
  const obs = Array.from({ length: 7 }, (_, i) => ({ scores: [1.5, -0.5, 0, 2] }));
  assert.deepEqual(meanScores(obs, 4), [1.5, -0.5, 0, 2]);
  assert.deepEqual(meanScores([], 3), [0, 0, 0]);
});

test("smooth reproduces constant data at every angle", () => {
  const pts = [0.3, 1.9, 3.3, 5.0].map((a) => ({ angle: a, u: 0, r: 0.6 }));
  for (let j = 0; j < 24; j++) assert.ok(Math.abs(smooth(pts, 0, (j / 24) * Math.PI * 2) - 0.6) < 1e-9);
});

test("smooth wraps around the circle", () => {
  const pts = [
    { angle: 0.1, u: 0, r: 0.2 },
    { angle: Math.PI * 2 - 0.1, u: 0, r: 0.8 },
  ];
  const at0 = smooth(pts, 0, 0);
  assert.ok(Math.abs(at0 - 0.5) < 1e-9);
  assert.ok(Math.abs(smooth(pts, 0, Math.PI * 2) - at0) < 1e-9);
});

test("smooth fills sparse slices and falls back when nothing is near", () => {
  const pts = [{ angle: 0, u: 0, r: 0.9 }];
  const far = smooth(pts, 40, 3, { fallback: 0.25 });
  assert.equal(far, 0.25);
  const filled = circleProfile([2, -2, 2], [0, 2.1, 4.2], 60);
  assert.equal(filled.length, 60);
  assert.ok(filled.every((v) => v > 0 && v <= 1));
  assert.ok(Math.max(...filled) > Math.min(...filled));
});

test("circleProfile of constant scores is a circle", () => {
  const p = circleProfile([0, 0, 0, 0], [0, 1.5, 3, 4.5], 36);
  assert.ok(p.every((v) => Math.abs(v - radiusOf(0)) < 1e-9));
});

test("a polygon has one vertex per component inside the outer ring", () => {
  for (const o of sample.obs) {
    const pts = polygonPoints(o.scores, sample.components);
    assert.equal(pts.length, sample.components.length);
    assert.ok(pts.every((p) => Math.hypot(...p) <= CIRCLE_RADIUS + 1e-9));
    const d = smoothLoop(pts);
    assert.equal((d.match(/C/g) ?? []).length, pts.length);
    assert.ok(d.startsWith("M") && d.endsWith("Z"));
  }
  assert.equal(polygonPoints(new Array(12).fill(0), comps(12)).length, 12);
});

test("the unit scale maps a score straight to a radius", () => {
  assert.equal(radiusOf(0.4, "unit"), 0.4);
  assert.equal(radiusOf(3, "unit"), 1);
  assert.equal(radiusOf(-1, "unit"), 0.02);
  const pts = polygonPoints([1, 0.5, 0.25, 0.75], comps(4), CIRCLE_RADIUS, "unit");
  assert.ok(Math.abs(Math.hypot(...pts[0]) - CIRCLE_RADIUS) < 1e-9);
  assert.ok(Math.abs(Math.hypot(...pts[1]) - CIRCLE_RADIUS * 0.5) < 1e-9);
});

test("parseDataset scrubs emails from meta and drops email links", () => {
  const ds = parseDataset(raw({
    obs: [{ id: "a", title: "A", scores: [0, 1, 2, -1], meta: { contact: "write to jane.doe@example.org today", note: "plain", n: 3 }, links: ["mailto:jane@example.org", "https://example.org/a", "https://x.org/?e=jane.doe@example.org"] }],
  }));
  assert.ok(!/@/.test(String(ds.obs[0].meta.contact)));
  assert.equal(ds.obs[0].meta.note, "plain");
  assert.equal(ds.obs[0].meta.n, 3);
  assert.deepEqual(ds.obs[0].links, ["https://example.org/a"]);
});

test("the scale and basis survive the contract", () => {
  const back = parseDataset(JSON.parse(JSON.stringify(sample)));
  assert.equal(back.scale, "unit");
  assert.equal(back.basis, "own");
  assert.equal(parseDataset(raw()).scale, "standardized");
  assert.equal(parseDataset(raw()).basis, "reference");
});

test("radius clamps the standardized score to the chart span", () => {
  assert.equal(radiusOf(-10), 0.02);
  assert.equal(radiusOf(10), 1);
  assert.ok(Math.abs(radiusOf(0) - 0.5) < 1e-12);
});

test("band averages follow the sweep bins", () => {
  const ds: Dataset = {
    ...sample,
    sweep: { field: "year", bins: [{ label: "early", from: 1900, to: 1999 }, { label: "late", from: 2000, to: 2099 }, { label: "empty", from: 3000, to: 3100 }] },
    obs: [
      { id: "a", title: "a", scores: [1, 1, 1, 1], t: 1950, meta: {}, links: [] },
      { id: "b", title: "b", scores: [3, 3, 3, 3], t: 1960, meta: {}, links: [] },
      { id: "c", title: "c", scores: [-1, -1, -1, -1], t: 2010, meta: {}, links: [] },
    ],
  };
  const b = bandAverages(ds);
  assert.deepEqual(b[0], [2, 2, 2, 2]);
  assert.deepEqual(b[1], [-1, -1, -1, -1]);
  assert.equal(b[2], null);
});

test("a prime file alone gives a dataset with no observations", () => {
  const ds = fromPrimeDirections(prime);
  assert.equal(ds.obs.length, 0);
  assert.equal(ds.components.length, 4);
});

test("labels wrap at the given width", () => {
  assert.deepEqual(wrapLabel("light and water", 10), ["light and", "water"]);
});

test("a licence label passes the contract, scrubbed and capped", () => {
  assert.equal(parseDataset(raw({ license: "CC BY 4.0" })).license, "CC BY 4.0");
  assert.equal(parseDataset(raw()).license, undefined);
  assert.equal(parseDataset(raw({ license: "   " })).license, undefined);
  assert.equal(parseDataset(raw({ license: 5 })).license, undefined);
  assert.ok(!/@/.test(parseDataset(raw({ license: "contact jane@example.org" })).license as string));
  assert.equal((parseDataset(raw({ license: "x".repeat(500) })).license as string).length, 200);
});
