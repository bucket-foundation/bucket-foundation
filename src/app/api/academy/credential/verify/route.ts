/**
 * bucket.foundation, POST /api/academy/credential/verify (bkt-52p)
 * ----------------------------------------------------------------------------
 * The MACHINE verify endpoint. Public, no auth. Accepts any of:
 * { jwt: "<compact VC-JWT>" }
 * { credential: <id or hosted URL> } // we fetch the stored JWT and verify
 * { json: <credential JSON object> } // negative: unsigned JSON can't
 * // be cryptographically verified
 *
 * Verification (in order):
 * 1. SIGNATURE, EdDSA against the published Bucket issuer key(s),
 * 2. ISSUER, must be Bucket (iss + embedded issuer.id),
 * 3. REVOCATION, live lookup of the credential's status (revoked? -> invalid),
 * 4. CONSISTENCY (bonus), are the asserted concepts still consistent with the
 * learner's live public profile? (reported for context only.)
 *
 * `valid` is true ONLY when signature is valid AND issuer is Bucket AND not
 * revoked. Consistency never flips `valid`, the credential is a signed
 * point-in-time artifact.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { baseVerify, looksLikeJwt } from "@/lib/academy/credential/sign";
import {
  dbConfigured,
  getCredentialByUrl,
} from "@/lib/academy/credential/store";
import { checkConsistency } from "@/lib/academy/credential/consistency";
import {
  assemblePublicProfile,
  type ProgressRow,
  type PublicProfile,
} from "@/lib/academy/profile";
import type { OpenBadgeCredential, VerifyResult } from "@/lib/academy/credential/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function bucketSvc(): SupabaseClient {
  return createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
}

/** Load a learner's live public profile by handle (or null). */
async function liveProfile(handle: string): Promise<PublicProfile | null> {
  if (!dbConfigured()) return null;
  const svc = bucketSvc();
  const { data, error } = await svc
    .from("academy_profiles")
    .select("user_id,handle,display_name,is_public")
    .eq("handle", handle)
    .maybeSingle();
  if (error || !data) return null;
  const rec = data as unknown as {
    user_id: string;
    handle: string;
    display_name: string | null;
    is_public: boolean;
  };
  if (!rec.is_public) return null;
  const { data: rows } = await svc
    .from("academy_progress")
    .select("branch,data,updated_at")
    .eq("user_id", rec.user_id);
  return assemblePublicProfile(
    rec.handle,
    rec.display_name,
    (rows as unknown as ProgressRow[]) || []
  );
}

/** Live revocation check for a credential whose hosted id is known. */
async function checkRevoked(credential: OpenBadgeCredential): Promise<boolean | null> {
  if (!dbConfigured()) return null;
  const row = await getCredentialByUrl(credential.id);
  if (!row) return null; // unknown to us, can't assert (could be a fixture)
  return !!row.revoked_at;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { jwt?: unknown; credential?: unknown; json?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  // ---- unsigned JSON: negative ------------------------------------
  if (body.json && typeof body.json === "object") {
    const result: VerifyResult = {
      valid: false,
      signatureValid: false,
      issuerTrusted: false,
      revoked: null,
      reasons: [
        "A bare credential JSON object carries no cryptographic proof — the " +
          "signature lives in the VC-JWT. Paste the signed JWT (or the credential " +
          "id/URL) to verify it.",
      ],
      credential: body.json as OpenBadgeCredential,
    };
    return json(result);
  }

  // ---- resolve to a JWT ---------------------------------------------------
  let jwt: string | null = null;
  if (typeof body.jwt === "string" && body.jwt.trim()) {
    jwt = body.jwt.trim();
  } else if (typeof body.credential === "string" && body.credential.trim()) {
    const ref = body.credential.trim();
    if (looksLikeJwt(ref)) {
      jwt = ref;
    } else {
      const row = await getCredentialByUrl(ref);
      if (!row) return json({ error: "not_found" }, 404);
      jwt = row.jwt;
    }
  }
  if (!jwt) return json({ error: "bad_request" }, 400);

  if (!looksLikeJwt(jwt)) {
    return json({
      valid: false,
      signatureValid: false,
      issuerTrusted: false,
      revoked: null,
      reasons: ["Input is not a compact VC-JWT (expected three base64url segments)."],
    } satisfies VerifyResult);
  }

  // ---- 1+2: signature + issuer -------------------------------------------
  const result = await baseVerify(jwt);

  // ---- 3: revocation ------------------------------------------------------
  if (result.signatureValid && result.issuerTrusted && result.credential) {
    const revoked = await checkRevoked(result.credential);
    result.revoked = revoked;
    if (revoked === true) {
      result.reasons.push("This credential has been REVOKED by the issuer/owner.");
    } else if (revoked === false) {
      result.reasons.push("Revocation status: live and not revoked.");
    } else {
      result.reasons.push(
        "Revocation status: unknown to Bucket (credential id not on record — " +
          "e.g. a test fixture). Treated cautiously."
      );
    }

    // ---- 4: bonus consistency cross-check ---------------------------------
    const handle =
      result.credential.credentialSubject["https://bucket.foundation/ns#handle"];
    const live = handle ? await liveProfile(handle) : null;
    result.consistency = checkConsistency(result.credential, live);
  }

  // ---- finalize `valid` ---------------------------------------------------
  result.valid =
    result.signatureValid && result.issuerTrusted && result.revoked !== true;

  return json(result);
}
