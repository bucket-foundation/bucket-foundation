import type { NextRequest, NextResponse } from "next/server";
import { normalizeReportReason, uuidOrNull } from "@/lib/academy/groups";
import { shareRpcError } from "@/lib/academy/group-shares";
import { emailItemReport, itemById } from "@/lib/academy/group-shares-server";
import { configured, fail, groupById, json, membersOf, preflight, readBody, reportLimited, requestUser, service } from "@/lib/academy/groups-server";

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
  const itemId = uuidOrNull(body?.itemId);
  const reason = normalizeReportReason(body?.reason);
  if (!itemId || !reason) return json({ error: "bad_request" }, 400);
  try {
    const res = await service().rpc("report_shared_item", { p_item: itemId, p_reporter: uid, p_reason: reason });
    if (res.error) {
      const known = shareRpcError(res.error.message);
      if (known) return json({ error: known.error }, known.status);
      throw new Error(`report_shared_item: ${res.error.message}`);
    }
    const item = await itemById(itemId);
    if (item) {
      const [group, members] = await Promise.all([groupById(item.group_id), membersOf([item.group_id])]);
      const sender = members.find((m) => m.user_id === item.sender_id);
      await emailItemReport({
        itemId,
        groupId: item.group_id,
        groupName: group?.name ?? "",
        senderId: item.sender_id,
        senderName: sender?.display_name ?? "",
        reason,
        reports: Number(res.data) || 1,
        preview: [item.kind, item.url, item.body, item.image_path].filter(Boolean).join("\n"),
      }).catch((err) => console.error("[academy/groups] item report email:", err instanceof Error ? err.message : err));
    }
    return json({ ok: true });
  } catch (err) {
    return fail(err, "share report");
  }
}
