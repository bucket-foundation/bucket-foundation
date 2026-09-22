/**
 * Research OS for K-12, the age and consent gate (bkt-ros ros-07, minors
 * compliance pack part A, task item 3; wired to its call sites by the
 * ros-07 follow-up, "consent gate wiring"). Backs graph.learner_profiles
 * (supabase/migrations/20260910040000_research_os_privacy_consent.sql).
 *
 * WHY THIS EXISTS: _intake/research-os-k12/04-compliance-distribution.md
 * section 1 states COPPA's floor plainly: verifiable parental consent
 * (VPC) before collecting personal information from a known under-13 user.
 * Section 3's "practical design implication" extends the same floor to
 * under-18 users in India and treats it as the strictest practical line
 * among the jurisdictions researched there. The code-side enforcement
 * point for that floor is a single function, called before any write path
 * collects or acts on a minor's workspace input.
 *
 * SCOPE, per PLAN-REVISION-1.md section 3 item 8 ("ros-07: scope depends
 * on the Phase 0 front-door decision, which is still open, so build only
 * the decision-independent part"): this file does not pick or integrate a
 * verified-parental-consent VENDOR (that choice is downstream of the
 * sky-blue vs quantum-history front-door decision, and of section 13's
 * "buy the verification mechanism, do not build novel age-verification
 * technology" recommendation). What IS decision-independent, and is what
 * this file builds, is the SHAPE of the gate: a role, an age bucket, a
 * consent status, and the rule that ties them to a blocked or allowed
 * outcome. Swapping in a real VPC vendor later changes how consent_status
 * transitions from 'none' to 'parent'; this file's decision rule stays the
 * same either way.
 *
 * WIRED, four call sites, each right after its route's existing
 * verifyLearner() check and before the write it guards:
 *   - src/app/api/research-os/workspace/route.ts POST (action "workspace_tool"),
 *     in front of the whole handler, so an unconsented minor gets the same
 *     block on Locate/Quote as on Check/Organize: COPPA's floor is
 *     collecting personal information from a known minor, not only
 *     persisting it, and a search query or a quote request already does
 *     that once the caller is a known, signed-in user.
 *   - src/app/api/research-os/probe/route.ts POST (action "probe_answer").
 *   - src/app/api/research-os/state/route.ts POST, only when
 *     action === "transfer_item" (action "transfer_answer"); the sibling
 *     "open" action records a navigation event rather than a
 *     learner-authored answer, and stays ungated so a signed-in minor with
 *     no profile yet can still browse the map and reach the profile page
 *     this gate points them to.
 *   - src/app/api/research-os/production/route.ts POST (action
 *     "production_submit"), in front of the whole handler (draft saves
 *     and submits both carry learner-authored content).
 * Every gated route returns consentBlockedBody(gate) as its JSON body on a
 * blocked call, status 403. Review and class routes (teacher-facing) are
 * deliberately untouched: verifyReviewer already gates them, and a
 * teacher's own age/consent status is not the thing being asked about.
 *
 * The "no profile row" case (a learner who has never answered the age
 * question) routes to src/app/research-os/profile/page.tsx, a minimal
 * role + birth_year_bucket form (no birthdate, no name); see
 * src/lib/research-os/profile.ts and src/app/api/research-os/profile/
 * route.ts. That route writes role and birth_year_bucket only, never
 * consent_status: the school/parent consent path (compliance/README.md
 * part B item 2) is the only writer of that column, and stays a TODO.
 */
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

/** The four wired call sites (see this file's header). Kept as a closed
 * union rather than a free string, so adding a future call site is a
 * type-level decision that catches a typo before it silently gates
 * nothing. decideConsent's rule does not vary by action today; the label
 * exists for logging and for the day a rule DOES need to differ by call
 * site. */
export type ConsentAction = "workspace_tool" | "probe_answer" | "transfer_answer" | "production_submit";

export interface ConsentCheckResult {
  allowed: boolean;
  /** Present only when `allowed` is false. 'no_profile': the learner has
   * never answered the age question at all, the strictest case (see
   * decideConsent's own comment for why this fails closed rather than
   * open). 'consent_required': the age question has been answered, the
   * learner is under 18, and no consent has been recorded yet.
   * 'unavailable': a read behind the decision did not complete, so no
   * answer was reached. It carries a 503. Telling a learner they need
   * parental consent states something about them, and this states that
   * the server could not finish a read. */
  reason?: "no_profile" | "consent_required" | "unavailable";
  /** A caller-facing message, safe to return directly in an API response. */
  message?: string;
}

const NO_PROFILE_MESSAGE =
  "This account has not completed the age check yet. Ask a teacher or parent to complete it before using this feature.";
const CONSENT_REQUIRED_MESSAGE =
  "This feature needs parent or school consent on file before a learner under 18 can use it. Ask a teacher or parent to complete consent.";
const UNAVAILABLE_MESSAGE = "Consent could not be checked right now. Try again in a moment.";

/**
 * The decision rule, pure and dependency-free so it is unit-testable with
 * plain fixture objects (matching this repo's convention for every other
 * gating rule, e.g. src/lib/research-os/stages.ts, frontier.ts). Takes the
 * profile row already read from the database (or null when no row exists)
 * and the action being attempted; returns the same shape requireConsent
 * returns.
 *
 * THE RULE:
 * 1. No profile row at all -> blocked, reason 'no_profile'. This is a
 *    deliberately stricter default than "no birth_year_bucket recorded
 *    yet, so assume adult": _intake/research-os-k12/04-compliance-
 *    distribution.md's COPPA section requires an age screen BEFORE any
 *    data collection on a mixed-audience surface, which means "we have
 *    not asked" cannot default to "proceed as if answered 18plus." An
 *    account with no profile row has not passed the age screen yet,
 *    full stop, so it is gated the same as a known minor with no
 *    consent until the question is answered.
 * 2. A profile row with birth_year_bucket '18plus' -> allowed regardless
 *    of consent_status (COPPA's VPC requirement is specific to a KNOWN
 *    under-13 user; section 3's India extension is specific to under-18;
 *    an adult learner needs no parent/school consent under either).
 * 3. A profile row with birth_year_bucket 'under13' or '13to17' and
 *    consent_status 'none' -> blocked, reason 'consent_required'.
 * 4. Every other case (a minor with consent_status 'school', 'parent', or
 *    'self') -> allowed.
 */
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

/** Reads graph.learner_profiles for `learnerId` and applies decideConsent.
 * A read error (missing table on a fresh environment, network blip) is
 * treated the same as "no profile row": fails closed, never open, matching
 * every other fail-open-vs-closed choice this file documents. */
export type ConsentPathResolver = (learnerId: string, profile: LearnerProfile) => Promise<EffectiveConsent>;
/** Writes a resolved consent back to the profile. Injected so the decision
 * can be tested without a database. */
export type ConsentWriteThrough = (learnerId: string, effective: EffectiveConsent) => Promise<void>;

const writeConsentThrough: ConsentWriteThrough = async (learnerId, effective) => {
  await graphService()
    .from("learner_profiles")
    .update({ consent_status: effective.status, consent_source: effective.source, updated_at: new Date().toISOString() })
    .eq("learner_id", learnerId);
};

/**
 * The decision once the profile is in hand: the profile column first, then
 * ros-32's school and vendor paths for a minor with nothing recorded. Split
 * out of requireConsent so the raise and the write-through are reachable
 * from a test with no database behind it.
 */
export async function decideWithPaths(
  learnerId: string,
  profile: LearnerProfile,
  action: ConsentAction,
  resolve: ConsentPathResolver = resolveConsentPaths,
  writeThrough: ConsentWriteThrough = writeConsentThrough,
): Promise<ConsentCheckResult> {
  const first = decideConsent(profile, action);
  if (first.allowed || first.reason !== "consent_required") return first;

  // A rostered learner in a class under the school exception, or a
  // verified vendor request, reads as consent, and the result is written
  // through so the next check is one read.
  //
  // resolveConsentPaths raises when one of its three reads fails. A raise
  // here used to leave this function, pass through four POST routes that
  // call it bare, and reach the learner as a 500 with no body. The
  // outcome is named instead, so every caller has to answer it.
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

export async function requireConsent(learnerId: string, action: ConsentAction): Promise<ConsentCheckResult> {
  const { data, error } = await graphService().from("learner_profiles").select("*").eq("learner_id", learnerId).maybeSingle();
  // A failed profile read used to become "no profile", which tells a
  // learner to complete an age check they may already have completed.
  // That is a claim about them made from a read that did not finish.
  if (error) {
    console.error("[research-os/consent] learner_profiles read failed:", error.message);
    return { allowed: false, reason: "unavailable", message: UNAVAILABLE_MESSAGE };
  }
  if (!data) return decideConsent(null, action);
  return decideWithPaths(learnerId, toLearnerProfile(data as LearnerProfileRow), action);
}

/**
 * The school-exception and vendor paths for one learner (consent-paths.ts).
 *
 * All three reads dropped their error, and each one fails toward a more
 * restrictive answer: a failed `class_members` read is a learner in no
 * class, which is a learner with no school exception, which blocks them.
 * Fail-closed is the right direction and a silent definite answer is
 * still the wrong report, so a read that could not complete raises and
 * the caller decides.
 */
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
  /** Mirrors ConsentCheckResult.reason; named "error" to match every other
   * gated route's {error} response shape in this codebase. */
  error: "no_profile" | "consent_required";
  message: string;
  /** True only for "no_profile": the client's cue to link to
   * /research-os/profile rather than to a generic "ask a parent" message
   * with nowhere to click. */
  needsProfile: boolean;
}

/**
 * Shapes a blocked ConsentCheckResult into the JSON body every gated route
 * returns on its 403, so the four call sites format the same response
 * rather than each inventing its own. Pure, so the shape itself is
 * unit-testable without a route or a live Supabase call (matching this
 * file's own decideConsent). Throws on an allowed result: a caller
 * rendering a blocked body for an allowed check is a bug in the caller,
 * not a shape this function should paper over.
 */
export function consentBlockedBody(result: ConsentCheckResult): ConsentBlockedBody {
  if (result.allowed || !result.reason) {
    throw new Error("consentBlockedBody: called with an allowed ConsentCheckResult");
  }
  if (result.reason === "unavailable") {
    throw new Error("consentBlockedBody: 'unavailable' is a 503, use consentRefusal");
  }
  return { error: result.reason, message: result.message ?? "", needsProfile: result.reason === "no_profile" };
}

/**
 * The status and body a route answers for a blocked check, both kinds in
 * one call so a route cannot handle the 403 and forget the 503. Every
 * gated route calls this rather than consentBlockedBody directly.
 */
export function consentRefusal(result: ConsentCheckResult): { status: 403 | 503; body: ConsentBlockedBody | { error: "consent_unavailable"; message: string } } {
  if (result.reason === "unavailable") {
    return { status: 503, body: { error: "consent_unavailable", message: result.message ?? UNAVAILABLE_MESSAGE } };
  }
  return { status: 403, body: consentBlockedBody(result) };
}
