import { SIGN_IN_PATH, signInUrl } from "@/lib/auth/paths";

export const DOWNLOAD_PATH = "/download";
export const SITE_ORIGIN = "https://www.bucket.foundation";
export const SIGN_IN_OPEN_FLAG = "SIGN_IN_OPEN";

type Env = Record<string, string | undefined>;

export function signInClosed(env: Env = process.env): boolean {
  if (env.VERCEL_ENV !== "production") return false;
  return env[SIGN_IN_OPEN_FLAG]?.trim() !== "1";
}

export function isSignInPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH || pathname.startsWith(SIGN_IN_PATH + "/");
}

export function signInEntryUrl(nextPath: string, env: Env = process.env): string {
  return signInClosed(env) ? DOWNLOAD_PATH : signInUrl(nextPath);
}

export function signInRedirectTarget(pathname: string, env: Env = process.env): string | null {
  return isSignInPath(pathname) && signInClosed(env) ? DOWNLOAD_PATH : null;
}

export function protectedRedirectTarget(pathname: string, search: string, env: Env = process.env): string {
  return signInEntryUrl(pathname + search, env);
}

export function redirectUrl(target: string, requestUrl: string, onResearchHost: boolean): URL {
  return onResearchHost && target === DOWNLOAD_PATH ? new URL(DOWNLOAD_PATH, SITE_ORIGIN) : new URL(target, requestUrl);
}
