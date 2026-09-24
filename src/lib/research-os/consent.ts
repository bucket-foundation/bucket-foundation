import { graphService } from "./db";
import { effectiveConsent, type ClassConsent, type ConsentRequestRecord, type EffectiveConsent } from "./consent-paths";

export type LearnerRole = "student" | "teacher" | "independent";
export type BirthYearBucket = "under13" | "13to17" | "18plus";
export type ConsentStatus = "none" | "school" | "parent" | "self";

export interface LearnerProfile {
  learnerId: string;
  role: LearnerRole;
  birthYearBucket: BirthYearBucket | null;
  consentStatus: ConsentStatus;
  consentSource: string | null;
  updatedAt: string;
}

export type ConsentAction = "workspace_tool" | "probe_answer" | "transfer_answer" | "production_submit" | "search_standing" | "learn_event";

export interface ConsentCheckResult {
  allowed: boolean;
  reason?: "no_profile" | "consent_required" | "unavailable";
  message?: string;
}

const NO_PROFILE_MESSAGE =
  "This account has not completed the age check yet. Ask a teacher or parent to complete it before using this feature.";
const CONSENT_REQUIRED_MESSAGE =
  "This feature needs parent or school consent on file before a learner under 18 can use it. Ask a teacher or parent to complete consent.";
const UNAVAILABLE_MESSAGE = "Consent could not be checked right now. Try again in a moment.";

export function decideConsent(profile: LearnerProfile | null, _action: ConsentAction): ConsentCheckResult {
  if (!profile) {
    return { allowed: false, reason: "no_profile", message: NO_PROFILE_MESSAGE };
  }
  if (profile.birthYearBucket === "18plus") {
    return { allowed: true };
  }
  const isMinorBucket = profile.birthYearBucket === "under13" || profile.birthYearBucket === "13to17";
  if (isMinorBucket && profile.consentStatus === "none") {
    return { allowed: false, reason: "consent_required", message: CONSENT_REQUIRED_MESSAGE };
  }
  return { allowed: true };
}

interface LearnerProfileRow {
  learner_id: string;
  role: string;
  birth_year_bucket: string | null;
  consent_status: string;
  consent_source: string | null;
  updated_at: string;
}

function toLearnerProfile(r: LearnerProfileRow): LearnerProfile {
  return {
    learnerId: r.learner_id,
    role: r.role as LearnerRole,
    birthYearBucket: (r.birth_year_bucket as BirthYearBucket | null) ?? null,
    consentStatus: r.consent_status as ConsentStatus,
    consentSource: r.consent_source,
    updatedAt: r.updated_at,
  };
}

export type ConsentPathResolver = (learnerId: string, profile: LearnerProfile) => Promise<EffectiveConsent>;
export type ConsentWriteThrough = (learnerId: string, effective: EffectiveConsent) => Promise<void>;

const writeConsentThrough: ConsentWriteThrough = async (learnerId, effective) => {
  await graphService()
    .from("learner_profiles")
    .update({ consent_status: effective.status, consent_source: effective.source, updated_at: new Date().toISOString() })
    .eq("learner_id", learnerId);
};

export async function decideWithPaths(
  learnerId: string,
  profile: LearnerProfile,
  action: ConsentAction,
  resolve: ConsentPathResolver = resolveConsentPaths,
  writeThrough: ConsentWriteThrough = writeConsentThrough,
): Promise<ConsentCheckResult> {
  const first = decideConsent(profile, action);
  if (first.allowed || first.reason !== "consent_required") return first;

  let effective: EffectiveConsent;
  try {
    effective = await resolve(learnerId, profile);
  } catch (err) {
    console.error("[research-os/consent] consent paths unavailable:", err instanceof Error ? err.message : err);
    return { allowed: false, reason: "unavailable", message: UNAVAILABLE_MESSAGE };
  }
  if (effective.status === "none") return first;
  await writeThrough(learnerId, effective);
  return decideConsent({ ...profile, consentStatus: effective.status, consentSource: effective.source }, action);
}

export async function readLearnerProfile(learnerId: string): Promise<LearnerProfile | null> {
  const { data, error } = await graphService().from("learner_profiles").select("*").eq("learner_id", learnerId).maybeSingle();
  if (error) throw new Error(`readLearnerProfile: learner_profiles read failed: ${error.message}`);
  return data ? toLearnerProfile(data as LearnerProfileRow) : null;
}

export async function requireConsent(learnerId: string, action: ConsentAction): Promise<ConsentCheckResult> {
  const { data, error } = await graphService().from("learner_profiles").select("*").eq("learner_id", learnerId).maybeSingle();
  if (error) {
    console.error("[research-os/consent] learner_profiles read failed:", error.message);
    return { allowed: false, reason: "unavailable", message: UNAVAILABLE_MESSAGE };
  }
  if (!data) return decideConsent(null, action);
  return decideWithPaths(learnerId, toLearnerProfile(data as LearnerProfileRow), action);
}

export async function resolveConsentPaths(learnerId: string, profile: LearnerProfile): Promise<EffectiveConsent> {
  const svc = graphService();
  const { data: members, error: membersErr } = await svc.from("class_members").select("class_id,role").eq("learner_id", learnerId);
  if (membersErr) throw new Error(`resolveConsentPaths: class_members read failed: ${membersErr.message}`);
  const memberships = ((members as { class_id: string; role: string | null }[]) || []).map((m) => ({ classId: m.class_id, role: m.role || "learner" }));
  const classIds = memberships.map((m) => m.classId);
  const classes: ClassConsent[] = [];
  if (classIds.length) {
    const { data: rows, error: rowsErr } = await svc.from("classes").select("id,consent_basis,consent_document").in("id", classIds);
    if (rowsErr) throw new Error(`resolveConsentPaths: classes read failed: ${rowsErr.message}`);
    for (const c of (rows as { id: string; consent_basis: string | null; consent_document: string | null }[]) || []) {
      classes.push({ classId: c.id, consentBasis: c.consent_basis === "school" ? "school" : "none", consentDocument: c.consent_document });
    }
  }
  const { data: reqs, error: reqsErr } = await svc.from("consent_requests").select("vendor,status,vendor_ref").eq("learner_id", learnerId);
  if (reqsErr) throw new Error(`resolveConsentPaths: consent_requests read failed: ${reqsErr.message}`);
  const requests: ConsentRequestRecord[] = ((reqs as { vendor: ConsentRequestRecord["vendor"]; status: ConsentRequestRecord["status"]; vendor_ref: string | null }[]) || []).map((r) => ({
    vendor: r.vendor,
    status: r.status,
    vendorRef: r.vendor_ref,
  }));
  return effectiveConsent(profile, memberships, classes, requests);
}

export interface ConsentBlockedBody {
  error: "no_profile" | "consent_required";
  message: string;
  needsProfile: boolean;
}

export function consentBlockedBody(result: ConsentCheckResult): ConsentBlockedBody {
  if (result.allowed || !result.reason) {
    throw new Error("consentBlockedBody: called with an allowed ConsentCheckResult");
  }
  if (result.reason === "unavailable") {
    throw new Error("consentBlockedBody: 'unavailable' is a 503, use consentRefusal");
  }
  return { error: result.reason, message: result.message ?? "", needsProfile: result.reason === "no_profile" };
}

export function consentRefusal(result: ConsentCheckResult): { status: 403 | 503; body: ConsentBlockedBody | { error: "consent_unavailable"; message: string } } {
  if (result.reason === "unavailable") {
    return { status: 503, body: { error: "consent_unavailable", message: result.message ?? UNAVAILABLE_MESSAGE } };
  }
  return { status: 403, body: consentBlockedBody(result) };
}
