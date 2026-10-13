import { expect, test } from "bun:test";
import { surfaceEligible } from "./explore/protein-surface";

test("surface work is bounded by atom count and coordinate extent", () => {
  expect(surfaceEligible([{ x: 0, y: 0, z: 0 }, { x: 40, y: 50, z: 60 }])).toBe(true);
  expect(surfaceEligible(Array.from({ length: 3001 }, () => ({ x: 0, y: 0, z: 0 })))).toBe(false);
  expect(surfaceEligible([{ x: 0, y: 0, z: 0 }, { x: 151, y: 0, z: 0 }])).toBe(false);
  expect(surfaceEligible([{ x: 0, y: 0, z: 0 }, { x: 140, y: 140, z: 140 }])).toBe(false);
  expect(surfaceEligible([{ x: NaN, y: 0, z: 0 }])).toBe(false);
  expect(surfaceEligible([{ x: 0, y: 0 }])).toBe(false);
  expect(surfaceEligible([])).toBe(false);
});
