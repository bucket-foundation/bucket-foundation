import test from "node:test";
import assert from "node:assert/strict";
import atlas from "../src/lib/research-os/solvability-atlas-data.json";
import type { SolvabilityAtlasData } from "../src/lib/research-os/solvability-atlas";
import { ERAS, SPHERE_RADIUS, SPACE_VIEWS, axisPoint, eraOf, place, sharedTokenEdges, sliceRows, smoothedRadius, spaceRadius, timeCoord } from "../src/lib/research-os/solvability-space";

const rows = (atlas as SolvabilityAtlasData).productions;

test("eras cover every posed year and time runs forward", () => {
  for (const p of rows) assert.ok(eraOf(p.posed) >= 0 && eraOf(p.posed) < ERAS.length, p.id);
  assert.ok(timeCoord(1700) < timeCoord(1950));
  assert.ok(timeCoord(1950) < timeCoord(2025));
});

test("the time axis runs from back left to front right", () => {
  const a = axisPoint(0);
  const b = axisPoint(ERAS.length);
  assert.ok(a[0] < 0 && a[2] < 0 && b[0] > 0 && b[2] > 0);
});

test("every view places every production at a finite point", () => {
  for (const v of SPACE_VIEWS) for (const p of rows) assert.ok(place(p, v).every(Number.isFinite), `${v} ${p.id}`);
});

test("the sphere keeps every point on its surface", () => {
  for (const p of rows) assert.ok(Math.abs(Math.hypot(...place(p, "sphere")) - SPHERE_RADIUS) < 1e-9, p.id);
});

test("circle radius grows with solvability", () => {
  const lo = Math.hypot(...place({ theta: 1, solvability: 0.1, posed: 2000 }, "circle"));
  const hi = Math.hypot(...place({ theta: 1, solvability: 0.9, posed: 2000 }, "circle"));
  assert.ok(hi > lo);
});

test("edges join only productions that share a token", () => {
  const e = sharedTokenEdges([{ id: "a", tokens: ["x"] }, { id: "b", tokens: ["x", "y"] }, { id: "c", tokens: ["z"] }]);
  assert.deepEqual(e, [["a", "b"]]);
});

test("slices hold only productions posed by the chosen year", () => {
  const s = sliceRows(rows, 3, 1990);
  assert.ok(s.every((p) => eraOf(p.posed) === 3 && p.posed <= 1990));
});

test("the smoothed surface stays inside the solvability range", () => {
  for (const u of [0.5, 2.5, 5.5]) {
    const r = smoothedRadius(rows, u, 1, "helix");
    assert.ok(r >= spaceRadius(0) - 1e-9 && r <= spaceRadius(1) + 1e-9);
  }
});
