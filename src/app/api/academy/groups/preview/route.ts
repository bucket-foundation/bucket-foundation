import type { NextRequest, NextResponse } from "next/server";
import { groupPreview, normalizeInviteCode } from "@/lib/academy/groups";
import { clientIp, configured, fail, groupByCode, json, membersOf, preflight, previewLimited } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  if (previewLimited(clientIp(req))) return json({ error: "rate_limited" }, 429);
  const code = normalizeInviteCode(new URL(req.url).searchParams.get("code"));
  if (!code) return json({ error: "not_found" }, 404);
  try {
    const group = await groupByCode(code);
    if (!group) return json({ error: "not_found" }, 404);
    return json(groupPreview(group, await membersOf([group.id])));
  } catch (err) {
    return fail(err, "preview");
  }
}
