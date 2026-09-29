import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PREFIX = "v1:";

export function newDataKey(): Buffer {
  return randomBytes(32);
}

export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  if (!passphrase) throw new Error("empty passphrase");
  return scryptSync(passphrase.normalize("NFKC"), salt, 32, SCRYPT);
}

export function seal(key: Buffer, plaintext: string, aad = ""): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}

export function open(key: Buffer, sealed: string, aad = ""): string {
  if (!sealed.startsWith(PREFIX)) throw new Error("unknown ciphertext version");
  const raw = Buffer.from(sealed.slice(PREFIX.length), "base64");
  if (raw.length < 28) throw new Error("ciphertext too short");
  const d = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}
