import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE } from "./facts";
import { TESTFLIGHT_JOIN_URL } from "./testflight-links";

export const LINK_TTL_MS = 7 * 24 * 60 * 60_000;
type Env = Record<string, string | undefined>;

export function linkKey(env: Env): string | null {
  const secret = env.BETA_LINK_SECRET?.trim();
  if (secret) return secret;
  const service = env.POLINGUAL_DB_SERVICE_KEY?.trim();
  return service ? createHmac("sha256", service).update("beta-link").digest("base64url") : null;
}

function mac(email: string, exp: number, key: string): string {
  return createHmac("sha256", key).update(`${email}.${exp}`).digest("base64url");
}

export function signLink(email: string, key: string, nowMs = Date.now()): string {
  const exp = Math.floor((nowMs + LINK_TTL_MS) / 1000);
  return `${exp}.${mac(email, exp, key)}`;
}

export function verifyLink(email: string, token: string, key: string, nowMs = Date.now()): boolean {
  const [expText, sig, extra] = token.split(".");
  if (extra !== undefined || !sig || !/^\d{1,12}$/.test(expText ?? "")) return false;
  const exp = Number(expText);
  if (exp * 1000 <= nowMs) return false;
  const want = Buffer.from(mac(email, exp, key));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function betaLink(email: string, env: Env, nowMs = Date.now()): string {
  const key = linkKey(env);
  if (!key) return TESTFLIGHT_JOIN_URL;
  return `${SITE}/api/beta/join?e=${encodeURIComponent(email)}&t=${encodeURIComponent(signLink(email, key, nowMs))}`;
}
