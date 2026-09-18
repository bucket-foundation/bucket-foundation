/** Pure tests for connections.ts: held cross-branch connections and bridges one step away. */
import test from "node:test";
import assert from "node:assert/strict";
import { crossBranchConnections } from "../src/lib/research-os/connections";

const nodes = [
  { id: "a", slug: "a", title: "Waves", branch: "02-physics" },
  { id: "b", slug: "b", title: "Fourier series", branch: "01-mathematics" },
  { id: "c", slug: "c", title: "Vision", branch: "07-mind" },
  { id: "d", slug: "d", title: "Optics", branch: "02-physics" },
];
const edges = [
  { fromId: "a", toId: "b", kind: "derives_from" },
  { fromId: "c", toId: "a", kind: "example_of" },
  { fromId: "d", toId: "a", kind: "prerequisite" },
];

test("a connection is held when both ends are understood in different branches", () => {
  const r = crossBranchConnections([{ nodeId: "a", stage: "understanding" }, { nodeId: "b", stage: "production" }], nodes, edges);
  assert.equal(r.held.length, 1);
  assert.equal(r.held[0].to.id, "b");
  assert.equal(r.bridges.length, 1);
  assert.equal(r.bridges[0].next.id, "c");
});

test("prerequisite edges and same-branch edges never count; awareness is not understanding", () => {
  const r = crossBranchConnections([{ nodeId: "a", stage: "awareness" }, { nodeId: "d", stage: "understanding" }], nodes, edges);
  assert.equal(r.held.length, 0);
  assert.equal(r.bridges.length, 0);
});
