import type { GradeResult } from "./grounding";
import type { Stage } from "./types";

export const LEARNER_CONFIDENCE_VALUES = ["not_sure", "a_little", "fairly", "certain"] as const;
export type LearnerConfidence = (typeof LEARNER_CONFIDENCE_VALUES)[number];

export function isValidLearnerConfidence(value: unknown): value is LearnerConfidence {
  return typeof value === "string" && (LEARNER_CONFIDENCE_VALUES as readonly string[]).includes(value);
}

export function learnerConfidenceScore(value: LearnerConfidence): number {
  return LEARNER_CONFIDENCE_VALUES.indexOf(value) + 1;
}

export const LEARNER_CONFIDENCE_COPY: Record<LearnerConfidence, string> = {
  not_sure: "not sure at all",
  a_little: "a little sure",
  fairly: "pretty sure",
  certain: "very sure",
};

export const CONFIDENCE_QUESTION_COPY = "How sure are you that what you wrote is right?";
export const SOURCE_PREDICTION_QUESTION_COPY = "Which source do you think backs up what you wrote?";

export function computePredictionCorrect(sourcePrediction: string, allowLabel: string): boolean {
  return sourcePrediction.trim().length > 0 && sourcePrediction.trim() === allowLabel.trim();
}

export function envForcingDefault(): boolean {
  const raw = (process.env.RESEARCH_OS_FORCING_ENABLED || "").trim().toLowerCase();
  return raw !== "false" && raw !== "0";
}

export function resolveForcingEnabled(classOverride: boolean | null | undefined): boolean {
  return typeof classOverride === "boolean" ? classOverride : envForcingDefault();
}

export interface PendingCheckAttempt {
  learnerId: string;
  nodeId: string;
  sessionId?: string;
  explanation: string;
  allowLabel: string;
  grade: GradeResult;
  currentStage: Stage;
  forcingEnabled: boolean;
  createdAt: number;
}

export const ATTEMPT_TTL_MS = 30 * 60 * 1000;

const pendingAttempts = new Map<string, PendingCheckAttempt>();

export function newAttemptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function storePendingAttempt(
  attempt: PendingCheckAttempt,
  store: Map<string, PendingCheckAttempt> = pendingAttempts,
  id: string = newAttemptId(),
): string {
  store.set(id, attempt);
  return id;
}

export interface AttemptAccessResult {
  ok: boolean;
  reason?: "not_found" | "expired";
}

export function checkAttemptAccess(
  found: PendingCheckAttempt | null | undefined,
  learnerId: string,
  now: number,
  ttlMs: number = ATTEMPT_TTL_MS,
): AttemptAccessResult {
  if (!found) return { ok: false, reason: "not_found" };
  if (found.learnerId !== learnerId) return { ok: false, reason: "not_found" };
  if (now - found.createdAt > ttlMs) return { ok: false, reason: "expired" };
  return { ok: true };
}

export function getPendingAttempt(
  attemptId: string,
  learnerId: string,
  store: Map<string, PendingCheckAttempt> = pendingAttempts,
  now: number = Date.now(),
): PendingCheckAttempt | null {
  const found = store.get(attemptId);
  const access = checkAttemptAccess(found, learnerId, now);
  if (!access.ok) {
    if (access.reason === "expired" && found) store.delete(attemptId);
    return null;
  }
  return found as PendingCheckAttempt;
}

export function consumePendingAttempt(attemptId: string, store: Map<string, PendingCheckAttempt> = pendingAttempts): void {
  store.delete(attemptId);
}

export function pruneExpiredAttempts(store: Map<string, PendingCheckAttempt> = pendingAttempts, now: number = Date.now()): number {
  let pruned = 0;
  store.forEach((attempt, id) => {
    if (now - attempt.createdAt > ATTEMPT_TTL_MS) {
      store.delete(id);
      pruned += 1;
    }
  });
  return pruned;
}

export type RevealResult =
  | { ok: true; attempt: PendingCheckAttempt; learnerConfidence: LearnerConfidence; sourcePrediction: string; predictionCorrect: boolean }
  | { ok: false; reason: "not_found" | "forcing_incomplete" };

export function revealPendingAttempt(
  attemptId: string,
  learnerId: string,
  learnerConfidenceRaw: unknown,
  sourcePredictionRaw: string,
  store: Map<string, PendingCheckAttempt> = pendingAttempts,
  now: number = Date.now(),
): RevealResult {
  const pending = getPendingAttempt(attemptId, learnerId, store, now);
  if (!pending) return { ok: false, reason: "not_found" };

  const result = finalizeReveal(pending, learnerConfidenceRaw, sourcePredictionRaw);
  if (result.ok) consumePendingAttempt(attemptId, store);
  return result;
}

export function finalizeReveal(pending: PendingCheckAttempt, learnerConfidenceRaw: unknown, sourcePredictionRaw: string): RevealResult {
  const sourcePrediction = sourcePredictionRaw.trim();
  if (!isValidLearnerConfidence(learnerConfidenceRaw) || !sourcePrediction) {
    return { ok: false, reason: "forcing_incomplete" };
  }
  return {
    ok: true,
    attempt: pending,
    learnerConfidence: learnerConfidenceRaw,
    sourcePrediction,
    predictionCorrect: computePredictionCorrect(sourcePrediction, pending.allowLabel),
  };
}
