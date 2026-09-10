/**
 * Unit tests: confidence-weighted frontier-backward routing (bkt-ros
 * ros-03 item 2). src/lib/research-os/frontier.ts's computeFrontier now
 * prefers the highest-confidence chain to a target when more than one
 * path reaches the same ancestor, and flags any edge on the returned
 * chain below LOW_CONFIDENCE_THRESHOLD even when no stronger alternative
 * exists (learning/research-os/PLAN-REVISION-1.md section 2b, learning/
 * research-os/ROUTING.md).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-confidence.ts
 * (same invocation as scripts/test-research-os-routing.ts; no test
 * framework configured in this repo, node:test + node:assert is the
 * existing pattern.)
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { computeFrontier, LOW_CONFIDENCE_THRESHOLD } from "../src/lib/research-os/frontier";
import { DEFAULT_EDGE_CONFIDENCE } from "../src/lib/research-os/types";
import type { GraphNode, GraphEdge } from "../src/lib/research-os/types";

function node(slug: string): GraphNode {
  return { id: slug, slug, title: slug, kind: "concept", tier: 0, branch: "test", summary: null };
}

function edge(fromId: string, toId: string, confidence?: number, opts?: { id?: string; confidenceSource?: string }): GraphEdge {
  return { id: opts?.id, fromId, toId, kind: "prerequisite", confidence, confidenceSource: opts?.confidenceSource };
}

test("LOW_CONFIDENCE_THRESHOLD defaults to 0.6", () => {
  assert.equal(LOW_CONFIDENCE_THRESHOLD, 0.6);
});

test("an edge with no confidence field defaults to DEFAULT_EDGE_CONFIDENCE (1.0) in the chain", () => {
  const nodes = [node("target"), node("root")];
  const edges = [edge("root", "target")];
  const result = computeFrontier(nodes, edges, [], "target");
  const rootStep = result.chain.find((s) => s.node.slug === "root")!;
  assert.equal(rootStep.edgeConfidence, DEFAULT_EDGE_CONFIDENCE);
  assert.equal(result.lowConfidenceFlags.length, 0);
});

test("diamond fixture: computeFrontier prefers the high-confidence alternate chain to the same ancestor", () => {
  // target <- A <- root (confidence 0.9 on root->A)
  // target <- B <- root (confidence 0.2 on root->B), a weak alternate path
  // to the SAME root. Both A and B are required (AND semantics: target
  // needs both), but root itself is reachable two ways, and the router
  // must pick the 0.9 path over the 0.2 path when reporting root's own
  // edgeConfidence/pathConfidence.
  const nodes = [node("target"), node("a"), node("b"), node("root")];
  const edges = [
    edge("a", "target", 1.0),
    edge("b", "target", 1.0),
    edge("root", "a", 0.9, { id: "edge-root-a" }),
    edge("root", "b", 0.2, { id: "edge-root-b" }),
  ];
  const result = computeFrontier(nodes, edges, [], "target");

  const rootStep = result.chain.find((s) => s.node.slug === "root")!;
  assert.ok(
    Math.abs(rootStep.edgeConfidence! - 0.9) < 1e-6,
    `root should route through the 0.9 edge, got edgeConfidence ${rootStep.edgeConfidence}`,
  );
  assert.ok(
    Math.abs(rootStep.pathConfidence - 0.9) < 1e-6,
    `root's cumulative pathConfidence should be ~0.9 (1.0 * 0.9), got ${rootStep.pathConfidence}`,
  );
  // The weak 0.9-vs-0.2 choice means root is NOT flagged (0.9 >= threshold),
  // even though a weaker alternate edge exists elsewhere in the graph.
  assert.ok(
    !result.lowConfidenceFlags.some((f) => f.toNodeId === "a" && f.fromNodeId === "root"),
    "the chosen high-confidence edge must not itself be flagged",
  );

  // Both A and B are still required and both appear in the chain (AND
  // semantics: choosing root's best path never drops a required node).
  assert.ok(result.chain.some((s) => s.node.slug === "a"));
  assert.ok(result.chain.some((s) => s.node.slug === "b"));
});

test("diamond fixture: ties broken by shortest length when confidence product is equal", () => {
  // Two paths to `far`, both with a total product of 1.0 * 1.0 = 1.0, but
  // one is 1 hop shorter. The shorter one must win.
  const nodes = [node("target"), node("mid"), node("far")];
  const edges = [
    edge("mid", "target", 1.0),
    edge("far", "mid", 1.0), // far -> mid -> target, 2 hops
    edge("far", "target", 1.0), // far -> target directly, 1 hop, same total confidence
  ];
  const result = computeFrontier(nodes, edges, [], "target");
  const farStep = result.chain.find((s) => s.node.slug === "far")!;
  assert.equal(farStep.hops, 1, "the direct (shorter) tied-confidence path must win");
});

test("no alternative exists: the router still routes through a weak edge and flags it, rather than silently routing", () => {
  const nodes = [node("target"), node("weak-root")];
  const edges = [edge("weak-root", "target", 0.3, { id: "edge-weak", confidenceSource: "inferred" })];
  const result = computeFrontier(nodes, edges, [], "target");

  const rootStep = result.chain.find((s) => s.node.slug === "weak-root")!;
  assert.equal(rootStep.edgeConfidence, 0.3, "the chain must still route through the only available edge");
  assert.equal(result.lowConfidenceFlags.length, 1);
  assert.deepEqual(result.lowConfidenceFlags[0], {
    edgeId: "edge-weak",
    fromNodeId: "weak-root",
    toNodeId: "target",
    confidence: 0.3,
    confidenceSource: "inferred",
  });
});

test("a low-confidence edge exactly at the threshold is not flagged (flag is strictly below threshold)", () => {
  const nodes = [node("target"), node("root")];
  const edges = [edge("root", "target", LOW_CONFIDENCE_THRESHOLD, { id: "edge-at-threshold" })];
  const result = computeFrontier(nodes, edges, [], "target");
  assert.equal(result.lowConfidenceFlags.length, 0);
});

test("lowConfidenceFlags is empty when the chain has no low-confidence edge", () => {
  const nodes = [node("target"), node("root")];
  const edges = [edge("root", "target", 0.95)];
  const result = computeFrontier(nodes, edges, [], "target");
  assert.deepEqual(result.lowConfidenceFlags, []);
});

test("a flag with no edgeId (a fixture edge, never a live database row) still carries its confidence", () => {
  const nodes = [node("target"), node("root")];
  const edges = [edge("root", "target", 0.1)]; // no `id` passed
  const result = computeFrontier(nodes, edges, [], "target");
  assert.equal(result.lowConfidenceFlags.length, 1);
  assert.equal(result.lowConfidenceFlags[0].edgeId, undefined);
});
