import { createHash, timingSafeEqual } from "node:crypto";
import type { AuthResult } from "./session-server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{8,10}$/;

export interface ReviewDemo {
  email: string;
  code: string;
}

export type ReviewDemoOutcome = "code_requested" | "signed_in" | "bad_code" | "sign_in_failed" | "rate_limited";

export interface ReviewDemoUser {
  app_metadata?: Record<string, unknown>;
}

export interface ReviewDemoLink {
  user: ReviewDemoUser | null;
  tokenHash: string;
  type: string;
}

export interface ReviewDemoAuth {
  generateLink: (email: string) => Promise<{ link: ReviewDemoLink | null; status: number | null }>;
  verifyToken: (tokenHash: string, type: string) => Promise<AuthResult>;
}

export function reviewDemoConfig(rawEmail: string | undefined, rawCode: string | undefined): ReviewDemo | null {
  const email = rawEmail?.trim().toLowerCase() ?? "";
  const code = rawCode?.trim() ?? "";
  return EMAIL_RE.test(email) && CODE_RE.test(code) ? { email, code } : null;
}

export function isReviewDemoEmail(email: string, demo: ReviewDemo): boolean {
  return email.toLowerCase() === demo.email;
}

export function reviewCodeMatches(given: string, expected: string): boolean {
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export function isReviewDemoUser(user: ReviewDemoUser | null | undefined): boolean {
  return user?.app_metadata?.review_demo === true;
}

export async function mintReviewSession(email: string, auth: ReviewDemoAuth): Promise<AuthResult> {
  const { link, status } = await auth.generateLink(email);
  if (!link) return { session: null, status };
  if (!isReviewDemoUser(link.user)) return { session: null, status: 403 };
  return auth.verifyToken(link.tokenHash, link.type);
}
