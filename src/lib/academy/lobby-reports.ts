import { uuidOrNull } from "./groups";
import { messageReportDecision, normalizeMessageReport, type LobbyMessageRow, type MessageReport } from "./lobbies";

export const REPORTS_PER_HOUR = 10;
export const MODERATION_RESPONSE_HOURS = 24;

export interface ReportRow {
  reporter_id: string;
  lobby_id: string;
  message_id: number;
  target_user_id: string;
  target_name: string;
  body: string;
  reason: MessageReport["reason"];
}

export interface ReportDeps {
  take(keys: string[], limit: number): Promise<boolean>;
  memberLobby(uid: string, lobbyId: string): Promise<{ id: string }>;
  message(lobbyId: string, messageId: number): Promise<Pick<LobbyMessageRow, "id" | "lobby_id" | "user_id" | "body"> | null>;
  targetName(lobbyId: string, userId: string): Promise<string | null>;
  insert(row: ReportRow): Promise<boolean>;
  notify(row: ReportRow): Promise<void>;
}

export interface Reply {
  status: number;
  body: Record<string, unknown>;
}

export function reportLimitKeys(uid: string, ip: string): string[] {
  return ip && ip !== "unknown" ? [`report:user:${uid}`, `report:ip:${ip}`] : [`report:user:${uid}`];
}

export async function fileMessageReport(deps: ReportDeps, uid: string, ip: string, body: Record<string, unknown> | null): Promise<Reply> {
  const report = normalizeMessageReport(body);
  if (!report) return { status: 400, body: { error: "bad_request" } };
  if (!(await deps.take(reportLimitKeys(uid, ip), REPORTS_PER_HOUR))) return { status: 429, body: { error: "rate_limited" } };
  const lobby = await deps.memberLobby(uid, report.lobbyId);
  const message = await deps.message(lobby.id, report.messageId);
  const decision = messageReportDecision(uid, report, message);
  if (decision === "not_found" || !message) return { status: 404, body: { error: "not_found" } };
  if (decision === "self") return { status: 400, body: { error: "bad_request" } };
  const row: ReportRow = {
    reporter_id: uid,
    lobby_id: lobby.id,
    message_id: message.id,
    target_user_id: message.user_id,
    target_name: ((await deps.targetName(lobby.id, message.user_id)) ?? "Player").slice(0, 60),
    body: message.body,
    reason: report.reason,
  };
  if (await deps.insert(row)) {
    await deps.notify(row).catch((err) => console.error("[academy/lobbies] report email:", err instanceof Error ? err.message : err));
  }
  return { status: 200, body: { ok: true, reviewWithinHours: MODERATION_RESPONSE_HOURS } };
}

export interface BlockChange {
  userId: string;
  name: string;
  blocked: boolean;
}

export function normalizeBlockChange(body: Record<string, unknown> | null | undefined, uid: string): BlockChange | null {
  const userId = uuidOrNull(body?.userId);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const blocked = body?.blocked;
  if (!userId || userId === uid || typeof blocked !== "boolean" || (blocked && !name)) return null;
  return { userId, name: name || "Player", blocked };
}
