import { createHash, timingSafeEqual } from "node:crypto";
import type { AuthResult } from "./session-server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{8,10}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const USER_PAGE_SIZE = 1000;

export interface ReviewDemo {
  email: string;
  code: string;
}

export type ReviewDemoOutcome = "code_requested" | "signed_in" | "bad_code" | "sign_in_failed" | "rate_limited";

export interface ReviewDemoUser {
  email?: string;
  app_metadata?: Record<string, unknown>;
}

export type ListUsers<U> = (page: number, perPage: number) => Promise<U[]>;

export interface ReviewDemoLink {
  tokenHash: string;
  type: string;
}

export interface ReviewDemoAuth {
  findUser: (email: string) => Promise<ReviewDemoUser | null>;
  generateLink: (email: string) => Promise<{ link: ReviewDemoLink | null; status: number | null }>;
  verifyToken: (tokenHash: string, type: string) => Promise<AuthResult>;
}

export function reviewDemoConfig(rawEmail: string | undefined, rawCode: string | undefined, rawUntil: string | undefined, now: number): ReviewDemo | null {
  const email = rawEmail?.trim().toLowerCase() ?? "";
  const code = rawCode?.trim() ?? "";
  const until = rawUntil?.trim() ?? "";
  const open = DATE_RE.test(until) && Date.parse(until) > now;
  return open && EMAIL_RE.test(email) && CODE_RE.test(code) ? { email, code } : null;
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

export async function findUserByEmail<U extends ReviewDemoUser>(list: ListUsers<U>, email: string): Promise<U | null> {
  for (let page = 1; ; page++) {
    const users = await list(page, USER_PAGE_SIZE);
    const found = users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (users.length < USER_PAGE_SIZE) return null;
  }
}

export async function mintReviewSession(email: string, auth: ReviewDemoAuth): Promise<AuthResult> {
  if (!isReviewDemoUser(await auth.findUser(email))) return { session: null, status: 403 };
  const { link, status } = await auth.generateLink(email);
  if (!link) return { session: null, status };
  return auth.verifyToken(link.tokenHash, link.type);
}
