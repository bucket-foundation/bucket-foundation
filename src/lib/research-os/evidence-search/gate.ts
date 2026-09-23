import type { SupabaseClient } from "@supabase/supabase-js";
import type { BirthYearBucket } from "../consent";

export interface GateInput {
  flagOn: boolean;
  pilotIds: string[];
  learnerId: string | null;
  consentAllowed: boolean;
  birthYearBucket: BirthYearBucket | null;
}

export type GateDecision =
  | { ok: true }
  | { ok: false; status: 404 | 401 | 403; error: "feature_off" | "no_session" | "consent_required" | "adults_only" | "not_in_pilot"; message: string };

export function decideGate(input: GateInput): GateDecision {
  if (!input.flagOn) return { ok: false, status: 404, error: "feature_off", message: "Evidence search is off." };
  if (!input.learnerId) return { ok: false, status: 401, error: "no_session", message: "Sign in to search public evidence." };
  if (!input.consentAllowed) return { ok: false, status: 403, error: "consent_required", message: "Answer the consent questions on your profile first." };
  if (input.birthYearBucket !== "18plus") {
    return { ok: false, status: 403, error: "adults_only", message: "The evidence search pilot runs with adult accounts while it is measured." };
  }
  if (!input.pilotIds.includes(input.learnerId)) {
    return { ok: false, status: 403, error: "not_in_pilot", message: "This account is outside the evidence search pilot." };
  }
  return { ok: true };
}

export function pilotIds(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function flagOn(raw: string | undefined): boolean {
  return raw === "1" || raw === "true";
}

export class ProfileUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileUnavailable";
    Object.setPrototypeOf(this, ProfileUnavailable.prototype);
  }
}

export async function readBirthYearBucket(svc: SupabaseClient, learnerId: string): Promise<BirthYearBucket | null> {
  const { data, error } = await svc.from("learner_profiles").select("birth_year_bucket").eq("learner_id", learnerId).maybeSingle();
  if (error) throw new ProfileUnavailable(error.message);
  const band = (data as { birth_year_bucket?: unknown } | null)?.birth_year_bucket;
  return band === "under13" || band === "13to17" || band === "18plus" ? band : null;
}
