/**
 * Research OS for K-12, Phase 0, stage advancement rules (bkt-ros, task item
 * 5). Every transition appends an evidence event before (or instead of)
 * raising `stage`, matching graph.learner_node_state.evidence's role as an
 * append-only log. Pure functions, no I/O; the API routes under
 * /api/research-os/* call these and persist the result.
 *
 * `fromStage`/`toStage` on EvidenceEvent (bkt-ros, ros-06/ros-02's own
 * contract) follow src/lib/research-os/EVIDENCE-SCHEMA.md: every event
 * records the stage immediately before and after it, so a reader
 * reconstructs the transition timeline from the log alone. `reviewId`
 * (ros-06) is the graph.teacher_reviews row id a "teacher_review" or
 * "production_returned" event corresponds to, joining the audit table and
 * the learner's own evidence log with no timestamp match needed.
 *
 * ros-04 UPDATE (bkt-ros, workspace hardening item 1): every transition
 * beyond the two production-review functions below now also writes the
 * rest of the field set EVIDENCE-SCHEMA.md specifies, closing the gaps
 * that file's own "Current schema against that plan" section lists (the
 * learner's own text, the model's abstain flag/feedback/citations, a
 * session id). Every added field is optional at the call site: callers
 * pass an `EvidenceContext` with only the fields they have, matching the
 * existing pattern where `result`/`confidence` are already optional on
 * `EvidenceEvent`. Inter-rater columns (`sampledForSecondRating`,
 * `secondRaterId`, `secondDecision`, `agrees`) are typed here per the
 * schema's contract but have no writer yet: the second-rating flow and its
 * `graph.teacher_reviews` migration belong to ros-06, per
 * EVIDENCE-SCHEMA.md's own scope note on that migration.
 */
import type { Stage } from "./types";
import { stageAtLeast } from "./types";

export type EvidenceKind =
  | "open"
  | "explanation"
  | "check"
  | "transfer_item"
  | "production_submitted"
  | "production_returned"
  | "teacher_review"
  | "quote";

/**
 * Fields a caller supplies per event, beyond what the transition function
 * itself already knows (kind, result, confidence, held, fromStage/
 * toStage). Every field is optional: a caller passes only what it has for
 * this specific event, the same discipline EVIDENCE-SCHEMA.md's contract
 * names ("a writer omits a field it has nothing for rather than writing a
 * placeholder value").
 */
export interface EvidenceContext {
  /** Groups every tool call and evidence event from one workspace sitting.
   * Client-generated, stable across a reconnect (EVIDENCE-SCHEMA.md). */
  sessionId?: string;
  /** The learner-authored text this event judged: an explanation for a
   * "check" event, an answer for a "transfer_item" event. */
  learnerText?: string;
  /** The stable id of the pooled item a "transfer_item" event answered.
   * Phase 0 has no sealed held-out item pool (LEARNER-STATE-MODEL.md
   * section 4's "Transfer-task construction rule"), so this is a fixed
   * per-target constant today, forwarded verbatim rather than validated
   * against a pool table that does not exist yet. */
  itemId?: string;
  /** The model's full feedback text on a "check" event, from
   * grounding.ts's GradeResult.feedback. */
  modelFeedback?: string;
  /** The model's citations on a "check" event, from GradeResult.citations. */
  citations?: string[];
  /** The Quote tool's own passage locator on a "quote" event
   * (src/lib/research-os/passages.ts's QuotePassage.locator). Recorded so
   * src/lib/research-os/production-guard.ts's quote-matching check can
   * verify a Production's cited source against a real Quote call this
   * learner made, per learning/research-os/PRODUCTION-GUARD.md. */
  locator?: string;
}

export interface EvidenceEvent {
  at: string; // ISO timestamp
  kind: EvidenceKind;
  result?: "support" | "contradiction" | "unknown";
  confidence?: "high" | "medium" | "low";
  held?: boolean;
  heldReason?: string;
  note?: string;
  reviewerId?: string; // set only on a "teacher_review" / "production_returned" event
  reviewId?: string; // graph.teacher_reviews.id, set only on a "teacher_review" / "production_returned" event

  // Closes "no before-and-after stage pair on an event" (EVIDENCE-SCHEMA.md).
  fromStage?: Stage;
  toStage?: Stage;

  // Closes "no stored explanation, transfer-item answer, or transfer-item id."
  learnerText?: string;
  itemId?: string;

  // Closes "abstained is used to decide a transition and then discarded" and
  // "no stored model verdict beyond result and confidence."
  abstained?: boolean;
  modelFeedback?: string;
  citations?: string[];

  // Closes "no session or attempt grouping."
  sessionId?: string;

  // Inter-rater fields (typed per the contract; no writer in ros-04, see
  // this file's header).
  sampledForSecondRating?: boolean;
  secondRaterId?: string;
  secondDecision?: "approved" | "returned";
  agrees?: boolean;

  // Closes "no stored Quote locator for provenance-guard matching," set
  // only on a "quote" event (onQuoteReturned below). production-guard.ts's
  // checkSourceProvenance reads this across a learner's whole
  // learner_node_state.evidence array to verify a Production's cited
  // sources against a real Quote call, per
  // learning/research-os/PRODUCTION-GUARD.md.
  locator?: string;
}

export interface StageTransition {
  nextStage: Stage;
  event: EvidenceEvent;
}

/** access -> awareness: the learner opened the node. */
export function onNodeOpened(currentStage: Stage, context: EvidenceContext = {}, now: string = new Date().toISOString()): StageTransition {
  const nextStage: Stage = currentStage === "access" ? "awareness" : currentStage;
  const event: EvidenceEvent = { at: now, kind: "open", fromStage: currentStage, toStage: nextStage, sessionId: context.sessionId };
  return { nextStage, event };
}

/**
 * No stage change: the Quote tool (workspace/route.ts's "quote" case)
 * returned a real, curated verbatim passage (src/lib/research-os/
 * passages.ts's getPassage returned non-null, "kind": "quote" rather than
 * the "summary" fallback). Logged as evidence so production-guard.ts's
 * quote-matching check has a real record of which locators this learner
 * pulled, closing the gap production guard, task item 1 names:
 * a source cited in a Production must correspond to a Quote record this
 * learner produced. Never called for the "summary" fallback: a summary
 * carries no locator, so there is nothing here worth recording toward
 * that check.
 */
export function onQuoteReturned(currentStage: Stage, context: EvidenceContext = {}, now: string = new Date().toISOString()): StageTransition {
  const event: EvidenceEvent = { at: now, kind: "quote", fromStage: currentStage, toStage: currentStage, sessionId: context.sessionId, locator: context.locator };
  return { nextStage: currentStage, event };
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
  context: EvidenceContext = {},
  now: string = new Date().toISOString(),
): StageTransition {
  const grounded = !check.abstained && check.result === "support" && check.confidence !== "low";
  const eligible = stageAtLeast(currentStage, "awareness") && !stageAtLeast(currentStage, "understanding");
  const nextStage: Stage = grounded && eligible ? "understanding" : currentStage;
  const event: EvidenceEvent = {
    at: now,
    kind: "check",
    result: check.result,
    confidence: check.confidence,
    abstained: check.abstained,
    fromStage: currentStage,
    toStage: nextStage,
    learnerText: context.learnerText,
    modelFeedback: context.modelFeedback,
    citations: context.citations,
    sessionId: context.sessionId,
  };
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
  context: EvidenceContext = {},
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = {
    at: now,
    kind: "transfer_item",
    held: true,
    heldReason: "teacher_judgment_stub",
    note: "Transfer item answered; held pending teacher review (no teacher layer in Phase 0).",
    fromStage: currentStage,
    toStage: currentStage,
    learnerText: context.learnerText,
    itemId: context.itemId,
    sessionId: context.sessionId,
  };
  return { nextStage: currentStage, event }; // stage intentionally unchanged
}

/**
 * Diagnostic-probe grading (bkt-ros, Phase 1 item 2, review section 3 step
 * 5, "handle unknown prior knowledge"). src/lib/research-os/probe.ts's
 * probeDue only fires a probe for a learner with NO state record on any
 * ancestor of the target, so the starting stage here is always 'access'
 * (`fromStage` below is hardcoded to that invariant rather than taking a
 * parameter no caller could supply differently). The grading call itself is
 * the SAME one Check makes (src/lib/research-os/grounding.ts's
 * gradeExplanation, task item 2's "graded by the existing grounded tutor
 * Check action"); this function only differs from onCheckResult in what a
 * result is worth, because a cold-start probe answer means something
 * different from an in-path Check answer:
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
  context: EvidenceContext = {},
  now: string = new Date().toISOString(),
): StageTransition {
  const fromStage: Stage = "access";
  let nextStage: Stage = "access";
  if (!check.abstained && check.result === "support" && check.confidence !== "low") {
    nextStage = "understanding";
  } else if (!check.abstained && (check.result === "support" || check.result === "unknown")) {
    nextStage = "awareness";
  }
  const event: EvidenceEvent = {
    at: now,
    kind: "check",
    result: check.result,
    confidence: check.confidence,
    abstained: check.abstained,
    note: "diagnostic_probe",
    fromStage,
    toStage: nextStage,
    learnerText: context.learnerText,
    modelFeedback: context.modelFeedback,
    citations: context.citations,
    sessionId: context.sessionId,
  };
  return { nextStage, event };
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
 *
 * ros-04: now takes `currentStage` (the caller fetches it first, e.g.
 * db.ts's loadCurrentStage) so the evidence event carries a real
 * `fromStage` instead of an assumed one; `nextStage` is unconditionally
 * "production" either way, unchanged from the original behavior.
 */
export function onProductionSubmitted(
  currentStage: Stage,
  context: EvidenceContext = {},
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = { at: now, kind: "production_submitted", fromStage: currentStage, toStage: "production", sessionId: context.sessionId };
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
  const eligible = stageAtLeast(currentStage, "understanding") && !stageAtLeast(currentStage, "internalization");
  const nextStage: Stage = decision === "approved" && eligible ? "internalization" : currentStage;
  const event: EvidenceEvent = {
    at: now,
    kind: "teacher_review",
    held: decision === "returned",
    heldReason: decision === "returned" ? reason : undefined,
    note: reason,
    reviewerId,
    fromStage: currentStage,
    toStage: nextStage,
  };
  return { nextStage, event };
}

/**
 * Teacher review decision to APPROVE a submitted Production (bkt-ros,
 * ros-06 item 3, closing the gap ENGINE-BRIDGE.md names: "Phase 0 has no
 * teacher-accept path," the one thing standing between an accepted
 * production and the engine outbox write). Unlike onTeacherReview above,
 * Production is already the graph's terminal stage (STAGE_ORDER's last
 * entry, set at submission by onProductionSubmitted): an approval does not
 * raise `stage` further, it re-affirms `production` and logs the
 * teacher's own sign-off as the evidence event RESEARCH-OS-K12-SYSTEM-
 * REVIEW.md section 3 requires ("a teacher can advance or hold back a
 * stage directly ... stored on the evidence record"), which is what gives
 * the outbox write (`db.ts`'s `emitProductionOutboxIfAccepted`) a real,
 * teacher-signed evidence trail underneath it. See onProductionReturned
 * below for the "returned" counterpart.
 */
export function onProductionReview(
  reviewerId: string,
  reason: string | undefined,
  reviewId?: string,
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = {
    at: now,
    kind: "teacher_review",
    note: reason,
    reviewerId,
    reviewId,
    fromStage: "production",
    toStage: "production",
  };
  return { nextStage: "production", event };
}

/**
 * Teacher review decision to RETURN a submitted Production (bkt-ros,
 * ros-06, closing the gap src/lib/research-os/EVIDENCE-SCHEMA.md's own
 * "corrective event on graph.productions" section names: "a returned
 * production leaves graph.learner_node_state.stage at 'production' with
 * no evidence event recording the correction, because the review route's
 * production branch never calls recordEvidence"). `stage` does NOT move
 * backward here -- every transition in this file already enforces the
 * high-water-mark rule (`stageAtLeast`), and a returned production is no
 * exception: `graph.productions.status` (this decision sets it back to
 * "draft") is what any outcome query already filters on for acceptance,
 * so leaving `stage` at "production" overclaims nothing. `fromStage`/
 * `toStage` both read "production" on this event for
 * the same reason EVIDENCE-SCHEMA.md gives: "the append documents the
 * correction without violating the high-water-mark rule."
 */
export function onProductionReturned(
  reviewerId: string,
  reason: string | undefined,
  reviewId?: string,
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = {
    at: now,
    kind: "production_returned",
    held: true,
    heldReason: reason,
    note: reason,
    reviewerId,
    reviewId,
    fromStage: "production",
    toStage: "production",
  };
  return { nextStage: "production", event };
}
