import { createHash } from "node:crypto";
import { APP_STORE_URL } from "./facts";
import { allowedSource, emailLimiter, verifyHuman, ipLimiter, type BetaEnv, type BetaRequest, type Fetcher, RateLimiter } from "./beta";
import { parseSignup } from "./signup";

export const FOUNDING_FAMILIES = 500;
export const FAMILY_SEATS = 6;
const FAMILY_CAP = { p_cap: FOUNDING_FAMILIES };
const LEAVE = "To give up your spot, email privacy@polingual.com and we remove your address.";
export const DB_TIMEOUT_MS = 1500;

type Spots = { total: number; left: number };
export type Outcome = "claimed" | "resend" | "recent" | "ip-limit" | "full";
export type Claim = { outcome: Outcome; left: number };
type FoundingResult = { status: number; body: { ok?: true; error?: string; left?: number; full?: true } };
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

async function claimSpot(email: string, ip: string, key: string, base: string, send: Fetcher): Promise<Claim | null> {
  const r = await send(`${base}/claim_founding_family`, {
    method: "POST",
    headers: rpcHeaders(key),
    body: JSON.stringify({ p_email: email, p_ip_hash: ip, ...FAMILY_CAP }),
    signal: AbortSignal.timeout(DB_TIMEOUT_MS * 2),
  });
  if (!r.ok) return null;
  const [row] = (await r.json()) as { outcome: Outcome; spots_left: number }[];
  return row ? { outcome: row.outcome, left: Number(row.spots_left) } : null;
}

export function familyEmail(to: string, from: string) {
  const lead = `You hold one of ${FOUNDING_FAMILIES} Polingual founding family spots.`;
  const offer = `Your family gets the Polingual Family plan free for life, for up to ${FAMILY_SEATS} people through Apple Family Sharing.`;
  const next = "We will email this address with the steps to turn it on. One spot per family.";
  return {
    from,
    to: [to],
    subject: "Your Polingual founding family spot",
    text: `${lead}\n\n${offer}\n\n${next}\n\nPolingual is on the App Store. Download it on your iPhone:\n${APP_STORE_URL}\n\n${LEAVE}\n\nPolingual`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#231F20"><p>${lead}</p><p>${offer}</p><p>${next}</p><p><a href="${APP_STORE_URL}" style="display:inline-block;background:#D9381E;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Download on the App Store</a></p><p style="font-size:13px;color:#5d5650">${LEAVE}</p><p>Polingual</p></div>`,
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
    claim = await claimSpot(parsed.signup.email, ipHash(req.ip ?? null, env), db, base, send);
  } catch {
    claim = null;
  }
  if (!claim) return { status: 502, body: { error: "Your signup did not save. Try again in a minute." } };
  if (claim.outcome === "full") return { status: 409, body: { error: `All ${FOUNDING_FAMILIES} founding family spots are taken.`, full: true, left: 0 } };
  if (claim.outcome === "ip-limit") return TOO_MANY;
  if (claim.outcome === "recent") return { status: 200, body: { ok: true, left: claim.left } };
  const from = env.BETA_FROM?.trim() || "Polingual <hello@bucket.foundation>";
  const sent = await send("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${mail}`, "Content-Type": "application/json" },
    body: JSON.stringify(familyEmail(parsed.signup.email, from)),
  });
  if (!sent.ok) return { status: 502, body: { error: "We saved your spot but the email failed. Submit the same address again in 10 minutes to resend it." } };
  return { status: 200, body: { ok: true, left: claim.left } };
}

export function parseCodes(raw: string): string[] {
  return [...new Set(raw.split(/[\s,]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z0-9]{6,64}$/.test(c)))];
}
