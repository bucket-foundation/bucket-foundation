import { createHash, randomBytes, randomInt } from "node:crypto";
import { verifyEd25519 } from "./device-sign";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const POLL_INTERVAL_S = 5;
export const TOKEN_SKEW_MS = 60_000;
export const USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DEVICE_KINDS = ["desktop", "cli", "mobile"] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

const PUBKEY_RE = /^[A-Za-z0-9+/]{43}=$/;
const USER_CODE_RE = /^[A-Z0-9]{8}$/;
const DEVICE_CODE_RE = /^[A-Za-z0-9_-]{43}$/;

export interface CodeRow {
  device_code_hash: string;
  user_code: string;
  device_id: string;
  public_key: string;
  kind: DeviceKind;
  label: string | null;
  user_id: string | null;
  status: "pending" | "approved" | "consumed" | "denied";
  expires_at: string;
}

export interface MintedSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  session_id: string;
}

export interface DeviceFlowDeps {
  now: () => number;
  insertCode: (row: CodeRow) => Promise<void>;
  approveCode: (userCode: string, uid: string, nowIso: string) => Promise<CodeRow | null>;
  findCode: (hash: string) => Promise<CodeRow | null>;
  consumeCode: (hash: string) => Promise<CodeRow | null>;
  registerDevice: (uid: string, row: CodeRow, sessionId: string) => Promise<boolean>;
  endSession: (accessToken: string) => Promise<void>;
  mintSession: (uid: string) => Promise<MintedSession>;
  revokeDevice: (uid: string, deviceId: string) => Promise<boolean>;
  signOutOthers: (accessToken: string) => Promise<void>;
  publicConfig: () => { supabase_url: string; anon_key: string };
}

export type FlowResult = { status: number; body: Record<string, unknown> };

export function deviceIdFor(publicKeyB64: string): string {
  return "dev_" + createHash("sha256").update(Buffer.from(publicKeyB64, "base64")).digest("hex").slice(0, 20);
}

export function hashCode(deviceCode: string): string {
  return createHash("sha256").update(deviceCode).digest("hex");
}

export function newUserCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  return s;
}

export function tokenProofMessage(deviceCode: string, ts: number): string {
  return `bkt-device-token\n${deviceCode}\n${ts}`;
}

export function normalizeUserCode(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const c = v.toUpperCase().replace(/[\s-]/g, "");
  return USER_CODE_RE.test(c) ? c : null;
}

export function createDeviceFlow(deps: DeviceFlowDeps) {
  async function start(body: unknown, verificationUri: string): Promise<FlowResult> {
    const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    const pk = typeof b.public_key === "string" ? b.public_key : "";
    const kind = DEVICE_KINDS.includes(b.kind as DeviceKind) ? (b.kind as DeviceKind) : null;
    const label = typeof b.label === "string" ? b.label.slice(0, 80) : null;
    if (!PUBKEY_RE.test(pk) || Buffer.from(pk, "base64").length !== 32 || !kind) return { status: 400, body: { error: "bad_request" } };
    if (b.device_id !== deviceIdFor(pk)) return { status: 400, body: { error: "device_id_mismatch" } };
    const deviceCode = randomBytes(32).toString("base64url");
    const userCode = newUserCode();
    await deps.insertCode({
      device_code_hash: hashCode(deviceCode),
      user_code: userCode,
      device_id: b.device_id as string,
      public_key: pk,
      kind,
      label,
      user_id: null,
      status: "pending",
      expires_at: new Date(deps.now() + CODE_TTL_MS).toISOString(),
    });
    return { status: 200, body: { device_code: deviceCode, user_code: userCode, verification_uri: verificationUri, expires_in: CODE_TTL_MS / 1000, interval: POLL_INTERVAL_S } };
  }

  async function approve(uid: string, body: unknown): Promise<FlowResult> {
    const code = normalizeUserCode((body as { user_code?: unknown } | null)?.user_code);
    if (!code) return { status: 400, body: { error: "bad_request" } };
    const row = await deps.approveCode(code, uid, new Date(deps.now()).toISOString());
    if (!row) return { status: 404, body: { error: "unknown_or_expired_code" } };
    return { status: 200, body: { ok: true, device_id: row.device_id, kind: row.kind, label: row.label } };
  }

  async function token(body: unknown): Promise<FlowResult> {
    const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    const deviceCode = typeof b.device_code === "string" ? b.device_code : "";
    const ts = typeof b.ts === "number" ? b.ts : NaN;
    const sig = typeof b.sig === "string" ? b.sig : "";
    if (!DEVICE_CODE_RE.test(deviceCode) || !Number.isSafeInteger(ts) || !sig) return { status: 400, body: { error: "bad_request" } };
    if (Math.abs(deps.now() - ts) > TOKEN_SKEW_MS) return { status: 400, body: { error: "stale_proof" } };
    const hash = hashCode(deviceCode);
    const row = await deps.findCode(hash);
    if (!row || Date.parse(row.expires_at) < deps.now() || row.status === "consumed" || row.status === "denied") return { status: 400, body: { error: "expired_token" } };
    if (!verifyEd25519(row.public_key, tokenProofMessage(deviceCode, ts), sig)) return { status: 401, body: { error: "bad_proof" } };
    if (row.status === "pending") return { status: 428, body: { error: "authorization_pending", interval: POLL_INTERVAL_S } };
    const taken = await deps.consumeCode(hash);
    if (!taken || !taken.user_id) return { status: 400, body: { error: "expired_token" } };
    const session = await deps.mintSession(taken.user_id);
    if (!(await deps.registerDevice(taken.user_id, taken, session.session_id))) {
      await deps.endSession(session.access_token).catch((e) => console.error("device token end-session failed", e));
      return { status: 403, body: { error: "device_revoked" } };
    }
    const { session_id: _sid, ...tokens } = session;
    return { status: 200, body: { ...tokens, user_id: taken.user_id, device_id: taken.device_id, ...deps.publicConfig() } };
  }

  async function revoke(uid: string, accessToken: string | null, body: unknown): Promise<FlowResult> {
    const id = (body as { device_id?: unknown } | null)?.device_id;
    if (typeof id !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(id)) return { status: 400, body: { error: "bad_request" } };
    const revoked = await deps.revokeDevice(uid, id);
    if (!revoked) return { status: 404, body: { error: "unknown_device" } };
    let signedOut = false;
    if (accessToken) {
      try {
        await deps.signOutOthers(accessToken);
        signedOut = true;
      } catch (e) {
        console.error("device revoke sign-out failed", e);
      }
    }
    return { status: 200, body: { ok: true, revoked: id, signed_out_others: signedOut } };
  }

  return { start, approve, token, revoke };
}
