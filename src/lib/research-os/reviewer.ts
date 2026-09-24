import type { NextRequest } from "next/server";
import { graphService, verifyLearnerIdentity } from "./db";

export interface Reviewer {
  id: string;
  email: string;
}

export function emailAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function reviewerAllowlist(): Set<string> {
  return emailAllowlist(process.env.RESEARCH_OS_REVIEWER_EMAILS);
}

export function isResearchAgentEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return emailAllowlist(process.env.RESEARCH_AGENT_EMAILS).has(email.trim().toLowerCase());
}

export function isReviewerEmail(email: string): boolean {
  const allow = reviewerAllowlist();
  if (allow.size === 0) return false;
  return allow.has(email.trim().toLowerCase());
}

export async function verifyReviewer(req: NextRequest): Promise<Reviewer | null> {
  const identity = await verifyLearnerIdentity(req);
  if (!identity?.email) return null;
  if (!isReviewerEmail(identity.email) && !(await holdsStaffRole(identity.id))) return null;
  return { id: identity.id, email: identity.email };
}

export async function verifyGraphReviewer(req: NextRequest): Promise<Reviewer | null> {
  const identity = await verifyLearnerIdentity(req);
  return isGraphReviewer(identity);
}

export function isGraphReviewer(identity: { id: string; email?: string | null } | null): Reviewer | null {
  if (!identity?.email || !isReviewerEmail(identity.email)) return null;
  return { id: identity.id, email: identity.email };
}

async function holdsStaffRole(userId: string): Promise<boolean> {
  try {
    const { data, error } = await graphService().from("class_members").select("class_id").eq("learner_id", userId).in("role", ["teacher", "librarian"]).limit(1);
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
