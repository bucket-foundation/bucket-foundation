/**
 * Research OS for K-12, the second-source requirement on Check (bkt-ros,
 * `learning/research-os/PLAN-REVISION-3.md` section 2c, "Lateral reading
 * against a single-source Check," STRONG LEAN). Wineburg and McGrew
 * (2019) found expert fact checkers leave the page to cross-reference a
 * claim against an independent source before judging it, the strategy
 * the paper names lateral reading, while non-experts stay on one page and
 * are misled by superficial cues; Breakstone and colleagues (2021) put a
 * number on that gap at national scale, 3,446 US high school students, 96
 * percent of whom never learned a site had an undisclosed conflict of
 * interest. Check (`grounding.ts`'s gradeExplanation) verifies a claim
 * against the node's own summary, a single, in-workspace source; nothing
 * in that contract corroborates it against an independent second one.
 *
 * The design response: at Understanding tier and above, revealing a held
 * Check verdict (`forcing.ts`'s two-phase commit, `workspace/route.ts`'s
 * "check" phase 2) additionally requires the learner to attach a second
 * Quote from a source `locate.ts`'s assessSourceIndependence judges
 * independent of the node under Check. At Awareness tier a single source
 * still suffices, matching the existing forcing gate's own tier-agnostic
 * floor: lateral reading is asked of a learner old enough in this node's
 * own progress to have something to corroborate. `checkSecondSourceGate`
 * below is the pure, unit-testable decision (the same "extract the pure
 * gate, test it directly" pattern `forcing.ts`'s finalizeReveal and
 * `grounding.ts`'s sanitizeGradeResult already use); the route wiring
 * that calls it, and the corroboration record it gates on
 * (`stages.ts`'s onCorroborationRecorded), are the route/page work this
 * bead's own task description holds back until PR #74 (workspace page
 * and Check route) merges. See `learning/research-os/LATERAL-READING.md`.
 *
 * The AI never supplies the missing second source or writes the
 * corroboration verdict: SECOND_SOURCE_MISSING_MESSAGE below is a fixed,
 * code-level string, never model output, matching the tutor's own S7
 * floor extended to this gate -- the tutor's feedback may NAME that a
 * second source is missing, it never picks or writes one on the
 * learner's behalf.
 */
import type { Stage } from "./types";
import { stageAtLeast } from "./types";

// ---------------------------------------------------------------------------
// The per-class arm switch, the same pattern forcing.ts's
// envForcingDefault/resolveForcingEnabled already establish.
// ---------------------------------------------------------------------------

/** `RESEARCH_OS_SECOND_SOURCE_REQUIRED` default: on unless explicitly
 * "false" or "0", matching this task's own "default on" instruction and
 * forcing.ts's envForcingDefault posture (an unparseable value falls back
 * to the default rather than disabling silently). */
export function envSecondSourceRequiredDefault(): boolean {
  const raw = (process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED || "").trim().toLowerCase();
  return raw !== "false" && raw !== "0";
}

/** A class-level override (`graph.classes.second_source_required`,
 * migration 20260910080000_research_os_lateral_reading.sql) wins when
 * set; `null`/`undefined` (no override on file, or the lookup failed
 * open, db.ts's loadSecondSourceRequiredForLearner) defers to the env
 * default. Split from that lookup so this decision is unit-testable with
 * no network call, the same split forcing.ts's resolveForcingEnabled
 * already keeps from db.ts's loadForcingEnabledForLearner. */
export function resolveSecondSourceRequired(classOverride: boolean | null | undefined): boolean {
  return typeof classOverride === "boolean" ? classOverride : envSecondSourceRequiredDefault();
}

/** True only once the switch above is on AND the learner's own stage, at
 * the moment of this Check attempt, has already reached Understanding
 * (`STAGE_ORDER`'s third stage): "at Awareness tier a single source
 * suffices," this task's own rule. A learner still at Access or Awareness
 * gets the pre-existing single-source Check contract unchanged. */
export function secondSourceRequiredAtStage(stage: Stage, enabled: boolean): boolean {
  return enabled && stageAtLeast(stage, "understanding");
}

// ---------------------------------------------------------------------------
// Grade-4-reading-level copy (task item 4), one clause each, matching
// forcing.ts's own LEARNER_CONFIDENCE_COPY/CONFIDENCE_QUESTION_COPY
// convention.
// ---------------------------------------------------------------------------

export const SECOND_SOURCE_QUESTION_COPY = "Find a second place that says this.";
export const SECOND_SOURCE_AGREE_QUESTION_COPY = "Do the two sources agree?";

/** Fixed, code-level feedback the Check response carries when the second-
 * source requirement blocks a reveal: it NAMES that a source is missing,
 * it never supplies one (this file's own header). Never model output. */
export const SECOND_SOURCE_MISSING_MESSAGE =
  "Find a second, independent source and quote it before you can see your results.";

// ---------------------------------------------------------------------------
// The gate: whether a held Check attempt's reveal may proceed, given
// whether a second source is required at this stage and, if so, whether
// a real, independent, quoted second source has been attached.
// ---------------------------------------------------------------------------

export interface SecondSourceGateInput {
  /** resolveSecondSourceRequired's own output for this learner's class. */
  required: boolean;
  /** The attempt's own currentStage (forcing.ts's PendingCheckAttempt.currentStage). */
  stage: Stage;
  /** The node id of a second source the learner is attaching at reveal
   * time, or undefined/empty when none was supplied. */
  secondSourceNodeId?: string;
  /** True only when this learner holds a real "quote" evidence event
   * (stages.ts's onQuoteReturned, db.ts's loadLearnerQuoteEvidence) for
   * secondSourceNodeId -- a node id alone, with no real Quote call behind
   * it, never satisfies this gate; the client cannot self-report its way
   * past a Quote it never made. */
  secondSourceWasQuoted: boolean;
  /** True only when locate.ts's assessSourceIndependence judged
   * secondSourceNodeId's own provenance independent of the node under
   * Check's provenance, computed server-side against real provenance
   * fields, never trusted from the client. */
  secondSourceIndependent: boolean;
}

export type SecondSourceGateResult =
  | { ok: true; secondSourceRequired: boolean }
  | { ok: false; reason: "second_source_required"; message: typeof SECOND_SOURCE_MISSING_MESSAGE };

/**
 * The single decision `workspace/route.ts`'s Check phase 2 (reveal) calls
 * on top of forcing.ts's own finalizeReveal, once the deferred route
 * wiring lands: a reveal is refused, with SECOND_SOURCE_MISSING_MESSAGE
 * as the only feedback, unless the requirement is off, the stage is below
 * Understanding, or a real, independently-assessed second Quote has been
 * attached to THIS attempt. Pure, no I/O: every fact this function needs
 * (whether a Quote call happened, whether the two sources are
 * independent) is resolved by its caller first, the same separation
 * forcing.ts's checkAttemptAccess keeps from the store that calls it.
 */
export function checkSecondSourceGate(input: SecondSourceGateInput): SecondSourceGateResult {
  const need = secondSourceRequiredAtStage(input.stage, input.required);
  if (!need) return { ok: true, secondSourceRequired: false };
  const satisfied = Boolean(input.secondSourceNodeId) && input.secondSourceWasQuoted && input.secondSourceIndependent;
  if (satisfied) return { ok: true, secondSourceRequired: true };
  return { ok: false, reason: "second_source_required", message: SECOND_SOURCE_MISSING_MESSAGE };
}
