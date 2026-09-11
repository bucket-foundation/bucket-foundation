/**
 * Canon sign-off approver gate. A second, stricter allowlist stacked on top
 * of the existing Research OS reviewer gate (src/lib/research-os/
 * reviewer.ts): being a teacher reviewer is necessary but not sufficient to
 * approve or reject a canon record. GOVERNANCE.md's "Canon sign-off"
 * section reserves that decision for a named founder; CANON_SIGNOFF_
 * APPROVERS is the deploy-time allowlist that enforces it.
 *
 * Same fail-closed posture as reviewer.ts's own allowlist: an unset or
 * empty env var approves nobody, matching this repo's existing pattern
 * rather than introducing a second one.
 */

function canonApproverAllowlist(): Set<string> {
  return new Set(
    (process.env.CANON_SIGNOFF_APPROVERS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isCanonApprover(email: string): boolean {
  const allow = canonApproverAllowlist();
  if (allow.size === 0) return false;
  return allow.has(email.trim().toLowerCase());
}

/**
 * The full gate a caller (the /api/canon/signoff route) applies: a verified
 * reviewer identity (src/lib/research-os/reviewer.ts's own gate, applied by
 * the caller before this) AND membership in CANON_SIGNOFF_APPROVERS. Split
 * out as a pure function of an email so the 403 paths are testable with no
 * Supabase token and no network, matching scripts/test-research-os-teacher-
 * class.ts's isReviewerEmail coverage.
 */
export function isCanonSignoffApprover(isReviewer: boolean, email: string | null | undefined): boolean {
  if (!isReviewer) return false;
  if (!email) return false;
  return isCanonApprover(email);
}
