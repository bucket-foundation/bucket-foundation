/**
 * Unit tests: the per-learner calibration summary (bkt-ros, learning/
 * research-os/PLAN-REVISION-2.md section 2a), src/lib/research-os/
 * calibration.ts's computeCalibrationSummary. Pure, no I/O, matching
 * class-view.ts's own test convention (scripts/test-research-os-teacher-
 * class.ts): plain evidence-array fixtures, no database.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-calibration.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { computeCalibrationSummary, type CalibrationEvidenceEntry } from "../src/lib/research-os/calibration";

function checkEvent(overrides: Partial<CalibrationEvidenceEntry> = {}): CalibrationEvidenceEntry {
  return { kind: "check", learnerConfidence: "fairly", predictionCorrect: true, ...overrides };
}

test("a learner with one forcing-gated check attempt gets one row", () => {
  const rows = computeCalibrationSummary(new Map([["learner-1", [checkEvent()]]]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].learnerId, "learner-1");
  assert.equal(rows[0].n, 1);
  assert.equal(rows[0].meanConfidence, 3); // "fairly" = 3
  assert.equal(rows[0].meanCorrectness, 1);
});

test("meanConfidence and meanCorrectness average across multiple attempts", () => {
  const evidence = [
    checkEvent({ learnerConfidence: "not_sure", predictionCorrect: false }), // 1, wrong
    checkEvent({ learnerConfidence: "certain", predictionCorrect: true }), // 4, right
  ];
  const rows = computeCalibrationSummary(new Map([["learner-1", evidence]]));
  assert.equal(rows[0].n, 2);
  assert.equal(rows[0].meanConfidence, 2.5); // (1 + 4) / 2
  assert.equal(rows[0].meanCorrectness, 0.5); // 1 of 2 correct
});

test("a learner with zero qualifying events is omitted, not returned as a zeroed row", () => {
  const rows = computeCalibrationSummary(new Map([["learner-1", []]]));
  assert.equal(rows.length, 0);
});

test("an 'open' or 'transfer_item' event never counts, even if it happens to carry a learnerConfidence-shaped field", () => {
  const evidence: CalibrationEvidenceEntry[] = [
    { kind: "open", learnerConfidence: "certain", predictionCorrect: true },
    { kind: "transfer_item", learnerConfidence: "certain", predictionCorrect: true },
  ];
  const rows = computeCalibrationSummary(new Map([["learner-1", evidence]]));
  assert.equal(rows.length, 0);
});

test("a diagnostic-probe check event (note: diagnostic_probe) never counts: it never goes through the forcing commit step", () => {
  const evidence = [checkEvent({ note: "diagnostic_probe", learnerConfidence: "certain", predictionCorrect: true })];
  const rows = computeCalibrationSummary(new Map([["learner-1", evidence]]));
  assert.equal(rows.length, 0);
});

test("a comparison-arm check event (no learnerConfidence at all) never counts", () => {
  const evidence: CalibrationEvidenceEntry[] = [{ kind: "check", predictionCorrect: true }];
  const rows = computeCalibrationSummary(new Map([["learner-1", evidence]]));
  assert.equal(rows.length, 0);
});

test("an invalid/garbage learnerConfidence value never counts", () => {
  const evidence: CalibrationEvidenceEntry[] = [{ kind: "check", learnerConfidence: "super-duper-sure", predictionCorrect: true }];
  const rows = computeCalibrationSummary(new Map([["learner-1", evidence]]));
  assert.equal(rows.length, 0);
});

test("predictionCorrect must be exactly true to count as correct; a missing or false value counts as incorrect", () => {
  const evidence = [
    checkEvent({ predictionCorrect: undefined }),
    checkEvent({ predictionCorrect: false }),
    checkEvent({ predictionCorrect: true }),
  ];
  const rows = computeCalibrationSummary(new Map([["learner-1", evidence]]));
  assert.equal(rows[0].n, 3);
  assert.equal(rows[0].meanCorrectness, 1 / 3);
});

test("rows are independent per learner, scoped to only that learner's own evidence array", () => {
  const evidenceByLearner = new Map<string, CalibrationEvidenceEntry[]>([
    ["learner-1", [checkEvent({ learnerConfidence: "certain", predictionCorrect: true })]],
    ["learner-2", [checkEvent({ learnerConfidence: "not_sure", predictionCorrect: false })]],
  ]);
  const rows = computeCalibrationSummary(evidenceByLearner);
  assert.equal(rows.length, 2);
  const byId = new Map(rows.map((r) => [r.learnerId, r]));
  assert.equal(byId.get("learner-1")?.meanCorrectness, 1);
  assert.equal(byId.get("learner-2")?.meanCorrectness, 0);
});
