import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isPendingSignoff, loadPrimaryPapers } from "../src/lib/canon-primary";

test("isPendingSignoff: true for a 'pending: <name>' value", () => {
  assert.equal(isPendingSignoff("pending: gianyrox"), true);
});

test("isPendingSignoff: case-insensitive and tolerant of leading space", () => {
  assert.equal(isPendingSignoff("Pending: gianyrox"), true);
  assert.equal(isPendingSignoff("  pending: gianyrox"), true);
});

test("isPendingSignoff: false for an approved value", () => {
  assert.equal(isPendingSignoff("approved: gianyrox"), false);
});

test("isPendingSignoff: true for a 'rejected: <name> <date>: <reason>' value", () => {
  assert.equal(isPendingSignoff("rejected: gianyrox 2026-09-10: broken DOI"), true);
});

test("isPendingSignoff: case-insensitive and tolerant of leading space for rejected too", () => {
  assert.equal(isPendingSignoff("Rejected: gianyrox 2026-09-10: bad"), true);
  assert.equal(isPendingSignoff("  rejected: gianyrox 2026-09-10: bad"), true);
});

test("isPendingSignoff: false for null/undefined (pre-ros-11 records stay ungated)", () => {
  assert.equal(isPendingSignoff(null), false);
  assert.equal(isPendingSignoff(undefined), false);
});

test("loadPrimaryPapers: never returns a record with a pending provenance_signoff", () => {
  const papers = loadPrimaryPapers();
  const stillPending = papers.filter((p) => isPendingSignoff(p.provenanceSignoff));
  assert.equal(
    stillPending.length,
    0,
    `loadPrimaryPapers() leaked ${stillPending.length} pending-signoff record(s): ` +
      stillPending.map((p) => `${p.branch}/${p.concept}/${p.id}`).join(", "),
  );
});

test("loadPrimaryPapers: still serves pre-ros-11 records with no provenance_signoff", () => {
  const papers = loadPrimaryPapers();
  const stillServed = papers.some(
    (p) => p.branch === "05-biophysics" && p.concept === "mitochondria",
  );
  assert.equal(stillServed, true, "pre-ros-11 canon must not be retroactively gated");
});
