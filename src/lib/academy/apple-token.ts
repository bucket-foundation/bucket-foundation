import { createCipheriv, createDecipheriv, createPrivateKey, randomBytes, sign } from "node:crypto";

export const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
export const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";
export const APPLE_CLIENT_IDS: Record<string, string> = { bucket: "foundation.bucket.app", polingual: "com.polingual.app" };
export const APPLE_FETCH_TIMEOUT_MS = 8000;
export const PENDING_BATCH = 20;
export const MAX_REVOKE_ATTEMPTS = 5;
export const MAX_CREDENTIAL_WAIT_DAYS = 30;

export interface AppleKey {
  teamId: string;
  keyId: string;
  privateKey: string;
}

export interface StoredAppleToken {
  clientId: string;
  sealed: string;
}

export interface PendingRevoke extends StoredAppleToken {
  id: number;
  attempts: number;
  createdSeconds: number;
}

type FetchInit = { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal };

export interface AppleTokenDeps {
  key: () => AppleKey | null;
  encKey: () => Buffer | null;
  fetch: (url: string, init: FetchInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
  timeoutMs?: number;
  save: (userId: string, token: StoredAppleToken) => Promise<void>;
  list: (userId: string) => Promise<StoredAppleToken[]>;
  remove: (userId: string, clientId: string) => Promise<void>;
  addPending: (token: StoredAppleToken, reason: string) => Promise<void>;
  listPending: (limit: number) => Promise<PendingRevoke[]>;
  removePending: (id: number) => Promise<void>;
  bumpPending: (id: number, reason: string, failed: boolean) => Promise<void>;
  touchPending: (id: number, reason: string) => Promise<void>;
  log: (event: string, fields: Record<string, unknown>) => void;
  alert: (message: string) => void;
  nowSeconds: () => number;
}

export function appleKeyFromEnv(env: Record<string, string | undefined>): AppleKey | null {
  const { APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId, APPLE_PRIVATE_KEY: raw } = env;
  if (!teamId || !keyId || !raw) return null;
  return { teamId, keyId, privateKey: raw.replace(/\\n/g, "\n") };
}

export function encKeyFromEnv(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

export function sealToken(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function openToken(key: Buffer, sealed: string): string {
  const [v, iv, tag, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || ct === undefined) throw new Error("bad sealed token");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");

export function appleClientSecret(key: AppleKey, clientId: string, nowSeconds: number): string {
  const head = b64({ alg: "ES256", kid: key.keyId });
  const body = b64({ iss: key.teamId, iat: nowSeconds, exp: nowSeconds + 300, aud: "https://appleid.apple.com", sub: clientId });
  const sig = sign("sha256", Buffer.from(`${head}.${body}`), { key: createPrivateKey(key.privateKey), dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${sig.toString("base64url")}`;
}

const FORM_HEADERS = { "content-type": "application/x-www-form-urlencoded" };

async function postApple(deps: AppleTokenDeps, url: string, fields: Record<string, string>) {
  try {
    const res = await deps.fetch(url, { method: "POST", headers: FORM_HEADERS, body: new URLSearchParams(fields).toString(), signal: AbortSignal.timeout(deps.timeoutMs ?? APPLE_FETCH_TIMEOUT_MS) });
    if (res.ok) return { res, reason: null };
    const err = await res.json().then((b) => (b as { error?: unknown }).error, () => undefined);
    return { res, reason: typeof err === "string" && /^[a-z_]{1,40}$/.test(err) ? `http_${res.status}_${err}` : `http_${res.status}` };
  } catch (e) {
    return { res: null, reason: e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "fetch_error" };
  }
}

export async function exchangeAppleCode(deps: AppleTokenDeps, userId: string, app: string, code: string): Promise<{ ok: boolean; reason?: string }> {
  const done = (ok: boolean, reason?: string) => (deps.log("apple_exchange", { userId, app, ok, reason }), { ok, reason });
  if (!code) return done(false, "no_code");
  const enc = deps.encKey();
  if (!enc) return done(false, "enc_key_missing");
  const key = deps.key();
  if (!key) return done(false, "apple_key_missing");
  const clientId = APPLE_CLIENT_IDS[app] ?? APPLE_CLIENT_IDS.bucket;
  const { res, reason } = await postApple(deps, APPLE_TOKEN_URL, { client_id: clientId, client_secret: appleClientSecret(key, clientId, deps.nowSeconds()), code, grant_type: "authorization_code" });
  if (!res || reason) return done(false, reason ?? "fetch_error");
  const refresh = ((await res.json()) as { refresh_token?: unknown }).refresh_token;
  if (typeof refresh !== "string" || !refresh) return done(false, "no_refresh_token");
  await deps.save(userId, { clientId, sealed: sealToken(enc, refresh) });
  return done(true);
}

async function revokeSealed(deps: AppleTokenDeps, t: StoredAppleToken): Promise<string | null> {
  const enc = deps.encKey();
  if (!enc) return "enc_key_missing";
  const key = deps.key();
  if (!key) return "apple_key_missing";
  let token: string;
  try {
    token = openToken(enc, t.sealed);
  } catch {
    return "decrypt_failed";
  }
  const { reason } = await postApple(deps, APPLE_REVOKE_URL, { client_id: t.clientId, client_secret: appleClientSecret(key, t.clientId, deps.nowSeconds()), token, token_type_hint: "refresh_token" });
  return reason;
}

export const isPermanentRevokeError = (reason: string | null) => Boolean(reason?.endsWith("_invalid_grant"));
export const isCredentialRevokeError = (reason: string | null) => Boolean(reason?.endsWith("_invalid_client"));

export async function revokeForAccountDelete(deps: AppleTokenDeps, userId: string): Promise<{ failed: boolean }> {
  try {
    await revokeUserTokens(deps, userId);
    return { failed: false };
  } catch (e) {
    deps.log("apple_revoke_step_failed", { userId, ok: false, reason: e instanceof Error ? e.message : String(e) });
    return { failed: true };
  }
}

export interface RetryResult {
  revoked: number;
  failed: number;
  expired: number;
  alerts: string[];
}

export function retryCronReply(r: RetryResult): { status: number; body: RetryResult & { ok: boolean } } {
  return r.alerts.length ? { status: 503, body: { ok: false, ...r } } : { status: 200, body: { ok: true, ...r } };
}

export async function retryPendingRevokes(deps: AppleTokenDeps, limit = PENDING_BATCH): Promise<RetryResult> {
  let revoked = 0;
  let failed = 0;
  let expired = 0;
  const credentialClients = new Set<string>();
  const maxWait = MAX_CREDENTIAL_WAIT_DAYS * 86400;
  for (const p of await deps.listPending(limit)) {
    const reason = await revokeSealed(deps, p);
    if (reason && isCredentialRevokeError(reason)) {
      failed++;
      credentialClients.add(p.clientId);
      const giveUp = deps.nowSeconds() - p.createdSeconds > maxWait;
      if (giveUp) {
        expired++;
        await deps.bumpPending(p.id, reason, true);
      } else {
        await deps.touchPending(p.id, reason);
      }
      deps.log("apple_revoke_retry", { id: p.id, clientId: p.clientId, attempts: p.attempts, ok: false, reason, gaveUp: giveUp });
      continue;
    }
    const attempts = p.attempts + 1;
    const giveUp = Boolean(reason) && (attempts >= MAX_REVOKE_ATTEMPTS || isPermanentRevokeError(reason));
    if (reason) {
      failed++;
      await deps.bumpPending(p.id, reason, giveUp);
    } else {
      revoked++;
      await deps.removePending(p.id);
    }
    deps.log("apple_revoke_retry", { id: p.id, clientId: p.clientId, attempts, ok: !reason, reason, gaveUp: giveUp });
  }
  const alerts: string[] = [];
  if (credentialClients.size) alerts.push(`Apple revoke returned invalid_client for ${Array.from(credentialClients).join(", ")}: check APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY. Pending rows stay queued.`);
  if (expired) alerts.push(`${expired} Apple revoke rows waited over ${MAX_CREDENTIAL_WAIT_DAYS} days on invalid_client and were marked failed.`);
  for (const a of alerts) deps.alert(a);
  return { revoked, failed, expired, alerts };
}

export async function revokeUserTokens(deps: AppleTokenDeps, userId: string): Promise<{ revoked: number; pending: number }> {
  let revoked = 0;
  let pending = 0;
  for (const t of await deps.list(userId)) {
    const reason = await revokeSealed(deps, t);
    if (reason) {
      pending++;
      await deps.addPending(t, reason);
    } else {
      revoked++;
    }
    await deps.remove(userId, t.clientId);
    deps.log("apple_revoke", { userId, clientId: t.clientId, ok: !reason, reason, queued: Boolean(reason) });
  }
  return { revoked, pending };
}
