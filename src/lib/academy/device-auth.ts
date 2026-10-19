import { DEVICE_HEADER, DEVICE_TTL_MS, canonicalRequest, parseDeviceHeader, verifyEd25519 } from "./device-sign";

export type DeviceFailure = "header_required" | "malformed" | "stale" | "unknown_device" | "revoked" | "bad_signature" | "replay" | "lookup_failed";

export type DeviceCheck = { ok: true; deviceId: string | null } | { ok: false; reason: DeviceFailure };

export interface DeviceRecord {
  public_key: string | null;
  revoked_at: string | null;
}

export interface DeviceAuthDeps {
  now: () => number;
  lookup: (uid: string, deviceId: string) => Promise<DeviceRecord | null>;
  useNonce: (uid: string, deviceId: string, nonce: string, ttlSeconds: number) => Promise<boolean>;
  deviceSession: (uid: string, sessionId: string) => Promise<boolean>;
}

export function sessionIdOf(req: Request): string | null {
  const m = (req.headers.get("authorization") ?? "").match(/^Bearer\s+[^.]+\.([^.]+)\./i);
  if (!m) return null;
  try {
    const claims = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8")) as { session_id?: unknown };
    return typeof claims.session_id === "string" ? claims.session_id : null;
  } catch {
    return null;
  }
}

export async function verifyDevice(req: Request, uid: string, body: string, deps: DeviceAuthDeps): Promise<DeviceCheck> {
  const raw = req.headers.get(DEVICE_HEADER);
  if (raw === null) {
    const sid = sessionIdOf(req);
    if (!sid) return { ok: true, deviceId: null };
    try {
      return (await deps.deviceSession(uid, sid)) ? { ok: false, reason: "header_required" } : { ok: true, deviceId: null };
    } catch {
      return { ok: false, reason: "lookup_failed" };
    }
  }
  const claim = parseDeviceHeader(raw);
  if (!claim) return { ok: false, reason: "malformed" };
  if (Math.abs(deps.now() - claim.ts) > DEVICE_TTL_MS) return { ok: false, reason: "stale" };
  let rec: DeviceRecord | null;
  try {
    rec = await deps.lookup(uid, claim.deviceId);
  } catch {
    return { ok: false, reason: "lookup_failed" };
  }
  if (!rec || !rec.public_key) return { ok: false, reason: "unknown_device" };
  if (rec.revoked_at) return { ok: false, reason: "revoked" };
  const url = new URL(req.url);
  const message = canonicalRequest(req.method, url.pathname + url.search, claim.ts, claim.nonce, body);
  if (!verifyEd25519(rec.public_key, message, claim.sig)) return { ok: false, reason: "bad_signature" };
  let fresh: boolean;
  try {
    fresh = await deps.useNonce(uid, claim.deviceId, claim.nonce, Math.ceil((2 * DEVICE_TTL_MS) / 1000));
  } catch {
    return { ok: false, reason: "lookup_failed" };
  }
  if (!fresh) return { ok: false, reason: "replay" };
  return { ok: true, deviceId: claim.deviceId };
}
