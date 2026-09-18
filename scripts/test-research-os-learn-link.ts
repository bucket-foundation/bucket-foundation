/**
 * Unit tests: Learn inside the workspace (ros-29), src/lib/research-os/learn-link.ts.
 * Pure, no I/O. Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-learn-link.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { academyHref, learnTargetFor, recallFor } from "../src/lib/research-os/learn-link";

test("an academy atom node links to its lesson", () => {
  const t = learnTargetFor({ branch: "02-physics", provenance: { type: "academy_atom", source: "learning/app/corpus/02-physics.json", atom_id: "waves" } });
  assert.ok(t);
  assert.equal(t.branchFile, "02-physics");
  assert.equal(t.atomId, "waves");
  assert.equal(t.href, "/research-os/learn/02-physics/waves");
});

test("a canon node in a branch with an academy corpus links to the branch", () => {
  const t = learnTargetFor({ branch: "01-mathematics", provenance: { type: "primary_source" } });
  assert.ok(t);
  assert.equal(t.atomId, null);
  assert.equal(t.href, "/research-os/learn/01-mathematics");
  assert.equal(learnTargetFor({ branch: "05-biophysics" })?.branchFile, "biophysics");
  assert.equal(learnTargetFor({ branch: "09-deep-history" }), null);
});

test("academyHref encodes", () => {
  assert.equal(academyHref("07-mind", "a b"), "/research-os/learn/07-mind/a%20b");
});

test("recallFor reads the card and reports recall, mastery, and due", () => {
  const now = Date.parse("2026-09-15T00:00:00Z");
  const day = 86400000;
  const data = { cards: { waves: { stability: 10, lastReview: now - 5 * day, due: now + 3 * day } } };
  const r = recallFor(data, "waves", now);
  assert.equal(r.seen, true);
  assert.ok(r.retrievability !== null && r.retrievability > 0.5 && r.retrievability < 1);
  assert.ok(r.mastery !== null && r.mastery > 0);
  assert.ok(Math.abs((r.dueInDays ?? 0) - 3) < 1e-9);
  const unseen = recallFor(data, "light", now);
  assert.equal(unseen.seen, false);
  assert.equal(unseen.retrievability, null);
  assert.equal(recallFor(null, "waves").seen, false);
});
