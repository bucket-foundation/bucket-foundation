import { adminHosts } from "./hosts.cjs";

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type OpsEnv = Partial<Record<string, string | undefined>>;

export const FOUNDER_EMAIL = "gianyrox@gmail.com";
export const ACCESS_COOKIE = "pl_ops_at";
export const REFRESH_COOKIE = "pl_ops_rt";
export const EXPIRES_COOKIE = "pl_ops_exp";
const TIMEOUT_MS = 5000;

export function isAdminHost(host: string | null | undefined, env: OpsEnv = process.env): boolean {
  const h = (host ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  return h !== "" && adminHosts(env).includes(h);
}

export function requestHost(headers: { get(name: string): string | null }): string | null {
  return headers.get("x-forwarded-host") ?? headers.get("host");
}

export function isFounder(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === FOUNDER_EMAIL;
}

export function missingAuthEnv(env: OpsEnv): string[] {
  return ["POLINGUAL_DB_URL", "POLINGUAL_DB_ANON_KEY"].filter((k) => !env[k]?.trim());
}

export async function founderFromToken(token: string | null | undefined, env: OpsEnv, send: Fetcher): Promise<string | null> {
  if (!token || token.length > 4096 || missingAuthEnv(env).length) return null;
  try {
    const r = await send(`${env.POLINGUAL_DB_URL!.trim().replace(/\/$/, "")}/auth/v1/user`, {
      method: "GET",
      headers: { apikey: env.POLINGUAL_DB_ANON_KEY!.trim(), Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const u = (await r.json()) as { email?: unknown };
    return typeof u.email === "string" && isFounder(u.email) ? FOUNDER_EMAIL : null;
  } catch {
    return null;
  }
}

export type SessionTokens = { access_token: string; refresh_token: string; expires_at: number };
type SessionCall = { ok: true; tokens?: SessionTokens } | { ok: false; error: string };

function sessionBase(env: OpsEnv): string {
  return (env.POLINGUAL_SYNC_BASE?.trim() || "https://www.bucket.foundation").replace(/\/$/, "");
}

async function session(body: Record<string, string>, env: OpsEnv, send: Fetcher): Promise<SessionCall> {
  try {
    const r = await send(`${sessionBase(env)}/api/academy/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const b = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) return { ok: false, error: typeof b.error === "string" ? b.error : `status_${r.status}` };
    if (typeof b.access_token === "string" && typeof b.refresh_token === "string" && typeof b.expires_at === "number") {
      return { ok: true, tokens: { access_token: b.access_token, refresh_token: b.refresh_token, expires_at: b.expires_at } };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "offline" };
  }
}

export async function sendFounderCode(email: string, env: OpsEnv, send: Fetcher): Promise<SessionCall> {
  if (!isFounder(email)) return { ok: false, error: "not_founder" };
  return session({ action: "otp", email: FOUNDER_EMAIL, app: "polingual" }, env, send);
}

export async function verifyFounderCode(email: string, code: string, env: OpsEnv, send: Fetcher): Promise<SessionCall> {
  if (!isFounder(email)) return { ok: false, error: "not_founder" };
  const r = await session({ action: "verify", email: FOUNDER_EMAIL, code: code.trim() }, env, send);
  if (!r.ok) return r;
  if (!r.tokens) return { ok: false, error: "no_session" };
  return (await founderFromToken(r.tokens.access_token, env, send)) ? r : { ok: false, error: "not_founder" };
}

export async function refreshFounder(refreshToken: string, env: OpsEnv, send: Fetcher): Promise<SessionCall> {
  if (!refreshToken || refreshToken.length > 4096) return { ok: false, error: "no_session" };
  const r = await session({ action: "refresh", refresh_token: refreshToken }, env, send);
  if (!r.ok) return r;
  if (!r.tokens) return { ok: false, error: "no_session" };
  return (await founderFromToken(r.tokens.access_token, env, send)) ? r : { ok: false, error: "not_founder" };
}
