import test from "node:test";
import assert from "node:assert/strict";
import baseline from "../tests/baselines/solvability-geometry.json";
import * as shim from "../src/lib/research-os/solvability-space";
import * as geometry from "../src/lib/explore/geometry";
import { computeGeometryBaseline } from "./geometry-baseline-compute";

test("the atlas geometry matches the baseline captured before the move", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(computeGeometryBaseline())), baseline);
});

test("solvability-space re-exports the geometry module", () => {
  for (const key of Object.keys(geometry) as (keyof typeof geometry)[]) assert.equal(shim[key as keyof typeof shim], geometry[key], key);
  for (const key of ["ERAS", "SPACE_VIEWS", "place", "smoothedRadius", "sliceRows", "sharedTokenEdges", "axisPoint", "ringPoint", "timeCoord", "eraOf"]) assert.ok(key in shim, key);
});
