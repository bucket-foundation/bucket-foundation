import { INFERRED_CONFIDENCE_MIN, INFERRED_CONFIDENCE_MAX } from "../ingest/infer";
import { LOW_CONFIDENCE_THRESHOLD } from "../types";

export { INFERRED_CONFIDENCE_MIN, INFERRED_CONFIDENCE_MAX };

export const DISAGREEMENT_CONFIDENCE = 0.4;

export function llmSelfReportedToConfidence(reported: number): number {
  const clamped = Number.isFinite(reported) ? Math.min(1, Math.max(0, reported)) : 0;
  const raw = INFERRED_CONFIDENCE_MIN + (INFERRED_CONFIDENCE_MAX - INFERRED_CONFIDENCE_MIN) * clamped;
  return Math.round(raw * 100) / 100;
}

export type ModelAnswer = "yes" | "no";

export interface PromptJudgment {
  answer: ModelAnswer;
  confidence: number;
  justification: string;
}

export interface AgreementResult {
  agree: boolean;
  proposeEdge: boolean;
  confidence: number;
}

export function combineAgreement(a: PromptJudgment, b: PromptJudgment): AgreementResult {
  if (a.answer === "no" && b.answer === "no") {
    return { agree: true, proposeEdge: false, confidence: 0 };
  }
  if (a.answer === "yes" && b.answer === "yes") {
    const confidence = Math.min(llmSelfReportedToConfidence(a.confidence), llmSelfReportedToConfidence(b.confidence));
    return { agree: true, proposeEdge: true, confidence };
  }
  if (DISAGREEMENT_CONFIDENCE >= LOW_CONFIDENCE_THRESHOLD) {
    throw new Error("DISAGREEMENT_CONFIDENCE must stay below LOW_CONFIDENCE_THRESHOLD");
  }
  return { agree: false, proposeEdge: true, confidence: DISAGREEMENT_CONFIDENCE };
}
