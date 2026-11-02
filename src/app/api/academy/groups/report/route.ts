import type { NextRequest, NextResponse } from "next/server";
import { missingTable, normalizeReportReason, uuidOrNull } from "@/lib/academy/groups";
import { configured, emailReport, fail, groupById, json, membersOf, preflight, readBody, reportLimited, REPORTS, requestUser, service } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  if (reportLimited(uid)) return json({ error: "rate_limited" }, 429);
  const body = await readBody(req);
  const groupId = uuidOrNull(body?.groupId);
  const target = body?.userId === undefined ? null : uuidOrNull(body.userId);
  const reason = normalizeReportReason(body?.reason);
  if (!groupId || !reason || (body?.userId !== undefined && !target) || target === uid) return json({ error: "bad_request" }, 400);
  try {
    const [group, members] = await Promise.all([groupById(groupId), membersOf([groupId])]);
    if (!group || !members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    const reported = target ? members.find((m) => m.user_id === target) : null;
    if (target && !reported) return json({ error: "not_found" }, 404);
    const targetName = reported?.display_name ?? group.name;
    const res = await service().from(REPORTS).insert({ reporter_id: uid, group_id: groupId, target_user_id: target, target_name: targetName, reason });
    if (res.error && !missingTable(res.error)) throw new Error(`report insert: ${res.error.message}`);
    const emailed = await emailReport({ reason, targetName, groupName: group.name, groupId, targetUserId: target }).catch((err) => {
      console.error("[academy/groups] report email:", err instanceof Error ? err.message : err);
      return false;
    });
    if (res.error && !emailed) throw new Error("report lost: no table and no email");
    return json({ ok: true });
  } catch (err) {
    return fail(err, "report");
  }
}
