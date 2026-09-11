/**
 * Persisted held-attempt store for Check cognitive forcing (bkt-ros,
 * `graph.check_attempts`, migration
 * 20260910070000_research_os_check_attempts.sql). This is what
 * `src/app/api/research-os/workspace/route.ts`'s "check" action calls in
 * production, replacing forcing.ts's in-memory `Map`: a Vercel
 * deploy invokes each route call on whichever instance is warm, so a
 * phase-1 Check and its phase-2 reveal landing on two different instances
 * would lose the held verdict against a bare `Map`, and the learner would
 * see the Check form again with no explanation. See forcing.ts's own
 * module header for the full story and why the `Map` store stays, as the
 * test double `scripts/test-research-os-forcing.ts` exercises directly.
 *
 * Ownership, TTL, and reveal-completeness are NOT re-implemented here:
 * this module calls forcing.ts's `checkAttemptAccess` and `finalizeReveal`
 * directly, the same pure decision functions the in-memory store's
 * `getPendingAttempt`/`revealPendingAttempt` call, so the two stores can
 * never disagree on what "held" or "revealed" means. On top of the
 * 30-minute `ATTEMPT_TTL_MS` commit window `checkAttemptAccess` already
 * enforces, this store adds a second, outer 24-hour hard expiry
 * (`HARD_EXPIRY_MS`): `dbGetPendingAttempt` refuses a row past it even if
 * the sweep below has not yet run, and
 * `graph.purge_expired_check_attempts()` (called from the privacy delete
 * path, `src/lib/research-os/privacy.ts`'s `deleteLearnerData`) is what
 * removes the row rather than leaving it to accumulate.
 *
 * TESTING NOTE (matches privacy.ts's own convention, read before changing
 * this file): this repo has no live-database test harness. The functions
 * below that touch Supabase (dbStorePendingAttempt, dbGetPendingAttempt,
 * dbConsumePendingAttempt, dbRevealPendingAttempt, dbPurgeExpiredAttempts)
 * go untested directly here; every non-trivial decision inside them is
 * factored into pure functions instead, which ARE tested
 * (scripts/test-research-os-check-attempts.ts): mapCheckAttemptRow (row ->
 * PendingCheckAttempt) and isPastHardExpiry (the 24-hour check), plus
 * forcing.ts's own checkAttemptAccess/finalizeReveal this module reuses.
 */
import { graphService } from "./db";
import { checkAttemptAccess, finalizeReveal, ATTEMPT_TTL_MS, type PendingCheckAttempt, type RevealResult } from "./forcing";
import type { GradeResult } from "./grounding";
import type { Stage } from "./types";

/** The outer bound: a held attempt is never revealed, and is removed by
 * the next purge sweep, once it is this old, regardless of the 30-minute
 * commit-window TTL above. See this file's header. */
export const HARD_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface CheckAttemptRow {
  id: string;
  learner_id: string;
  node_id: string;
  session_id: string | null;
  explanation: string;
  allow_label: string;
  grade: GradeResult;
  current_stage: string;
  forcing_enabled: boolean;
  created_at: string;
}

/** Row -> PendingCheckAttempt, the same shape forcing.ts's Map store holds
 * in memory, so checkAttemptAccess/finalizeReveal work identically against
 * either store. Pure, tested directly. */
export function mapCheckAttemptRow(row: CheckAttemptRow): PendingCheckAttempt {
  return {
    learnerId: row.learner_id,
    nodeId: row.node_id,
    sessionId: row.session_id ?? undefined,
    explanation: row.explanation,
    allowLabel: row.allow_label,
    grade: row.grade,
    currentStage: row.current_stage as Stage,
    forcingEnabled: row.forcing_enabled,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** True once `createdAtIso` is more than HARD_EXPIRY_MS in the past. Pure,
 * tested directly; the one decision dbGetPendingAttempt makes before
 * handing a row to checkAttemptAccess. */
export function isPastHardExpiry(createdAtIso: string, now: number): boolean {
  return now - new Date(createdAtIso).getTime() > HARD_EXPIRY_MS;
}

/** Stores a freshly graded, not-yet-revealed attempt and returns its id. */
export async function dbStorePendingAttempt(attempt: PendingCheckAttempt): Promise<string> {
  const svc = graphService();
  const { data, error } = await svc
    .from("check_attempts")
    .insert({
      learner_id: attempt.learnerId,
      node_id: attempt.nodeId,
      session_id: attempt.sessionId ?? null,
      explanation: attempt.explanation,
      allow_label: attempt.allowLabel,
      grade: attempt.grade,
      current_stage: attempt.currentStage,
      forcing_enabled: attempt.forcingEnabled,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`dbStorePendingAttempt: insert failed: ${error?.message ?? "no row returned"}`);
  return (data as { id: string }).id;
}

/** Read-only lookup mirroring forcing.ts's getPendingAttempt against the
 * persisted table: returns the attempt only when it exists, belongs to
 * `learnerId`, is within the 30-minute commit window, AND within the
 * 24-hour hard expiry. Never deletes; a caller distinguishes "not found"
 * the same way the in-memory store's callers already do. */
export async function dbGetPendingAttempt(attemptId: string, learnerId: string, now: number = Date.now()): Promise<PendingCheckAttempt | null> {
  if (!attemptId) return null;
  const svc = graphService();
  const { data, error } = await svc.from("check_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (error || !data) return null;
  const row = data as CheckAttemptRow;
  if (isPastHardExpiry(row.created_at, now)) return null;
  const pending = mapCheckAttemptRow(row);
  const access = checkAttemptAccess(pending, learnerId, now, ATTEMPT_TTL_MS);
  return access.ok ? pending : null;
}

/** Single-use: deletes the row so a second reveal attempt on the same id
 * reads as "not found" rather than replaying the verdict, matching
 * forcing.ts's consumePendingAttempt. */
export async function dbConsumePendingAttempt(attemptId: string): Promise<void> {
  const svc = graphService();
  await svc.from("check_attempts").delete().eq("id", attemptId);
}

/** The persisted twin of forcing.ts's revealPendingAttempt: same contract,
 * same RevealResult shape, driven by the same finalizeReveal gate. */
export async function dbRevealPendingAttempt(
  attemptId: string,
  learnerId: string,
  learnerConfidenceRaw: unknown,
  sourcePredictionRaw: string,
  now: number = Date.now(),
): Promise<RevealResult> {
  const pending = await dbGetPendingAttempt(attemptId, learnerId, now);
  if (!pending) return { ok: false, reason: "not_found" };
  const result = finalizeReveal(pending, learnerConfidenceRaw, sourcePredictionRaw);
  if (result.ok) await dbConsumePendingAttempt(attemptId);
  return result;
}

/** Best-effort hygiene: deletes every check_attempts row past the 24-hour
 * hard expiry, across every learner, by calling the same
 * graph.purge_expired_check_attempts() RPC that
 * graph.privacy_delete_learner already runs, inside its own transaction,
 * on every delete request (migration 20260910070000's own header explains
 * why that path carries the sweep, this repo has no cron infra). This
 * wrapper exists so a future caller, a maintenance script or a scheduled
 * job once one exists, can trigger the same sweep directly without going
 * through a delete request. Never throws: hygiene must not be able to
 * fail the request that triggered it. */
export async function dbPurgeExpiredAttempts(): Promise<number> {
  try {
    const svc = graphService();
    const { data, error } = await svc.rpc("purge_expired_check_attempts");
    if (error) return 0;
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}
