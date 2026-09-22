/**
 * Who may reach evidence search while it is a development pilot
 * (ros-ai-find, IMPLEMENTATION.md, "Authorization boundary").
 *
 * Four conditions, each checked on the server: the feature flag is on,
 * the caller has a session, consent covers the workspace tools, the
 * profile says `18plus`, and the user id is on the server-side pilot
 * list. A reviewer or staff role grants nothing here, and a consented
 * minor or an unanswered age question fails. Age is self-reported and
 * serves as an operational filter; a child-facing launch needs its own
 * age assurance.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BirthYearBucket } from "../consent";

export interface GateInput {
  flagOn: boolean;
  /** The ids RESEARCH_OS_AI_SEARCH_PILOT_IDS names, as the server reads them. */
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

/** The pilot list from its environment variable: ids separated by commas or spaces. */
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

/**
 * The learner's age band, or null when they have answered no age question.
 * A failed read raises: an unreadable profile is an outage, and answering
 * it as "no band" would read to the learner as a refusal they cannot fix.
 */
export async function readBirthYearBucket(svc: SupabaseClient, learnerId: string): Promise<BirthYearBucket | null> {
  const { data, error } = await svc.from("learner_profiles").select("birth_year_bucket").eq("learner_id", learnerId).maybeSingle();
  if (error) throw new ProfileUnavailable(error.message);
  const band = (data as { birth_year_bucket?: unknown } | null)?.birth_year_bucket;
  return band === "under13" || band === "13to17" || band === "18plus" ? band : null;
}
