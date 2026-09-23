import { learnerConfidenceScore, isValidLearnerConfidence } from "./forcing";

export interface CalibrationEvidenceEntry {
  kind?: string;
  note?: string;
  learnerConfidence?: unknown;
  predictionCorrect?: unknown;
}

export interface CalibrationRow {
  learnerId: string;
  n: number;
  meanConfidence: number;
  meanCorrectness: number;
}

export function computeCalibrationSummary(evidenceByLearner: Map<string, CalibrationEvidenceEntry[]>): CalibrationRow[] {
  const rows: CalibrationRow[] = [];
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
