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
   * learner is under 18, and no consent has been recorded yet. */
  reason?: "no_profile" | "consent_required";
  /** A caller-facing message, safe to return directly in an API response. */
  message?: string;
}

const NO_PROFILE_MESSAGE =
  "This account has not completed the age check yet. Ask a teacher or parent to complete it before using this feature.";
const CONSENT_REQUIRED_MESSAGE =
  "This feature needs parent or school consent on file before a learner under 18 can use it. Ask a teacher or parent to complete consent.";

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
export async function requireConsent(learnerId: string, action: ConsentAction): Promise<ConsentCheckResult> {
  const svc = graphService();
  const { data, error } = await svc.from("learner_profiles").select("*").eq("learner_id", learnerId).maybeSingle();
  if (error || !data) return decideConsent(null, action);
  return decideConsent(toLearnerProfile(data as LearnerProfileRow), action);
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
  return { error: result.reason, message: result.message ?? "", needsProfile: result.reason === "no_profile" };
}
