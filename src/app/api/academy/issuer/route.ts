/**
 * bucket.foundation, /api/academy/issuer  (bkt-52p)
 * ----------------------------------------------------------------------------
 * The Bucket Academy ISSUER IDENTITY document, served at a stable, resolvable
 * URL (ISSUER_ID === https://www.bucket.foundation/api/academy/issuer).
 *
 * Returns the OB3 `Profile` / W3C VC issuer object: issuer id, name, url, and
 * the PUBLIC verification key(s) as JsonWebKey verificationMethods. A verifier
 * (any third party) resolves THIS document to get the public key, then checks a
 * credential's EdDSA signature against it. No secrets are ever served here, the
 * private signing key lives only in server env (issuer.loadPrivateJwk).
 *
 * Cacheable + CORS-open so external verifiers can fetch it.
 */
import { NextResponse } from "next/server";
import { issuerProfile } from "@/lib/academy/credential/issuer";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET(): NextResponse {
  return new NextResponse(JSON.stringify(issuerProfile(), null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=3600",
    },
  });
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
