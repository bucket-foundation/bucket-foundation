import type { NextRequest, NextResponse } from "next/server";
import { json, preflight, reportLimited, service } from "@/lib/academy/groups-server";
import { MESSAGE_REPORTS, messageReportDecision, normalizeMessageReport, type LobbyMessageRow } from "@/lib/academy/lobbies";
import { authed, checkLobby, lobbyFail, memberLobby, MESSAGES, namedPlayersOf } from "@/lib/academy/lobbies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  const report = normalizeMessageReport(a.body);
  if (!report) return json({ error: "bad_request" }, 400);
  if (reportLimited(a.uid)) return json({ error: "rate_limited" }, 429);
  try {
    const lobby = await memberLobby(a.uid, report.lobbyId);
    const rows = checkLobby(await service().from(MESSAGES).select("id,lobby_id,user_id,body,created_at").eq("id", report.messageId).eq("lobby_id", lobby.id).limit(1), "report message") as LobbyMessageRow[];
    const message = rows[0] ?? null;
    const decision = messageReportDecision(a.uid, report, message);
    if (decision === "not_found" || !message) return json({ error: "not_found" }, 404);
    if (decision === "self") return json({ error: "bad_request" }, 400);
    const players = await namedPlayersOf([lobby.id]);
    const targetName = (players.find((p) => p.user_id === message.user_id)?.display_name ?? "Player").slice(0, 60);
    checkLobby(
      await service().from(MESSAGE_REPORTS).upsert(
        { reporter_id: a.uid, lobby_id: lobby.id, message_id: message.id, target_user_id: message.user_id, target_name: targetName, body: message.body, reason: report.reason },
        { onConflict: "reporter_id,message_id", ignoreDuplicates: true },
      ),
      "report insert",
    );
    return json({ ok: true });
  } catch (err) {
    return lobbyFail(err, "report");
  }
}
