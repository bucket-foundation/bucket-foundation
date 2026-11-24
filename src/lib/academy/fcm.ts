import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { cheerText, streakText, type CheerPushKind, type SendResult } from "./apns";

export const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
export const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
export const ACCESS_TOKEN_SKEW_MS = 5 * 60_000;

export interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

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

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  status: number;
  ok: boolean;
  text(): Promise<string>;
}>;

export interface FcmStore {
  devices(userId: string): Promise<FcmDevice[]>;
  prune(token: string): Promise<void>;
}

export function fcmConfig(env: Record<string, string | undefined> = process.env): FcmConfig | null {
  const raw = env.FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
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
  return { projectId, clientEmail, privateKey, tokenUri };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signAssertion(cfg: FcmConfig, nowMs: number, key: KeyObject = createPrivateKey(cfg.privateKey)): string {
  const iat = Math.floor(nowMs / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: cfg.clientEmail, scope: FCM_SCOPE, aud: cfg.tokenUri, iat, exp: iat + 3600 }));
  const input = `${head}.${claims}`;
  return `${input}.${b64url(sign("sha256", Buffer.from(input), key))}`;
}

let cached: { token: string; expiresAt: number; clientEmail: string } | null = null;

export function resetAccessTokenCache(): void {
  cached = null;
}

export async function accessToken(cfg: FcmConfig, fetchFn: FetchLike, nowMs: number): Promise<string> {
  if (cached && cached.clientEmail === cfg.clientEmail && nowMs < cached.expiresAt - ACCESS_TOKEN_SKEW_MS) return cached.token;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: signAssertion(cfg, nowMs),
  }).toString();
  const res = await fetchFn(cfg.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
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
  return code === "UNREGISTERED" || code === "INVALID_ARGUMENT";
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
  const bearer = await accessToken(opts.cfg, fetchFn, opts.now ?? Date.now());
  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(opts.cfg.projectId)}/messages:send`;
  await Promise.all(
    devices.map(async (d) => {
      try {
        const res = await fetchFn(url, {
          method: "POST",
          headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
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
