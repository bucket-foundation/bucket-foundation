import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const GUEST_PREFIX = "g1.";
export const GUEST_TTL_MS = 30 * 86_400_000;
export const GUEST_PER_MINUTE = 5;

export interface GuestClaims {
  sub: string;
  gid: string;
  nick: string;
  exp: number;
}

const GUEST_ID = /^[A-Za-z0-9_-]{16,64}$/;

export function normalizeGuestId(input: unknown): string | null {
  return typeof input === "string" && GUEST_ID.test(input) ? input : null;
}

export function guestUserId(guestId: string): string {
  const h = createHash("sha256").update(`polingual-guest:${guestId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function b64(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function issueGuestToken(guestId: string, nick: string, secret: string, now: number): { token: string; userId: string; expiresAt: string } {
  const claims: GuestClaims = { sub: guestUserId(guestId), gid: guestId, nick, exp: now + GUEST_TTL_MS };
  const body = b64(JSON.stringify(claims));
  return { token: `${GUEST_PREFIX}${body}.${sign(body, secret)}`, userId: claims.sub, expiresAt: new Date(claims.exp).toISOString() };
}

export function isGuestToken(token: string): boolean {
  return token.startsWith(GUEST_PREFIX);
}

export function verifyGuestToken(token: string, secret: string, now: number): GuestClaims | null {
  if (!isGuestToken(token)) return null;
  const [body, mac] = token.slice(GUEST_PREFIX.length).split(".");
  if (!body || !mac) return null;
  const want = Buffer.from(sign(body, secret));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as GuestClaims;
    if (typeof c.sub !== "string" || typeof c.gid !== "string" || typeof c.exp !== "number" || c.exp <= now) return null;
    return c.sub === guestUserId(c.gid) ? c : null;
  } catch {
    return null;
  }
}

export function bearer(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
