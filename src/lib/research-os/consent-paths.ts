/**
 * Research OS, the under-13 gates and the guardian payee (ros-32). Pure
 * rules, no I/O. consent.ts's decideConsent stays the gate; this file
 * decides what consent a learner has from the paths the plan names, and
 * whether a payment can go out.
 *
 * Paths, in order of precedence:
 *   1. 18plus: no consent needed (decideConsent already allows).
 *   2. School exception: a rostered learner (role 'learner') in a class
 *      whose consent_basis is 'school' reads as consent 'school'.
 *   3. Vendor consent: a verified consent request (PRIVO, k-ID) or a
 *      manually recorded one reads as consent 'parent'.
 *   4. 13to17 with none of the above: consent required (unchanged).
 */
import type { BirthYearBucket, ConsentStatus, LearnerProfile } from "./consent";

export interface ClassConsent {
  classId: string;
  consentBasis: "none" | "school";
  consentDocument: string | null;
}

export interface ConsentRequestRecord {
  vendor: "privo" | "kid" | "manual";
  status: "pending" | "verified" | "declined";
  vendorRef?: string | null;
}

export interface EffectiveConsent {
  status: ConsentStatus;
  source: string | null;
  /** Which path produced it. */
  path: "adult" | "profile" | "school" | "vendor" | "none";
}

export function effectiveConsent(
  profile: Pick<LearnerProfile, "birthYearBucket" | "consentStatus" | "consentSource"> | null,
  memberships: { classId: string; role: string }[],
  classes: ClassConsent[],
  requests: ConsentRequestRecord[]
): EffectiveConsent {
  if (!profile) return { status: "none", source: null, path: "none" };
  if (profile.birthYearBucket === "18plus") return { status: "self", source: "adult", path: "adult" };
  if (profile.consentStatus !== "none") return { status: profile.consentStatus, source: profile.consentSource, path: "profile" };
  const byId = new Map(classes.map((c) => [c.classId, c]));
  for (const m of memberships) {
    if (m.role !== "learner") continue;
    const c = byId.get(m.classId);
    if (c && c.consentBasis === "school") {
      return { status: "school", source: c.consentDocument ? `school exception: ${c.consentDocument}` : "school exception", path: "school" };
    }
  }
  const verified = requests.find((r) => r.status === "verified");
  if (verified) {
    const ref = verified.vendorRef ? ` ${verified.vendorRef}` : "";
    return { status: "parent", source: `${verified.vendor}${ref}`, path: "vendor" };
  }
  return { status: "none", source: null, path: "none" };
}

/** Which vendor path applies: under-13 needs verified parental consent
 * unless the school exception covers them; 13 to 17 may use the school
 * path or a recorded parent consent. */
export function consentPathFor(bucket: BirthYearBucket | null, schoolCovered: boolean): "none_needed" | "school" | "vendor" | "ask_age" {
  if (bucket === null) return "ask_age";
  if (bucket === "18plus") return "none_needed";
  if (schoolCovered) return "school";
  return "vendor";
}

export type PayeeType = "self" | "guardian" | "custodial";

export interface PayeeProfile {
  birthYearBucket: BirthYearBucket | null;
  payeeType: PayeeType | null;
  guardianContactHash: string | null;
}

export type PayeeDecision = { ok: true; payee: PayeeType } | { ok: false; reason: "age_unknown" | "guardian_required" | "guardian_contact_required" };

/** Whether a payment may go out, and to whom. Minors are paid through a
 * guardian or a custodial account only; a guardian payee needs a contact
 * on file so every payment is visible to them. */
export function payeeFor(p: PayeeProfile): PayeeDecision {
  if (p.birthYearBucket === null) return { ok: false, reason: "age_unknown" };
  if (p.birthYearBucket === "18plus") return { ok: true, payee: p.payeeType ?? "self" };
  if (p.payeeType !== "guardian" && p.payeeType !== "custodial") return { ok: false, reason: "guardian_required" };
  if (p.payeeType === "guardian" && !p.guardianContactHash) return { ok: false, reason: "guardian_contact_required" };
  return { ok: true, payee: p.payeeType };
}

/** A stable, salted hash for a guardian contact; the contact itself is never stored. */
export async function hashContact(contact: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${contact.trim().toLowerCase()}`);
  const digest = await (globalThis.crypto as Crypto).subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
