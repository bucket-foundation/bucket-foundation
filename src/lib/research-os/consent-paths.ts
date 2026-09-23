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

export function payeeFor(p: PayeeProfile): PayeeDecision {
  if (p.birthYearBucket === null) return { ok: false, reason: "age_unknown" };
  if (p.birthYearBucket === "18plus") return { ok: true, payee: p.payeeType ?? "self" };
  if (p.payeeType !== "guardian" && p.payeeType !== "custodial") return { ok: false, reason: "guardian_required" };
  if (p.payeeType === "guardian" && !p.guardianContactHash) return { ok: false, reason: "guardian_contact_required" };
  return { ok: true, payee: p.payeeType };
}

export async function hashContact(contact: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${contact.trim().toLowerCase()}`);
  const digest = await (globalThis.crypto as Crypto).subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
