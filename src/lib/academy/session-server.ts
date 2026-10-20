import { createHash } from "node:crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_S = 600;

export const SESSION_LIMITS = {
  otpEmail: 5,
  otpIp: 20,
  verifyEmail: 10,
  verifyIp: 40,
  refreshIp: 120,
} as const;

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user?: { id: string };
}

export type AuthResult = { session: AuthSession | null; status: number | null };

export interface SessionDeps {
  enabled: () => boolean;
  configured: () => boolean;
  rateHit: (key: string, limit: number, windowSeconds: number) => Promise<boolean>;
  sendOtp: (email: string) => Promise<{ status: number | null }>;
  verifyOtp: (email: string, code: string) => Promise<AuthResult>;
  refresh: (refreshToken: string) => Promise<AuthResult>;
  now: () => number;
}

export type SessionResult = { status: number; body: Record<string, unknown> };

export function clientIp(headers: Headers): string {
  const platform = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
  if (platform) return platform;
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export const OTP_LOCKOUT_MESSAGE = "Bucket sent several codes to this email. Wait ten minutes and try again.";
export const RATE_MESSAGE = "Too many tries from here. Wait ten minutes and try again.";

const hashed = (v: string) => createHash("sha256").update(v.toLowerCase()).digest("hex").slice(0, 32);

export function createSessionHandler(deps: SessionDeps) {
  const tokens = (s: AuthSession) => ({
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at ?? Math.floor(deps.now() / 1000) + (s.expires_in ?? 3600),
    user_id: s.user?.id ?? null,
  });

  async function within(keys: [string, number][]): Promise<boolean> {
    for (const [key, limit] of keys) if (!(await deps.rateHit(key, limit, WINDOW_S))) return false;
    return true;
  }

  return async function handle(body: unknown, ip: string): Promise<SessionResult> {
    if (!deps.enabled()) return { status: 503, body: { error: "review_log_disabled" } };
    if (!deps.configured()) return { status: 503, body: { error: "sync_unavailable" } };
    const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    const email = typeof b.email === "string" ? b.email.trim() : "";

    if (b.action === "otp") {
      if (!EMAIL_RE.test(email)) return { status: 400, body: { error: "bad_email" } };
      if (!(await within([[`otp:ip:${ip}`, SESSION_LIMITS.otpIp]]))) return { status: 429, body: { error: "too_many_requests", message: RATE_MESSAGE } };
      if (!(await within([[`otp:email:${hashed(email)}`, SESSION_LIMITS.otpEmail]]))) return { status: 429, body: { error: "too_many_requests", message: OTP_LOCKOUT_MESSAGE } };
      const r = await deps.sendOtp(email);
      if (r.status === 429) return { status: 429, body: { error: "too_many_requests" } };
      return r.status === null ? { status: 200, body: { ok: true } } : { status: 400, body: { error: "send_failed" } };
    }

    if (b.action === "verify") {
      const code = typeof b.code === "string" ? b.code.trim() : "";
      if (!EMAIL_RE.test(email) || !/^\d{6,10}$/.test(code)) return { status: 400, body: { error: "bad_code" } };
      if (!(await within([[`verify:ip:${ip}`, SESSION_LIMITS.verifyIp], [`verify:email:${hashed(email)}`, SESSION_LIMITS.verifyEmail]]))) return { status: 429, body: { error: "too_many_requests" } };
      const r = await deps.verifyOtp(email, code);
      if (r.status === 429) return { status: 429, body: { error: "too_many_requests" } };
      return r.session ? { status: 200, body: tokens(r.session) } : { status: 400, body: { error: "bad_code" } };
    }

    if (b.action === "refresh") {
      const rt = typeof b.refresh_token === "string" ? b.refresh_token : "";
      if (!rt || rt.length > 512) return { status: 400, body: { error: "bad_request" } };
      if (!(await within([[`refresh:ip:${ip}`, SESSION_LIMITS.refreshIp]]))) return { status: 429, body: { error: "too_many_requests" } };
      const r = await deps.refresh(rt);
      if (r.session) return { status: 200, body: tokens(r.session) };
      if (r.status === 400 || r.status === 401 || r.status === 403) return { status: 401, body: { error: "revoked" } };
      if (r.status === 429) return { status: 429, body: { error: "too_many_requests" } };
      return { status: 502, body: { error: "refresh_failed" } };
    }

    return { status: 400, body: { error: "bad_request" } };
  };
}
