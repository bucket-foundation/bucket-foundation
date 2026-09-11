/**
 * Research OS for K-12, LLM-assisted edge inference: confidence calibration
 * and the two-prompt agreement rule (bkt-ros ros-13, PLAN-REVISION-2.md
 * section 2c). Sibling to src/lib/research-os/ingest/infer.ts's lexical
 * proposer: both bound their own proposal's confidence into a sub-canon
 * band and never write to the graph directly, a human review step gates
 * every edge either module proposes.
 *
 * THE CALIBRATION RULE. PLAN-REVISION-2.md section 2c reads Alzetta and
 * colleagues (2018, `_intake/research-os-k12-literature/
 * prerequisite-knowledge-graphs/alzetta-et-al-2018-pret-prerequisite-
 * enriched-terminology.md`)'s gold-standard annotation study, moderate
 * inter-annotator agreement on prerequisite pairs, disagreement
 * concentrated on same-section pairs where co-occurrence and a true
 * prerequisite relation are easy to conflate, and sets a concrete policy:
 * "a future `llm_proposed_edge` review item never inherits a confidence
 * above the inferred tier's own 0.65 ceiling regardless of the model's own
 * stated confidence." `llmSelfReportedToConfidence` below implements that
 * exact ceiling by reusing infer.ts's own INFERRED_CONFIDENCE_MIN/MAX band
 * rather than a separate constant pair: an LLM-proposed edge is the same
 * "inferred, not yet human-confirmed" trust tier as a lexical-overlap
 * proposal, one full notch below canon_map's 0.9, so the two proposers
 * share one ceiling rather than each guessing its own.
 *
 * THE AGREEMENT RULE. Two independently-phrased prompts (prompts.ts)
 * judge the same candidate pair. Agreement (both "yes" or both "no")
 * lets the pair's confidence stand at the conservative (lower) of the two
 * self-reported scores, once shrunk. Disagreement is read the way
 * Alzetta's own moderate-agreement baseline reads a human annotator's
 * disagreement: not proof the pair is wrong, but exactly the same-
 * section-conflation risk the calibration policy above exists for, so a
 * disagreeing pair is never silently dropped -- it still reaches the
 * review list, forced to a fixed confidence below LOW_CONFIDENCE_THRESHOLD
 * (learning/research-os/ROUTING.md's 0.6 teacher-flag line) so a reviewer
 * sees it flagged rather than routed through quietly.
 */
import { INFERRED_CONFIDENCE_MIN, INFERRED_CONFIDENCE_MAX } from "../ingest/infer";
import { LOW_CONFIDENCE_THRESHOLD } from "../types";

export { INFERRED_CONFIDENCE_MIN, INFERRED_CONFIDENCE_MAX };

/** A disagreeing pair's forced confidence: comfortably below
 * LOW_CONFIDENCE_THRESHOLD (0.6) so it always lands in a teacher-facing
 * "needs review" state, and comfortably above 0, never a value a bad
 * router division could turn into an infinite -log(confidence) cost. Fixed
 * rather than derived from either prompt's own self-report: on
 * disagreement neither prompt's number is trustworthy on its own (that is
 * what disagreement means), so this value carries no information from
 * either call, only the fact that they conflicted. */
export const DISAGREEMENT_CONFIDENCE = 0.4;

/**
 * Self-reported model confidence (any real number; the model may return
 * outside [0,1] under an adversarial or malformed response) mapped onto
 * [INFERRED_CONFIDENCE_MIN, INFERRED_CONFIDENCE_MAX], linear in the
 * clamped input. Mirrors infer.ts's own `inferredConfidence` shape exactly
 * (same band, same rounding), so a reviewer reading the review list sees
 * one consistent confidence scale across both proposers regardless of
 * which one produced a given row. Never reaches canon_map's 0.9 by
 * construction: INFERRED_CONFIDENCE_MAX is 0.65.
 */
export function llmSelfReportedToConfidence(reported: number): number {
  const clamped = Number.isFinite(reported) ? Math.min(1, Math.max(0, reported)) : 0;
  const raw = INFERRED_CONFIDENCE_MIN + (INFERRED_CONFIDENCE_MAX - INFERRED_CONFIDENCE_MIN) * clamped;
  return Math.round(raw * 100) / 100;
}

export type ModelAnswer = "yes" | "no";

export interface PromptJudgment {
  answer: ModelAnswer;
  /** Raw self-reported confidence, still in the model's own [0,1] scale,
   * before llmSelfReportedToConfidence's shrink. */
  confidence: number;
  justification: string;
}

export interface AgreementResult {
  /** Whether both prompts returned the same answer. */
  agree: boolean;
  /** False when both prompts answered "no": nothing to propose, the pair
   * is dropped rather than added to the review list at any confidence. */
  proposeEdge: boolean;
  /** Only meaningful when proposeEdge is true. Always inside
   * (0, INFERRED_CONFIDENCE_MAX], and always below LOW_CONFIDENCE_THRESHOLD
   * when agree is false. */
  confidence: number;
}

/**
 * Combines the two independently-phrased prompts' judgments of one
 * candidate pair (task item 2, "an agreement check"). Three cases:
 *
 *   - both "no": no prerequisite relation proposed, proposeEdge false.
 *   - both "yes": agree true, confidence is the LOWER of the two shrunk
 *     self-reports (the conservative reading -- a proposal is only as
 *     confident as its weaker-confidence phrasing), still capped at
 *     INFERRED_CONFIDENCE_MAX.
 *   - split ("yes" from one, "no" from the other): agree false, the pair
 *     still proposeEdge (surfaced for review, never silently dropped), at
 *     the fixed DISAGREEMENT_CONFIDENCE -- always below
 *     LOW_CONFIDENCE_THRESHOLD, so it flags automatically the same way any
 *     other sub-threshold edge does (learning/research-os/ROUTING.md).
 */
export function combineAgreement(a: PromptJudgment, b: PromptJudgment): AgreementResult {
  if (a.answer === "no" && b.answer === "no") {
    return { agree: true, proposeEdge: false, confidence: 0 };
  }
  if (a.answer === "yes" && b.answer === "yes") {
    const confidence = Math.min(llmSelfReportedToConfidence(a.confidence), llmSelfReportedToConfidence(b.confidence));
    return { agree: true, proposeEdge: true, confidence };
  }
  // Split verdict. DISAGREEMENT_CONFIDENCE is already well under
  // LOW_CONFIDENCE_THRESHOLD; the assertion here is a belt-and-suspenders
  // check that a future edit to either constant cannot silently break the
  // "a disagreeing pair always flags" guarantee task item 2 requires.
  if (DISAGREEMENT_CONFIDENCE >= LOW_CONFIDENCE_THRESHOLD) {
    throw new Error("DISAGREEMENT_CONFIDENCE must stay below LOW_CONFIDENCE_THRESHOLD");
  }
  return { agree: false, proposeEdge: true, confidence: DISAGREEMENT_CONFIDENCE };
}
