import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { AuthResult } from "./session-server";

export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export interface GoogleIdentity {
  sub: string;
  email: string;
}

let remoteKeys: JWTVerifyGetKey | null = null;
export const googleKeys = (): JWTVerifyGetKey => (remoteKeys ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL)));

export function googleClientId(raw: string | undefined): string | null {
  const id = raw?.trim() ?? "";
  return id ? id : null;
}

export const GOOGLE_SUB_KEY = "google_sub";
export const GOOGLE_MISMATCH_STATUS = 409;

export interface GoogleSessionUser {
  id: string;
  app_metadata?: Record<string, unknown>;
}

export interface GoogleSessionAuth {
  findUser: (email: string) => Promise<GoogleSessionUser | null>;
  createUser: (email: string, sub: string) => Promise<{ status: number | null }>;
  bindSub: (userId: string, sub: string) => Promise<{ bound: string | null; status: number | null }>;
  generateLink: (email: string) => Promise<{ link: { tokenHash: string; type: string } | null; status: number | null }>;
  verifyToken: (tokenHash: string, type: string) => Promise<AuthResult>;
}

async function claimUser(who: GoogleIdentity, auth: GoogleSessionAuth): Promise<number | null> {
  let user = await auth.findUser(who.email);
  if (!user) {
    const created = await auth.createUser(who.email, who.sub);
    if (created.status === null) return null;
    if (created.status !== 422) return created.status;
    user = await auth.findUser(who.email);
    if (!user) return 500;
  }
  const bound = user.app_metadata?.[GOOGLE_SUB_KEY];
  if (typeof bound === "string" && bound) return bound === who.sub ? null : GOOGLE_MISMATCH_STATUS;
  const bind = await auth.bindSub(user.id, who.sub);
  if (bind.status !== null) return bind.status;
  return bind.bound === who.sub ? null : GOOGLE_MISMATCH_STATUS;
}

export async function mintGoogleSession(who: GoogleIdentity, auth: GoogleSessionAuth): Promise<AuthResult> {
  const claimed = await claimUser(who, auth);
  if (claimed !== null) return { session: null, status: claimed };
  const { link, status } = await auth.generateLink(who.email);
  if (!link) return { session: null, status };
  return auth.verifyToken(link.tokenHash, link.type);
}

const sha256hex = (v: string) => createHash("sha256").update(v).digest("hex");

export async function verifyGoogleIdToken(idToken: string, rawNonce: string, opts: { clientId: string; keys: JWTVerifyGetKey; now: number }): Promise<GoogleIdentity | null> {
  if (!opts.clientId || !rawNonce) return null;
  try {
    const { payload } = await jwtVerify(idToken, opts.keys, {
      issuer: GOOGLE_ISSUERS,
      audience: opts.clientId,
      algorithms: ["RS256"],
      currentDate: new Date(opts.now),
      requiredClaims: ["exp", "iat", "sub"],
    });
    if (payload.nonce !== sha256hex(rawNonce)) return null;
    if (payload.email_verified !== true) return null;
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, email };
  } catch {
    return null;
  }
}
