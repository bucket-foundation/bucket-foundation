import { createPrivateKey, sign } from "node:crypto";

export const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
export const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";
export const APPLE_CLIENT_IDS: Record<string, string> = { bucket: "foundation.bucket.app", polingual: "com.polingual.app" };

export interface AppleKey {
  teamId: string;
  keyId: string;
  privateKey: string;
}

export interface StoredAppleToken {
  clientId: string;
  refreshToken: string;
}

export interface AppleTokenDeps {
  key: () => AppleKey | null;
  fetch: (url: string, init: { method: "POST"; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
  save: (userId: string, token: StoredAppleToken) => Promise<void>;
  load: (userId: string) => Promise<StoredAppleToken | null>;
  remove: (userId: string) => Promise<void>;
  nowSeconds: () => number;
}

export function appleKeyFromEnv(env: Record<string, string | undefined>): AppleKey | null {
  const { APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId, APPLE_PRIVATE_KEY: raw } = env;
  if (!teamId || !keyId || !raw) return null;
  return { teamId, keyId, privateKey: raw.replace(/\\n/g, "\n") };
}

const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");

export function appleClientSecret(key: AppleKey, clientId: string, nowSeconds: number): string {
  const head = b64({ alg: "ES256", kid: key.keyId });
  const body = b64({ iss: key.teamId, iat: nowSeconds, exp: nowSeconds + 300, aud: "https://appleid.apple.com", sub: clientId });
  const sig = sign("sha256", Buffer.from(`${head}.${body}`), { key: createPrivateKey(key.privateKey), dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${sig.toString("base64url")}`;
}

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString();
const FORM_HEADERS = { "content-type": "application/x-www-form-urlencoded" };

export async function exchangeAppleCode(deps: AppleTokenDeps, userId: string, app: string, code: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const key = deps.key();
  if (!key) return { ok: false, reason: "apple_key_missing" };
  const clientId = APPLE_CLIENT_IDS[app] ?? APPLE_CLIENT_IDS.bucket;
  const secret = appleClientSecret(key, clientId, deps.nowSeconds());
  const res = await deps.fetch(APPLE_TOKEN_URL, { method: "POST", headers: FORM_HEADERS, body: form({ client_id: clientId, client_secret: secret, code, grant_type: "authorization_code" }) });
  if (!res.ok) return { ok: false, reason: `apple_token_${res.status}` };
  const refresh = ((await res.json()) as { refresh_token?: unknown }).refresh_token;
  if (typeof refresh !== "string" || !refresh) return { ok: false, reason: "apple_token_no_refresh" };
  await deps.save(userId, { clientId, refreshToken: refresh });
  return { ok: true };
}

export async function revokeAppleToken(deps: AppleTokenDeps, userId: string): Promise<{ revoked: boolean; reason?: string }> {
  const stored = await deps.load(userId);
  if (!stored) return { revoked: false, reason: "none_stored" };
  const key = deps.key();
  if (!key) return { revoked: false, reason: "apple_key_missing" };
  const secret = appleClientSecret(key, stored.clientId, deps.nowSeconds());
  const res = await deps.fetch(APPLE_REVOKE_URL, { method: "POST", headers: FORM_HEADERS, body: form({ client_id: stored.clientId, client_secret: secret, token: stored.refreshToken, token_type_hint: "refresh_token" }) });
  if (!res.ok) return { revoked: false, reason: `apple_revoke_${res.status}` };
  await deps.remove(userId);
  return { revoked: true };
}
