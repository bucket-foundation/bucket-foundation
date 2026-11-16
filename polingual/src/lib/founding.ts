import { createHash, randomBytes } from "node:crypto";
import { APP_STORE_URL, SITE } from "./facts";
import { allowedSource, emailLimiter, verifyHuman, ipLimiter, type BetaEnv, type BetaRequest, type Fetcher, RateLimiter } from "./beta";
import { parseSignup } from "./signup";

export const FOUNDING_FAMILIES = 500;
export const FAMILY_SEATS = 6;
const FAMILY_CAP = { p_cap: FOUNDING_FAMILIES };
const LEAVE = "To give up your spot, email privacy@polingual.com and we remove your address.";
export const OFFER = "Founding families get the Family plan free for life. We email your code when family plans open.";
const GMAIL = new Set(["gmail.com", "googlemail.com"]);
const TOKEN = /^[0-9a-f]{64}$/;
const BOX = "font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#231F20";
const CTA = "display:inline-block;background:#D9381E;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700";
const FULL: FoundingResult = { status: 409, body: { error: `All ${FOUNDING_FAMILIES} founding family spots are taken.`, full: true, left: 0 } };
const OFFLINE: FoundingResult = { status: 503, body: { error: "Signups are offline. Try again soon." } };
const UNSAVED: FoundingResult = { status: 502, body: { error: "Your signup did not save. Try again in a minute." } };
export const DB_TIMEOUT_MS = 1500;

type Spots = { total: number; left: number };
export type Outcome = "pending" | "resend" | "recent" | "confirmed" | "ip-limit" | "full";
export type ConfirmOutcome = "confirmed" | "already" | "full" | "invalid";
export type Claim = { outcome: Outcome; left: number };
type FoundingResult = { status: number; body: { ok?: true; error?: string; left?: number; full?: true; confirmed?: true } };
type FoundingRequest = BetaRequest;

function rpcBase(env: BetaEnv): string | null {
  const url = env.POLINGUAL_DB_URL?.trim();
  return url ? `${url}/rest/v1/rpc` : null;
}

function rpcHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Content-Profile": "polingual", "Accept-Profile": "polingual" };
}

function foundingConfigured(env: BetaEnv): boolean {
  return Boolean(rpcBase(env) && env.POLINGUAL_DB_SERVICE_KEY?.trim() && env.RESEND_API_KEY?.trim() && env.TURNSTILE_SECRET_KEY?.trim() && env.TURNSTILE_SITE_KEY?.trim());
}

export async function fetchSpots(env: BetaEnv, send: Fetcher = fetch): Promise<Spots | null> {
  const base = rpcBase(env);
  const key = env.POLINGUAL_DB_SERVICE_KEY?.trim();
  if (!base || !key || !foundingConfigured(env)) return null;
  try {
    const r = await send(`${base}/founding_family_spots`, { method: "POST", headers: rpcHeaders(key), body: JSON.stringify(FAMILY_CAP), signal: AbortSignal.timeout(DB_TIMEOUT_MS) });
    if (!r.ok) return null;
    const [row] = (await r.json()) as { total: number; spots_left: number }[];
    if (!row || !Number(row.total)) return null;
    return { total: Number(row.total), left: Number(row.spots_left) };
  } catch {
    return null;
  }
}

type FoundingStatus = { body: (Spots | { open: false }) & { siteKey?: string }; cache: string };

export async function foundingStatus(env: BetaEnv, send: Fetcher = fetch): Promise<FoundingStatus> {
  const spots = await fetchSpots(env, send);
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() || undefined;
  return { body: { ...(spots ?? { open: false as const }), ...(siteKey ? { siteKey } : {}) }, cache: spots ? "s-maxage=30" : "no-store" };
}

export function ipHash(ip: string | null, env: BetaEnv): string {
  return createHash("sha256").update(`${env.FOUNDING_IP_SALT?.trim() || "polingual-founding"}:${ip || "unknown"}`).digest("hex");
}

export function familyKey(email: string): string {
  const at = email.lastIndexOf("@");
  const domain = email.slice(at + 1).toLowerCase();
  const local = email.slice(0, at).toLowerCase().split("+")[0];
  return GMAIL.has(domain) ? `${local.replace(/\./g, "")}@gmail.com` : `${local}@${domain}`;
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function rpc<T>(name: string, args: Record<string, unknown>, key: string, base: string, send: Fetcher): Promise<T | null> {
  try {
    const r = await send(`${base}/${name}`, { method: "POST", headers: rpcHeaders(key), body: JSON.stringify({ ...args, ...FAMILY_CAP }), signal: AbortSignal.timeout(DB_TIMEOUT_MS * 2) });
    if (!r.ok) return null;
    const [row] = (await r.json()) as T[];
    return row ?? null;
  } catch {
    return null;
  }
}

const RESEND_EMAILS = "https://api.resend.com/emails";

function mail(key: string, message: unknown, send: Fetcher): Promise<Response> {
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  return send(RESEND_EMAILS, { method: "POST", headers, body: JSON.stringify(message) });
}

function sender(env: BetaEnv): string {
  return env.BETA_FROM?.trim() || "Polingual <hello@bucket.foundation>";
}

export function confirmEmail(to: string, from: string, token: string) {
  const link = `${SITE}/founding?token=${token}`;
  const lead = "Confirm your email to hold a Polingual founding family spot.";
  const rule = `Spots go to the first ${FOUNDING_FAMILIES} families who confirm. If you did not sign up, ignore this email.`;
  return {
    from,
    to: [to],
    subject: "Confirm your Polingual founding family spot",
    text: `${lead}\n\nOpen this link and tap Confirm my spot:\n${link}\n\n${OFFER}\n\n${rule}\n\nPolingual`,
    html: `<div style="${BOX}"><p>${lead}</p><p><a href="${link}" style="${CTA}">Confirm my spot</a></p><p>${OFFER}</p><p style="font-size:13px;color:#5d5650">${rule}</p><p>Polingual</p></div>`,
  };
}

export function familyEmail(to: string, from: string) {
  const lead = `Your spot is confirmed. You hold one of ${FOUNDING_FAMILIES} Polingual founding family spots.`;
  const seats = `One spot covers your family, up to ${FAMILY_SEATS} people through Apple Family Sharing.`;
  return {
    from,
    to: [to],
    subject: "Your Polingual founding family spot",
    text: `${lead}\n\n${OFFER}\n\n${seats}\n\nPolingual is on the App Store. Download it on your iPhone:\n${APP_STORE_URL}\n\n${LEAVE}\n\nPolingual`,
    html: `<div style="${BOX}"><p>${lead}</p><p>${OFFER}</p><p>${seats}</p><p><a href="${APP_STORE_URL}" style="${CTA}">Download on the App Store</a></p><p style="font-size:13px;color:#5d5650">${LEAVE}</p><p>Polingual</p></div>`,
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
  if (parsed.suspect) return { status: 400, body: { error: "Your signup did not go through. Reload the page and try again." } };
  const email = familyKey(parsed.signup.email);
  if (!limits.email.take(email, req.now)) return TOO_MANY;
  const base = rpcBase(env);
  const db = env.POLINGUAL_DB_SERVICE_KEY?.trim();
  const resend = env.RESEND_API_KEY?.trim();
  if (!base || !db || !resend || !foundingConfigured(env)) return OFFLINE;
  if (!(await verifyHuman(req.token, req.ip ?? null, env, send))) return { status: 403, body: { error: "Finish the check above the button, then try again." } };
  const token = randomBytes(32).toString("hex");
  const args = { p_email: email, p_address: parsed.signup.email, p_token_hash: tokenHash(token), p_ip_hash: ipHash(req.ip ?? null, env) };
  const row = await rpc<{ outcome: Outcome; spots_left: number }>("claim_founding_family", args, db, base, send);
  if (!row) return UNSAVED;
  const left = Number(row.spots_left);
  if (row.outcome === "full") return FULL;
  if (row.outcome === "ip-limit") return TOO_MANY;
  if (row.outcome === "recent") return { status: 200, body: { ok: true, left } };
  const message = row.outcome === "confirmed" ? familyEmail(parsed.signup.email, sender(env)) : confirmEmail(parsed.signup.email, sender(env), token);
  const sent = await mail(resend, message, send);
  if (!sent.ok) return { status: 502, body: { error: "The confirmation email failed. Submit the same address again in 10 minutes to resend it." } };
  return { status: 200, body: { ok: true, left } };
}

export async function confirmFounding(body: unknown, env: BetaEnv, send: Fetcher = fetch, req: FoundingRequest = {}, limit: RateLimiter = ipLimiter): Promise<FoundingResult> {
  if (!allowedSource(req.origin, req.referer)) return { status: 403, body: { error: "Confirm from polingual.com." } };
  if (!limit.take(req.ip || "unknown", req.now)) return TOO_MANY;
  const token = (body as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || !TOKEN.test(token)) return { status: 400, body: { error: "This link is not valid. Sign up again at polingual.com." } };
  const base = rpcBase(env);
  const db = env.POLINGUAL_DB_SERVICE_KEY?.trim();
  const resend = env.RESEND_API_KEY?.trim();
  if (!base || !db || !resend || !foundingConfigured(env)) return OFFLINE;
  const row = await rpc<{ outcome: ConfirmOutcome; address: string | null; spots_left: number }>("confirm_founding_family", { p_token_hash: tokenHash(token) }, db, base, send);
  if (!row) return UNSAVED;
  if (row.outcome === "invalid") return { status: 404, body: { error: "This link is not valid. Sign up again at polingual.com." } };
  if (row.outcome === "full") return FULL;
  if (row.outcome === "confirmed" && row.address) {
    const sent = await mail(resend, familyEmail(row.address, sender(env)), send);
    if (!sent.ok) console.error("[founding] confirmation email failed", sent.status);
  }
  return { status: 200, body: { ok: true, left: Number(row.spots_left), confirmed: true } };
}

export function parseCodes(raw: string): string[] {
  return [...new Set(raw.split(/[\s,]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z0-9]{6,64}$/.test(c)))];
}
