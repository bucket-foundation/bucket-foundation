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

  return new NextResponse(row.jwt, {
    status: 200,
    headers: {
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
  }

  const outcome = await revokeCredential(id, uid, reason);
  if (outcome === "unavailable") return json({ error: "revoke_unavailable" }, 503);
  if (outcome === "no_row") {
    return json({ error: "revoke_failed" }, 409);
  }
  return json({ ok: true, id, revoked: true });
}
