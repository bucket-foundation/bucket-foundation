/** The layered layout: columns by tier, chains aligned, sizes. */
import test from "node:test";
import assert from "node:assert/strict";
import { layoutGraph, COL_W } from "../src/lib/research-os/graph-layout";

test("columns follow distinct tiers and a chain lines up across columns", () => {
  const nodes = [
    { id: "a", tier: 0, title: "A" },
    { id: "b", tier: 1, title: "B" },
    { id: "c", tier: 2, title: "C" },
    { id: "z", tier: 0, title: "Z" },
    { id: "y", tier: 1, title: "Y" },
  ];
  const edges = [
    { fromId: "z", toId: "y" },
    { fromId: "a", toId: "b" },
    { fromId: "b", toId: "c" },
  ];
  const l = layoutGraph(nodes, edges);
  assert.deepEqual(l.columns, [0, 1, 2]);
  assert.equal(l.rows, 2);
  const at = (id: string) => l.placed.find((p) => p.id === id)!;
  assert.equal(at("b").x - at("a").x, COL_W);
  assert.equal(at("b").row, at("a").row);
  assert.equal(at("y").row, at("z").row);
  assert.equal(at("c").col, 2);
});

test("an empty branch lays out to one empty column", () => {
  const l = layoutGraph([], []);
  assert.equal(l.placed.length, 0);
  assert.ok(l.width > 0 && l.height > 0);
});
