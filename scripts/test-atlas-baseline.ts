import test from "node:test";
import assert from "node:assert/strict";
import baseline from "../tests/baselines/solvability-space.json";
import { computeAtlasBaseline } from "./atlas-baseline-compute";

const TOLERANCE = 1e-9;

function flatten(prefix: string, v: unknown, out: Map<string, number>) {
  if (typeof v === "number") out.set(prefix, v);
  else if (Array.isArray(v)) v.forEach((x, i) => flatten(`${prefix}[${i}]`, x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) flatten(prefix ? `${prefix}.${k}` : k, x, out);
}

test("place, timeCoord and smoothedRadius match the committed atlas baseline", () => {
  const want = new Map<string, number>();
  const got = new Map<string, number>();
  flatten("", baseline, want);
  flatten("", computeAtlasBaseline(), got);
  assert.deepEqual(Array.from(got.keys()), Array.from(want.keys()));
  assert.ok(want.size > 300);
  for (const [k, v] of Array.from(want)) assert.ok(Math.abs((got.get(k) as number) - v) <= TOLERANCE, `${k}: ${got.get(k)} vs ${v}`);
});
