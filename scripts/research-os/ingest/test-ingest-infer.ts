/**
 * Unit tests: src/lib/research-os/ingest/infer.ts's offline prerequisite-
 * edge inference (bkt-ros ros-03 item 4). Pure functions, plain fixtures,
 * no I/O, matching scripts/research-os/ingest/test-ingest-validate.ts's own
 * convention.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/test-ingest-infer.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  tokenize,
  jaccardOverlap,
  inferredConfidence,
  inferEdges,
  pairKey,
  INFERRED_CONFIDENCE_MIN,
  INFERRED_CONFIDENCE_MAX,
  OVERLAP_MIN_RATIO,
} from "../../../src/lib/research-os/ingest/infer";
import type { IngestNodeDraft } from "../../../src/lib/research-os/ingest/types";

function node(slug: string, tier: number, summary: string, branch = "02-physics"): IngestNodeDraft {
  return { slug, title: slug, kind: "concept", tier, branch, summary, labels: { en: { title: slug } }, provenance: {} };
}

// ---------------------------------------------------------------------------
// tokenize / jaccardOverlap / inferredConfidence
// ---------------------------------------------------------------------------

test("tokenize: lowercases, strips punctuation, drops short words and stopwords", () => {
  const tokens = tokenize("The Wavefunction and the Born Rule, a first look.");
  assert.ok(tokens.has("wavefunction"));
  assert.ok(tokens.has("born"));
  assert.ok(tokens.has("rule"));
  assert.ok(!tokens.has("the"), "stopword 'the' must be dropped");
  assert.ok(!tokens.has("and"), "stopword 'and' must be dropped");
  assert.ok(!tokens.has("a"), "short word 'a' must be dropped");
});

test("jaccardOverlap: identical sets overlap at 1", () => {
  const a = tokenize("wavefunction born rule");
  assert.equal(jaccardOverlap(a, new Set(a)), 1);
});

test("jaccardOverlap: disjoint sets overlap at 0", () => {
  assert.equal(jaccardOverlap(tokenize("wavefunction born rule"), tokenize("gravity orbit planet")), 0);
});

test("jaccardOverlap: an empty set overlaps at 0, never divides by zero", () => {
  assert.equal(jaccardOverlap(new Set(), tokenize("wavefunction")), 0);
  assert.equal(jaccardOverlap(new Set(), new Set()), 0);
});

test("inferredConfidence: bounded in [INFERRED_CONFIDENCE_MIN, INFERRED_CONFIDENCE_MAX], monotonic in overlap", () => {
  const low = inferredConfidence(0);
  const mid = inferredConfidence(0.5);
  const high = inferredConfidence(1);
  assert.equal(low, INFERRED_CONFIDENCE_MIN);
  assert.equal(high, INFERRED_CONFIDENCE_MAX);
  assert.ok(low <= mid && mid <= high, "confidence must rise with overlap");
  assert.ok(high < 0.9, "an inferred proposal must never reach canon_map's own 0.9 confidence");
});

// ---------------------------------------------------------------------------
// inferEdges
// ---------------------------------------------------------------------------

test("inferEdges: proposes a -> b when a.tier < b.tier and summaries overlap above the threshold", () => {
  const nodes = [
    node("wavefunction", 13, "the wavefunction and the born rule describe quantum probability amplitude"),
    node("uncertainty", 14, "the born rule and quantum probability amplitude bound measurement uncertainty"),
  ];
  const { proposals } = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].fromSlug, "wavefunction");
  assert.equal(proposals[0].toSlug, "uncertainty");
  assert.ok(proposals[0].overlapRatio >= OVERLAP_MIN_RATIO);
});

test("inferEdges: direction always follows tier order regardless of input array order", () => {
  const nodes = [
    node("harder", 20, "quantum field theory idea gauge symmetry particle"),
    node("easier", 5, "quantum field theory idea gauge symmetry basics"),
  ];
  const { proposals } = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].fromSlug, "easier", "the lower-tier node must be fromSlug (the prerequisite)");
  assert.equal(proposals[0].toSlug, "harder");
});

test("inferEdges: a tier tie produces no proposal (no ordering signal)", () => {
  const nodes = [
    node("a", 10, "shared vocabulary overlap example words physics energy"),
    node("b", 10, "shared vocabulary overlap example words physics energy"),
  ];
  const { proposals } = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  assert.equal(proposals.length, 0);
});

test("inferEdges: cross-branch pairs are never proposed, even with identical summaries", () => {
  const nodes = [
    node("phys-a", 5, "shared vocabulary overlap example words physics energy", "02-physics"),
    node("mind-b", 20, "shared vocabulary overlap example words physics energy", "07-mind"),
  ];
  const { proposals } = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  assert.equal(proposals.length, 0);
});

test("inferEdges: overlap below OVERLAP_MIN_RATIO produces no proposal", () => {
  const nodes = [node("a", 5, "alpha beta gamma delta epsilon"), node("b", 10, "zeta eta theta iota kappa")];
  const { proposals } = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  assert.equal(proposals.length, 0);
});

test("inferEdges: a pair already in existingPrerequisitePairs is never re-proposed", () => {
  const nodes = [
    node("wavefunction", 13, "the wavefunction and the born rule describe quantum probability amplitude"),
    node("uncertainty", 14, "the born rule and quantum probability amplitude bound measurement uncertainty"),
  ];
  const { proposals } = inferEdges({
    nodes,
    existingPrerequisitePairs: new Set([pairKey("wavefunction", "uncertainty")]),
  });
  assert.equal(proposals.length, 0);
});

test("inferEdges: a node with no summary is skipped entirely (nothing to compare)", () => {
  const nodes: IngestNodeDraft[] = [
    { slug: "a", title: "a", kind: "concept", tier: 5, branch: "02-physics", summary: null, labels: {}, provenance: {} },
    node("b", 10, "the wavefunction and the born rule describe quantum probability amplitude"),
  ];
  const { proposals } = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  assert.equal(proposals.length, 0);
});

test("inferEdges: proposals sort by descending overlap ratio, ties broken by slug", () => {
  const nodes = [
    node("weak-a", 1, "quantum wave energy particle photon"),
    node("weak-b", 2, "quantum wave energy particle spin"),
    node("strong-a", 3, "quantum wave energy particle photon spin field"),
    node("strong-b", 4, "quantum wave energy particle photon spin field theory"),
  ];
  const { proposals } = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  for (let i = 1; i < proposals.length; i++) {
    assert.ok(proposals[i - 1].overlapRatio >= proposals[i].overlapRatio, "proposals must sort by descending overlap");
  }
});

test("inferEdges: every proposal produces a stable-id inferred_prerequisite_proposal review item, never applied", () => {
  const nodes = [
    node("wavefunction", 13, "the wavefunction and the born rule describe quantum probability amplitude"),
    node("uncertainty", 14, "the born rule and quantum probability amplitude bound measurement uncertainty"),
  ];
  const { reviewList } = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  assert.equal(reviewList.length, 1);
  assert.equal(reviewList[0].kind, "inferred_prerequisite_proposal");
  assert.equal(reviewList[0].id, "inferred_prerequisite_proposal:wavefunction:uncertainty");
  assert.equal(reviewList[0].detail.confidenceSource, "inferred");
  assert.match(reviewList[0].note, /Not written to the graph/);
});

test("inferEdges: re-running on identical input produces an identical review list (idempotent, no model in the loop)", () => {
  const nodes = [
    node("wavefunction", 13, "the wavefunction and the born rule describe quantum probability amplitude"),
    node("uncertainty", 14, "the born rule and quantum probability amplitude bound measurement uncertainty"),
  ];
  const once = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  const twice = inferEdges({ nodes, existingPrerequisitePairs: new Set() });
  assert.deepEqual(once.reviewList, twice.reviewList);
});
