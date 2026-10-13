import test from "node:test";
import assert from "node:assert/strict";
import { AXIS } from "../src/lib/explore/geometry";
import { MAX_FALLBACK_SLICES, PROFILE_SAMPLES, cylinderRadius, distanceFromAxis, makeSlices, sliceCenter, sliceOutline, stepSlice } from "../src/lib/explore/slices";
import { SPACE_SCHEMA, fromAdvisorReview, type Dataset } from "../src/lib/explore/space";
import { parseAdvisorReview, parsePrimeDirections } from "../src/lib/research-os/advisor-review";
import sampleReview from "../src/lib/explore/fixtures/advisors.sample.json";
import samplePrime from "../src/lib/explore/fixtures/prime.sample.json";

const sample = fromAdvisorReview(parseAdvisorReview(sampleReview), parsePrimeDirections(samplePrime), true);

function comps(k: number) {
  return Array.from({ length: k }, (_, i) => ({ index: i + 1, angle_deg: (360 * i) / k, variance_ratio: 1 / k, top_terms: [`t${i}`], bottom_terms: [] as string[] }));
}

function dataset(n: number, withTime: boolean): Dataset {
  return {
    schema: SPACE_SCHEMA,
    id: "d",
    label: "d",
    fields: [],
    components: comps(5),
    mean: [0, 0, 0, 0, 0],
    obs: Array.from({ length: n }, (_, i) => ({ id: `o${i}`, title: `o${i}`, scores: [i, -i, 0.5, 1, -1], t: withTime ? 1900 + i * 10 : null, meta: {}, links: [] })),
    sweep: withTime ? { field: "year", bins: [{ label: "early", from: 1900, to: 1929 }, { label: "mid", from: 1930, to: 1959 }, { label: "late", from: 1960, to: 2100 }, { label: "none", from: 5000, to: 6000 }] } : undefined,
  };
}

test("sweep bins become slices in order and skip empty bins", () => {
  const slices = makeSlices(dataset(9, true));
  assert.deepEqual(slices.map((s) => s.label), ["early", "mid", "late"]);
  assert.deepEqual(slices.map((s) => s.index), [0, 1, 2]);
  assert.equal(slices.reduce((n, s) => n + s.obsIds.length, 0), 9);
});

test("a slice score is the mean of its members", () => {
  const ds = dataset(6, true);
  const [first] = makeSlices(ds);
  const members = ds.obs.filter((o) => first.obsIds.includes(o.id));
  first.scores.forEach((v, k) => assert.ok(Math.abs(v - members.reduce((s, o) => s + o.scores[k], 0) / members.length) < 1e-12));
});

test("data without a sweep falls back to contiguous chunks", () => {
  const slices = makeSlices(dataset(20, false));
  assert.equal(slices.length, MAX_FALLBACK_SLICES);
  assert.deepEqual(slices.flatMap((s) => s.obsIds), Array.from({ length: 20 }, (_, i) => `o${i}`));
  assert.equal(makeSlices(dataset(1, false)).length, 1);
  assert.equal(makeSlices(dataset(0, false)).length, 0);
});

test("the advisor sample slices by era", () => {
  const slices = makeSlices(sample);
  assert.ok(slices.length >= 2);
  assert.equal(slices.reduce((n, s) => n + s.obsIds.length, 0), sample.obs.filter((o) => typeof o.t === "number").length);
});

test("stepping clamps at both ends like a file list", () => {
  assert.equal(stepSlice(0, -1, 5), 0);
  assert.equal(stepSlice(4, 1, 5), 4);
  assert.equal(stepSlice(2, 1, 5), 3);
  assert.equal(stepSlice(2, -1, 5), 1);
  assert.equal(stepSlice(0, 1, 0), 0);
});

test("slices run left to right and back to front along the locked axis", () => {
  const n = 6;
  const centers = Array.from({ length: n }, (_, i) => sliceCenter(i, n));
  for (let i = 1; i < n; i++) {
    assert.ok(centers[i][0] > centers[i - 1][0], "x increases");
    assert.ok(centers[i][2] > centers[i - 1][2], "z increases");
  }
  const d = (c: number[]) => c[0] * AXIS[0] + c[2] * AXIS[2];
  assert.ok(Math.abs(d(centers[0]) + d(centers[n - 1])) < 1e-9);
});

test("the transparent cylinder encloses every slice outline", () => {
  const ds = dataset(12, true);
  const slices = makeSlices(ds);
  slices.forEach((s, i) => {
    const outline = sliceOutline(s, ds, i, slices.length);
    assert.equal(outline.length, PROFILE_SAMPLES);
    for (const p of outline) assert.ok(distanceFromAxis(p) <= cylinderRadius() + 1e-9);
  });
});

test("an outline of constant scores is a circle in the plane of its slice", () => {
  const ds = { ...dataset(3, false), components: comps(6) };
  const flat = { index: 0, label: "flat", obsIds: [], scores: [0, 0, 0, 0, 0, 0] };
  const center = sliceCenter(2, 4);
  const outline = sliceOutline(flat, ds, 2, 4);
  const radii = outline.map((p) => Math.hypot(p[0] - center[0], p[1] - center[1], p[2] - center[2]));
  assert.ok(radii.every((r) => Math.abs(r - radii[0]) < 1e-9));
  for (const p of outline) assert.ok(Math.abs((p[0] - center[0]) * AXIS[0] + (p[2] - center[2]) * AXIS[2]) < 1e-9);
});
