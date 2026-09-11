/**
 * Unit tests: the evidence-emission contract (bkt-ros ros-04, "workspace
 * hardening" item 1). Asserts src/lib/research-os/stages.ts's transition
 * functions close every gap src/lib/research-os/EVIDENCE-SCHEMA.md's
 * "Current schema against that plan" section lists: a before/after stage
 * pair on every event, the learner's own text and item id on a
 * transfer_item, the model's abstain flag/feedback/citations on a check,
 * a session id threading through every event, and the new
 * "production_returned" corrective event. Also covers
 * src/lib/research-os/rate-limit.ts's daily tool-call cap.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-evidence.ts
 * (same invocation as scripts/test-research-os-routing.ts; no test
 * framework configured in this repo, node:test + node:assert is the
 * existing pattern.)
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  onNodeOpened,
  onCheckResult,
  onTransferItemAnswered,
  onProbeCheckResult,
  onProductionSubmitted,
  onProductionReturned,
  onTeacherReview,
} from "../src/lib/research-os/stages";
import { dailyKeyFor, recordAndCheck, dailyToolCap } from "../src/lib/research-os/rate-limit";

// ---------------------------------------------------------------------------
// fromStage/toStage on every transition (EVIDENCE-SCHEMA.md gap 1)
// ---------------------------------------------------------------------------

test("onNodeOpened: event carries fromStage/toStage, access -> awareness", () => {
  const t = onNodeOpened("access");
  assert.equal(t.event.fromStage, "access");
  assert.equal(t.event.toStage, "awareness");
  assert.equal(t.nextStage, "awareness");
});

test("onNodeOpened: opening an already-past-access node is a no-op, fromStage === toStage", () => {
  const t = onNodeOpened("understanding");
  assert.equal(t.event.fromStage, "understanding");
  assert.equal(t.event.toStage, "understanding");
  assert.equal(t.nextStage, "understanding");
});

test("onCheckResult: fromStage/toStage bracket a real advance", () => {
  const t = onCheckResult("awareness", { result: "support", confidence: "high", abstained: false });
  assert.equal(t.event.fromStage, "awareness");
  assert.equal(t.event.toStage, "understanding");
});

test("onCheckResult: a non-advancing check still logs fromStage === toStage", () => {
  const t = onCheckResult("awareness", { result: "contradiction", confidence: "high", abstained: false });
  assert.equal(t.event.fromStage, "awareness");
  assert.equal(t.event.toStage, "awareness");
});

test("onTeacherReview: fromStage/toStage bracket an approval", () => {
  const t = onTeacherReview("understanding", "approved", "reviewer-1", undefined);
  assert.equal(t.event.fromStage, "understanding");
  assert.equal(t.event.toStage, "internalization");
});

test("onProductionSubmitted: fromStage is the caller-supplied current stage, toStage is always production", () => {
  const t = onProductionSubmitted("internalization");
  assert.equal(t.event.fromStage, "internalization");
  assert.equal(t.event.toStage, "production");
  assert.equal(t.nextStage, "production");
});

// ---------------------------------------------------------------------------
// Learner's own text + item id on transfer_item (gap 2)
// ---------------------------------------------------------------------------

test("onTransferItemAnswered: learnerText and itemId round-trip onto the event, stage never advances", () => {
  const t = onTransferItemAnswered("understanding", { learnerText: "sunsets scatter more red light", itemId: "sky-blue::sunset-1" });
  assert.equal(t.nextStage, "understanding");
  assert.equal(t.event.learnerText, "sunsets scatter more red light");
  assert.equal(t.event.itemId, "sky-blue::sunset-1");
  assert.equal(t.event.held, true);
  assert.equal(t.event.heldReason, "teacher_judgment_stub");
});

test("onTransferItemAnswered: context is optional, an event with no context still carries fromStage/toStage", () => {
  const t = onTransferItemAnswered("understanding");
  assert.equal(t.event.learnerText, undefined);
  assert.equal(t.event.fromStage, "understanding");
  assert.equal(t.event.toStage, "understanding");
});

// ---------------------------------------------------------------------------
// abstained persisted, model feedback/citations stored (gap 3)
// ---------------------------------------------------------------------------

test("onCheckResult: abstained is persisted on the event, not just used to decide the transition", () => {
  const t = onCheckResult(
    "awareness",
    { result: "unknown", confidence: "low", abstained: true },
    { learnerText: "explanation text", modelFeedback: "could not ground this", citations: [] },
  );
  assert.equal(t.event.abstained, true);
  assert.equal(t.event.learnerText, "explanation text");
  assert.equal(t.event.modelFeedback, "could not ground this");
  assert.deepEqual(t.event.citations, []);
});

// ---------------------------------------------------------------------------
// Cognitive forcing on Check: learnerConfidence, sourcePrediction,
// predictionCorrect, forcingEnabled (PLAN-REVISION-2.md section 2a)
// ---------------------------------------------------------------------------

test("onCheckResult: learnerConfidence, sourcePrediction, predictionCorrect, forcingEnabled all persist on the event", () => {
  const t = onCheckResult(
    "awareness",
    { result: "support", confidence: "high", abstained: false },
    {
      learnerText: "explanation text",
      modelFeedback: "grounded",
      citations: ["Rayleigh, Lord (1871)."],
      learnerConfidence: "fairly",
      sourcePrediction: "Rayleigh, Lord (1871).",
      predictionCorrect: true,
      forcingEnabled: true,
    },
  );
  assert.equal(t.event.learnerConfidence, "fairly");
  assert.equal(t.event.sourcePrediction, "Rayleigh, Lord (1871).");
  assert.equal(t.event.predictionCorrect, true);
  assert.equal(t.event.forcingEnabled, true);
});

test("onCheckResult: forcingEnabled:false persists with no learnerConfidence/sourcePrediction/predictionCorrect (the comparison arm's own shape)", () => {
  const t = onCheckResult(
    "awareness",
    { result: "support", confidence: "high", abstained: false },
    { learnerText: "explanation text", modelFeedback: "grounded", citations: [], forcingEnabled: false },
  );
  assert.equal(t.event.forcingEnabled, false);
  assert.equal(t.event.learnerConfidence, undefined);
  assert.equal(t.event.sourcePrediction, undefined);
  assert.equal(t.event.predictionCorrect, undefined);
});

test("onCheckResult: with no forcing context at all, all four fields are undefined, not a placeholder value", () => {
  const t = onCheckResult("awareness", { result: "support", confidence: "high", abstained: false });
  assert.equal(t.event.learnerConfidence, undefined);
  assert.equal(t.event.sourcePrediction, undefined);
  assert.equal(t.event.predictionCorrect, undefined);
  assert.equal(t.event.forcingEnabled, undefined);
});

test("onProbeCheckResult never carries the forcing fields: forcing gates Check, not the diagnostic probe", () => {
  const t = onProbeCheckResult({ result: "support", confidence: "high", abstained: false }, { learnerText: "x" });
  assert.equal(t.event.learnerConfidence, undefined);
  assert.equal(t.event.forcingEnabled, undefined);
});

test("onProbeCheckResult: abstained, learnerText, modelFeedback, and citations all persist; fromStage is always access per the cold-start invariant", () => {
  const t = onProbeCheckResult(
    { result: "support", confidence: "high", abstained: false },
    { learnerText: "light scatters", modelFeedback: "grounded", citations: ["Tyndall, 1869"] },
  );
  assert.equal(t.event.fromStage, "access");
  assert.equal(t.event.abstained, false);
  assert.equal(t.event.learnerText, "light scatters");
  assert.equal(t.event.modelFeedback, "grounded");
  assert.deepEqual(t.event.citations, ["Tyndall, 1869"]);
  assert.equal(t.nextStage, "understanding");
});

// ---------------------------------------------------------------------------
// Session grouping (gap 5)
// ---------------------------------------------------------------------------

test("every learner-authored transition function forwards sessionId onto its event when supplied", () => {
  // onProductionReturned is teacher-authored (reviewerId/reason/reviewId,
  // no EvidenceContext, no learner sitting to group), so it carries no
  // sessionId at all; covered separately below.
  const sessionId = "session-abc";
  assert.equal(onNodeOpened("access", { sessionId }).event.sessionId, sessionId);
  assert.equal(onCheckResult("awareness", { result: "support", confidence: "high", abstained: false }, { sessionId }).event.sessionId, sessionId);
  assert.equal(onTransferItemAnswered("understanding", { learnerText: "x", sessionId }).event.sessionId, sessionId);
  assert.equal(onProbeCheckResult({ result: "support", confidence: "high", abstained: false }, { sessionId }).event.sessionId, sessionId);
  assert.equal(onProductionSubmitted("access", { sessionId }).event.sessionId, sessionId);
});

test("sessionId is undefined, not a placeholder string, when no context is supplied", () => {
  const t = onNodeOpened("access");
  assert.equal(t.event.sessionId, undefined);
});

// ---------------------------------------------------------------------------
// The production_returned corrective event (gap 6)
// ---------------------------------------------------------------------------

test("onProductionReturned: fromStage and toStage are both production, stage never moves backward", () => {
  const t = onProductionReturned("reviewer-1", "missing a source for the second claim", "review-row-1");
  assert.equal(t.nextStage, "production");
  assert.equal(t.event.kind, "production_returned");
  assert.equal(t.event.fromStage, "production");
  assert.equal(t.event.toStage, "production");
  assert.equal(t.event.note, "missing a source for the second claim");
  assert.equal(t.event.reviewerId, "reviewer-1");
  assert.equal(t.event.reviewId, "review-row-1");
});

test("onProductionReturned: reviewId and reason are optional", () => {
  const t = onProductionReturned("reviewer-1", undefined);
  assert.equal(t.event.kind, "production_returned");
  assert.equal(t.event.note, undefined);
  assert.equal(t.event.reviewId, undefined);
});

// ---------------------------------------------------------------------------
// Rate/cost guard: the daily tool-call cap (rate-limit.ts)
// ---------------------------------------------------------------------------

test("dailyToolCap: defaults to 200 when RESEARCH_OS_DAILY_TOOL_CAP is unset", () => {
  delete process.env.RESEARCH_OS_DAILY_TOOL_CAP;
  assert.equal(dailyToolCap(), 200);
});

test("dailyToolCap: reads a positive override from the env", () => {
  process.env.RESEARCH_OS_DAILY_TOOL_CAP = "5";
  assert.equal(dailyToolCap(), 5);
  delete process.env.RESEARCH_OS_DAILY_TOOL_CAP;
});

test("dailyToolCap: a non-positive or unparseable override falls back to the default rather than disabling the cap", () => {
  process.env.RESEARCH_OS_DAILY_TOOL_CAP = "0";
  assert.equal(dailyToolCap(), 200);
  process.env.RESEARCH_OS_DAILY_TOOL_CAP = "not-a-number";
  assert.equal(dailyToolCap(), 200);
  delete process.env.RESEARCH_OS_DAILY_TOOL_CAP;
});

test("recordAndCheck: allows every call up to the cap, then rejects, on an injected store", () => {
  const store = new Map();
  const now = new Date("2026-09-10T12:00:00Z");
  let allowedCount = 0;
  for (let i = 0; i < 5; i++) {
    if (recordAndCheck("learner-a", 3, store, now).allowed) allowedCount++;
  }
  assert.equal(allowedCount, 3, "only the first 3 of 5 calls should be allowed under a cap of 3");
  const last = recordAndCheck("learner-a", 3, store, now);
  assert.equal(last.allowed, false);
  assert.equal(last.count, 6);
});

test("recordAndCheck: caps are independent per learner", () => {
  const store = new Map();
  const now = new Date("2026-09-10T12:00:00Z");
  recordAndCheck("learner-a", 1, store, now);
  const bResult = recordAndCheck("learner-b", 1, store, now);
  assert.equal(bResult.allowed, true, "learner-b's cap must not be affected by learner-a's calls");
});

test("recordAndCheck: the count resets on a new UTC calendar day", () => {
  const store = new Map();
  const day1 = new Date("2026-09-10T23:59:00Z");
  const day2 = new Date("2026-09-11T00:01:00Z");
  const first = recordAndCheck("learner-a", 1, store, day1);
  assert.equal(first.allowed, true);
  const secondSameDay = recordAndCheck("learner-a", 1, store, day1);
  assert.equal(secondSameDay.allowed, false, "a second call on the same UTC day should be rejected under a cap of 1");
  const nextDay = recordAndCheck("learner-a", 1, store, day2);
  assert.equal(nextDay.allowed, true, "the cap resets at UTC midnight");
});

test("dailyKeyFor: keys by learner id and UTC calendar day, not by wall-clock time", () => {
  const morning = new Date("2026-09-10T01:00:00Z");
  const evening = new Date("2026-09-10T23:00:00Z");
  assert.equal(dailyKeyFor("learner-a", morning), dailyKeyFor("learner-a", evening));
  const nextDay = new Date("2026-09-11T01:00:00Z");
  assert.notEqual(dailyKeyFor("learner-a", morning), dailyKeyFor("learner-a", nextDay));
});
