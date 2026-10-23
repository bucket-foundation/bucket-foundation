import { parseSignup } from "./signup";

export const TESTFLIGHT_URL = "https://testflight.apple.com/join/HfeRBKr8";

export type BetaEnv = Record<string, string | undefined>;
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type BetaResult = { status: number; body: { ok?: true; error?: string; testflight?: string } };

const API = "https://api.resend.com";
export const UNSUBSCRIBE = "To leave the beta list, email privacy@polingual.com and we remove your address.";
const ALLOWED_HOSTS = new Set(["polingual.com", "www.polingual.com"]);

export type BetaRequest = { origin?: string | null; referer?: string | null; ip?: string | null; now?: number };

export function allowedSource(origin?: string | null, referer?: string | null): boolean {
  const src = origin || referer;
  if (!src) return false;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number, private maxKeys = 10000) {}
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) this.hits.delete(this.hits.keys().next().value as string);
    return true;
  }
}

export const ipLimiter = new RateLimiter(5, 10 * 60_000);
export const emailLimiter = new RateLimiter(2, 60 * 60_000);
const TOO_MANY: BetaResult = { status: 429, body: { error: "Too many signups. Try again later." } };

export function welcomeEmail(to: string, from: string) {
  return {
    from,
    to: [to],
    subject: "Your Polingual beta link",
    text: `Thanks for joining the Polingual beta.\n\nInstall it on your iPhone through TestFlight:\n${TESTFLIGHT_URL}\n\nReply to this email with the languages you speak and the ones you want next.\n\n${UNSUBSCRIBE}\n\nPolingual`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#231F20"><p>Thanks for joining the Polingual beta.</p><p><a href="${TESTFLIGHT_URL}" style="display:inline-block;background:#D9381E;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Install with TestFlight</a></p><p>Reply with the languages you speak and the ones you want next.</p><p style="font-size:13px;color:#5d5650">${UNSUBSCRIBE}</p><p>Polingual</p></div>`,
  };
}

export async function joinBeta(
  body: unknown,
  env: BetaEnv,
  send: Fetcher = fetch,
  req: BetaRequest = {},
  limits = { ip: ipLimiter, email: emailLimiter },
): Promise<BetaResult> {
  if (!allowedSource(req.origin, req.referer)) return { status: 403, body: { error: "Sign up from polingual.com." } };
  if (!limits.ip.take(req.ip || "unknown", req.now)) return TOO_MANY;
  const parsed = parseSignup(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  if (parsed.suspect) return { status: 200, body: { ok: true, testflight: TESTFLIGHT_URL } };
  if (!limits.email.take(parsed.signup.email, req.now)) return TOO_MANY;
  const key = env.RESEND_API_KEY?.trim();
  const audience = env.RESEND_BETA_AUDIENCE_ID?.trim();
  if (!key || !audience) return { status: 503, body: { error: "Signups are offline. Try again soon." } };
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const existing = await send(`${API}/audiences/${audience}/contacts/${encodeURIComponent(parsed.signup.email)}`, { method: "GET", headers });
  if (existing.ok) return { status: 200, body: { ok: true, testflight: TESTFLIGHT_URL } };
  const contact = await send(`${API}/audiences/${audience}/contacts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: parsed.signup.email, unsubscribed: false }),
  });
  if (contact.status === 409) return { status: 200, body: { ok: true, testflight: TESTFLIGHT_URL } };
  if (!contact.ok) return { status: 502, body: { error: "Your signup did not save. Try again in a minute." } };
  const from = env.BETA_FROM?.trim() || "Polingual <hello@bucket.foundation>";
  const mail = await send(`${API}/emails`, { method: "POST", headers, body: JSON.stringify(welcomeEmail(parsed.signup.email, from)) });
  if (!mail.ok) console.error("[beta] welcome email failed", mail.status);
  return { status: 200, body: { ok: true, testflight: TESTFLIGHT_URL } };
}
