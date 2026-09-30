import test from "node:test";
import assert from "node:assert/strict";
import { AXIS } from "../src/lib/explore/geometry";
import { HELICOID_RADIUS, HELICOID_TURNS, helicoidAngle, helicoidPoint, lociOf, positionU, ribbonMesh, rungsOf, sweepRange } from "../src/lib/explore/helicoid";
import { cylinderRadius, distanceFromAxis } from "../src/lib/explore/slices";
import type { Dataset } from "../src/lib/explore/space";

const dot = (p: number[], q: number[]) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const norm = (p: number[]) => Math.hypot(p[0], p[1], p[2]);

const ds: Pick<Dataset, "obs" | "marks"> = {
  obs: [
    { id: "a", title: "a", scores: [], t: 0, meta: { base: "A" }, links: [] },
    { id: "b", title: "b", scores: [], t: 50, meta: { base: "G" }, links: [] },
    { id: "c", title: "c", scores: [], t: 100, meta: { base: "" }, links: [] },
  ],
  marks: [{ t: 50, label: "MTHFR rs1801133", kind: "locus" }, { t: 100, label: "APOE rs429358" }],
};

test("the helix turns a fixed number of times along the axis", () => {
  assert.equal(helicoidAngle(1), HELICOID_TURNS * Math.PI * 2);
  assert.equal(helicoidAngle(0), 0);
  assert.ok(Math.abs(helicoidAngle(1 / HELICOID_TURNS) - Math.PI * 2) < 1e-12);
});

test("the two strands sit opposite each other at the same height on the axis", () => {
  for (const u of [0, 0.13, 0.5, 0.77, 1]) {
    const a = helicoidPoint(u, 1);
    const b = helicoidPoint(u, -1);
    assert.ok(Math.abs(dot(a, AXIS) - dot(b, AXIS)) < 1e-12);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] as [number, number, number];
    assert.ok(distanceFromAxis(mid) < 1e-12);
    assert.ok(Math.abs(distanceFromAxis(a) - HELICOID_RADIUS) < 1e-12);
    assert.ok(Math.abs(distanceFromAxis(b) - HELICOID_RADIUS) < 1e-12);
  }
});

test("the ribbon runs along the axis and stays inside the cylinder", () => {
  assert.ok(dot(helicoidPoint(0.9, 0.5), AXIS) > dot(helicoidPoint(0.1, 0.5), AXIS));
  const mesh = ribbonMesh(60, 6);
  assert.equal(mesh.positions.length, 61 * 7);
  assert.equal(mesh.index.length, 60 * 6 * 6);
  assert.ok(mesh.index.every((i) => i >= 0 && i < mesh.positions.length));
  for (const p of mesh.positions) assert.ok(distanceFromAxis(p) <= HELICOID_RADIUS + 1e-9);
  assert.ok(HELICOID_RADIUS < cylinderRadius());
});

test("the axis point of the ribbon is on the axis", () => {
  for (const u of [0, 0.4, 1]) assert.ok(norm([helicoidPoint(u, 0)[0] - AXIS[0] * dot(helicoidPoint(u, 0), AXIS), helicoidPoint(u, 0)[1], helicoidPoint(u, 0)[2] - AXIS[2] * dot(helicoidPoint(u, 0), AXIS)]) < 1e-12);
});

test("rungs are one per observation, ordered by sweep position, with complementary bases", () => {
  const rungs = rungsOf(ds);
  assert.equal(rungs.length, 3);
  assert.ok(rungs[0].u < rungs[1].u && rungs[1].u < rungs[2].u);
  assert.deepEqual([rungs[0].base, rungs[0].complement], ["A", "T"]);
  assert.deepEqual([rungs[1].base, rungs[1].complement], ["G", "C"]);
  assert.deepEqual([rungs[2].base, rungs[2].complement], ["", ""]);
  for (const r of rungs) assert.ok(Math.abs(distanceFromAxis(r.a) - distanceFromAxis(r.b)) < 1e-12);
});

test("loci sit on the strand surface at their sweep position", () => {
  const loci = lociOf(ds);
  assert.equal(loci.length, 2);
  for (const l of loci) assert.ok(Math.abs(distanceFromAxis(l.position) - HELICOID_RADIUS) < 1e-12);
  assert.ok(loci[0].u < loci[1].u);
  assert.deepEqual(lociOf({ obs: ds.obs }), []);
});

test("undated observations spread evenly along the ribbon", () => {
  assert.equal(sweepRange([{ t: null }]), null);
  assert.equal(positionU(null, null, 0, 5), 0);
  assert.equal(positionU(null, null, 4, 5), 1);
  assert.equal(positionU(25, [0, 100], 0, 5), 0.25);
  assert.equal(positionU(undefined, null, 0, 1), 0.5);
});
