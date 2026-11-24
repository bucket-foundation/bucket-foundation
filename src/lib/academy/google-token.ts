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

export interface GoogleSessionAuth {
  findUser: (email: string) => Promise<{ email?: string } | null>;
  createUser: (email: string) => Promise<{ status: number | null }>;
  generateLink: (email: string) => Promise<{ link: { tokenHash: string; type: string } | null; status: number | null }>;
  verifyToken: (tokenHash: string, type: string) => Promise<AuthResult>;
}

export async function mintGoogleSession(email: string, auth: GoogleSessionAuth): Promise<AuthResult> {
  if (!(await auth.findUser(email))) {
    const created = await auth.createUser(email);
    if (created.status !== null && created.status !== 422) return { session: null, status: created.status };
  }
  const { link, status } = await auth.generateLink(email);
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
