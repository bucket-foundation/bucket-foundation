import { createHash, timingSafeEqual } from "node:crypto";
import { revokedMark, type DocStore } from "./store";

type Env = Record<string, string | undefined>;

export type Scope = "post" | "admin";

export interface TokenRecord {
  name: string;
  hash: Buffer;
  scope: Scope;
}

export interface Poster {
  name: string;
  scope: Scope;
}

export const TOKEN_MIN = 32;
export const REVOCATION_TTL_MS = 30_000;

const RECORD = /^([a-z0-9-]{1,40}):([0-9a-f]{64}):(post|admin)$/;

export function parseTokens(raw: string | undefined): TokenRecord[] {
  const out: TokenRecord[] = [];
  for (const part of (raw ?? "").split(",")) {
    const m = RECORD.exec(part.trim().toLowerCase());
    if (m && !out.some((r) => r.name === m[1])) out.push({ name: m[1], hash: Buffer.from(m[2], "hex"), scope: m[3] as Scope });
  }
  return out;
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function bearer(header: string | null | undefined): string | null {
  const value = header ?? "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : null;
}

export function matchToken(
  given: string | null,
  records: TokenRecord[],
  equal: (a: Buffer, b: Buffer) => boolean = timingSafeEqual,
): Poster | null {
  const digest = createHash("sha256").update(given ?? "").digest();
  let found: Poster | null = null;
  for (const r of records) {
    const same = equal(digest, r.hash);
    if (same && found === null) found = { name: r.name, scope: r.scope };
  }
  return given !== null && given.length >= TOKEN_MIN ? found : null;
}

export function revokedInEnv(name: string, env: Env): boolean {
  return (env.WHATS_NEW_REVOKED ?? "").split(",").some((n) => n.trim().toLowerCase() === name);
}

export type RevocationCache = Map<string, { revoked: boolean; at: number }>;

export const sharedRevocationCache: RevocationCache = new Map();

export async function revokedInStore(
  store: DocStore,
  name: string,
  cache: RevocationCache = sharedRevocationCache,
  clock: () => number = Date.now,
  ttlMs: number = REVOCATION_TTL_MS,
): Promise<boolean> {
  const key = `${store.prefix}${name}`;
  const hit = cache.get(key);
  if (hit && clock() - hit.at < ttlMs) return hit.revoked;
  const revoked = await revokedMark(store, name);
  cache.set(key, { revoked, at: clock() });
  return revoked;
}
