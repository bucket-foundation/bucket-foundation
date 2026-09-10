/**
 * Research OS for K-12, Phase 0, stage advancement rules (bkt-ros, task item
 * 5). Every transition appends an evidence event before (or instead of)
 * raising `stage`, matching graph.learner_node_state.evidence's role as an
 * append-only log. Pure functions, no I/O; the API routes under
 * /api/research-os/* call these and persist the result.
 */
import type { Stage } from "./types";
import { stageAtLeast } from "./types";

export type EvidenceKind = "open" | "explanation" | "check" | "transfer_item" | "production_submitted" | "teacher_review";

export interface EvidenceEvent {
  at: string; // ISO timestamp
  kind: EvidenceKind;
  result?: "support" | "contradiction" | "unknown";
  confidence?: "high" | "medium" | "low";
  held?: boolean;
  heldReason?: string;
  note?: string;
  reviewerId?: string; // set only on a "teacher_review" event
}

export interface StageTransition {
  nextStage: Stage;
  event: EvidenceEvent;
}

/** access -> awareness: the learner opened the node. */
export function onNodeOpened(currentStage: Stage, now: string = new Date().toISOString()): StageTransition {
  const event: EvidenceEvent = { at: now, kind: "open" };
  const nextStage: Stage = currentStage === "access" ? "awareness" : currentStage;
  return { nextStage, event };
}

/**
 * awareness -> understanding: the learner wrote an explanation and the Check
 * tool (task item 4) confirmed it is grounded. "Grounded" here means the tool
 * did not abstain, judged the explanation as supported by the node's own
 * summary/provenance, and did not report low confidence, mirroring the
 * abstain-on-weak-retrieval floor /api/academy/tutor already enforces.
 */
export function onCheckResult(
  currentStage: Stage,
  check: { result: "support" | "contradiction" | "unknown"; confidence: "high" | "medium" | "low"; abstained: boolean },
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = { at: now, kind: "check", result: check.result, confidence: check.confidence };
  const grounded = !check.abstained && check.result === "support" && check.confidence !== "low";
  const eligible = stageAtLeast(currentStage, "awareness") && !stageAtLeast(currentStage, "understanding");
  const nextStage: Stage = grounded && eligible ? "understanding" : currentStage;
  return { nextStage, event };
}

/**
 * understanding -> internalization: a transfer prompt was answered, but per
 * task item 5 "teacher judgment stubbed as auto-hold" -- Phase 0 has no
 * teacher layer (task item 6), so this transition never auto-advances. The
 * attempt is logged as held evidence, ready for a real teacher override in
 * Phase 1 (RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3, "Teacher judgment is
 * a first-class evidence kind from the start").
 * TODO(Phase 1, review section 3 + gap analysis "Teacher review queue"):
 * replace this stub with a real teacher-visible hold queue and an override
 * that advances `stage`.
 */
export function onTransferItemAnswered(
  currentStage: Stage,
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = {
    at: now,
    kind: "transfer_item",
    held: true,
    heldReason: "teacher_judgment_stub",
    note: "Transfer item answered; held pending teacher review (no teacher layer in Phase 0).",
  };
  return { nextStage: currentStage, event }; // stage intentionally unchanged
}

/**
 * Diagnostic-probe grading (bkt-ros, Phase 1 item 2, review section 3 step
 * 5, "handle unknown prior knowledge"). src/lib/research-os/probe.ts's
 * probeDue only fires a probe for a learner with NO state record on any
 * ancestor of the target, so the starting stage here is always 'access'.
 * The grading call itself is the SAME one Check makes
 * (src/lib/research-os/grounding.ts's gradeExplanation, task item 2's
 * "graded by the existing grounded tutor Check action"); this function only
 * differs from onCheckResult in what a result is worth, because a cold-start
 * probe answer means something different from an in-path Check answer:
 *
 *   - strongly grounded (support, no abstain, confidence >= medium):
 *     the learner can already explain this ancestor concept, so probing
 *     jumps straight to 'understanding' -- skipping the 'awareness' gate
 *     onCheckResult enforces, since that gate exists to require "opened the
 *     node" first, which a probe deliberately bypasses for a node the
 *     learner never opened.
 *   - recognized but not fully explained (support, low confidence, or
 *     unknown without abstaining): 'awareness' -- they showed some prior
 *     familiarity, short of a full explanation.
 *   - unrelated, contradicted, or abstained: stays at 'access'. The probe
 *     attempt is still logged as evidence either way.
 */
export function onProbeCheckResult(
  check: { result: "support" | "contradiction" | "unknown"; confidence: "high" | "medium" | "low"; abstained: boolean },
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = {
    at: now,
    kind: "check",
    result: check.result,
    confidence: check.confidence,
    note: "diagnostic_probe",
  };
  if (!check.abstained && check.result === "support" && check.confidence !== "low") {
    return { nextStage: "understanding", event };
  }
  if (!check.abstained && (check.result === "support" || check.result === "unknown")) {
    return { nextStage: "awareness", event };
  }
  return { nextStage: "access", event };
}

/**
 * production: submitting a Production for this node raises its state to
 * `production` directly. Unlike the internalization gate above, task item 5
 * lists this transition without a stub caveat, and Phase 0 has no review
 * queue to hold it behind (task item 6). Acceptance/rejection of the
 * Production itself is a separate field (graph.productions.status) still
 * gated to 'draft'/'submitted' in Phase 0; only 'accepted' would represent a
 * teacher- or reviewer-approved production, and that path is Phase 1 work
 * (RESEARCH-OS-K12-SYSTEM-REVIEW.md gap analysis, "Teacher review queue").
 */
export function onProductionSubmitted(now: string = new Date().toISOString()): StageTransition {
  const event: EvidenceEvent = { at: now, kind: "production_submitted" };
  return { nextStage: "production", event };
}

/**
 * Teacher review decision on a held transfer-item answer (bkt-ros, Phase 1
 * item 4). Completes the transition onTransferItemAnswered above
 * deliberately left held: RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3,
 * "Teacher judgment is a first-class evidence kind from the start: a
 * teacher can advance or hold back a stage directly, with a required
 * one-line reason stored on the evidence record." An "approved" decision
 * raises understanding -> internalization; "returned" leaves the stage
 * where it is, with the reason logged either way. Only meaningful when the
 * learner is already past Understanding and not yet at Internalization; a
 * decision on any other stage still logs the evidence event but leaves
 * `stage` unchanged (nothing for this specific gate to advance).
 *
 * `reviewerId` is who made the call (src/lib/research-os/reviewer.ts's
 * verified identity), never the learner: this event's author is the
 * teacher, unlike every other EvidenceEvent in this file.
 */
export function onTeacherReview(
  currentStage: Stage,
  decision: "approved" | "returned",
  reviewerId: string,
  reason: string | undefined,
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = {
    at: now,
    kind: "teacher_review",
    held: decision === "returned",
    heldReason: decision === "returned" ? reason : undefined,
    note: reason,
    reviewerId,
  };
  const eligible = stageAtLeast(currentStage, "understanding") && !stageAtLeast(currentStage, "internalization");
  const nextStage: Stage = decision === "approved" && eligible ? "internalization" : currentStage;
  return { nextStage, event };
}
