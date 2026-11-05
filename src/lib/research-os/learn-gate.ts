import { graphService } from "./db";
import type { BirthYearBucket } from "./consent";

export type LearnWriteRefusal = "no_profile" | "minor_read_only" | "needs_parent";

export type LearnWriteDecision = { allowed: true } | { allowed: false; reason: LearnWriteRefusal; message: string };

export const LEARN_WRITE_MESSAGES: Record<LearnWriteRefusal, string> = {
  no_profile: "Choose your age range before Learn saves progress to your account.",
  minor_read_only: "Progress for this account stays on this device.",
  needs_parent: "Enter a parent's email. Your progress saves once they approve.",
};

export function decideLearnWrite(band: BirthYearBucket | null, consent: string | null = null): LearnWriteDecision {
  if (band === "18plus" || band === "13to17") return { allowed: true };
  if (band === "under13" && consent === "parent") return { allowed: true };
  const reason: LearnWriteRefusal = band === "under13" ? "needs_parent" : "no_profile";
  return { allowed: false, reason, message: LEARN_WRITE_MESSAGES[reason] };
}

const RANK: Record<BirthYearBucket, number> = { under13: 0, "13to17": 1, "18plus": 2 };

export function bandChangeAllowed(current: BirthYearBucket | null, next: BirthYearBucket): boolean {
  if (current === null || current === next) return true;
  if (current === "under13") return false;
  if (current === "13to17") return RANK[next] < RANK[current];
  return true;
}

export const AGE_BAND_LOCKED_MESSAGE = "Your age range is set. Contact Bucket to change it.";

export async function readAgeBand(learnerId: string): Promise<{ ok: true; band: BirthYearBucket | null; consent?: string | null } | { ok: false }> {
  const { data, error } = await graphService().from("learner_profiles").select("birth_year_bucket,consent_status").eq("learner_id", learnerId).maybeSingle();
  if (error) return { ok: false };
  const row = data as { birth_year_bucket: string | null; consent_status: string | null } | null;
  const band = row?.birth_year_bucket ?? null;
  return { ok: true, band: band === "under13" || band === "13to17" || band === "18plus" ? band : null, consent: row?.consent_status ?? null };
}
