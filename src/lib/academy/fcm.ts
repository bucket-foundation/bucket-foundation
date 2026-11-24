import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { cheerText, streakText, type CheerPushKind, type SendResult } from "./apns";

export const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
export const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
export const ACCESS_TOKEN_SKEW_MS = 5 * 60_000;

export const STS_TOKEN_URL = "https://sts.googleapis.com/v1/token";
export const IAM_CREDENTIALS_URL = "https://iamcredentials.googleapis.com/v1";
export const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
export const OIDC_TOKEN_SKEW_MS = 60_000;
export const DEFAULT_FCM_PROJECT_ID = "bucket-foundation";
export const DEFAULT_GCP_PROJECT_NUMBER = "201543151655";
export const DEFAULT_WIF_POOL_ID = "vercel";
export const DEFAULT_WIF_PROVIDER_ID = "vercel";
export const DEFAULT_FCM_SERVICE_ACCOUNT_EMAIL = "firebase-adminsdk-fbsvc@bucket-foundation.iam.gserviceaccount.com";

export interface FcmKeyConfig {
  auth: "key";
  projectId: string;
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

export interface FcmOidcConfig {
  auth: "oidc";
  projectId: string;
  audience: string;
  serviceAccountEmail: string;
  oidcToken?: () => string | null;
}

export type FcmConfig = FcmKeyConfig | FcmOidcConfig;

export interface FcmDevice {
  token: string;
  bundle_id: string;
}

export interface FcmMessage {
  title?: string;
  body: string;
  tag: string;
  data: Record<string, string>;
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  status: number;
  ok: boolean;
  text(): Promise<string>;
}>;

export interface FcmStore {
  devices(userId: string): Promise<FcmDevice[]>;
  prune(token: string): Promise<void>;
}

function envOr(env: Record<string, string | undefined>, key: string, fallback: string): string {
  return env[key]?.trim() || fallback;
}

export function wifAudience(env: Record<string, string | undefined> = process.env): string {
  const number = envOr(env, "GCP_PROJECT_NUMBER", DEFAULT_GCP_PROJECT_NUMBER);
  const pool = envOr(env, "GCP_WIF_POOL_ID", DEFAULT_WIF_POOL_ID);
  const provider = envOr(env, "GCP_WIF_PROVIDER_ID", DEFAULT_WIF_PROVIDER_ID);
  return `//iam.googleapis.com/projects/${number}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`;
}

export function fcmOidcConfig(env: Record<string, string | undefined> = process.env): FcmOidcConfig | null {
  const onVercel = env.VERCEL === "1" || !!env.VERCEL_OIDC_TOKEN?.trim() || env.FCM_AUTH === "oidc";
  if (!onVercel) return null;
  return {
    auth: "oidc",
    projectId: envOr(env, "FCM_PROJECT_ID", DEFAULT_FCM_PROJECT_ID),
    audience: wifAudience(env),
    serviceAccountEmail: envOr(env, "FCM_SERVICE_ACCOUNT_EMAIL", DEFAULT_FCM_SERVICE_ACCOUNT_EMAIL),
  };
}

export function vercelOidcToken(env: Record<string, string | undefined> = process.env): string | null {
  const ctx = (globalThis as Record<symbol, unknown>)[Symbol.for("@vercel/request-context")] as
    | { get?: () => { headers?: Record<string, string | string[] | undefined> } | undefined }
    | undefined;
  const header = ctx?.get?.()?.headers?.["x-vercel-oidc-token"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return fromHeader?.trim() || env.VERCEL_OIDC_TOKEN?.trim() || null;
}

export function fcmConfig(env: Record<string, string | undefined> = process.env): FcmConfig | null {
  const raw = env.FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return fcmOidcConfig(env);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const projectId = typeof parsed.project_id === "string" ? parsed.project_id.trim() : "";
  const clientEmail = typeof parsed.client_email === "string" ? parsed.client_email.trim() : "";
  const privateKey = typeof parsed.private_key === "string" ? parsed.private_key.replace(/\\n/g, "\n").trim() : "";
  const tokenUri = typeof parsed.token_uri === "string" && parsed.token_uri.startsWith("https://") ? parsed.token_uri : GOOGLE_TOKEN_URI;
  if (!projectId || !clientEmail || !privateKey) return null;
  return { auth: "key", projectId, clientEmail, privateKey, tokenUri };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signAssertion(cfg: FcmKeyConfig, nowMs: number, key: KeyObject = createPrivateKey(cfg.privateKey)): string {
  const iat = Math.floor(nowMs / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: cfg.clientEmail, scope: FCM_SCOPE, aud: cfg.tokenUri, iat, exp: iat + 3600 }));
  const input = `${head}.${claims}`;
  return `${input}.${b64url(sign("sha256", Buffer.from(input), key))}`;
}

let cached: { token: string; expiresAt: number; clientEmail: string } | null = null;
let oidcCached: { token: string; expiresAt: number; key: string } | null = null;

export function resetAccessTokenCache(): void {
  cached = null;
  oidcCached = null;
}

async function postJson(fetchFn: FetchLike, url: string, headers: Record<string, string>, body: string, label: string): Promise<Record<string, unknown>> {
  const res = await fetchFn(url, { method: "POST", headers, signal: AbortSignal.timeout(2500), body });
  if (!res.ok) throw new Error(`fcm ${label}: ${res.status}`);
  try {
    return JSON.parse(await res.text()) as Record<string, unknown>;
  } catch {
    throw new Error(`fcm ${label}: bad json`);
  }
}

export async function oidcAccessToken(cfg: FcmOidcConfig, fetchFn: FetchLike, nowMs: number): Promise<string> {
  const key = `${cfg.audience}|${cfg.serviceAccountEmail}`;
  if (oidcCached && oidcCached.key === key && nowMs < oidcCached.expiresAt - OIDC_TOKEN_SKEW_MS) return oidcCached.token;
  const subject = (cfg.oidcToken ?? vercelOidcToken)();
  if (!subject) throw new Error("fcm sts: no vercel oidc token");
  const sts = await postJson(
    fetchFn,
    STS_TOKEN_URL,
    { "content-type": "application/json" },
    JSON.stringify({
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: cfg.audience,
      scope: CLOUD_PLATFORM_SCOPE,
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      subjectToken: subject,
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
    }),
    "sts",
  );
  if (typeof sts.access_token !== "string" || !sts.access_token) throw new Error("fcm sts: no access_token");
  const iam = await postJson(
    fetchFn,
    `${IAM_CREDENTIALS_URL}/projects/-/serviceAccounts/${encodeURIComponent(cfg.serviceAccountEmail)}:generateAccessToken`,
    { authorization: `Bearer ${sts.access_token}`, "content-type": "application/json" },
    JSON.stringify({ scope: [FCM_SCOPE], lifetime: "3600s" }),
    "impersonate",
  );
  if (typeof iam.accessToken !== "string" || !iam.accessToken) throw new Error("fcm impersonate: no accessToken");
  const expiresAt = typeof iam.expireTime === "string" ? Date.parse(iam.expireTime) : NaN;
  if (!Number.isFinite(expiresAt)) throw new Error("fcm impersonate: bad expireTime");
  oidcCached = { token: iam.accessToken, expiresAt, key };
  return iam.accessToken;
}

export function fcmAccessToken(cfg: FcmConfig, fetchFn: FetchLike, nowMs: number): Promise<string> {
  return cfg.auth === "oidc" ? oidcAccessToken(cfg, fetchFn, nowMs) : accessToken(cfg, fetchFn, nowMs);
}

export async function accessToken(cfg: FcmKeyConfig, fetchFn: FetchLike, nowMs: number): Promise<string> {
  if (cached && cached.clientEmail === cfg.clientEmail && nowMs < cached.expiresAt - ACCESS_TOKEN_SKEW_MS) return cached.token;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: signAssertion(cfg, nowMs),
  }).toString();
  const res = await fetchFn(cfg.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(2500),
    body,
  });
  if (!res.ok) throw new Error(`fcm oauth: ${res.status}`);
  const json = JSON.parse(await res.text()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("fcm oauth: no access_token");
  cached = { token: json.access_token, expiresAt: nowMs + (json.expires_in ?? 3600) * 1000, clientEmail: cfg.clientEmail };
  return json.access_token;
}

export function fcmErrorCode(status: number, text: string): string | null {
  try {
    const err = (JSON.parse(text) as { error?: { status?: string; details?: { errorCode?: string }[] } }).error;
    const detail = err?.details?.find((d) => typeof d.errorCode === "string")?.errorCode;
    return detail ?? err?.status ?? null;
  } catch {
    return status === 404 ? "UNREGISTERED" : null;
  }
}

export function shouldPruneFcm(code: string | null): boolean {
  return code === "UNREGISTERED";
}

export function fcmBody(token: string, msg: FcmMessage): string {
  return JSON.stringify({
    message: {
      token,
      notification: msg.title ? { title: msg.title, body: msg.body } : { body: msg.body },
      data: msg.data,
      android: { priority: "HIGH", notification: { tag: msg.tag, sound: "default" } },
    },
  });
}

export async function sendFcm(
  devices: FcmDevice[],
  msg: FcmMessage,
  opts: { cfg: FcmConfig; prune: (token: string) => Promise<void>; fetch?: FetchLike; now?: number },
): Promise<SendResult> {
  const result: SendResult = { sent: 0, pruned: [], moved: [], failed: 0 };
  if (devices.length === 0) return result;
  const fetchFn = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const bearer = await fcmAccessToken(opts.cfg, fetchFn, opts.now ?? Date.now());
  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(opts.cfg.projectId)}/messages:send`;
  await Promise.all(
    devices.map(async (d) => {
      try {
        const res = await fetchFn(url, {
          method: "POST",
          headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
          signal: AbortSignal.timeout(2500),
          body: fcmBody(d.token, msg),
        });
        if (res.ok) {
          result.sent += 1;
          return;
        }
        result.failed += 1;
        if (shouldPruneFcm(fcmErrorCode(res.status, await res.text().catch(() => "")))) {
          result.pruned.push(d.token);
          await opts.prune(d.token).catch(() => undefined);
        }
      } catch {
        result.failed += 1;
      }
    }),
  );
  return result;
}

export function cheerMessage(kind: CheerPushKind, name: string, groupId: string): FcmMessage {
  return { body: cheerText(kind, name), tag: groupId, data: { group: groupId, kind } };
}

export function streakMessage(streak: number): FcmMessage {
  return { body: streakText(streak), tag: "streak", data: { group: "streak" } };
}

async function pushToUser(
  userId: string,
  msg: FcmMessage,
  label: string,
  deps: { cfg: FcmConfig | null; store: FcmStore; fetch?: FetchLike; now?: number },
): Promise<SendResult | null> {
  if (!deps.cfg) return null;
  try {
    const devices = await deps.store.devices(userId);
    return await sendFcm(devices, msg, { cfg: deps.cfg, prune: deps.store.prune, fetch: deps.fetch, now: deps.now });
  } catch (err) {
    console.error(`[academy/push] fcm ${label}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export function pushFcmCheer(
  cheer: { group_id: string; to_id: string; kind: CheerPushKind },
  fromName: string,
  deps: { cfg: FcmConfig | null; store: FcmStore; fetch?: FetchLike; now?: number },
): Promise<SendResult | null> {
  return pushToUser(cheer.to_id, cheerMessage(cheer.kind, fromName, cheer.group_id), "cheer", deps);
}

export function pushFcmStreak(
  userId: string,
  streak: number,
  deps: { cfg: FcmConfig | null; store: FcmStore; fetch?: FetchLike; now?: number },
): Promise<SendResult | null> {
  return pushToUser(userId, streakMessage(streak), "streak", deps);
}

export function mergeResults(a: SendResult | null, b: SendResult | null): SendResult | null {
  if (!a) return b;
  if (!b) return a;
  return { sent: a.sent + b.sent, pruned: [...a.pruned, ...b.pruned], moved: [...a.moved, ...b.moved], failed: a.failed + b.failed };
}
