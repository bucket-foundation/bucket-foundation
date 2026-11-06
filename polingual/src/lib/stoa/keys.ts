import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as edSign,
  timingSafeEqual,
  type KeyObject,
} from "node:crypto";
import { eventMessage, type SignedEvent } from "./event";

export type StoaEnv = Record<string, string | undefined>;
export type PlayerClaims = { typ: "player"; rid: string; pid: string; tv: number; iat: number; exp: number };
export type HostClaims = { typ: "host"; rid: string; uid: string; iat: number; exp: number };
export type RoomClaims = PlayerClaims | HostClaims;
export type RoomKeys = { signKey: string; verifyKey: string };
export type PlayerAccess = "ok" | "removed" | "stale";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SEALED = /^v1\.([A-Za-z0-9_-]+)$/;
const SECRET = /^[A-Za-z0-9+/_-]{43,}={0,2}$/;
export const PREV_WINDOW_MS = 3 * 3_600_000;

export class StoaConfigError extends Error {}

export function secretOk(value: string | undefined): value is string {
  if (!value || !SECRET.test(value)) return false;
  const bytes = Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return bytes.length >= 32 && new Set(bytes).size >= 16;
}

export function roomSecrets(env: StoaEnv, now = Date.now()): string[] {
  const current = env.STOA_ROOM_SECRET?.trim();
  if (!secretOk(current)) throw new StoaConfigError("STOA_ROOM_SECRET must be base64 of 32 or more random bytes");
  const prev = env.STOA_ROOM_SECRET_PREV?.trim();
  const until = Date.parse(env.STOA_ROOM_SECRET_PREV_UNTIL?.trim() ?? "");
  const open = Number.isFinite(until) && now < until && until - now <= PREV_WINDOW_MS;
  return open && secretOk(prev) && prev !== current ? [current, prev] : [current];
}

export function stoaConfigured(env: StoaEnv): boolean {
  try {
    roomSecrets(env);
    return true;
  } catch {
    return false;
  }
}

function roomKey(secret: string, roomId: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, roomId, "stoa/room-key/v1", 32));
}

function tokenKey(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "stoa", "stoa/room-token/v1", 32));
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function sealSignKey(roomId: string, privateKey: KeyObject, env: StoaEnv): string {
  const [secret] = roomSecrets(env);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", roomKey(secret, roomId), iv);
  cipher.setAAD(Buffer.from(roomId));
  const der = privateKey.export({ format: "der", type: "pkcs8" });
  const ct = Buffer.concat([cipher.update(der), cipher.final()]);
  return `v1.${b64url(Buffer.concat([iv, cipher.getAuthTag(), ct]))}`;
}

export function createRoomKeys(roomId: string, env: StoaEnv): RoomKeys {
  if (!UUID.test(roomId)) throw new Error("room id must be a lowercase uuid");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" }) as { x: string };
  return { signKey: sealSignKey(roomId, privateKey, env), verifyKey: jwk.x };
}

export function openSignKey(roomId: string, sealed: string, env: StoaEnv, now = Date.now()): KeyObject | null {
  const m = SEALED.exec(sealed);
  if (!m) return null;
  const raw = Buffer.from(m[1], "base64url");
  if (raw.length < 29) return null;
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  for (const secret of roomSecrets(env, now)) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", roomKey(secret, roomId), iv);
      decipher.setAAD(Buffer.from(roomId));
      decipher.setAuthTag(tag);
      const der = Buffer.concat([decipher.update(ct), decipher.final()]);
      return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
    } catch {
      continue;
    }
  }
  return null;
}

export function signEvent(roomId: string, seq: number, type: string, issuedAt: number, payload: unknown, key: KeyObject): SignedEvent {
  const body = JSON.stringify(payload ?? null);
  const hash = createHash("sha256").update(body).digest("hex");
  const sig = edSign(null, Buffer.from(eventMessage(roomId, seq, type, issuedAt, hash)), key);
  return { room_id: roomId, seq, type, issued_at: issuedAt, body, sig: b64url(sig) };
}

const HEADER = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));

function mac(secret: string, data: string): Buffer {
  return createHmac("sha256", tokenKey(secret)).update(data).digest();
}

export function issueToken(claims: RoomClaims, env: StoaEnv): string {
  const [secret] = roomSecrets(env);
  const body = `${HEADER}.${b64url(Buffer.from(JSON.stringify(claims)))}`;
  return `${body}.${b64url(mac(secret, body))}`;
}

export function playerToken(rid: string, pid: string, tv: number, expiresAt: number, env: StoaEnv, now = Date.now()): string {
  return issueToken({ typ: "player", rid, pid, tv, iat: Math.floor(now / 1000), exp: Math.floor(expiresAt / 1000) }, env);
}

export function hostToken(rid: string, uid: string, expiresAt: number, env: StoaEnv, now = Date.now()): string {
  return issueToken({ typ: "host", rid, uid, iat: Math.floor(now / 1000), exp: Math.floor(expiresAt / 1000) }, env);
}

function validClaims(c: unknown): c is RoomClaims {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  if (typeof o.rid !== "string" || !UUID.test(o.rid) || !Number.isSafeInteger(o.exp) || !Number.isSafeInteger(o.iat)) return false;
  if (o.typ === "player") return typeof o.pid === "string" && UUID.test(o.pid) && Number.isSafeInteger(o.tv) && (o.tv as number) > 0;
  if (o.typ === "host") return typeof o.uid === "string" && UUID.test(o.uid);
  return false;
}

export function readToken(token: string | null | undefined, env: StoaEnv, now = Date.now()): RoomClaims | null {
  if (!token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== HEADER) return null;
  const sig = Buffer.from(parts[2], "base64url");
  const data = `${parts[0]}.${parts[1]}`;
  const signed = roomSecrets(env, now).some((secret) => {
    const want = mac(secret, data);
    return sig.length === want.length && timingSafeEqual(sig, want);
  });
  if (!signed) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!validClaims(claims)) return null;
  if (claims.exp * 1000 <= now) return null;
  return claims;
}

export function playerAccess(claims: PlayerClaims, player: { removed: boolean } | null, roomTokenVersion: number): PlayerAccess {
  if (!player || player.removed) return "removed";
  return claims.tv === roomTokenVersion ? "ok" : "stale";
}

export function bearer(header: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return m ? m[1] : null;
}
