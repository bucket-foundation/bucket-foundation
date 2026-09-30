import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

export interface SealKey {
  id: string;
  key: Buffer;
}

export interface SealKeys {
  current: SealKey;
  byId: Map<string, Buffer>;
}

export interface Sealed {
  keyId: string;
  iv: Buffer;
  ciphertext: Buffer;
}

export interface SealContext {
  ownerId: string;
  importId: string;
  inputDigest: string;
}

const KEY_ID = /^[a-z0-9_-]{1,32}$/;
const TAG_BYTES = 16;

export function parseSealKeys(raw: string | undefined): SealKeys | null {
  if (!raw) return null;
  const byId = new Map<string, Buffer>();
  let current: SealKey | null = null;
  for (const part of raw.split(",")) {
    const [id, b64] = part.trim().split(":", 2);
    if (!id || !b64 || !KEY_ID.test(id)) return null;
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32 || byId.has(id)) return null;
    byId.set(id, key);
    current ??= { id, key };
  }
  return current ? { current, byId } : null;
}

function derive(master: Buffer, ownerId: string): Buffer {
  return Buffer.from(hkdfSync("sha256", master, Buffer.from("bucket.marketing.v1"), Buffer.from(ownerId), 32));
}

const aad = (c: SealContext) => Buffer.from(`${c.ownerId}\n${c.importId}\n${c.inputDigest}`);

export function seal(keys: SealKeys, plaintext: string, ctx: SealContext): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derive(keys.current.key, ctx.ownerId), iv);
  cipher.setAAD(aad(ctx));
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return { keyId: keys.current.id, iv, ciphertext: body };
}

export function open(keys: SealKeys, sealed: Sealed, ctx: SealContext): string | null {
  const master = keys.byId.get(sealed.keyId);
  if (!master || sealed.iv.length !== 12 || sealed.ciphertext.length < TAG_BYTES) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", derive(master, ctx.ownerId), sealed.iv);
    decipher.setAAD(aad(ctx));
    decipher.setAuthTag(sealed.ciphertext.subarray(sealed.ciphertext.length - TAG_BYTES));
    return Buffer.concat([decipher.update(sealed.ciphertext.subarray(0, sealed.ciphertext.length - TAG_BYTES)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
