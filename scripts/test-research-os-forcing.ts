/**
 * Unit tests: cognitive forcing on Check (bkt-ros, learning/research-os/
 * PLAN-REVISION-2.md section 2a), src/lib/research-os/forcing.ts. Pure, no
 * I/O, no live Supabase or network, matching this repo's existing
 * research-os test convention (node:test + node:assert, plain fixture
 * objects, injectable stores).
 *
 * The headline case ("a test proves the feedback cannot be fetched
 * early") exercises revealPendingAttempt directly, the exact function
 * src/app/api/research-os/workspace/route.ts's "check" phase 2 calls, so
 * this test covers production code rather than a parallel
 * reimplementation of the same gate.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-forcing.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  LEARNER_CONFIDENCE_VALUES,
  isValidLearnerConfidence,
  learnerConfidenceScore,
  computePredictionCorrect,
  envForcingDefault,
  resolveForcingEnabled,
  storePendingAttempt,
  getPendingAttempt,
  consumePendingAttempt,
  pruneExpiredAttempts,
  revealPendingAttempt,
  ATTEMPT_TTL_MS,
  type PendingCheckAttempt,
} from "../src/lib/research-os/forcing";
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

function attempt(overrides: Partial<PendingCheckAttempt> = {}): PendingCheckAttempt {
  return {
    learnerId: "learner-1",
    nodeId: "node-1",
    sessionId: "session-1",
    explanation: "Short wavelengths scatter more, so the sky looks blue.",
    allowLabel: "Rayleigh, Lord (1871).",
    grade: grade(),
    currentStage: "awareness",
    forcingEnabled: true,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// The 4-point confidence item
// ---------------------------------------------------------------------------

test("isValidLearnerConfidence accepts exactly the four schema values", () => {
  for (const v of LEARNER_CONFIDENCE_VALUES) assert.equal(isValidLearnerConfidence(v), true);
  assert.equal(isValidLearnerConfidence("very_sure"), false);
  assert.equal(isValidLearnerConfidence(""), false);
  assert.equal(isValidLearnerConfidence(undefined), false);
  assert.equal(isValidLearnerConfidence(3), false);
});

test("learnerConfidenceScore is a stable 1-4 ordinal, lowest to highest", () => {
  assert.equal(learnerConfidenceScore("not_sure"), 1);
  assert.equal(learnerConfidenceScore("a_little"), 2);
  assert.equal(learnerConfidenceScore("fairly"), 3);
  assert.equal(learnerConfidenceScore("certain"), 4);
});

// ---------------------------------------------------------------------------
// Source prediction correctness: computed in code, never from the model
// ---------------------------------------------------------------------------

test("computePredictionCorrect matches only the exact allowed label", () => {
  assert.equal(computePredictionCorrect("Rayleigh, Lord (1871).", "Rayleigh, Lord (1871)."), true);
  assert.equal(computePredictionCorrect("  Rayleigh, Lord (1871).  ", "Rayleigh, Lord (1871)."), true, "trims both sides before comparing");
  assert.equal(computePredictionCorrect("Tyndall, John (1869).", "Rayleigh, Lord (1871)."), false);
  assert.equal(computePredictionCorrect("", "Rayleigh, Lord (1871)."), false, "an empty prediction is never correct");
});

// ---------------------------------------------------------------------------
// The arm switch
// ---------------------------------------------------------------------------

test("envForcingDefault is on unless RESEARCH_OS_FORCING_ENABLED is exactly false or 0", () => {
  const saved = process.env.RESEARCH_OS_FORCING_ENABLED;
  try {
    delete process.env.RESEARCH_OS_FORCING_ENABLED;
    assert.equal(envForcingDefault(), true, "unset defaults on");
    process.env.RESEARCH_OS_FORCING_ENABLED = "false";
    assert.equal(envForcingDefault(), false);
    process.env.RESEARCH_OS_FORCING_ENABLED = "0";
    assert.equal(envForcingDefault(), false);
    process.env.RESEARCH_OS_FORCING_ENABLED = "FALSE";
    assert.equal(envForcingDefault(), false, "case-insensitive");
    process.env.RESEARCH_OS_FORCING_ENABLED = "true";
    assert.equal(envForcingDefault(), true);
    process.env.RESEARCH_OS_FORCING_ENABLED = "garbage";
    assert.equal(envForcingDefault(), true, "an unparseable value falls back to on, matching rate-limit.ts's own posture");
  } finally {
    if (saved === undefined) delete process.env.RESEARCH_OS_FORCING_ENABLED;
    else process.env.RESEARCH_OS_FORCING_ENABLED = saved;
  }
});

test("resolveForcingEnabled: a class override wins over the env default either direction", () => {
  const saved = process.env.RESEARCH_OS_FORCING_ENABLED;
  try {
    delete process.env.RESEARCH_OS_FORCING_ENABLED; // env default: on
    assert.equal(resolveForcingEnabled(true), true);
    assert.equal(resolveForcingEnabled(false), false, "an explicit false override beats the on-by-default env");
    assert.equal(resolveForcingEnabled(null), true, "null defers to the env default");
    assert.equal(resolveForcingEnabled(undefined), true, "undefined defers to the env default");
  } finally {
    if (saved === undefined) delete process.env.RESEARCH_OS_FORCING_ENABLED;
    else process.env.RESEARCH_OS_FORCING_ENABLED = saved;
  }
});

// ---------------------------------------------------------------------------
// The held-attempt store
// ---------------------------------------------------------------------------

test("storePendingAttempt + getPendingAttempt: round-trips for the same learner", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt(), store, "attempt-1");
  const found = getPendingAttempt(id, "learner-1", store);
  assert.ok(found);
  assert.equal(found?.explanation, "Short wavelengths scatter more, so the sky looks blue.");
});

test("getPendingAttempt refuses another learner's held attempt", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt({ learnerId: "learner-1" }), store, "attempt-1");
  assert.equal(getPendingAttempt(id, "learner-2", store), null);
});

test("getPendingAttempt returns null for an unknown id", () => {
  const store = new Map<string, PendingCheckAttempt>();
  assert.equal(getPendingAttempt("no-such-id", "learner-1", store), null);
});

test("getPendingAttempt expires and deletes an attempt past the TTL", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const createdAt = 1_000_000;
  const id = storePendingAttempt(attempt({ createdAt }), store, "attempt-1");
  assert.ok(getPendingAttempt(id, "learner-1", store, createdAt + 1000), "still fresh a second later");
  assert.equal(getPendingAttempt(id, "learner-1", store, createdAt + ATTEMPT_TTL_MS + 1), null, "expired past the TTL");
  assert.equal(store.has(id), false, "expiry deletes the entry, not only refuses to return it");
});

test("consumePendingAttempt is single-use", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt(), store, "attempt-1");
  consumePendingAttempt(id, store);
  assert.equal(getPendingAttempt(id, "learner-1", store), null);
});

test("pruneExpiredAttempts removes only expired entries and reports the count", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const now = 5_000_000;
  storePendingAttempt(attempt({ createdAt: now - ATTEMPT_TTL_MS - 1 }), store, "expired-1");
  storePendingAttempt(attempt({ createdAt: now - ATTEMPT_TTL_MS - 1 }), store, "expired-2");
  storePendingAttempt(attempt({ createdAt: now }), store, "fresh-1");
  const pruned = pruneExpiredAttempts(store, now);
  assert.equal(pruned, 2);
  assert.equal(store.size, 1);
  assert.ok(store.has("fresh-1"));
});

// ---------------------------------------------------------------------------
// revealPendingAttempt: the exact gate workspace/route.ts's "check" phase
// 2 calls. This is the "feedback cannot be fetched early" contract.
// ---------------------------------------------------------------------------

test("revealPendingAttempt: attemptId alone (no confidence, no prediction) never returns the grade", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt(), store, "attempt-1");

  const result = revealPendingAttempt(id, "learner-1", undefined, "", store);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "forcing_incomplete");
  // No "grade", "attempt", "feedback", or "citations" key exists on the
  // false branch's type at all -- this is enforced by RevealResult's own
  // discriminated union, not only by this assertion -- but assert the
  // shape directly too, so a future refactor cannot quietly widen it.
  assert.equal(Object.prototype.hasOwnProperty.call(result, "attempt"), false);

  // The attempt is untouched: a caller can retry with the missing field.
  assert.ok(getPendingAttempt(id, "learner-1", store), "attempt stays held, not consumed, on an incomplete reveal");
});

test("revealPendingAttempt: a confidence rating with no source prediction still withholds the grade", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt(), store, "attempt-1");
  const result = revealPendingAttempt(id, "learner-1", "certain", "", store);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "forcing_incomplete");
  assert.ok(getPendingAttempt(id, "learner-1", store));
});

test("revealPendingAttempt: a source prediction with no valid confidence still withholds the grade", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt(), store, "attempt-1");
  const result = revealPendingAttempt(id, "learner-1", "not-a-real-confidence-value", "Rayleigh, Lord (1871).", store);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "forcing_incomplete");
  assert.ok(getPendingAttempt(id, "learner-1", store));
});

test("revealPendingAttempt: both fields present reveals the held grade and computes predictionCorrect", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const heldGrade = grade({ feedback: "This is grounded in the Rayleigh scattering law." });
  const id = storePendingAttempt(attempt({ grade: heldGrade, allowLabel: "Rayleigh, Lord (1871)." }), store, "attempt-1");

  const result = revealPendingAttempt(id, "learner-1", "fairly", "Rayleigh, Lord (1871).", store);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.attempt.grade.feedback, "This is grounded in the Rayleigh scattering law.");
    assert.equal(result.learnerConfidence, "fairly");
    assert.equal(result.sourcePrediction, "Rayleigh, Lord (1871).");
    assert.equal(result.predictionCorrect, true);
  }
});

test("revealPendingAttempt: a wrong source prediction still reveals the grade, with predictionCorrect false", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt({ allowLabel: "Rayleigh, Lord (1871)." }), store, "attempt-1");
  const result = revealPendingAttempt(id, "learner-1", "a_little", "Tyndall, John (1869).", store);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.predictionCorrect, false);
});

test("revealPendingAttempt is single-use: a second reveal on the same attemptId is not_found", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt(), store, "attempt-1");
  const first = revealPendingAttempt(id, "learner-1", "certain", "Rayleigh, Lord (1871).", store);
  assert.equal(first.ok, true);
  const second = revealPendingAttempt(id, "learner-1", "certain", "Rayleigh, Lord (1871).", store);
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.reason, "not_found");
});

test("revealPendingAttempt refuses another learner's held attempt, even with valid forcing fields", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const id = storePendingAttempt(attempt({ learnerId: "learner-1" }), store, "attempt-1");
  const result = revealPendingAttempt(id, "learner-2", "certain", "Rayleigh, Lord (1871).", store);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "not_found");
});

test("revealPendingAttempt: an unknown attemptId is not_found regardless of forcing fields", () => {
  const store = new Map<string, PendingCheckAttempt>();
  const result = revealPendingAttempt("no-such-id", "learner-1", "certain", "Rayleigh, Lord (1871).", store);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "not_found");
});
