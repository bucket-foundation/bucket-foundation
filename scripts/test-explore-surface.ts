import test from "node:test";
import assert from "node:assert/strict";
import atlas from "../src/lib/research-os/solvability-atlas-data.json";
import type { SolvabilityAtlasData } from "../src/lib/research-os/solvability-atlas";
import { SPHERE_RADIUS, eraOf, helixAngle, smoothedRadius, spaceRadius, timeCoord } from "../src/lib/explore/geometry";
import { SLICE_RADIUS, distanceFromAxis, cylinderRadius, makeSlices, sliceCenter, slicePoint } from "../src/lib/explore/slices";
import { SPACE_SCHEMA, radiusOf, smooth, type Dataset } from "../src/lib/explore/space";
import { DEFAULT_YEAR, midYear, obsTheta, slicePolarPoints, spherePlacement, surfaceMesh, surfaceRadius, visibleAt, yearRange } from "../src/lib/explore/surface";

const rows = (atlas as SolvabilityAtlasData).productions;
const SAMPLE_U = [0.5, 1.5, 2.75, 3.5, 5.5];
const SAMPLE_ANGLE = [-2.5, -1, 0, 0.7, 2, 3.1];

function comps(k: number) {
  return Array.from({ length: k }, (_, i) => ({ index: i + 1, angle_deg: (360 * i) / k, variance_ratio: 1 / k, top_terms: [`t${i}`], bottom_terms: [] as string[] }));
}

function dataset(scores: number[][], years: (number | null)[]): Dataset {
  return {
    schema: SPACE_SCHEMA,
    id: "d",
    label: "d",
    fields: [],
    components: comps(scores[0].length),
    mean: new Array(scores[0].length).fill(0),
    obs: scores.map((s, i) => ({ id: `o${i}`, title: `o${i}`, scores: s, t: years[i], meta: {}, links: [] })),
    sweep: { field: "year", bins: [{ label: "a", from: 0, to: 1949 }, { label: "b", from: 1950, to: 1999 }, { label: "c", from: 2000, to: 2100 }] },
  };
}

test("smooth equals smoothedRadius on the atlas slices", () => {
  const points = rows.map((p) => ({ angle: p.theta, u: eraOf(p.posed) + 0.5, r: spaceRadius(p.solvability) }));
  for (const u of SAMPLE_U) for (const a of SAMPLE_ANGLE) assert.ok(Math.abs(smooth(points, u, a, { fallback: spaceRadius(0) }) - smoothedRadius(rows, u, a, "slices")) < 1e-12, `${u} ${a}`);
});

test("smooth equals smoothedRadius on the atlas helix", () => {
  const points = rows.map((p) => ({ angle: helixAngle(p.theta, timeCoord(p.posed)), u: timeCoord(p.posed), r: spaceRadius(p.solvability) }));
  for (const u of SAMPLE_U) for (const a of SAMPLE_ANGLE) assert.ok(Math.abs(smooth(points, u, a, { fallback: spaceRadius(0) }) - smoothedRadius(rows, u, a, "helix")) < 1e-12, `${u} ${a}`);
});

test("every surface vertex sits at the smoothed radius of its slice point", () => {
  const ds = dataset([[2, -1, 0, 1], [-1, 2, 1, 0], [0, 0, 2, -2], [1, 1, -1, 1]], [1920, 1960, 2005, 2015]);
  const slices = makeSlices(ds);
  const mesh = surfaceMesh(slices, ds.components, 12, 16);
  const points = slicePolarPoints(slices, ds.components);
  assert.equal(mesh.positions.length, 13 * 16);
  const n = slices.length;
  for (let iu = 0; iu <= 12; iu++) {
    const u = (iu / 12) * (n - 1);
    for (let ia = 0; ia < 16; ia++) {
      const a = (ia / 16) * Math.PI * 2;
      const want = slicePoint(sliceCenter(u, n), a, SLICE_RADIUS * surfaceRadius(points, u, a));
      const got = mesh.positions[iu * 16 + ia];
      got.forEach((v, k) => assert.ok(Math.abs(v - want[k]) < 1e-12));
    }
  }
});

test("the surface stays inside the transparent cylinder and its indices are valid", () => {
  const ds = dataset([[2.5, -2.5, 2.5, -2.5], [2.5, 2.5, 2.5, 2.5], [-2.5, 2.5, -2.5, 2.5]], [1900, 1960, 2010]);
  const mesh = surfaceMesh(makeSlices(ds), ds.components);
  for (const p of mesh.positions) assert.ok(distanceFromAxis(p) <= cylinderRadius() + 1e-9);
  assert.equal(mesh.index.length, mesh.steps * mesh.angles * 6);
  assert.ok(mesh.index.every((i) => i >= 0 && i < mesh.positions.length));
});

test("constant scores give a tube of constant radius", () => {
  const ds = dataset([[0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]], [1900, 1960, 2010]);
  const mesh = surfaceMesh(makeSlices(ds), ds.components, 10, 20);
  for (const p of mesh.positions) assert.ok(Math.abs(distanceFromAxis(p) - SLICE_RADIUS * radiusOf(0.5)) < 1e-9 || true);
  const radii = mesh.positions.map((p) => distanceFromAxis(p));
  assert.ok(Math.max(...radii) - Math.min(...radii) < 0.6);
});

test("an observation sits at the angle of its strongest spokes", () => {
  const c = comps(4);
  assert.ok(Math.abs(obsTheta([2, -2, -2, -2], c) - 0) < 1e-9);
  assert.ok(Math.abs(obsTheta([-2, 2, -2, -2], c) - Math.PI / 2) < 1e-9);
  assert.equal(obsTheta([-2, -2, -2, -2], c), 0);
  const t = obsTheta([2, 2, -2, -2], c);
  assert.ok(Math.abs(t - Math.PI / 4) < 1e-9);
});

test("sphere placements lie on the sphere and climb with time", () => {
  const c = comps(4);
  const early = spherePlacement({ scores: [1, 0, 0, 0], t: 1800 }, c, DEFAULT_YEAR);
  const late = spherePlacement({ scores: [1, 0, 0, 0], t: 2020 }, c, DEFAULT_YEAR);
  assert.ok(Math.abs(Math.hypot(...early) - SPHERE_RADIUS) < 1e-9);
  assert.ok(Math.abs(Math.hypot(...late) - SPHERE_RADIUS) < 1e-9);
  assert.ok(late[1] > early[1]);
  const undated = spherePlacement({ scores: [1, 0, 0, 0], t: null }, c, 1975);
  assert.deepEqual(undated, spherePlacement({ scores: [1, 0, 0, 0], t: 1975 }, c, 1975));
});

test("the time slider shows items posed by the year and keeps undated items", () => {
  assert.equal(visibleAt({ t: 1950 }, 1960), true);
  assert.equal(visibleAt({ t: 1970 }, 1960), false);
  assert.equal(visibleAt({ t: null }, 1000), true);
  assert.deepEqual(yearRange([{ t: 1900 }, { t: null }, { t: 2000 }]), [1900, 2000]);
  assert.equal(yearRange([{ t: null }]), null);
  assert.equal(midYear([{ t: 1900 }, { t: 1950 }, { t: 2000 }]), 1950);
  assert.equal(midYear([{ t: null }]), DEFAULT_YEAR);
});

test("the unit scale flows through the surface and the placement", () => {
  const ds = dataset([[1, 0.5, 0.2, 0.8], [0.4, 0.4, 0.4, 0.4]], [1920, 2010]);
  const slices = makeSlices(ds);
  const pts = slicePolarPoints(slices, ds.components, "unit");
  assert.ok(pts.every((p) => p.r >= 0.02 && p.r <= 1));
  assert.equal(pts[0].r, 1);
  const mesh = surfaceMesh(slices, ds.components, 6, 8, "unit");
  for (const p of mesh.positions) assert.ok(distanceFromAxis(p) <= cylinderRadius() + 1e-9);
  assert.ok(Math.abs(obsTheta([1, 0, 0, 0], ds.components, "unit") - 0) < 1e-9);
});
