/**
 * Research OS for K-12, the teacher-review gate (bkt-ros, Phase 1 item 4,
 * closing the Phase 0 PR's "no teacher layer" stub for the one slice the
 * review calls a hard requirement: "Teacher judgment is a first-class
 * evidence kind from the start"). Gates who may call
 * POST /api/research-os/review.
 *
 * SCOPE (see supabase/migrations/20260910020000_research_os_teacher_reviews.sql's
 * header): the review's own gap-analysis row "Role system" ("No `role`
 * column anywhere in the schema") is real Phase 1+ work; this file leaves
 * it alone. A proper role belongs on a roster-backed table once school
 * rostering (Clever/ClassLink, per section 8's Phase 1 scope) exists. Until
 * then, an env-var allowlist is the floor this Phase can support: a named,
 * auditable, deploy-time list of reviewer emails rather than a database
 * role or a self-service signup. Nobody is a reviewer when the env var is
 * unset (fails closed).
 *
 * TODO(Phase 1, review section 4 gap analysis "Role system"): replace this
 * with a real roster-backed role column + admin UI once school rostering
 * lands. Swapping this file's implementation is the only change a future
 * PR needs -- every caller already goes through verifyReviewer instead of
 * reading the env var itself.
 */
import type { NextRequest } from "next/server";
import { graphService, verifyLearnerIdentity } from "./db";

export interface Reviewer {
  id: string;
  email: string;
}

function reviewerAllowlist(): Set<string> {
  return new Set(
    (process.env.RESEARCH_OS_REVIEWER_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * The allowlist check alone, with no token verification -- split out from
 * verifyReviewer (ros-06) so the gate's own logic is unit-testable with no
 * network call (scripts/test-research-os-teacher-class.ts, "reviewer gate
 * rejects a non-reviewer"). An unset or empty env var rejects every email,
 * matching this file's own fail-closed posture.
 */
export function isReviewerEmail(email: string): boolean {
  const allow = reviewerAllowlist();
  if (allow.size === 0) return false;
  return allow.has(email.trim().toLowerCase());
}

/**
 * Verifies the caller's Supabase token AND that their email is on the
 * RESEARCH_OS_REVIEWER_EMAILS allowlist. Returns null on either failure
 * (bad/missing token, or a real learner who is not on the allowlist) --
 * the caller cannot distinguish which, by design, matching every other
 * research-os route's 401-for-anything-unverified posture.
 */
export async function verifyReviewer(req: NextRequest): Promise<Reviewer | null> {
  const identity = await verifyLearnerIdentity(req);
  if (!identity?.email) return null;
  if (!isReviewerEmail(identity.email) && !(await holdsStaffRole(identity.id))) return null;
  return { id: identity.id, email: identity.email };
}

/**
 * The gate for changing the graph itself: approving edges, creating nodes
 * from missing ideas, and confirming irreducible verdicts, on
 * /api/research-os/{edges,node-proposals,irreducible} and the review detail
 * on /api/research-os/makeup. A class membership opens teacher review, and
 * anyone signed in can create a class and hold one, so only the env
 * allowlist opens this gate. Unset, nobody is a graph reviewer.
 */
export async function verifyGraphReviewer(req: NextRequest): Promise<Reviewer | null> {
  const identity = await verifyLearnerIdentity(req);
  return isGraphReviewer(identity);
}

/** The graph-review decision on a verified identity: the allowlist, and nothing else. */
export function isGraphReviewer(identity: { id: string; email?: string | null } | null): Reviewer | null {
  if (!identity?.email || !isReviewerEmail(identity.email)) return null;
  return { id: identity.id, email: identity.email };
}

/**
 * A teacher or librarian membership in any class (graph.class_members.role)
 * makes a person a reviewer beside the env allowlist, so a teacher who
 * created their own class reviews without a deploy.
 */
async function holdsStaffRole(userId: string): Promise<boolean> {
  try {
    const { data, error } = await graphService().from("class_members").select("class_id").eq("learner_id", userId).in("role", ["teacher", "librarian"]).limit(1);
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
