import { createHash } from "node:crypto";
import { allowedSource, emailLimiter, ipLimiter, TESTFLIGHT_URL, type BetaEnv, type BetaRequest, type Fetcher, RateLimiter, UNSUBSCRIBE } from "./beta";
import { parseSignup } from "./signup";

export const FOUNDING_TOTAL = 200;
export const DB_TIMEOUT_MS = 1500;

export type Spots = { total: number; left: number };
export type Outcome = "claimed" | "resend" | "recent" | "ip-limit" | "full";
export type Claim = { code: string | null; outcome: Outcome; left: number };
export type FoundingResult = { status: number; body: { ok?: true; error?: string; left?: number; full?: true } };
export type FoundingRequest = BetaRequest & { token?: string | null };

function rpcBase(env: BetaEnv): string | null {
  const url = env.POLINGUAL_DB_URL?.trim();
  return url ? `${url}/rest/v1/rpc` : null;
}

function rpcHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Content-Profile": "polingual", "Accept-Profile": "polingual" };
}

export function foundingConfigured(env: BetaEnv): boolean {
  return Boolean(rpcBase(env) && env.POLINGUAL_DB_SERVICE_KEY?.trim() && env.RESEND_API_KEY?.trim() && env.TURNSTILE_SECRET_KEY?.trim() && env.TURNSTILE_SITE_KEY?.trim());
}

export async function fetchSpots(env: BetaEnv, send: Fetcher = fetch): Promise<Spots | null> {
  const base = rpcBase(env);
  const key = env.POLINGUAL_DB_SERVICE_KEY?.trim();
  if (!base || !key || !foundingConfigured(env)) return null;
  try {
    const r = await send(`${base}/founding_spots`, { method: "POST", headers: rpcHeaders(key), body: "{}", signal: AbortSignal.timeout(DB_TIMEOUT_MS) });
    if (!r.ok) return null;
    const [row] = (await r.json()) as { total: number; spots_left: number }[];
    if (!row || !Number(row.total)) return null;
    return { total: Number(row.total), left: Number(row.spots_left) };
  } catch {
    return null;
  }
}

export function ipHash(ip: string | null, env: BetaEnv): string {
  return createHash("sha256").update(`${env.FOUNDING_IP_SALT?.trim() || "polingual-founding"}:${ip || "unknown"}`).digest("hex");
}

export async function claimCode(email: string, ip: string, key: string, base: string, send: Fetcher): Promise<Claim | null> {
  const r = await send(`${base}/claim_founding_code`, {
    method: "POST",
    headers: rpcHeaders(key),
    body: JSON.stringify({ p_email: email, p_ip_hash: ip }),
    signal: AbortSignal.timeout(DB_TIMEOUT_MS * 2),
  });
  if (!r.ok) return null;
  const [row] = (await r.json()) as { code: string | null; outcome: Outcome; spots_left: number }[];
  return row ? { code: row.code, outcome: row.outcome, left: Number(row.spots_left) } : null;
}

export async function verifyHuman(token: string | null | undefined, ip: string | null, env: BetaEnv, send: Fetcher): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !token || token.length > 2048) return false;
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set("remoteip", ip);
    const r = await send("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, signal: AbortSignal.timeout(DB_TIMEOUT_MS * 2) });
    if (!r.ok) return false;
    const j = (await r.json()) as { success?: boolean; hostname?: string };
    return j.success === true && (!j.hostname || j.hostname === "polingual.com" || j.hostname === "www.polingual.com");
  } catch {
    return false;
  }
}

export function codeEmail(to: string, from: string, code: string) {
  const redeem = `https://apps.apple.com/redeem?ctx=offercodes&id=6825177856&code=${encodeURIComponent(code)}`;
  return {
    from,
    to: [to],
    subject: "Your Polingual founding spot",
    text: `You hold one of ${FOUNDING_TOTAL} Polingual founding spots.\n\nYour one-time offer code: ${code}\n\nPolingual language systems run in the Bucket beta today. Join it through TestFlight:\n${TESTFLIGHT_URL}\n\nWhen Polingual is on the App Store, redeem your code on your iPhone:\n${redeem}\n\nThe code works once.\n\n${UNSUBSCRIBE}\n\nPolingual`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#231F20"><p>You hold one of ${FOUNDING_TOTAL} Polingual founding spots.</p><p>Your one-time offer code: <b style="font-family:monospace;font-size:18px">${code}</b></p><p>Polingual language systems run in the Bucket beta today. <a href="${TESTFLIGHT_URL}">Join it through TestFlight</a>.</p><p>When Polingual is on the App Store, redeem your code on your iPhone:</p><p><a href="${redeem}" style="display:inline-block;background:#D9381E;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Redeem on iPhone</a></p><p style="font-size:13px;color:#5d5650">The code works once. ${UNSUBSCRIBE}</p><p>Polingual</p></div>`,
  };
}

const TOO_MANY: FoundingResult = { status: 429, body: { error: "Too many signups. Try again later." } };

export async function claimFounding(
  body: unknown,
  env: BetaEnv,
  send: Fetcher = fetch,
  req: FoundingRequest = {},
  limits: { ip: RateLimiter; email: RateLimiter } = { ip: ipLimiter, email: emailLimiter },
): Promise<FoundingResult> {
  if (!allowedSource(req.origin, req.referer)) return { status: 403, body: { error: "Sign up from polingual.com." } };
  if (!limits.ip.take(req.ip || "unknown", req.now)) return TOO_MANY;
  const parsed = parseSignup(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  if (parsed.suspect) return { status: 200, body: { ok: true } };
  if (!limits.email.take(parsed.signup.email, req.now)) return TOO_MANY;
  const base = rpcBase(env);
  const db = env.POLINGUAL_DB_SERVICE_KEY?.trim();
  const mail = env.RESEND_API_KEY?.trim();
  if (!base || !db || !mail || !foundingConfigured(env)) return { status: 503, body: { error: "Signups are offline. Try again soon." } };
  if (!(await verifyHuman(req.token, req.ip ?? null, env, send))) return { status: 403, body: { error: "Finish the check above the button, then try again." } };
  let claim: Claim | null = null;
  try {
    claim = await claimCode(parsed.signup.email, ipHash(req.ip ?? null, env), db, base, send);
  } catch {
    claim = null;
  }
  if (!claim) return { status: 502, body: { error: "Your signup did not save. Try again in a minute." } };
  if (claim.outcome === "full") return { status: 409, body: { error: "All founding spots are taken.", full: true, left: 0 } };
  if (claim.outcome === "ip-limit") return TOO_MANY;
  if (claim.outcome === "recent" || !claim.code) return { status: 200, body: { ok: true, left: claim.left } };
  const from = env.BETA_FROM?.trim() || "Polingual <hello@bucket.foundation>";
  const sent = await send("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${mail}`, "Content-Type": "application/json" },
    body: JSON.stringify(codeEmail(parsed.signup.email, from, claim.code)),
  });
  if (!sent.ok) return { status: 502, body: { error: "We saved your spot but the email failed. Submit the same address again in 10 minutes to resend it." } };
  return { status: 200, body: { ok: true, left: claim.left } };
}

export function parseCodes(raw: string): string[] {
  return [...new Set(raw.split(/[\s,]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z0-9]{6,64}$/.test(c)))];
}
