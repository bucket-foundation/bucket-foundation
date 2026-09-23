import { SignJWT, jwtVerify, importJWK, type JWK } from "jose";
import { loadPrivateJwk, publicJwks, ISSUER_ID } from "./issuer";
import type { OpenBadgeCredential, VerifyResult } from "./types";

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

export function looksLikeJwt(input: string): boolean {
  const s = input.trim();
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s);
}

export async function baseVerify(jwt: string): Promise<VerifyResult> {
  const sig = await verifySignature(jwt);
  return {
    valid: false,
    signatureValid: sig.signatureValid,
    issuerTrusted: sig.issuerTrusted,
    revoked: null,
    reasons: sig.reasons,
    credential: sig.credential,
  };
}
