/**
 * src/lib/academy/credential/issuer.ts (bkt-52p)
 * ----------------------------------------------------------------------------
 * Issuer identity + key handling for the Bucket Academy verifiable-credential
 * layer (Open Badges 3.0 / W3C Verifiable Credentials).
 *
 * THE MOAT (epic bkt-jh0): "the map IS a verifiable digital resume; the verifier
 * pays." We turn the, public Mastery Profile (src/lib/academy/profile.ts)
 * into machine-verifiable, issuer-SIGNED credentials a recruiter can fetch and
 * cryptographically verify against a published public key, no account, no
 * blockchain, no trust in us beyond "did the Bucket key sign this".
 *
 * HARD CONSTRAINTS (non-negotiable, encoded here):
 * - NO Story Protocol, NO blockchain. A credential is an OpenBadgeCredential
 * (which IS a W3C VC) signed with an Ed25519 (EdDSA) issuer key. The proof
 * format is VC-JWT (Compact JWS, alg=EdDSA), the pragmatic, serverless-
 * friendly, spec-permitted securing mechanism (no RDF canonicalization).
 * - Keys are secrets. The issuer PRIVATE JWK is read ONLY from the server env
 * ACADEMY_ISSUER_PRIVATE_JWK (or a gitignored local file in dev). It NEVER
 * ships to the browser and is NEVER committed. Only the PUBLIC JWK is
 * published (here + at /api/academy/issuer).
 *
 * Library: `jose` (already a dependency). It does EdDSA/Ed25519 JWS cleanly in
 * the Next.js Node runtime.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { JWK } from "jose";

/** Canonical public site origin (matches src/app/layout.tsx SITE_URL). */
export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.bucket.foundation"
).replace(/\/$/, "");

/** Stable issuer id, a resolvable https URL (the issuer profile document). */
export const ISSUER_ID = `${SITE_ORIGIN}/api/academy/issuer`;

/** Stable verificationMethod id, the issuer key, addressable as a fragment. */
export function verificationMethodId(kid: string): string {
  return `${ISSUER_ID}#${kid}`;
}

export const ISSUER_NAME = "Bucket Foundation";
export const ISSUER_DESCRIPTION =
  "Bucket Foundation — Bucket Academy. Issuer of evidence-backed, " +
  "demonstrated-mastery credentials for canon concepts. build the past. build history.";

/**
 * The PUBLIC JWK for the current issuer key. This is PUBLISHABLE (it is the
 * verification key only) and is baked in so verification works
 * without any secret. It MUST match the public half of ACADEMY_ISSUER_PRIVATE_JWK.
 *
 * Rotation: to rotate, generate a new keypair, bump `kid`, move the current
 * entry into PUBLIC_JWKS_HISTORY (so historical credentials still verify), and
 * make the new key the primary. Verifiers try every published JWK.
 */
export const PUBLIC_JWK: JWK = {
  kty: "OKP",
  crv: "Ed25519",
  x: "6AbV9b0Zpf3LLj4jlM7IlH0o-wj8Lsp2pP3mNVUKgTE",
  alg: "EdDSA",
  use: "sig",
  kid: "8a0035b8c6cc722d",
};

/** Retired-but-still-valid public keys, for verifying historical credentials. */
export const PUBLIC_JWKS_HISTORY: JWK[] = [];

/** Every public JWK a verifier should try (current + retired). */
export function publicJwks(): JWK[] {
  return [PUBLIC_JWK, ...PUBLIC_JWKS_HISTORY];
}

/**
 * Load the issuer PRIVATE JWK from a server-only source. Order:
 * 1. env ACADEMY_ISSUER_PRIVATE_JWK (the production path, set in Vercel),
 * 2. a gitignored local dev file private/academy/issuer-key.json.
 * Returns null when no key is configured (issuance then degrades to 503).
 */
export function loadPrivateJwk(): (JWK & { kid: string }) | null {
  const raw = process.env.ACADEMY_ISSUER_PRIVATE_JWK?.trim();
  if (raw) {
    try {
      const jwk = JSON.parse(raw) as JWK;
      if (jwk && jwk.kty === "OKP" && jwk.crv === "Ed25519" && (jwk as JWK).d) {
        return ensureKid(jwk);
      }
    } catch {
      /* fall through to the dev file */
    }
  }
  // Dev fallback: the gitignored local key file.
  try {
    const p = join(process.cwd(), "private", "academy", "issuer-key.json");
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, "utf8")) as { private_jwk?: JWK };
      const jwk = parsed.private_jwk;
      if (jwk && jwk.kty === "OKP" && jwk.crv === "Ed25519" && (jwk as JWK).d) {
        return ensureKid(jwk);
      }
    }
  } catch {
    /* no key available */
  }
  return null;
}

function ensureKid(jwk: JWK): JWK & { kid: string } {
  const kid = jwk.kid || PUBLIC_JWK.kid || "default";
  return { ...jwk, alg: "EdDSA", kid };
}

/** True when issuance is possible (a private key is configured). */
export function canIssue(): boolean {
  return loadPrivateJwk() !== null;
}

/**
 * The issuer profile document, served at ISSUER_ID. This is the OB3 `Profile` /
 * W3C VC `issuer` object plus a JWK-based verificationMethod a verifier resolves
 * the public key from. No secrets, only the PUBLIC key(s).
 */
export function issuerProfile(): Record<string, unknown> {
  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: ISSUER_ID,
    type: ["Profile"],
    name: ISSUER_NAME,
    description: ISSUER_DESCRIPTION,
    url: SITE_ORIGIN,
    // JsonWebKey verification methods (W3C VC-JOSE-COSE), one per published key.
    verificationMethod: publicJwks().map((jwk) => ({
      id: verificationMethodId(jwk.kid || "default"),
      type: "JsonWebKey",
      controller: ISSUER_ID,
      publicKeyJwk: jwk,
    })),
  };
}
