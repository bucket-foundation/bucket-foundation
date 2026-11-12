import type { NextRequest, NextResponse } from "next/server";
import { MAX_OWNED, normalizeDisplayName, normalizeGroupName, normalizeKind, validTimeZone } from "@/lib/academy/groups";
import { nameAllowed } from "@/lib/academy/groups-names";
import {
  configured,
  countOwned,
  fail,
  groupsFor,
  insertGroupWithCode,
  json,
  limitError,
  insertMember,
  NAME_NOT_ALLOWED,
  oneGroup,
  preflight,
  readBody,
  requestUser,
  service,
  GROUPS,
} from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const tz = validTimeZone(new URL(req.url).searchParams.get("tz"));
  try {
    return json({ groups: await groupsFor(uid, undefined, tz) });
  } catch (err) {
    return fail(err, "list");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const body = await readBody(req);
  const name = normalizeGroupName(body?.name);
  const kind = normalizeKind(body?.kind);
  const displayName = normalizeDisplayName(body?.displayName);
  if (!name || !kind || !displayName) return json({ error: "bad_request" }, 400);
  if (!nameAllowed(name) || !nameAllowed(displayName)) return json({ error: NAME_NOT_ALLOWED }, 422);
  try {
    if ((await countOwned(uid)) >= MAX_OWNED) return json({ error: "owned_limit" }, 409);
    const group = await insertGroupWithCode({ name, kind, owner_id: uid });
    const res = await insertMember({ group_id: group.id, user_id: uid, role: "owner", display_name: displayName });
    if (res.error) {
      await service().from(GROUPS).delete().eq("id", group.id);
      const limit = limitError(res.error.message);
      if (limit) throw limit;
      throw new Error(`owner insert: ${res.error.message}`);
    }
    return json({ group: await oneGroup(uid, group.id) });
  } catch (err) {
    return fail(err, "create");
  }
}
