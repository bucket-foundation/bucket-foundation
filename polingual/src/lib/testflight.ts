import { createHash, createPrivateKey, sign } from "node:crypto";
import { allowedSource, joinBeta, verifyHuman, RateLimiter, type BetaEnv, type BetaRequest, type Fetcher } from "./beta";
import { linkKey, verifyLink } from "./beta-link";
import { parseSignup } from "./signup";
import { TESTFLIGHT_JOIN_URL } from "./testflight-links";

export const ASC_API = "https://api.appstoreconnect.apple.com/v1";
export const BETA_GROUP_ID = "24c75263-401b-4914-834f-94cfeac0d346";
export const APP_ID = "6825177856";
export { TESTFLIGHT_JOIN_URL, TESTFLIGHT_APP_URL } from "./testflight-links";
const TOKEN_TTL_S = 15 * 60;

export type TestflightResult = { status: number; body: { ok?: true; error?: string; join?: string } };
type AscCreds = { keyId: string; issuerId: string; privateKey: string };

export const tfIpLimiter = new RateLimiter(5, 10 * 60_000);
export const tfEmailLimiter = new RateLimiter(3, 60 * 60_000);
export const tfGlobalLimiter = new RateLimiter(60, 60 * 60_000);
export const mailIpLimiter = new RateLimiter(5, 10 * 60_000);
export const mailEmailLimiter = new RateLimiter(2, 60 * 60_000);
export const mailGlobalLimiter = new RateLimiter(60, 60 * 60_000);
const DEFAULT_MAX_TESTERS = 9000;
const DB_TIMEOUT_MS = 3000;
export type Limits = { ip: RateLimiter; email: RateLimiter; global: RateLimiter };

export function hashSalt(env: BetaEnv): string | null {
  return env.FOUNDING_IP_SALT?.trim() || null;
}

export function saltMissingInProduction(env: BetaEnv): boolean {
  return !hashSalt(env) && (env.VERCEL_ENV === "production" || env.NODE_ENV === "production");
}

function hashed(salt: string, kind: string, value: string): string {
  return createHash("sha256").update(`${salt}:${kind}:${value}`).digest("hex");
}

export async function sharedLimit(ip: string, email: string, env: BetaEnv, send: Fetcher, scope = ""): Promise<boolean | null> {
  const url = env.POLINGUAL_DB_URL?.trim();
  const key = env.POLINGUAL_DB_SERVICE_KEY?.trim();
  const salt = hashSalt(env);
  if (!url || !key || !salt) return null;
  try {
    const r = await send(`${url}/rest/v1/rpc/record_testflight_attempt`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Content-Profile": "polingual", "Accept-Profile": "polingual" },
      body: JSON.stringify({ p_ip_hash: hashed(salt, `${scope}ip`, ip), p_email_hash: hashed(salt, `${scope}email`, email) }),
      signal: AbortSignal.timeout(DB_TIMEOUT_MS),
    });
    if (!r.ok) {
      console.error("[testflight] limit rpc failed", r.status);
      return null;
    }
    const allowed = await r.json().catch(() => null);
    return typeof allowed === "boolean" ? allowed : null;
  } catch {
    console.error("[testflight] limit rpc unreachable");
    return null;
  }
}

function localLimit(ip: string, email: string, limits: Limits, now?: number): boolean {
  return limits.ip.take(ip, now) && limits.email.take(email, now) && limits.global.take("all", now);
}

const NOT_HUMAN: TestflightResult = { status: 403, body: { error: "Finish the check below your email, then try again." } };
const TOO_MANY: TestflightResult = { status: 429, body: { error: "Too many signups. Try again later." } };
const FULL: TestflightResult = { status: 503, body: { error: "The beta is full for now. Use the public link below." } };
const OFFLINE: TestflightResult = { status: 503, body: { error: "TestFlight signups are offline. Use the public link below for now." } };
const APPLE_FAILED: TestflightResult = { status: 502, body: { error: "Apple did not accept the invite. Try again in a minute, or use the public link below." } };
const SENT: TestflightResult = { status: 200, body: { ok: true, join: TESTFLIGHT_JOIN_URL } };

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function ascCreds(env: BetaEnv): AscCreds | null {
  const keyId = env.ASC_KEY_ID?.trim();
  const issuerId = env.ASC_ISSUER_ID?.trim();
  const privateKey = env.ASC_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  return keyId && issuerId && privateKey ? { keyId, issuerId, privateKey } : null;
}

export function ascToken(creds: AscCreds, nowMs = Date.now()): string {
  const iat = Math.floor(nowMs / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: creds.keyId, typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: creds.issuerId, iat, exp: iat + TOKEN_TTL_S, aud: "appstoreconnect-v1" }));
  const input = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(input), { key: createPrivateKey(creds.privateKey), dsaEncoding: "ieee-p1363" });
  return `${input}.${b64url(signature)}`;
}

async function alreadyDone(r: Response): Promise<boolean> {
  if (r.status === 409) return true;
  if (r.status < 400 || r.status >= 500) return false;
  const text = await r.text().catch(() => "");
  return /already/i.test(text);
}

async function firstTester(query: string, headers: Record<string, string>, send: Fetcher): Promise<string | null | undefined> {
  const r = await send(`${ASC_API}/betaTesters?${query}&limit=1`, { method: "GET", headers });
  if (!r.ok) return undefined;
  const j = (await r.json().catch(() => ({}))) as { data?: { id?: string }[] };
  return j.data?.[0]?.id ?? null;
}

async function groupTotal(headers: Record<string, string>, send: Fetcher): Promise<number | null> {
  const r = await send(`${ASC_API}/betaGroups/${BETA_GROUP_ID}/betaTesters?limit=1`, { method: "GET", headers });
  if (!r.ok) return null;
  const j = (await r.json().catch(() => ({}))) as { meta?: { paging?: { total?: number } } };
  return typeof j.meta?.paging?.total === "number" ? j.meta.paging.total : null;
}

type Rejoin = { ok: true } | { ok: false; reason: string; status?: number };

async function rejoin(email: string, headers: Record<string, string>, send: Fetcher): Promise<Rejoin> {
  const filter = `filter[email]=${encodeURIComponent(email)}`;
  const member = await firstTester(`${filter}&filter[betaGroups]=${BETA_GROUP_ID}`, headers, send);
  if (member === undefined) return { ok: false, reason: "membership lookup failed" };
  if (member) return { ok: true };
  const id = await firstTester(filter, headers, send);
  if (!id) return { ok: false, reason: "tester lookup failed" };
  const added = await send(`${ASC_API}/betaGroups/${BETA_GROUP_ID}/relationships/betaTesters`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: [{ type: "betaTesters", id }] }),
  });
  if (!added.ok && !(await alreadyDone(added))) return { ok: false, reason: "add to group failed", status: added.status };
  const invite = await send(`${ASC_API}/betaTesterInvitations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: { type: "betaTesterInvitations", relationships: { app: { data: { type: "apps", id: APP_ID } }, betaTester: { data: { type: "betaTesters", id } } } } }),
  });
  if (invite.ok || (await alreadyDone(invite))) return { ok: true };
  return { ok: false, reason: "resend invite failed", status: invite.status };
}

export async function inviteTester(
  body: unknown,
  env: BetaEnv,
  send: Fetcher = fetch,
  req: BetaRequest = {},
  limits: Limits = { ip: tfIpLimiter, email: tfEmailLimiter, global: tfGlobalLimiter },
): Promise<TestflightResult> {
  if (!allowedSource(req.origin, req.referer)) return { status: 403, body: { error: "Sign up from beta.polingual.com." } };
  const parsed = parseSignup(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  if (parsed.suspect) return SENT;
  const creds = ascCreds(env);
  if (!creds || !env.TURNSTILE_SECRET_KEY?.trim() || saltMissingInProduction(env)) return OFFLINE;
  const ip = req.ip || "unknown";
  if (!req.token) return NOT_HUMAN;
  const shared = await sharedLimit(ip, parsed.signup.email, env, send);
  if (!(shared ?? localLimit(ip, parsed.signup.email, limits, req.now))) return TOO_MANY;
  if (!(await verifyHuman(req.token, req.ip ?? null, env, send))) return NOT_HUMAN;
  return OUTCOME[await addTester(parsed.signup.email, creds, env, send, req.now)];
}

export type AddOutcome = "sent" | "full" | "failed" | "offline";
const OUTCOME: Record<AddOutcome, TestflightResult> = { sent: SENT, full: FULL, failed: APPLE_FAILED, offline: OFFLINE };

export async function addTester(email: string, creds: AscCreds, env: BetaEnv, send: Fetcher = fetch, nowMs = Date.now()): Promise<AddOutcome> {
  let token: string;
  try {
    token = ascToken(creds, nowMs);
  } catch {
    console.error("[testflight] ASC_PRIVATE_KEY did not load");
    return "offline";
  }
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const max = Number(env.TESTFLIGHT_MAX_TESTERS?.trim()) || DEFAULT_MAX_TESTERS;
  try {
    const total = await groupTotal(headers, send);
    if (total === null) {
      console.error("[testflight] group count failed");
      return "failed";
    }
    if (total >= max) return "full";
    const created = await send(`${ASC_API}/betaTesters`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: { type: "betaTesters", attributes: { email }, relationships: { betaGroups: { data: [{ type: "betaGroups", id: BETA_GROUP_ID }] } } } }),
    });
    if (created.ok) return "sent";
    if (created.status !== 409) {
      console.error("[testflight] create tester failed", created.status);
      return "failed";
    }
    const again = await rejoin(email, headers, send);
    if (again.ok) return "sent";
    console.error(`[testflight] ${again.reason}`, again.status ?? "");
    return "failed";
  } catch {
    console.error("[testflight] Apple unreachable");
    return "failed";
  }
}

export async function enrollAfterEmail(email: string, ip: string, env: BetaEnv, send: Fetcher = fetch, limits: Limits = { ip: tfIpLimiter, email: tfEmailLimiter, global: tfGlobalLimiter }, nowMs?: number): Promise<AddOutcome | "skipped"> {
  const creds = ascCreds(env);
  if (!creds || saltMissingInProduction(env)) return "skipped";
  const shared = await sharedLimit(ip, email, env, send);
  if (!(shared ?? localLimit(ip, email, limits, nowMs))) return "skipped";
  return addTester(email, creds, env, send, nowMs);
}

export async function requestInvite(
  body: unknown,
  env: BetaEnv,
  send: Fetcher = fetch,
  req: BetaRequest = {},
  limits: Limits = { ip: mailIpLimiter, email: mailEmailLimiter, global: mailGlobalLimiter },
) {
  if (!allowedSource(req.origin, req.referer)) return { status: 403, body: { error: "Sign up from polingual.com." } };
  const parsed = parseSignup(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  if (parsed.suspect) return { status: 200, body: { ok: true as const } };
  if (saltMissingInProduction(env)) return OFFLINE;
  const human = Boolean(env.TURNSTILE_SECRET_KEY?.trim());
  if (human && !req.token) return NOT_HUMAN;
  const ip = req.ip || "unknown";
  const shared = await sharedLimit(ip, parsed.signup.email, env, send, "mail:");
  if (!(shared ?? localLimit(ip, parsed.signup.email, limits, req.now))) return TOO_MANY;
  if (human && !(await verifyHuman(req.token, req.ip ?? null, env, send))) return NOT_HUMAN;
  return joinBeta(body, env, send, { ...req, human });
}

export async function confirmJoin(
  email: string | null,
  token: string | null,
  ip: string,
  env: BetaEnv,
  send: Fetcher = fetch,
  limits: Limits = { ip: tfIpLimiter, email: tfEmailLimiter, global: tfGlobalLimiter },
  nowMs = Date.now(),
): Promise<AddOutcome | "skipped"> {
  const key = linkKey(env);
  if (!key || !email || !token || email.length > 320 || token.length > 200) return "skipped";
  const parsed = parseSignup({ email });
  if (!parsed.ok || parsed.signup.email !== email || !verifyLink(email, token, key, nowMs)) return "skipped";
  try {
    return await enrollAfterEmail(email, ip, env, send, limits, nowMs);
  } catch {
    console.error("[testflight] join enroll failed");
    return "failed";
  }
}
