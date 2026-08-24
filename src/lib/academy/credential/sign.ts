/**
 * src/lib/academy/credential/sign.ts (bkt-52p)
 * ----------------------------------------------------------------------------
 * Sign + verify OB3 credentials as VC-JWT (Compact JWS, alg=EdDSA / Ed25519)
 * using `jose`. This is the W3C VC "jwt" securing mechanism: the credential is
 * the JWS payload under the `vc` claim, plus the standard JWT claims (iss/sub/
 * jti/nbf/iat) mirrored from the credential so a generic JWT tool sees them too.
 *
 * WHY VC-JWT (not Data Integrity / RDF): VC-JWT needs no JSON-LD canonicalization
 *, it signs exact bytes, so it is correct, deterministic, and serverless-
 * friendly. (Data Integrity with eddsa-rdfc-2022 would require a correct URDNA
 * implementation; doing it wrong silently breaks interop. VC-JWT is fully
 * spec-permitted and what we ship.)
 *
 * Keys: the PRIVATE JWK is loaded server-side only (issuer.loadPrivateJwk).
 * Verification uses the PUBLISHED public JWK(s), no secret needed, so anyone
 * can verify offline against /api/academy/issuer.
 */
import { SignJWT, jwtVerify, importJWK, type JWK } from "jose";
import { loadPrivateJwk, publicJwks, ISSUER_ID } from "./issuer";
import type { OpenBadgeCredential, VerifyResult } from "./types";

/** Sign a credential into a compact VC-JWT string. Throws if no key configured. */
export async function signCredential(
  credential: OpenBadgeCredential
): Promise<string> {
  const jwk = loadPrivateJwk();
  if (!jwk) throw new Error("issuer_key_unavailable");
  const key = await importJWK(jwk as JWK, "EdDSA");

  const iat = Math.floor(new Date(credential.issuanceDate).getTime() / 1000);

  return await new SignJWT({ vc: credential as unknown as Record<string, unknown> })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid: jwk.kid })
    .setIssuer(ISSUER_ID)
    .setSubject(credential.credentialSubject.id)
    .setJti(credential.id)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(key);
}

/**
 * Verify the SIGNATURE of a VC-JWT against the published issuer key(s) and
 * confirm the issuer is Bucket. Does NOT check revocation (that's a live lookup
 * the caller layers on, see /api/academy/credential/verify). Pure crypto.
 */
export async function verifySignature(jwt: string): Promise<{
  signatureValid: boolean;
  issuerTrusted: boolean;
  credential?: OpenBadgeCredential;
  reasons: string[];
}> {
  const reasons: string[] = [];
  const keys = publicJwks();
  let lastErr: unknown = null;

  for (const pub of keys) {
    try {
      const key = await importJWK(pub as JWK, "EdDSA");
      const { payload } = await jwtVerify(jwt, key, { algorithms: ["EdDSA"] });
      const vc = (payload as { vc?: unknown }).vc as OpenBadgeCredential | undefined;
      if (!vc) {
        reasons.push("JWS verified but carries no `vc` credential claim.");
        return { signatureValid: true, issuerTrusted: false, reasons };
      }
      // Issuer must be Bucket, both in the JWT iss and the embedded credential.
      const credIssuer =
        typeof vc.issuer === "object" ? vc.issuer?.id : (vc.issuer as unknown as string);
      const issuerTrusted =
        payload.iss === ISSUER_ID && credIssuer === ISSUER_ID;
      if (!issuerTrusted) {
        reasons.push(
          `Signature is valid but issuer is not Bucket (got "${credIssuer ?? payload.iss}").`
        );
      } else {
        reasons.push("Signature verified against the published Bucket issuer key.");
      }
      return { signatureValid: true, issuerTrusted, credential: vc, reasons };
    } catch (e) {
      lastErr = e;
      // try the next key
    }
  }

  reasons.push(
    "Signature did NOT verify against any published Bucket issuer key — the " +
      "credential is unsigned, tampered, or signed by someone else."
  );
  if (lastErr instanceof Error && lastErr.message) {
    reasons.push(`(${lastErr.message})`);
  }
  return { signatureValid: false, issuerTrusted: false, reasons };
}

/**
 * Accept either a compact VC-JWT or a bare credential JSON object. If JSON is
 * passed, it CANNOT be cryptographically verified (the proof lives in the JWS),
 * so we return a clear, negative, we never "trust" unsigned JSON.
 */
export function looksLikeJwt(input: string): boolean {
  const s = input.trim();
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s);
}

/**
 * Assemble the public VerifyResult for a JWT input, signature-only (revocation +
 * consistency are layered by the route which has DB access).
 */
export async function baseVerify(jwt: string): Promise<VerifyResult> {
  const sig = await verifySignature(jwt);
  return {
    valid: false, // the route finalizes `valid` after revocation check
    signatureValid: sig.signatureValid,
    issuerTrusted: sig.issuerTrusted,
    revoked: null,
    reasons: sig.reasons,
    credential: sig.credential,
  };
}
