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
import { verifyLearnerIdentity } from "./db";

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
 * Verifies the caller's Supabase token AND that their email is on the
 * RESEARCH_OS_REVIEWER_EMAILS allowlist. Returns null on either failure
 * (bad/missing token, or a real learner who is not on the allowlist) --
 * the caller cannot distinguish which, by design, matching every other
 * research-os route's 401-for-anything-unverified posture.
 */
export async function verifyReviewer(req: NextRequest): Promise<Reviewer | null> {
  const identity = await verifyLearnerIdentity(req);
  if (!identity?.email) return null;
  const allow = reviewerAllowlist();
  if (allow.size === 0) return null;
  if (!allow.has(identity.email.toLowerCase())) return null;
  return { id: identity.id, email: identity.email };
}
