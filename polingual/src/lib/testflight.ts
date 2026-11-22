import { createPrivateKey, sign } from "node:crypto";
import { allowedSource, verifyHuman, RateLimiter, type BetaEnv, type BetaRequest, type Fetcher } from "./beta";
import { parseSignup } from "./signup";

export const ASC_API = "https://api.appstoreconnect.apple.com/v1";
export const BETA_GROUP_ID = "24c75263-401b-4914-834f-94cfeac0d346";
export const APP_ID = "6825177856";
export const TESTFLIGHT_JOIN_URL = "https://testflight.apple.com/join/B1ctUxn5";
export const TESTFLIGHT_APP_URL = "https://apps.apple.com/app/testflight/id899247664";
const TOKEN_TTL_S = 15 * 60;

export type TestflightResult = { status: number; body: { ok?: true; error?: string; join?: string } };
type AscCreds = { keyId: string; issuerId: string; privateKey: string };

export const tfIpLimiter = new RateLimiter(5, 10 * 60_000);
export const tfEmailLimiter = new RateLimiter(3, 60 * 60_000);

const TOO_MANY: TestflightResult = { status: 429, body: { error: "Too many signups. Try again later." } };
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

async function findTester(email: string, headers: Record<string, string>, send: Fetcher): Promise<string | null> {
  const r = await send(`${ASC_API}/betaTesters?filter[email]=${encodeURIComponent(email)}&limit=1`, { method: "GET", headers });
  if (!r.ok) return null;
  const j = (await r.json().catch(() => ({}))) as { data?: { id?: string }[] };
  return j.data?.[0]?.id ?? null;
}

async function resend(email: string, headers: Record<string, string>, send: Fetcher): Promise<Response | null> {
  const id = await findTester(email, headers, send);
  if (!id) return null;
  const member = await send(`${ASC_API}/betaGroups/${BETA_GROUP_ID}/relationships/betaTesters`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: [{ type: "betaTesters", id }] }),
  });
  if (!member.ok && !(await alreadyDone(member))) return member;
  return send(`${ASC_API}/betaTesterInvitations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: { type: "betaTesterInvitations", relationships: { app: { data: { type: "apps", id: APP_ID } }, betaTester: { data: { type: "betaTesters", id } } } } }),
  });
}

export async function inviteTester(
  body: unknown,
  env: BetaEnv,
  send: Fetcher = fetch,
  req: BetaRequest = {},
  limits = { ip: tfIpLimiter, email: tfEmailLimiter },
): Promise<TestflightResult> {
  if (!allowedSource(req.origin, req.referer)) return { status: 403, body: { error: "Sign up from beta.polingual.com." } };
  if (!limits.ip.take(req.ip || "unknown", req.now)) return TOO_MANY;
  const parsed = parseSignup(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  if (parsed.suspect) return SENT;
  if (!limits.email.take(parsed.signup.email, req.now)) return TOO_MANY;
  const creds = ascCreds(env);
  if (!creds) return OFFLINE;
  if ((req.token || env.BETA_REQUIRE_TURNSTILE?.trim() === "1") && !(await verifyHuman(req.token, req.ip ?? null, env, send))) {
    return { status: 403, body: { error: "Finish the check below your email, then try again." } };
  }
  let token: string;
  try {
    token = ascToken(creds, req.now);
  } catch {
    console.error("[testflight] ASC_PRIVATE_KEY did not load");
    return OFFLINE;
  }
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const email = parsed.signup.email;
  try {
    const created = await send(`${ASC_API}/betaTesters`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: { type: "betaTesters", attributes: { email }, relationships: { betaGroups: { data: [{ type: "betaGroups", id: BETA_GROUP_ID }] } } } }),
    });
    if (created.ok) return SENT;
    if (created.status !== 409) {
      console.error("[testflight] create tester failed", created.status);
      return APPLE_FAILED;
    }
    const invite = await resend(email, headers, send);
    if (!invite) {
      console.error("[testflight] tester lookup failed");
      return APPLE_FAILED;
    }
    if (invite.ok || (await alreadyDone(invite))) return SENT;
    console.error("[testflight] resend invite failed", invite.status);
    return APPLE_FAILED;
  } catch {
    console.error("[testflight] Apple unreachable");
    return APPLE_FAILED;
  }
}
