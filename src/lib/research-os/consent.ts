/**
 * Research OS for K-12, the age and consent gate skeleton (bkt-ros ros-07,
 * minors compliance pack part A, task item 3). Backs graph.learner_profiles
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
 * NOT WIRED (see this bead's own instructions): src/app/api/research-os/
 * workspace/route.ts and src/app/api/research-os/production/route.ts, the
 * two call sites this gate belongs in front of, both landed commits in the
 * hour before this file was written (`git log -3 --since='3 hours ago' --
 * src/app/api/research-os/` showed two, the most recent 2 minutes old),
 * concurrent work this bead's own instructions say to leave alone rather
 * than risk a merge collision on. requireConsent below is complete and
 * tested (scripts/test-research-os-consent.ts); wiring it in is a two-line
 * change at the top of each route's handler:
 *
 *   const gate = await requireConsent(learnerId, "workspace_tool");
 *   if (!gate.allowed) return bad(403, gate.message ?? "consent_required");
 *
 * TODO(next bead touching workspace/route.ts or production/route.ts): add
 * that call to both POST handlers, right after the existing
 * verifyLearner() check, before any tool call or production write.
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

/** The two call sites named in this bead's task. Kept as a closed union
 * rather than a free string so a future call site is a type-level decision,
 * not a typo away from silently gating nothing. */
export type ConsentAction = "workspace_tool" | "production_submit";

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
