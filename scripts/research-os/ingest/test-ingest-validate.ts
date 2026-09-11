/**
 * Unit tests: the ingestion slice's shared validators
 * (src/lib/research-os/ingest/validate.ts) and the review-list merge
 * helper (.../review.ts). Pure functions, plain fixtures, no I/O, matching
 * scripts/test-research-os-engine-bridge.ts's own convention.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/test-ingest-validate.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checkOrphanEdges, checkTierMonotonicity, tierViolationsToReviewItems } from "../../../src/lib/research-os/ingest/validate";
import { mergeReviewList } from "../../../src/lib/research-os/ingest/review";
import type { IngestEdgeDraft, IngestNodeDraft, ReviewItem } from "../../../src/lib/research-os/ingest/types";

function node(slug: string, tier: number): IngestNodeDraft {
  return { slug, title: slug, kind: "concept", tier, branch: "02-physics", summary: null, labels: { en: { title: slug } }, provenance: {} };
}

function edge(fromSlug: string, toSlug: string, kind: IngestEdgeDraft["kind"] = "prerequisite"): IngestEdgeDraft {
  return { fromSlug, toSlug, kind, weight: kind === "prerequisite" ? 1.0 : null };
}

// ---------------------------------------------------------------------------
// checkOrphanEdges
// ---------------------------------------------------------------------------

test("checkOrphanEdges: every endpoint resolves -> no orphans", () => {
  const nodes = [node("a", 1), node("b", 2)];
  const edges = [edge("a", "b")];
  assert.deepEqual(checkOrphanEdges(nodes, edges), []);
});

test("checkOrphanEdges: a missing target is reported", () => {
  const nodes = [node("a", 1)];
  const edges = [edge("a", "does-not-exist")];
  const orphans = checkOrphanEdges(nodes, edges);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].toSlug, "does-not-exist");
});

test("checkOrphanEdges: a missing source is reported", () => {
  const nodes = [node("b", 1)];
  const edges = [edge("does-not-exist", "b")];
  const orphans = checkOrphanEdges(nodes, edges);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].fromSlug, "does-not-exist");
});

// ---------------------------------------------------------------------------
// checkTierMonotonicity
// ---------------------------------------------------------------------------

test("checkTierMonotonicity: prerequisite tier <= dependent tier -> no violations", () => {
  const nodes = [node("a", 3), node("b", 5), node("c", 5)];
  const edges = [edge("a", "b"), edge("b", "c")];
  assert.deepEqual(checkTierMonotonicity(nodes, edges), []);
});

test("checkTierMonotonicity: a prerequisite with a HIGHER tier than its dependent is flagged", () => {
  const nodes = [node("a", 9), node("b", 4)];
  const edges = [edge("a", "b")];
  const violations = checkTierMonotonicity(nodes, edges);
  assert.equal(violations.length, 1);
  assert.deepEqual(violations[0], { fromSlug: "a", toSlug: "b", fromTier: 9, toTier: 4 });
});

test("checkTierMonotonicity: non-prerequisite edges carry no tier ordering claim, never flagged", () => {
  const nodes = [node("a", 90), node("b", 3)];
  const edges = [edge("a", "b", "derives_from"), edge("a", "b", "cites")];
  assert.deepEqual(checkTierMonotonicity(nodes, edges), []);
});

test("checkTierMonotonicity: an orphan edge (endpoint missing) is skipped here, avoiding a double report", () => {
  const nodes = [node("a", 9)];
  const edges = [edge("a", "missing")];
  assert.deepEqual(checkTierMonotonicity(nodes, edges), []);
});

test("tierViolationsToReviewItems: maps to a stable, human-readable review item", () => {
  const items = tierViolationsToReviewItems([{ fromSlug: "a", toSlug: "b", fromTier: 9, toTier: 4 }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "tier_violation");
  assert.equal(items[0].id, "tier_violation:a:b");
  assert.match(items[0].note, /higher source tier \(9\) than target tier \(4\)/);
});

// ---------------------------------------------------------------------------
// mergeReviewList
// ---------------------------------------------------------------------------

function reviewItem(id: string, note = id): ReviewItem {
  return { id, kind: "unmatched_derives_from", note, detail: {} };
}

test("mergeReviewList: disjoint lists concatenate", () => {
  const merged = mergeReviewList([reviewItem("a")], [reviewItem("b")]);
  assert.deepEqual(
    merged.map((i) => i.id),
    ["a", "b"],
  );
});

test("mergeReviewList: same id twice converges to one row, incoming wins (idempotent re-run)", () => {
  const first = mergeReviewList([], [reviewItem("a", "first note")]);
  const second = mergeReviewList(first, [reviewItem("a", "updated note")]);
  assert.equal(second.length, 1);
  assert.equal(second[0].note, "updated note");
});

test("mergeReviewList: re-running with identical input is a true no-op", () => {
  const items = [reviewItem("a"), reviewItem("b")];
  const once = mergeReviewList([], items);
  const twice = mergeReviewList(once, items);
  assert.deepEqual(once, twice);
});
