import type { NextRequest, NextResponse } from "next/server";
import { DEFAULT_FROM, DEFAULT_NOTIFY_TO } from "@/lib/download/notify";
import { clientIp, json, preflight, service } from "@/lib/academy/groups-server";
import { MESSAGE_REPORTS, type LobbyMessageRow } from "@/lib/academy/lobbies";
import { authed, checkLobby, lobbyFail, memberLobby, MESSAGES, namedPlayersOf } from "@/lib/academy/lobbies-server";
import { fileMessageReport, MODERATION_RESPONSE_HOURS, type ReportDeps, type ReportRow } from "@/lib/academy/lobby-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_SLA = `A moderator reviews every chat report within ${MODERATION_RESPONSE_HOURS} hours through bucket.open_lobby_reports and bucket.review_lobby_report.`;

async function emailChatReport(row: ReportRow): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY unset; chat report stored, not emailed");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to: process.env.MODERATION_EMAIL?.trim() || DEFAULT_NOTIFY_TO,
      subject: `Chat report: ${row.reason}`,
      text: `Reported player: ${row.target_name} (${row.target_user_id})\nLobby: ${row.lobby_id}\nMessage ${row.message_id}: ${row.body}\nReason: ${row.reason}\n${REVIEW_SLA}`,
    }),
  });
  if (!res.ok) throw new Error(`chat report email ${res.status}`);
}

const deps: ReportDeps = {
  async take(keys, limit) {
    const res = await service().rpc("lobby_report_take", { p_keys: keys, p_limit: limit });
    if (res.error) throw new Error(`report limit: ${res.error.message}`);
    return res.data === true;
  },
  memberLobby,
  async message(lobbyId, messageId) {
    const rows = checkLobby(await service().from(MESSAGES).select("id,lobby_id,user_id,body").eq("id", messageId).eq("lobby_id", lobbyId).limit(1), "report message") as LobbyMessageRow[];
    return rows[0] ?? null;
  },
  async targetName(lobbyId, userId) {
    return (await namedPlayersOf([lobbyId])).find((p) => p.user_id === userId)?.display_name ?? null;
  },
  async insert(row) {
    const res = checkLobby(await service().from(MESSAGE_REPORTS).upsert(row, { onConflict: "reporter_id,message_id", ignoreDuplicates: true }).select("id"), "report insert") as unknown[];
    return res.length > 0;
  },
  notify: emailChatReport,
};

export function OPTIONS(): NextResponse {
  return preflight();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const a = await authed(req);
  if (!("uid" in a)) return a;
  try {
    const reply = await fileMessageReport(deps, a.uid, clientIp(req), a.body);
    return json(reply.body, reply.status);
  } catch (err) {
    return lobbyFail(err, "report");
  }
}
