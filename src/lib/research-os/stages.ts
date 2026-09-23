import type { GuidanceLevel, Stage } from "./types";
import { stageAtLeast } from "./types";
import type { LearnerConfidence } from "./forcing";

export type EvidenceKind =
  | "open"
  | "explanation"
  | "check"
  | "academy_mastery"
  | "transfer_item"
  | "production_submitted"
  | "production_returned"
  | "teacher_review"
  | "quote"
  | "corroboration";

export interface EvidenceContext {
  sessionId?: string;
  learnerText?: string;
  itemId?: string;
  modelFeedback?: string;
  citations?: string[];
  guidanceLevel?: GuidanceLevel;
  locator?: string;
  learnerConfidence?: LearnerConfidence;
  sourcePrediction?: string;
  predictionCorrect?: boolean;
  forcingEnabled?: boolean;
  secondSourceRequired?: boolean;
  secondSourceNodeId?: string;

  firstSourceId?: string;
  secondSourceId?: string;
  independenceReason?: string;
  passagesAgree?: boolean;
}

export interface EvidenceEvent {
  at: string;
  kind: EvidenceKind;
  result?: "support" | "contradiction" | "unknown";
  confidence?: "high" | "medium" | "low";
  held?: boolean;
  heldReason?: string;
  atomId?: string;
  branch?: string;
  mastery?: number;
  note?: string;
  reviewerId?: string;
  reviewId?: string;

  fromStage?: Stage;
  toStage?: Stage;

  learnerText?: string;
  itemId?: string;

  abstained?: boolean;
  modelFeedback?: string;
  citations?: string[];

  sessionId?: string;

  learnerConfidence?: LearnerConfidence;
  sourcePrediction?: string;
  predictionCorrect?: boolean;
  forcingEnabled?: boolean;

  secondSourceRequired?: boolean;
  secondSourceNodeId?: string;
  firstSourceId?: string;
  secondSourceId?: string;
  independenceReason?: string;
  passagesAgree?: boolean;

  sampledForSecondRating?: boolean;
  secondRaterId?: string;
  secondDecision?: "approved" | "returned";
  agrees?: boolean;

  guidanceLevel?: GuidanceLevel;

  locator?: string;
}

export interface StageTransition {
  nextStage: Stage;
  event: EvidenceEvent;
}

export function onNodeOpened(currentStage: Stage, context: EvidenceContext = {}, now: string = new Date().toISOString()): StageTransition {
  const nextStage: Stage = currentStage === "access" ? "awareness" : currentStage;
  const event: EvidenceEvent = {
    at: now,
    kind: "open",
    fromStage: currentStage,
    toStage: nextStage,
    sessionId: context.sessionId,
    guidanceLevel: context.guidanceLevel,
  };
  return { nextStage, event };
}

export function isGroundedCheck(check: { result: "support" | "contradiction" | "unknown"; confidence: "high" | "medium" | "low"; abstained: boolean }): boolean {
  return !check.abstained && check.result === "support" && check.confidence !== "low";
}

export function onQuoteReturned(currentStage: Stage, context: EvidenceContext = {}, now: string = new Date().toISOString()): StageTransition {
  const event: EvidenceEvent = { at: now, kind: "quote", fromStage: currentStage, toStage: currentStage, sessionId: context.sessionId, locator: context.locator };
  return { nextStage: currentStage, event };
}

export function onCorroborationRecorded(
  currentStage: Stage,
  context: { sessionId?: string; firstSourceId: string; secondSourceId: string; independenceReason: string; passagesAgree: boolean },
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = {
    at: now,
    kind: "corroboration",
    fromStage: currentStage,
    toStage: currentStage,
    sessionId: context.sessionId,
    firstSourceId: context.firstSourceId,
    secondSourceId: context.secondSourceId,
    independenceReason: context.independenceReason,
    passagesAgree: context.passagesAgree,
  };
  return { nextStage: currentStage, event };
}

export function onAcademyMastery(
  currentStage: Stage,
  learn: { atomId: string; branch: string; mastery: number; threshold: number },
  now: string = new Date().toISOString(),
): StageTransition {
  const eligible = learn.mastery >= learn.threshold && !stageAtLeast(currentStage, "understanding");
  const nextStage: Stage = eligible ? "understanding" : currentStage;
  const event: EvidenceEvent = {
    at: now,
    kind: "academy_mastery",
    fromStage: currentStage,
    toStage: nextStage,
    atomId: learn.atomId,
    branch: learn.branch,
    mastery: +learn.mastery.toFixed(3),
  };
  return { nextStage, event };
}

export function onCheckResult(
  currentStage: Stage,
  check: { result: "support" | "contradiction" | "unknown"; confidence: "high" | "medium" | "low"; abstained: boolean },
  context: EvidenceContext = {},
  now: string = new Date().toISOString(),
): StageTransition {
  const grounded = isGroundedCheck(check);
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
    guidanceLevel: context.guidanceLevel,
    learnerConfidence: context.learnerConfidence,
    sourcePrediction: context.sourcePrediction,
    predictionCorrect: context.predictionCorrect,
    forcingEnabled: context.forcingEnabled,
    secondSourceRequired: context.secondSourceRequired,
    secondSourceNodeId: context.secondSourceNodeId,
  };
  return { nextStage, event };
}

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
    guidanceLevel: context.guidanceLevel,
  };
  return { nextStage: currentStage, event };
}

export function onProbeCheckResult(
  check: { result: "support" | "contradiction" | "unknown"; confidence: "high" | "medium" | "low"; abstained: boolean },
  context: EvidenceContext = {},
  now: string = new Date().toISOString(),
): StageTransition {
  const fromStage: Stage = "access";
  let nextStage: Stage = "access";
  if (isGroundedCheck(check)) {
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
    guidanceLevel: context.guidanceLevel,
  };
  return { nextStage, event };
}

export function onProductionSubmitted(
  currentStage: Stage,
  context: EvidenceContext = {},
  now: string = new Date().toISOString(),
): StageTransition {
  const event: EvidenceEvent = {
    at: now,
    kind: "production_submitted",
    fromStage: currentStage,
    toStage: "production",
    sessionId: context.sessionId,
    guidanceLevel: context.guidanceLevel,
  };
  return { nextStage: "production", event };
}

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
