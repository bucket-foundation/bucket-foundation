import type { NextRequest, NextResponse } from "next/server";
import { cheerDecision, normalizeCheerKind, toCheer, uuidOrNull, type CheerRow } from "@/lib/academy/groups";
import {
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
  if (!groupId || !to || !kind) return json({ error: "bad_request" }, 400);
  try {
    const now = Date.now();
    const members = await membersOf([groupId]);
    if (!members.some((m) => m.user_id === uid)) return json({ error: "not_found" }, 404);
    const [sent, sums] = await Promise.all([sentToday(groupId, uid, to, now), kind === "nudge" ? summaries([to], now, "UTC") : Promise.resolve(null)]);
    const decision = cheerDecision(members, uid, to, kind, sent, sums?.get(to)?.todayReviews ?? 0, now);
    if (decision === "self") return json({ error: "bad_request" }, 400);
    if (decision === "not_member") return json({ error: "not_found" }, 404);
    if (decision !== "ok") return json({ error: decision }, 409);
    const res = await service().rpc("send_cheer", { p_group: groupId, p_from: uid, p_to: to, p_kind: kind });
    if (res.error) {
      const m = res.error.message || "";
      if (m.includes("cheer_limit")) return json({ error: "cheer_limit" }, 409);
      if (m.includes("not_member")) return json({ error: "not_found" }, 404);
      throw new Error(`send_cheer: ${m}`);
    }
    const row = (Array.isArray(res.data) ? res.data[0] : res.data) as CheerRow | undefined;
    if (!row) throw new Error("send_cheer: no row");
    return json({ cheer: toCheer(row, members) });
  } catch (err) {
    return fail(err, "cheer");
  }
}
