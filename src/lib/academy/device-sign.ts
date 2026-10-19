import { createHash, createPublicKey, verify } from "node:crypto";

export const DEVICE_HEADER = "x-bkt-device";
export const DEVICE_TTL_MS = 60_000;
export const DEVICE_SCHEME = "bkt-device-v1";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const NONCE_RE = /^[A-Za-z0-9_-]{16,64}$/;
const DEVICE_RE = /^[A-Za-z0-9._-]{1,64}$/;
const SIG_RE = /^[A-Za-z0-9+/]{86}==$/;

export interface DeviceClaim {
  deviceId: string;
  ts: number;
  nonce: string;
  sig: string;
}

export function bodyHash(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

export function canonicalRequest(method: string, pathAndQuery: string, ts: number, nonce: string, body: string): string {
  return [DEVICE_SCHEME, method.toUpperCase(), pathAndQuery, String(ts), nonce, bodyHash(body)].join("\n");
}

export function formatDeviceHeader(c: DeviceClaim): string {
  return `v1;id=${c.deviceId};ts=${c.ts};nonce=${c.nonce};sig=${c.sig}`;
}

export function parseDeviceHeader(value: string | null): DeviceClaim | null {
  if (!value) return null;
  const parts = value.split(";");
  if (parts[0] !== "v1") return null;
  const kv: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const i = p.indexOf("=");
    if (i <= 0) return null;
    kv[p.slice(0, i)] = p.slice(i + 1);
  }
  const ts = Number(kv.ts);
  if (!DEVICE_RE.test(kv.id ?? "") || !Number.isSafeInteger(ts) || !NONCE_RE.test(kv.nonce ?? "") || !SIG_RE.test(kv.sig ?? "")) return null;
  return { deviceId: kv.id, ts, nonce: kv.nonce, sig: kv.sig };
}

export function verifyEd25519(publicKeyB64: string, message: string, signatureB64: string): boolean {
  try {
    const raw = Buffer.from(publicKeyB64, "base64");
    if (raw.length !== 32) return false;
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: "der", type: "spki" });
    return verify(null, Buffer.from(message), key, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}
