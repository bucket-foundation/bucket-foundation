/**
 * bucket.foundation, GET /api/academy/credential/[id]/status  (bkt-52p)
 * ----------------------------------------------------------------------------
 * The resolvable REVOCATION STATUS for a credential, the URL a credential's
 * `credentialStatus.id` points at. Any verifier (ours or a third party) can GET
 * this to learn, live, whether the credential is still valid or has been revoked
 * by the issuer/owner. Public, no auth.
 *
 *   200 { id, revoked, revoked_at, revocation_reason }
 *   404 if unknown.
 */
import { NextRequest, NextResponse } from "next/server";
import { dbConfigured, getCredential } from "@/lib/academy/credential/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!dbConfigured()) return json({ error: "sync_unavailable" }, 503);
  const id = params.id;
  if (!/^[0-9a-fA-F-]{8,}$/.test(id)) return json({ error: "not_found" }, 404);

  const row = await getCredential(id);
  if (!row) return json({ error: "not_found" }, 404);

  return json({
    id,
    type: "BucketRevocationStatus",
    revoked: !!row.revoked_at,
    revoked_at: row.revoked_at,
    revocation_reason: row.revocation_reason,
    checkedAt: new Date().toISOString(),
  });
}
