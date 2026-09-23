import { graphService } from "./db";
import { checkAttemptAccess, finalizeReveal, ATTEMPT_TTL_MS, type PendingCheckAttempt, type RevealResult } from "./forcing";
import type { GradeResult } from "./grounding";
import type { Stage } from "./types";

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

export function isPastHardExpiry(createdAtIso: string, now: number): boolean {
  return now - new Date(createdAtIso).getTime() > HARD_EXPIRY_MS;
}

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

export async function dbConsumePendingAttempt(attemptId: string): Promise<void> {
  const svc = graphService();
  await svc.from("check_attempts").delete().eq("id", attemptId);
}

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
