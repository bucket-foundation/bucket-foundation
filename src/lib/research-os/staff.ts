import { isReviewerEmail } from "./reviewer";
import { isClassStaffAnywhere } from "./class-db";

export async function isStaff(user: { id: string; email?: string | null } | null): Promise<boolean> {
  if (!user) return false;
  if (user.email && isReviewerEmail(user.email)) return true;
  return isClassStaffAnywhere(user.id);
}
