import type { NextRequest, NextResponse } from "next/server";
import { uuidOrNull } from "@/lib/academy/groups";
import { CHEERS, configured, fail, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  if (!Array.isArray(body?.ids) || body.ids.length > 200) return json({ error: "bad_request" }, 400);
  const ids = body.ids.map(uuidOrNull);
  if (ids.some((id) => !id)) return json({ error: "bad_request" }, 400);
  if (ids.length === 0) return json({ ok: true });
  try {
    const res = await service()
      .from(CHEERS)
      .update({ seen_at: new Date().toISOString() })
      .eq("to_id", uid)
      .is("seen_at", null)
      .in("id", ids as string[]);
    if (res.error) throw new Error(`cheers seen: ${res.error.message}`);
    return json({ ok: true });
  } catch (err) {
    return fail(err, "cheers seen");
  }
}
