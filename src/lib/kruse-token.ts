/**
 * HS256-signed access tokens for the private /kruse preview.
 *
 * Intentionally minimal. No auth library, no DB lookups. The secret and
 * version live in env; the allow-list of recipients is env-driven too.
 *
 * Used in three places:
 *  - `src/middleware.ts`           — verifies on every /kruse request
 *  - `src/app/api/kruse/search/route.ts` — verifies on every proxy call
 *  - `scripts/mint-kruse-token.ts` — mints new tokens
 */

import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "bkt_kruse_access";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

export type TokenPayload = {
  /** recipient id, e.g. "kruse" */
  r: string;
  /** token version — bump BKT_KRUSE_TOKEN_VERSION to revoke all prior tokens */
  v: number;
  iat: number;
  exp: number;
};

function getSecret(): Uint8Array {
  const raw = process.env.BKT_KRUSE_TOKEN_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "BKT_KRUSE_TOKEN_SECRET must be set and >=32 chars. See .env.example.",
    );
  }
  return new TextEncoder().encode(raw);
}

function getVersion(): number {
  const raw = process.env.BKT_KRUSE_TOKEN_VERSION ?? "1";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function getAllowedRecipients(): Set<string> {
  const raw = process.env.BKT_KRUSE_ALLOWED_RECIPIENTS ?? "kruse";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export async function mintToken(
  recipient: string,
  ttlSeconds = COOKIE_MAX_AGE_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const version = getVersion();
  return await new SignJWT({ r: recipient, v: version })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    const p = payload as unknown as Partial<TokenPayload>;
    if (!p || typeof p.r !== "string" || typeof p.v !== "number") return null;
    if (p.v !== getVersion()) return null;
    if (!getAllowedRecipients().has(p.r)) return null;
    if (typeof p.iat !== "number" || typeof p.exp !== "number") return null;
    return p as TokenPayload;
  } catch {
    return null;
  }
}
