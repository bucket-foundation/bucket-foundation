/**
 * Research OS for K-12, per-learner calibration summary (bkt-ros,
 * PLAN-REVISION-2.md section 2a's calibration record). Pure function over
 * plain evidence arrays, no I/O, matching class-view.ts's own
 * "dependency-free, unit-testable" convention
 * (scripts/test-research-os-calibration.ts). src/app/api/research-os/
 * class/route.ts is the only caller: it loads each reviewer-scoped
 * learner's own graph.learner_node_state.evidence array and passes it
 * here.
 *
 * "Calibration" here reads mean confidence against mean correctness on the
 * one thing this codebase can score without a human audit: whether a
 * learner's own source prediction (forcing.ts's computePredictionCorrect,
 * the code-level check on a "check" event's sourcePrediction field)
 * matched the node's real citation. A learner whose confidence tracks
 * their own prediction accuracy is well-calibrated. A learner confident
 * and wrong more times than confident and right reads as poorly
 * calibrated, the reading learning/research-os/study/INSTRUMENTS.md
 * section 2 names for Lee and colleagues' (2025) own framing.
 *
 * Only "check" events carrying a `learnerConfidence` are counted: those
 * are exactly the events that went through the pre-reveal forcing commit
 * step (forcingEnabled true). A learner on the comparison arm, or a
 * "check" event from before this pass shipped, contributes nothing here
 * rather than a misleading zero.
 */
import { learnerConfidenceScore, isValidLearnerConfidence } from "./forcing";

/** The subset of an EvidenceEvent this module reads. Loosely typed
 * (matching src/app/api/research-os/class/route.ts's own StateRow.evidence
 * shape, `Array<Record<string, unknown>>`) since the caller reads jsonb
 * straight off a Postgres row rather than through stages.ts's stricter
 * EvidenceEvent type. */
export interface CalibrationEvidenceEntry {
  kind?: string;
  note?: string;
  learnerConfidence?: unknown;
  predictionCorrect?: unknown;
}

export interface CalibrationRow {
  learnerId: string;
  /** Number of forcing-gated "check" attempts counted. */
  n: number;
  /** Mean of learnerConfidence's 1-4 ordinal score across those attempts. */
  meanConfidence: number;
  /** Fraction (0 to 1) of those attempts whose sourcePrediction matched
   * the node's own citation. */
  meanCorrectness: number;
}

/**
 * One row per learner with at least one forcing-gated "check" event,
 * skipping the diagnostic probe's own "check" events (note ===
 * "diagnostic_probe") since those never go through the forcing commit
 * step (stages.ts's onProbeCheckResult never sets learnerConfidence).
 * A learner with zero qualifying events gets no row at all: "no data yet"
 * and "well-calibrated at zero" both read as no row, so the caller renders
 * that case as an absence rather than as a computed mean.
 */
export function computeCalibrationSummary(evidenceByLearner: Map<string, CalibrationEvidenceEntry[]>): CalibrationRow[] {
  const rows: CalibrationRow[] = [];
  // .forEach rather than for-of over the Map directly: this repo's
  // tsconfig has no explicit `target`, so plain Map iteration needs
  // --downlevelIteration (TS2802); forEach needs neither.
  evidenceByLearner.forEach((evidence, learnerId) => {
    const qualifying = (evidence || []).filter(
      (e): e is CalibrationEvidenceEntry & { learnerConfidence: Parameters<typeof learnerConfidenceScore>[0] } =>
        e.kind === "check" && e.note !== "diagnostic_probe" && isValidLearnerConfidence(e.learnerConfidence),
    );
    if (qualifying.length === 0) return;
    const confidenceSum = qualifying.reduce((sum, e) => sum + learnerConfidenceScore(e.learnerConfidence), 0);
    const correctCount = qualifying.filter((e) => e.predictionCorrect === true).length;
    rows.push({
      learnerId,
      n: qualifying.length,
      meanConfidence: confidenceSum / qualifying.length,
      meanCorrectness: correctCount / qualifying.length,
    });
  });
  return rows;
}
