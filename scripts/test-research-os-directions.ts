/**
 * Unit tests: the Awareness view (ros-24), src/lib/research-os/directions.ts.
 * Pure. Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-directions.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { directionsFrom, isFrontierNode } from "../src/lib/research-os/directions";
import type { GraphEdge, GraphNode } from "../src/lib/research-os/types";

const n = (id: string, extra: Partial<GraphNode> = {}): GraphNode => ({ id, slug: id, title: id, kind: "concept", tier: 0, branch: "02-physics", summary: null, ...extra });
const e = (from: string, to: string, kind: GraphEdge["kind"] = "prerequisite"): GraphEdge => ({ fromId: from, toId: to, kind });

// light -> scattering -> {rayleigh -> sky-blue-hypothesis, sunset}
//                     -> why-red (open question)
const nodes = [n("light"), n("scattering"), n("rayleigh"), n("sunset"), n("sky-blue-hypothesis", { kind: "hypothesis" }), n("why-red", { frontierFlag: "open_question" }), n("unrelated")];
const edges = [e("light", "scattering"), e("scattering", "rayleigh"), e("scattering", "sunset"), e("rayleigh", "sky-blue-hypothesis", "extends"), e("scattering", "why-red"), e("sunset", "light", "cites")];

test("dependents are one step forward along prerequisite-like edges", () => {
  const d = directionsFrom("scattering", nodes, edges);
  assert.deepEqual(d.dependents.map((x) => x.id).sort(), ["rayleigh", "sunset", "why-red"]);
});

test("reach counts nodes per depth and stops at the depth limit", () => {
  const d = directionsFrom("light", nodes, edges, 3);
  assert.deepEqual(d.reach, [1, 3, 1]);
  const shallow = directionsFrom("light", nodes, edges, 1);
  assert.deepEqual(shallow.reach, [1]);
  assert.deepEqual(directionsFrom("unrelated", nodes, edges).reach, [0, 0, 0]);
});

test("frontier and open questions reachable forward", () => {
  const d = directionsFrom("light", nodes, edges);
  assert.deepEqual(d.frontier.map((x) => x.id), ["sky-blue-hypothesis"]);
  assert.deepEqual(d.openQuestions.map((x) => x.id), ["why-red"]);
  assert.equal(isFrontierNode(n("x", { frontierFlag: "frontier" })), true);
  assert.equal(isFrontierNode(n("x", { kind: "replication" })), true);
  assert.equal(isFrontierNode(n("x")), false);
});

test("cites edges do not count as forward and cycles do not loop", () => {
  const d = directionsFrom("sunset", nodes, edges);
  assert.deepEqual(d.dependents, []);
  assert.deepEqual(d.reach, [0, 0, 0]);
});
