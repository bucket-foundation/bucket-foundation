import type { NextRequest, NextResponse } from "next/server";
import { blocksTouching, configured, GroupsError, json, readBody, requestUser, service } from "./groups-server";
import { windowLimiter, type BlockRow } from "./groups";
import {
  assembleLobby,
  finished,
  generateLobbyCode,
  MESSAGE_LIMIT,
  type LobbyAnswerRow,
  type LobbyMessageRow,
  type LobbyPlayerRow,
  type LobbyRow,
  type LobbyState,
} from "./lobbies";

export const LOBBIES = "lobbies";
export const PLAYERS = "lobby_players";
export const MESSAGES = "lobby_messages";
export const ANSWERS = "lobby_answers";
const LOBBY_COLS = "id,code,host_id,name,root,targets,seed,status,listed,rounds,round_seconds,started_at,version,created_at";
const PLAYER_COLS = "lobby_id,user_id,display_name,ready,score,last_seen,joined_at";

export const chatLimited = windowLimiter(20, 60_000);
export const lobbyJoinLimited = windowLimiter(10, 60_000);

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) {
    if (res.error.message.includes("lobby_full")) throw new GroupsError("lobby_full", 409);
    if (res.error.message.includes("lobby_started")) throw new GroupsError("lobby_started", 409);
    throw new Error(`${what}: ${res.error.message}`);
  }
  return res.data as T;
}

export async function lobbyById(id: string): Promise<LobbyRow | null> {
  const rows = check(await service().from(LOBBIES).select(LOBBY_COLS).eq("id", id).limit(1), "lobby") as LobbyRow[];
  return rows[0] ?? null;
}

export async function lobbyByCode(code: string): Promise<LobbyRow | null> {
  const rows = check(await service().from(LOBBIES).select(LOBBY_COLS).eq("code", code).limit(1), "lobby code") as LobbyRow[];
  return rows[0] ?? null;
}

export async function playersOf(ids: string[]): Promise<LobbyPlayerRow[]> {
  if (ids.length === 0) return [];
  return check(await service().from(PLAYERS).select(PLAYER_COLS).in("lobby_id", ids), "players") as LobbyPlayerRow[];
}

export async function openRows(uid: string, since: string): Promise<{ lobbies: LobbyRow[]; players: LobbyPlayerRow[] }> {
  const mine = check(await service().from(PLAYERS).select("lobby_id").eq("user_id", uid), "mine") as { lobby_id: string }[];
  const open = check(await service().from(LOBBIES).select(LOBBY_COLS).eq("status", "lobby").eq("listed", true).gte("created_at", since).order("created_at", { ascending: false }).limit(50), "open") as LobbyRow[];
  const mineIds = mine.map((m) => m.lobby_id).filter((id) => !open.some((l) => l.id === id));
  const own = mineIds.length ? (check(await service().from(LOBBIES).select(LOBBY_COLS).in("id", mineIds), "own") as LobbyRow[]) : [];
  const lobbies = [...own, ...open];
  return { lobbies, players: await playersOf(lobbies.map((l) => l.id)) };
}

export async function insertLobby(row: Omit<LobbyRow, "id" | "code" | "status" | "started_at" | "version" | "created_at">): Promise<LobbyRow> {
  for (let i = 0; i < 5; i++) {
    const res = await service().from(LOBBIES).insert({ ...row, code: generateLobbyCode() }).select(LOBBY_COLS).single();
    if (!res.error) return res.data as LobbyRow;
    if (!/duplicate key|unique/i.test(res.error.message) || !/code/.test(res.error.message)) throw new Error(`lobby insert: ${res.error.message}`);
  }
  throw new Error("lobby insert: code collisions");
}

export async function addPlayer(lobbyId: string, uid: string, displayName: string): Promise<void> {
  const res = await service().from(PLAYERS).insert({ lobby_id: lobbyId, user_id: uid, display_name: displayName });
  if (res.error && /duplicate key|unique/i.test(res.error.message)) return;
  check(res, "player insert");
}

export async function settle(lobby: LobbyRow, now: number): Promise<LobbyRow> {
  if (lobby.status !== "playing" || !finished(lobby, now)) return lobby;
  const res = await service().from(LOBBIES).update({ status: "done" }).eq("id", lobby.id).eq("status", "playing").select(LOBBY_COLS);
  const rows = check(res, "settle") as LobbyRow[];
  return rows[0] ?? { ...lobby, status: "done" };
}

export async function lobbyState(lobby: LobbyRow, uid: string, now: number, blocks?: BlockRow[]): Promise<LobbyState> {
  const [players, messages, answers, b] = await Promise.all([
    playersOf([lobby.id]),
    service().from(MESSAGES).select("id,lobby_id,user_id,body,created_at").eq("lobby_id", lobby.id).order("id", { ascending: false }).limit(MESSAGE_LIMIT),
    service().from(ANSWERS).select("lobby_id,user_id,round,choice,correct,ms,points").eq("lobby_id", lobby.id),
    blocks ? Promise.resolve(blocks) : blocksTouching(uid),
  ]);
  const msgs = (check(messages, "messages") as LobbyMessageRow[]).reverse();
  return assembleLobby(lobby, players, msgs, check(answers, "answers") as LobbyAnswerRow[], b, uid, now);
}

export async function memberLobby(uid: string, lobbyId: unknown): Promise<LobbyRow> {
  if (typeof lobbyId !== "string" || !/^[0-9a-f-]{36}$/i.test(lobbyId)) throw new GroupsError("bad_request", 400);
  const lobby = await lobbyById(lobbyId);
  if (!lobby) throw new GroupsError("not_found", 404);
  const rows = check(await service().from(PLAYERS).select("user_id").eq("lobby_id", lobbyId).eq("user_id", uid).limit(1), "member") as unknown[];
  if (rows.length === 0) throw new GroupsError("not_found", 404);
  return lobby;
}

export async function authed(req: NextRequest, withBody = true): Promise<{ uid: string; body: Record<string, unknown> | null } | NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  return { uid, body: withBody ? await readBody(req) : null };
}

export function lobbyFail(err: unknown, where: string): NextResponse {
  if (err instanceof GroupsError) return json({ error: err.code }, err.status);
  console.error(`[academy/lobbies] ${where}:`, err instanceof Error ? err.message : err);
  return json({ error: "sync_unavailable" }, 503);
}

export { check as checkLobby };
