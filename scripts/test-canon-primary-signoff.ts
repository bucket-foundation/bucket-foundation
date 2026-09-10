/**
 * Unit tests: the ros-11 named-human-signoff gate in src/lib/canon-primary.ts.
 * A `primary-papers.yaml` record whose `provenance_signoff` value starts with
 * "pending" (e.g. `pending: gianyrox`) has not been approved by a named human
 * yet and must never be served as an approved, citeable-for-pay canon entry
 * by loadPrimaryPapers()/rankPrimary(), the shared loader behind both the
 * /api/research paid-cite envelope and the Research OS canon importer. A
 * record with no `provenance_signoff` field predates the ros-11 rule and
 * stays ungated.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-canon-primary-signoff.ts
 * (same invocation as scripts/test-research-os-evidence.ts; no test
 * framework configured in this repo, node:test + node:assert is the
 * existing pattern.)
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isPendingSignoff, loadPrimaryPapers } from "../src/lib/canon-primary";

// ---------------------------------------------------------------------------
// isPendingSignoff: the predicate itself
// ---------------------------------------------------------------------------

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

test("isPendingSignoff: false for null/undefined (pre-ros-11 records stay ungated)", () => {
  assert.equal(isPendingSignoff(null), false);
  assert.equal(isPendingSignoff(undefined), false);
});

// ---------------------------------------------------------------------------
// loadPrimaryPapers: the real bucket-canon/ dossiers this repo ships
// ---------------------------------------------------------------------------

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
  // 05-biophysics/mitochondria (Mitchell 1961) predates ros-11 and carries no
  // provenance_signoff field; it must still be servable. If this dossier is
  // ever renamed, repoint this assertion rather than deleting the coverage.
  const papers = loadPrimaryPapers();
  const stillServed = papers.some(
    (p) => p.branch === "05-biophysics" && p.concept === "mitochondria",
  );
  assert.equal(stillServed, true, "pre-ros-11 canon must not be retroactively gated");
});
