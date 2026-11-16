import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeArcs, landPath, project, unproject, type Topology } from "./world";

const topo: Topology = {
  transform: { scale: [1, 1], translate: [0, 0] },
  arcs: [[[0, 0], [10, 0], [0, 10], [-10, 0], [0, -10]]],
  objects: { land: { type: "GeometryCollection", geometries: [{ type: "Polygon", arcs: [[0]] }] } },
};

test("topojson arcs decode from deltas and draw a closed path", () => {
  assert.deepEqual(decodeArcs(topo)[0], [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
  const d = landPath(topo);
  assert.ok(d.startsWith("M360.0 180.0"));
  assert.ok(d.endsWith("Z"));
});

test("projection round trips", () => {
  const [x, y] = project(2.4, 48.9);
  const [lat, lon] = unproject(x, y);
  assert.ok(Math.abs(lat - 48.9) < 1e-9 && Math.abs(lon - 2.4) < 1e-9);
});
