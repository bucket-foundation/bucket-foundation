import { isReviewerEmail } from "./reviewer";

export async function isStaff(user: { id: string; email?: string | null } | null): Promise<boolean> {
  return Boolean(user?.email && isReviewerEmail(user.email));
}
