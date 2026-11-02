import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { connect, type ClientHttp2Session } from "node:http2";

export type PushEnv = "sandbox" | "production";
export type CheerPushKind = "cheer" | "nudge";

export const PUSH_BUNDLES = ["foundation.bucket.app", "com.polingual.app"] as const;
export const TOKEN_TTL_MS = 50 * 60_000;

export interface ApnsConfig {
  key: string;
  keyId: string;
  teamId: string;
}

export interface PushDevice {
  token: string;
  env: PushEnv;
  bundle_id: string;
}

export interface ApnsResponse {
  status: number;
  reason: string | null;
}

export interface ApnsTransport {
  send(origin: string, path: string, headers: Record<string, string>, body: string): Promise<ApnsResponse>;
  close(): void;
}

export interface PushPayload {
  aps: { alert: { body: string }; sound: string; "thread-id": string };
  group: string;
}

export interface SendResult {
  sent: number;
  pruned: string[];
  moved: string[];
  failed: number;
}

export function apnsConfig(env: Record<string, string | undefined> = process.env): ApnsConfig | null {
  const key = env.APNS_KEY?.trim();
  const keyId = env.APNS_KEY_ID?.trim();
  const teamId = env.APNS_TEAM_ID?.trim();
  if (!key || !keyId || !teamId) return null;
  return { key: key.replace(/\\n/g, "\n").trim(), keyId, teamId };
}

export function apnsOrigin(env: PushEnv): string {
  return env === "production" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
}

export function normalizePushEnv(v: unknown): PushEnv | null {
  return v === "sandbox" || v === "production" ? v : null;
}

export function normalizeBundleId(v: unknown): string | null {
  return typeof v === "string" && (PUSH_BUNDLES as readonly string[]).includes(v) ? v : null;
}

export function normalizeDeviceToken(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return /^[0-9a-f]{64,200}$/.test(t) ? t : null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signJwt(cfg: ApnsConfig, nowMs: number, key: KeyObject = createPrivateKey(cfg.key)): string {
  const head = b64url(JSON.stringify({ alg: "ES256", kid: cfg.keyId }));
  const claims = b64url(JSON.stringify({ iss: cfg.teamId, iat: Math.floor(nowMs / 1000) }));
  const input = `${head}.${claims}`;
  const sig = sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" });
  return `${input}.${b64url(sig)}`;
}

let cached: { jwt: string; at: number; keyId: string; teamId: string } | null = null;

export function providerToken(cfg: ApnsConfig, nowMs: number): string {
  if (cached && cached.keyId === cfg.keyId && cached.teamId === cfg.teamId && nowMs - cached.at < TOKEN_TTL_MS) return cached.jwt;
  const jwt = signJwt(cfg, nowMs);
  cached = { jwt, at: nowMs, keyId: cfg.keyId, teamId: cfg.teamId };
  return jwt;
}

export function resetTokenCache(): void {
  cached = null;
}

export function cheerText(kind: CheerPushKind, name: string): string {
  return kind === "cheer" ? `${name} cheered you on` : `${name} nudged you: time for today's reviews`;
}

export function cheerPayload(kind: CheerPushKind, name: string, groupId: string): PushPayload {
  return { aps: { alert: { body: cheerText(kind, name) }, sound: "default", "thread-id": groupId }, group: groupId };
}

export function shouldPrune(res: ApnsResponse): boolean {
  return res.status === 410 || res.reason === "Unregistered";
}

export function otherEnv(env: PushEnv): PushEnv {
  return env === "production" ? "sandbox" : "production";
}

export async function sendPush(
  devices: PushDevice[],
  payload: PushPayload,
  opts: {
    cfg: ApnsConfig;
    prune: (token: string) => Promise<void>;
    setEnv: (token: string, env: PushEnv) => Promise<void>;
    transport?: ApnsTransport;
    now?: number;
  },
): Promise<SendResult> {
  const result: SendResult = { sent: 0, pruned: [], moved: [], failed: 0 };
  if (devices.length === 0) return result;
  const transport = opts.transport ?? http2Transport();
  const jwt = providerToken(opts.cfg, opts.now ?? Date.now());
  const body = JSON.stringify(payload);
  try {
    await Promise.all(
      devices.map(async (d) => {
        try {
          const post = (env: PushEnv) =>
            transport.send(apnsOrigin(env), `/3/device/${d.token}`, {
              authorization: `bearer ${jwt}`,
              "apns-topic": d.bundle_id,
              "apns-push-type": "alert",
              "apns-priority": "10",
            }, body);
          const res = await post(d.env);
          if (res.status === 200) {
            result.sent += 1;
            return;
          }
          if (res.reason === "BadDeviceToken") {
            const retry = await post(otherEnv(d.env)).catch(() => null);
            if (retry?.status === 200) {
              result.sent += 1;
              result.moved.push(d.token);
              await opts.setEnv(d.token, otherEnv(d.env)).catch(() => undefined);
              return;
            }
            result.failed += 1;
            result.pruned.push(d.token);
            await opts.prune(d.token).catch(() => undefined);
            return;
          }
          result.failed += 1;
          if (shouldPrune(res)) {
            result.pruned.push(d.token);
            await opts.prune(d.token).catch(() => undefined);
          }
        } catch {
          result.failed += 1;
        }
      }),
    );
  } finally {
    transport.close();
  }
  return result;
}

export interface PushStore {
  devices(userId: string): Promise<PushDevice[]>;
  prune(token: string): Promise<void>;
  setEnv(token: string, env: PushEnv): Promise<void>;
}

export async function pushCheer(
  cheer: { group_id: string; to_id: string; kind: CheerPushKind },
  fromName: string,
  deps: { cfg: ApnsConfig | null; store: PushStore; transport?: ApnsTransport; now?: number },
): Promise<SendResult | null> {
  if (!deps.cfg) return null;
  try {
    const devices = await deps.store.devices(cheer.to_id);
    return await sendPush(devices, cheerPayload(cheer.kind, fromName, cheer.group_id), {
      cfg: deps.cfg,
      prune: deps.store.prune,
      setEnv: deps.store.setEnv,
      transport: deps.transport,
      now: deps.now,
    });
  } catch (err) {
    console.error("[academy/push] cheer:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function withBudget<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([work.catch(() => null), cap]).finally(() => clearTimeout(timer));
}

export function http2Transport(timeoutMs = 8000): ApnsTransport {
  const sessions = new Map<string, ClientHttp2Session>();
  const session = (origin: string): ClientHttp2Session => {
    const open = sessions.get(origin);
    if (open && !open.closed && !open.destroyed) return open;
    const s = connect(origin);
    s.on("error", () => sessions.delete(origin));
    sessions.set(origin, s);
    return s;
  };
  return {
    send(origin, path, headers, body) {
      return new Promise((resolve, reject) => {
        const req = session(origin).request({ ":method": "POST", ":path": path, "content-type": "application/json", ...headers });
        let status = 0;
        let data = "";
        req.setTimeout(timeoutMs, () => req.close());
        req.setEncoding("utf8");
        req.on("response", (h) => {
          status = Number(h[":status"]) || 0;
        });
        req.on("data", (chunk: string) => {
          data += chunk;
        });
        req.on("end", () => {
          let reason: string | null = null;
          try {
            reason = data ? ((JSON.parse(data) as { reason?: string }).reason ?? null) : null;
          } catch {
            reason = null;
          }
          resolve({ status, reason });
        });
        req.on("close", () => resolve({ status, reason: null }));
        req.on("error", reject);
        req.end(body);
      });
    },
    close() {
      sessions.forEach((s) => s.close());
      sessions.clear();
    },
  };
}
