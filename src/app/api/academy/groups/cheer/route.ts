import type { NextRequest, NextResponse } from "next/server";
import { cheerDecision, normalizeCheerKind, toCheer, uuidOrNull, validTimeZone, type CheerRow } from "@/lib/academy/groups";
import {
  CHEER_COLS,
  CHEERS,
  configured,
  fail,
  json,
  membersOf,
  preflight,
  readBody,
  requestUser,
  sentToday,
  service,
  summaries,
} from "@/lib/academy/groups-server";

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
  const groupId = uuidOrNull(body?.groupId);
  const to = uuidOrNull(body?.to);
  const kind = normalizeCheerKind(body?.kind);
  const tz = validTimeZone(body?.tz);
  if (!groupId || !to || !kind) return json({ error: "bad_request" }, 400);
  try {
    const now = Date.now();
    const members = await membersOf([groupId]);
    if (!members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    const [sent, sums] = await Promise.all([sentToday(groupId, uid, to, now), kind === "nudge" ? summaries([to], now, tz) : Promise.resolve(null)]);
    const decision = cheerDecision(members, uid, to, kind, sent, sums?.get(to)?.todayReviews ?? 0, now, tz);
    if (decision === "self") return json({ error: "bad_request" }, 400);
    if (decision === "not_member") return json({ error: "not_found" }, 404);
    if (decision !== "ok") return json({ error: decision }, 409);
    const res = await service().from(CHEERS).insert({ group_id: groupId, from_id: uid, to_id: to, kind }).select(CHEER_COLS).single();
    if (res.error) throw new Error(`cheer insert: ${res.error.message}`);
    return json({ cheer: toCheer(res.data as CheerRow, members) });
  } catch (err) {
    return fail(err, "cheer");
  }
}
