/**
 * Which paths need a signed-in person, and where to send them after
 * sign-in. Pure so the middleware's rules are unit-tested without a server
 * (scripts/test-auth-paths.ts).
 */

/** Paths under which every route needs a session. The Research OS landing at /research-os stays public. */
export const PROTECTED_PREFIXES = [
  "/research-os/home",
  "/research-os/workspace",
  "/research-os/class",
  "/research-os/review",
  "/research-os/roster",
  "/research-os/edges",
  "/research-os/profile",
  "/account",
  "/canon/signoff",
] as const;

export const SIGN_IN_PATH = "/sign-in";
export const DEFAULT_AFTER_SIGN_IN = "/research-os/home";

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function hasControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) < 32) return true;
  return false;
}

/**
 * A safe post-sign-in destination: a same-origin absolute path only. Rejects
 * protocol-relative URLs (//evil), absolute URLs, and anything with a
 * scheme, so the `next` query parameter can never bounce a person off-site.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_SIGN_IN;
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\")) return DEFAULT_AFTER_SIGN_IN;
  if (hasControlChars(s)) return DEFAULT_AFTER_SIGN_IN;
  if (s.startsWith(SIGN_IN_PATH)) return DEFAULT_AFTER_SIGN_IN;
  return s;
}

export function signInUrl(nextPath: string): string {
  const next = safeNextPath(nextPath);
  return next === DEFAULT_AFTER_SIGN_IN ? SIGN_IN_PATH : `${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`;
}
