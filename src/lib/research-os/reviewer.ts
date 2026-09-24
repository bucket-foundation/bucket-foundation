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

export function isReviewerEmail(email: string): boolean {
  const allow = reviewerAllowlist();
  if (allow.size === 0) return false;
  return allow.has(email.trim().toLowerCase());
}

export interface ClassTeacher extends Reviewer {
  staff: boolean;
}

export async function verifyClassTeacher(req: NextRequest): Promise<ClassTeacher | null> {
  const identity = await verifyLearnerIdentity(req);
  if (!identity?.email) return null;
  if (isReviewerEmail(identity.email)) return { id: identity.id, email: identity.email, staff: true };
  if (!(await teachesAnyClass(identity.id))) return null;
  return { id: identity.id, email: identity.email, staff: false };
}

export async function verifyGraphReviewer(req: NextRequest): Promise<Reviewer | null> {
  const identity = await verifyLearnerIdentity(req);
  return isGraphReviewer(identity);
}

export function isGraphReviewer(identity: { id: string; email?: string | null } | null): Reviewer | null {
  if (!identity?.email || !isReviewerEmail(identity.email)) return null;
  return { id: identity.id, email: identity.email };
}

async function teachesAnyClass(userId: string): Promise<boolean> {
  const { data, error } = await graphService().from("class_members").select("class_id").eq("learner_id", userId).in("role", ["teacher", "librarian"]).limit(1);
  if (error) throw new Error(`teachesAnyClass: class_members read failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}
