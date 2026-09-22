/**
 * One test for who counts as staff in Research OS: an email on the reviewer
 * allowlist, or a person who teaches a class. The app layout and every
 * staff-only page read it here so the two cannot drift.
 */
import { isReviewerEmail } from "./reviewer";
import { isClassStaffAnywhere } from "./class-db";

export async function isStaff(user: { id: string; email?: string | null } | null): Promise<boolean> {
  if (!user) return false;
  if (user.email && isReviewerEmail(user.email)) return true;
  return isClassStaffAnywhere(user.id);
}
