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

export function isCanonSignoffApprover(isReviewer: boolean, email: string | null | undefined): boolean {
  if (!isReviewer) return false;
  if (!email) return false;
  return isCanonApprover(email);
}
