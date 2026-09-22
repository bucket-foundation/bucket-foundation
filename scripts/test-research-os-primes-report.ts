/**
 * The prime report page's data (ros-frontend 1) over a hand-built graph.
 * node:test, no network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildPrimesReport, type ReportEdge, type ReportNode } from "../src/lib/research-os/primes-report";

const node = (id: string, kind = "concept", branch = "02-physics"): ReportNode => ({ id, slug: id, title: id.toUpperCase(), kind, branch });

// p1 and p2 are primes; c rests on both; top rests on c and p2; u has no edges.
const nodes = [node("p1"), node("p2", "concept", "01-mathematics"), node("c"), node("top"), node("u", "artifact")];
const edges: ReportEdge[] = [
  { from_id: "p1", to_id: "c", kind: "prerequisite", confidence: 0.9 },
  { from_id: "c", to_id: "p2", kind: "derives_from", confidence: 1 },
  { from_id: "top", to_id: "c", kind: "derives_from", confidence: 1 },
  { from_id: "p2", to_id: "top", kind: "prerequisite", confidence: 0.8 },
  { from_id: "c", to_id: "u", kind: "relates_to", confidence: 1 },
  { from_id: "p1", to_id: "gone", kind: "prerequisite", confidence: 1 },
];

test("counts primes, composites and unfactored nodes", () => {
  const r = buildPrimesReport(nodes, edges, new Set(), new Date("2026-09-21T00:00:00Z"));
  assert.equal(r.summary.nodes, 5);
  assert.equal(r.summary.prime, 2);
  assert.equal(r.summary.composite, 2);
  assert.equal(r.summary.unfactored, 1);
  assert.deepEqual(r.unfactoredByKind, [{ kind: "artifact", count: 1 }]);
  assert.equal(r.generatedAt, "2026-09-21T00:00:00.000Z");
});

test("ranks the deepest composite first and links by slug", () => {
  const r = buildPrimesReport(nodes, edges, new Set());
  assert.equal(r.deepest[0].slug, "top");
  assert.ok(r.deepest[0].depth > r.deepest[1].depth);
  assert.equal(r.deepest[0].primes, 2);
  assert.equal(r.widest.length, 2);
});

test("penetration puts the prime both composites rest on first", () => {
  const r = buildPrimesReport(nodes, edges, new Set());
  const top = r.penetrating[0];
  assert.equal(top.composites, 2);
  assert.ok(["p1", "p2"].includes(top.slug ?? ""));
});

test("confirmed irreducible primes, and confirmed nodes that gained factors", () => {
  const r = buildPrimesReport(nodes, edges, new Set(["p1", "c"]));
  assert.equal(r.confirmedIrreducible.count, 1);
  assert.equal(r.confirmedIrreducible.of, 2);
  assert.deepEqual(r.reviewAgain.map((n) => n.slug), ["c"]);
});

test("an empty graph gives an empty report", () => {
  const r = buildPrimesReport([], [], new Set());
  assert.equal(r.summary.nodes, 0);
  assert.equal(r.penetrating.length, 0);
  assert.equal(r.deepest.length, 0);
});
