/**
 * bucket.foundation — GET/DELETE /api/academy/credential/[id]  (bkt-52p)
 * ----------------------------------------------------------------------------
 * The HOSTED credential — a stable, resolvable artifact a third party fetches
 * and verifies.
 *
 *   GET  /api/academy/credential/<id>
 *        Default: returns the signed VC-JWT as text (Content-Type matches the
 *        VC-JWT media type). `?format=json` returns the embedded credential JSON
 *        (handy to read), `?format=jwt` forces the JWS. Public, no auth.
 *        If revoked, still served but with revocation metadata + 200 (the
 *        artifact persists; revocation is a separate, verifiable status).
 *
 *   DELETE /api/academy/credential/<id>   (auth, owner-only)
 *        Revoke the credential. Identity from the verified token; never trusts
 *        client-supplied ids of ownership. Returns the new revoked status.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  dbConfigured,
  getCredential,
  revokeCredential,
  verifyUserToken,
} from "@/lib/academy/credential/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
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

function bearer(req: NextRequest): string | null {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!dbConfigured()) return json({ error: "sync_unavailable" }, 503);

  const id = params.id;
  if (!/^[0-9a-fA-F-]{8,}$/.test(id)) return json({ error: "not_found" }, 404);

  const row = await getCredential(id);
  if (!row) return json({ error: "not_found" }, 404);

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  if (format === "json") {
    // The embedded credential JSON + status (for humans / quick inspection).
    return new NextResponse(
      JSON.stringify(
        {
          credential: row.credential,
          status: {
            revoked: !!row.revoked_at,
            revoked_at: row.revoked_at,
            revocation_reason: row.revocation_reason,
          },
        },
        null,
        2
      ),
      { status: 200, headers: { "content-type": "application/json", ...CORS } }
    );
  }

  // Default + ?format=jwt: serve the signed VC-JWT (the verifiable artifact).
  return new NextResponse(row.jwt, {
    status: 200,
    headers: {
      // VC-JWT media type per W3C VC-JOSE-COSE; text-friendly so curl shows it.
      "content-type": "application/vc+jwt",
      "x-credential-revoked": row.revoked_at ? "true" : "false",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!dbConfigured()) return json({ error: "sync_unavailable" }, 503);

  const uid = await verifyUserToken(bearer(req));
  if (!uid) return json({ error: "unauthorized" }, 401);

  const id = params.id;
  if (!/^[0-9a-fA-F-]{8,}$/.test(id)) return json({ error: "not_found" }, 404);

  let reason: string | null = null;
  try {
    const body = (await req.json()) as { reason?: unknown };
    if (typeof body?.reason === "string") reason = body.reason.slice(0, 200);
  } catch {
    /* no body is fine */
  }

  const ok = await revokeCredential(id, uid, reason);
  if (!ok) {
    // Either not owned by this user, already revoked, or not found — all opaque.
    return json({ error: "revoke_failed" }, 409);
  }
  return json({ ok: true, id, revoked: true });
}
