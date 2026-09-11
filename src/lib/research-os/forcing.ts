/**
 * Research OS for K-12, cognitive forcing on the Check tool (bkt-ros,
 * `learning/research-os/PLAN-REVISION-2.md` section 2a, the design
 * response to Buçinca, Malaya and Gajos 2021, Bansal et al. 2021, and
 * Vaccaro, Almaatouq and Malone 2024).
 *
 * Buçinca 2021's own lab result: a cognitive forcing function, an
 * interface that requires a person to commit to their own answer before an
 * AI verdict is revealed, reduces over-reliance on a wrong AI answer more
 * than an explanation-only interface does, with a retention benefit that
 * outlasts the session. Bansal 2021 and Vaccaro 2024 complicate the
 * assumption that a Research OS production (a written claim with cited
 * evidence, closer to Vaccaro's content-creation task type than to a
 * decision task) gets a complementary gain from an AI explanation alone.
 * The design response: `POST /api/research-os/workspace` action "check"
 * grades the learner's explanation right away, but holds the verdict
 * server-side until the learner commits to (1) a confidence rating on
 * their OWN explanation and (2) a prediction of which quoted source it
 * rests on, matching Buçinca's own commit-before-reveal structure. The
 * route (`src/app/api/research-os/workspace/route.ts`) is the only caller;
 * this module holds the pure, unit-testable pieces:
 *
 *   - the 4-point confidence scale and its grade-4-reading-level copy,
 *     naming the field `learnerConfidence` per `learning/research-os/
 *     study/INSTRUMENTS.md` section 2 (this pass moves that item from
 *     after the verdict to before it; see that file's own updated text);
 *   - computePredictionCorrect, the code-level (never model-dependent)
 *     check of whether a source prediction matches the node's own single
 *     allowed citation label;
 *   - the arm switch (`RESEARCH_OS_FORCING_ENABLED` / a per-class
 *     override), so the three-arm pilot can run its comparison arm with
 *     forcing off;
 *   - a held-attempt store, one entry per ungraded-to-the-learner Check
 *     call, keyed by a server-generated attempt id. In-memory only, the
 *     same best-effort posture `src/lib/research-os/rate-limit.ts`
 *     documents for its own daily cap: a serverless cold start or a
 *     multi-instance deploy loses a pending attempt, and the learner sees
 *     the Check form again rather than a stuck page. A durable store (a
 *     `graph.pending_check_attempts` table, or the Viatika metering layer
 *     once that lands, CLAUDE.md priority 6) is Phase 2 work; this is the
 *     Phase 1 floor. Pure counting/store logic is exported with an
 *     injectable `Map` (rate-limit.ts's own pattern) so
 *     `scripts/test-research-os-forcing.ts` exercises it with no timers,
 *     network, or environment variables.
 */
import type { GradeResult } from "./grounding";
import type { Stage } from "./types";

// ---------------------------------------------------------------------------
// The 4-point confidence item
// ---------------------------------------------------------------------------

/** `learnerConfidence` on a "check" `EvidenceEvent` (stages.ts,
 * EVIDENCE-SCHEMA.md): a self-rating of the learner's OWN explanation,
 * collected before Check's verdict is shown, per PLAN-REVISION-2.md
 * section 2a's commit-before-reveal design. */
export const LEARNER_CONFIDENCE_VALUES = ["not_sure", "a_little", "fairly", "certain"] as const;
export type LearnerConfidence = (typeof LEARNER_CONFIDENCE_VALUES)[number];

export function isValidLearnerConfidence(value: unknown): value is LearnerConfidence {
  return typeof value === "string" && (LEARNER_CONFIDENCE_VALUES as readonly string[]).includes(value);
}

/** 1-4 ordinal score for the class-view calibration summary
 * (`src/lib/research-os/calibration.ts`). Not shown to a learner; a
 * reviewer-facing number only. */
export function learnerConfidenceScore(value: LearnerConfidence): number {
  return LEARNER_CONFIDENCE_VALUES.indexOf(value) + 1;
}

/** Grade-4-reading-level button copy for the pre-reveal confidence
 * question, shared by the workspace page so the wording lives in one
 * place. Short words, one idea each, matching this pass's own child-
 * facing-copy requirement. */
export const LEARNER_CONFIDENCE_COPY: Record<LearnerConfidence, string> = {
  not_sure: "not sure at all",
  a_little: "a little sure",
  fairly: "pretty sure",
  certain: "very sure",
};

export const CONFIDENCE_QUESTION_COPY = "How sure are you that what you wrote is right?";
export const SOURCE_PREDICTION_QUESTION_COPY = "Which source do you think backs up what you wrote?";

// ---------------------------------------------------------------------------
// Source prediction: correctness is computed in code, never asked of the
// model. A node's Check tool cites at most one label, the exact ALLOWED
// CITATION string grounding.ts's buildGrounding hands the model
// (citationLabel(node)); "which source does my claim rest on" has exactly
// one right answer, that same label, regardless of what the model cited
// this time.
// ---------------------------------------------------------------------------

export function computePredictionCorrect(sourcePrediction: string, allowLabel: string): boolean {
  return sourcePrediction.trim().length > 0 && sourcePrediction.trim() === allowLabel.trim();
}

// ---------------------------------------------------------------------------
// The arm switch
// ---------------------------------------------------------------------------

/** `RESEARCH_OS_FORCING_ENABLED` default: on unless explicitly "false" or
 * "0", matching this task's own "default on" instruction and
 * rate-limit.ts's "an unparseable value falls back to the default rather
 * than disabling silently" posture. */
export function envForcingDefault(): boolean {
  const raw = (process.env.RESEARCH_OS_FORCING_ENABLED || "").trim().toLowerCase();
  return raw !== "false" && raw !== "0";
}

/** A class-level override (`graph.classes.forcing_enabled`, migration
 * 20260910060000_research_os_forcing.sql) wins when set; `null`/`undefined`
 * (no override on file, or the lookup failed open, `db.ts`'s
 * `loadForcingEnabledForLearner`) defers to the env default. Split from
 * that lookup so this decision is unit-testable with no network call. */
export function resolveForcingEnabled(classOverride: boolean | null | undefined): boolean {
  return typeof classOverride === "boolean" ? classOverride : envForcingDefault();
}

// ---------------------------------------------------------------------------
// The held-attempt store
// ---------------------------------------------------------------------------

export interface PendingCheckAttempt {
  learnerId: string;
  nodeId: string;
  sessionId?: string;
  explanation: string;
  /** The node's own single allowed citation label (grounding.ts's
   * citationLabel), the correct answer computePredictionCorrect checks
   * a source prediction against. */
  allowLabel: string;
  grade: GradeResult;
  currentStage: Stage;
  forcingEnabled: boolean;
  createdAt: number;
}

/** An unrevealed attempt outlives at most one workspace sitting; 30
 * minutes is generous for a K-12 learner to rate their own confidence and
 * pick a source without feeling rushed, short enough that a forgotten tab
 * does not hold a graded-but-unrevealed verdict indefinitely. */
export const ATTEMPT_TTL_MS = 30 * 60 * 1000;

const pendingAttempts = new Map<string, PendingCheckAttempt>();

export function newAttemptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stores a freshly graded, not-yet-revealed attempt and returns its id.
 * `id`/`store` are injectable for tests; real callers pass neither. */
export function storePendingAttempt(
  attempt: PendingCheckAttempt,
  store: Map<string, PendingCheckAttempt> = pendingAttempts,
  id: string = newAttemptId(),
): string {
  store.set(id, attempt);
  return id;
}

/**
 * Read-only lookup: returns the attempt only when it exists, belongs to
 * `learnerId` (never another learner's held verdict), and has not expired.
 * Does NOT delete on a miss, so a caller can distinguish "not found" from
 * "found but the forcing fields are still missing" and let the learner
 * retry the same attempt. This is the function that makes "the feedback
 * cannot be fetched early" true: nothing in this module ever returns
 * `attempt.grade` to a caller that has not also supplied a valid
 * `learnerConfidence` and a non-empty `sourcePrediction` (the caller's
 * job, `workspace/route.ts`'s reveal branch).
 */
export function getPendingAttempt(
  attemptId: string,
  learnerId: string,
  store: Map<string, PendingCheckAttempt> = pendingAttempts,
  now: number = Date.now(),
): PendingCheckAttempt | null {
  const found = store.get(attemptId);
  if (!found) return null;
  if (found.learnerId !== learnerId) return null;
  if (now - found.createdAt > ATTEMPT_TTL_MS) {
    store.delete(attemptId);
    return null;
  }
  return found;
}

/** Single-use: called only once the forcing fields have been validated and
 * the verdict is about to be revealed, so a second reveal attempt on the
 * same id reads as "not found" rather than replaying the verdict. */
export function consumePendingAttempt(attemptId: string, store: Map<string, PendingCheckAttempt> = pendingAttempts): void {
  store.delete(attemptId);
}

/** Best-effort housekeeping against unbounded memory growth (the same
 * "in-memory, best effort" posture as rate-limit.ts's buckets). This is
 * hygiene alone: getPendingAttempt already refuses an expired entry on its
 * own. Returns the number of entries removed. */
export function pruneExpiredAttempts(store: Map<string, PendingCheckAttempt> = pendingAttempts, now: number = Date.now()): number {
  let pruned = 0;
  // .forEach rather than for-of: this repo's tsconfig has no explicit
  // `target`, so plain Map iteration needs --downlevelIteration (TS2802).
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

/**
 * The single gate `workspace/route.ts`'s "check" phase 2 calls: the exact
 * enforcement of "the Check response omits feedback until the forcing
 * record exists for that attempt." Centralized here, rather than left
 * inline in the route, so `scripts/test-research-os-forcing.ts` exercises
 * the SAME code the route runs, the same "extract the pure gate, test it
 * directly" pattern `sanitizeGradeResult` and `groundOrganizeResult`
 * already use.
 *
 * `{ ok: false, reason: "forcing_incomplete" }` never carries `attempt`:
 * nothing this function returns on that path lets a caller read
 * `attempt.grade`, and the attempt is left in the store untouched so a
 * caller can retry with the missing field. `{ ok: true }` is the only
 * outcome that consumes the attempt (single-use) and computes
 * `predictionCorrect`; a second call with the same `attemptId` after that
 * gets `not_found`, never a replayed verdict.
 */
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

  const sourcePrediction = sourcePredictionRaw.trim();
  if (!isValidLearnerConfidence(learnerConfidenceRaw) || !sourcePrediction) {
    return { ok: false, reason: "forcing_incomplete" };
  }

  consumePendingAttempt(attemptId, store);
  return {
    ok: true,
    attempt: pending,
    learnerConfidence: learnerConfidenceRaw,
    sourcePrediction,
    predictionCorrect: computePredictionCorrect(sourcePrediction, pending.allowLabel),
  };
}
