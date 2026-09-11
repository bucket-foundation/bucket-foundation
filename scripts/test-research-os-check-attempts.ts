/**
 * Unit tests: the persisted held-attempt store's pure pieces
 * (src/lib/research-os/check-attempts-db.ts), the production twin of
 * forcing.ts's in-memory Map (bkt-ros, learning/research-os/
 * PLAN-REVISION-2.md section 2a). Matches this repo's established
 * convention for a DB-touching module (see privacy.ts's own header): the
 * functions that call Supabase go untested directly; every non-trivial
 * decision they make is factored into pure functions instead, which ARE
 * tested here: mapCheckAttemptRow (row -> PendingCheckAttempt) and
 * isPastHardExpiry (the 24-hour hard-expiry check), plus a full
 * store-and-reveal walk built from forcing.ts's own checkAttemptAccess and
 * finalizeReveal, the exact functions dbGetPendingAttempt and
 * dbRevealPendingAttempt call, so this test exercises the real gate logic
 * the persisted store runs, rather than a parallel reimplementation of it.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-check-attempts.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mapCheckAttemptRow, isPastHardExpiry, HARD_EXPIRY_MS } from "../src/lib/research-os/check-attempts-db";
import { checkAttemptAccess, finalizeReveal, ATTEMPT_TTL_MS } from "../src/lib/research-os/forcing";
import type { GradeResult } from "../src/lib/research-os/grounding";

function grade(overrides: Partial<GradeResult> = {}): GradeResult {
  return {
    result: "support",
    confidence: "high",
    abstained: false,
    feedback: "Nice, you named the scattering law correctly.",
    citations: ["Rayleigh, Lord (1871)."],
    ...overrides,
  };
}

function row(overrides: Partial<Parameters<typeof mapCheckAttemptRow>[0]> = {}) {
  return {
    id: "attempt-1",
    learner_id: "learner-1",
    node_id: "node-1",
    session_id: "session-1",
    explanation: "Short wavelengths scatter more, so the sky looks blue.",
    allow_label: "Rayleigh, Lord (1871).",
    grade: grade(),
    current_stage: "awareness",
    forcing_enabled: true,
    created_at: new Date(1_000_000).toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// HARD_EXPIRY_MS: the outer, 24-hour bound (distinct from forcing.ts's
// 30-minute ATTEMPT_TTL_MS commit window).
// ---------------------------------------------------------------------------

test("HARD_EXPIRY_MS is exactly 24 hours, and strictly longer than the 30-minute commit window", () => {
  assert.equal(HARD_EXPIRY_MS, 24 * 60 * 60 * 1000);
  assert.ok(HARD_EXPIRY_MS > ATTEMPT_TTL_MS, "the hard expiry is an outer bound, not a replacement for the commit window");
});

// ---------------------------------------------------------------------------
// mapCheckAttemptRow: a Supabase row -> forcing.ts's PendingCheckAttempt
// ---------------------------------------------------------------------------

test("mapCheckAttemptRow: carries every field through, including the createdAt timestamp conversion", () => {
  const createdAtIso = new Date(1_700_000_000_000).toISOString();
  const pending = mapCheckAttemptRow(row({ created_at: createdAtIso }));
  assert.equal(pending.learnerId, "learner-1");
  assert.equal(pending.nodeId, "node-1");
  assert.equal(pending.sessionId, "session-1");
  assert.equal(pending.explanation, "Short wavelengths scatter more, so the sky looks blue.");
  assert.equal(pending.allowLabel, "Rayleigh, Lord (1871).");
  assert.equal(pending.grade.feedback, "Nice, you named the scattering law correctly.");
  assert.equal(pending.currentStage, "awareness");
  assert.equal(pending.forcingEnabled, true);
  assert.equal(pending.createdAt, 1_700_000_000_000);
});

test("mapCheckAttemptRow: a null session_id becomes undefined, matching an in-memory attempt with no sessionId", () => {
  const pending = mapCheckAttemptRow(row({ session_id: null }));
  assert.equal(pending.sessionId, undefined);
});

// ---------------------------------------------------------------------------
// isPastHardExpiry: the 24-hour outer bound
// ---------------------------------------------------------------------------

test("isPastHardExpiry: false just under 24 hours, true just past it", () => {
  const createdAtIso = new Date(1_000_000).toISOString();
  assert.equal(isPastHardExpiry(createdAtIso, 1_000_000 + HARD_EXPIRY_MS - 1), false);
  assert.equal(isPastHardExpiry(createdAtIso, 1_000_000 + HARD_EXPIRY_MS + 1), true);
});

// ---------------------------------------------------------------------------
// The full persisted-store walk, built from forcing.ts's own shared gate
// functions: this is what dbGetPendingAttempt and dbRevealPendingAttempt
// run, minus the Supabase I/O.
// ---------------------------------------------------------------------------

test("persisted store walk: a fresh row within both TTLs is accessible and reveals with both forcing fields", () => {
  const createdAt = 1_000_000;
  const dbRow = row({ created_at: new Date(createdAt).toISOString() });
  const now = createdAt + 5 * 60 * 1000; // 5 minutes later
  assert.equal(isPastHardExpiry(dbRow.created_at, now), false);
  const pending = mapCheckAttemptRow(dbRow);
  const access = checkAttemptAccess(pending, "learner-1", now, ATTEMPT_TTL_MS);
  assert.equal(access.ok, true);
  const revealed = finalizeReveal(pending, "fairly", "Rayleigh, Lord (1871).");
  assert.equal(revealed.ok, true);
  if (revealed.ok) {
    assert.equal(revealed.predictionCorrect, true);
    assert.equal(revealed.learnerConfidence, "fairly");
  }
});

test("persisted store walk: past the 30-minute commit window but under 24 hours is not accessible (never revealed), yet the row itself is not yet due for the hard-expiry sweep", () => {
  const createdAt = 1_000_000;
  const dbRow = row({ created_at: new Date(createdAt).toISOString() });
  const now = createdAt + ATTEMPT_TTL_MS + 1;
  assert.equal(isPastHardExpiry(dbRow.created_at, now), false, "still well under 24 hours");
  const pending = mapCheckAttemptRow(dbRow);
  const access = checkAttemptAccess(pending, "learner-1", now, ATTEMPT_TTL_MS);
  assert.equal(access.ok, false);
  assert.equal(access.reason, "expired");
});

test("persisted store walk: past the 24-hour hard expiry is refused before the commit-window check even runs", () => {
  const createdAt = 1_000_000;
  const dbRow = row({ created_at: new Date(createdAt).toISOString() });
  const now = createdAt + HARD_EXPIRY_MS + 1;
  assert.equal(isPastHardExpiry(dbRow.created_at, now), true, "dbGetPendingAttempt refuses the row here, before mapping or checking ownership");
});

test("persisted store walk: another learner's row is refused the same way an unknown id would be", () => {
  const dbRow = row({ learner_id: "learner-1" });
  const pending = mapCheckAttemptRow(dbRow);
  const access = checkAttemptAccess(pending, "learner-2", 1_000_000 + 1000, ATTEMPT_TTL_MS);
  assert.equal(access.ok, false);
  assert.equal(access.reason, "not_found", "wrong-owner reads as not_found, never a distinct reason a caller could use to probe for a valid id");
});

test("persisted store walk: a reveal missing the source prediction still withholds the grade", () => {
  const dbRow = row();
  const pending = mapCheckAttemptRow(dbRow);
  const result = finalizeReveal(pending, "certain", "");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "forcing_incomplete");
});
