import type { NextRequest, NextResponse } from "next/server";
import { missingColumn, renameInput } from "@/lib/academy/groups";
import { configured, fail, joinLimited, json, MEMBERS, NAME_NOT_ALLOWED, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

async function rename(uid: string, displayName: string) {
  const res = await service().from(MEMBERS).update({ display_name: displayName, chosen_name: true }).eq("user_id", uid).select("group_id");
  if (!missingColumn(res.error)) return res;
  return service().from(MEMBERS).update({ display_name: displayName }).eq("user_id", uid).select("group_id");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  if (joinLimited(`rename:${uid}`)) return json({ error: "rate_limited" }, 429);
  const displayName = renameInput(await readBody(req));
  if (displayName === "bad_request") return json({ error: "bad_request" }, 400);
  if (displayName === "name_not_allowed") return json({ error: NAME_NOT_ALLOWED }, 422);
  try {
    const res = await rename(uid, displayName);
    if (res.error) return json({ error: "write_failed" }, 500);
    return json({ displayName, groups: (res.data ?? []).length });
  } catch (err) {
    return fail(err, "name");
  }
}
