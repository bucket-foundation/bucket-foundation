import type { NextRequest, NextResponse } from "next/server";
import { blocksTouching, configured, GroupsError, json, readBody, requestUser, service } from "./groups-server";
import { bearer, isGuestToken, verifyGuestToken } from "./lobby-guests";
import { uuidOrNull, type BlockRow } from "./groups";
import {
  assembleLobby,
  finished,
  generateLobbyCode,
  MESSAGE_LIMIT,
  type LobbyAnswerRow,
  type LobbyMessageRow,
  type LobbyPlayerRow,
  type LobbyPromptRow,
  type LobbyRow,
  type LobbyState,
} from "./lobbies";

export const LOBBIES = "lobbies";
export const PLAYERS = "lobby_players";
export const MESSAGES = "lobby_messages";
export const ANSWERS = "lobby_answers";
export const PROMPTS = "lobby_prompts";
export const PROFILES = "academy_profiles";
const LOBBY_COLS = "id,code,host_id,name,game,root,targets,seed,status,listed,rounds,round_seconds,started_at,version,created_at";
const PLAYER_COLS = "lobby_id,user_id,display_name,ready,score,last_seen,joined_at";

export async function limited(key: string, max: number): Promise<boolean> {
  const res = await service().rpc("lobby_take", { p_key: key, p_limit: max });
  if (res.error) throw new Error(`limit: ${res.error.message}`);
  return res.data !== true;
}

export async function promptsOf(lobbyId: string): Promise<LobbyPromptRow[]> {
  return check(await service().from(PROMPTS).select("lobby_id,round,lang,item_id,mode,gloss,choices,answer").eq("lobby_id", lobbyId), "prompts") as LobbyPromptRow[];
}

export function lobbyIdOf(input: unknown): string {
  const id = uuidOrNull(input);
  if (!id) throw new GroupsError("bad_request", 400);
  return id;
}

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

export async function handlesOf(userIds: string[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(userIds));
  if (ids.length === 0) return new Map();
  const res = await service().from(PROFILES).select("user_id,handle").in("user_id", ids);
  if (res.error) {
    console.error("lobby handles", res.error.message);
    return new Map();
  }
  return new Map((res.data as { user_id: string; handle: string }[]).map((r) => [r.user_id, r.handle]));
}

export async function playersOf(ids: string[]): Promise<LobbyPlayerRow[]> {
  if (ids.length === 0) return [];
  return check(await service().from(PLAYERS).select(PLAYER_COLS).in("lobby_id", ids), "players") as LobbyPlayerRow[];
}

export async function namedPlayersOf(ids: string[]): Promise<LobbyPlayerRow[]> {
  const rows = await playersOf(ids);
  const handles = await handlesOf(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, handle: handles.get(r.user_id) ?? null }));
}

export async function openRows(uid: string, since: string): Promise<{ lobbies: LobbyRow[]; players: LobbyPlayerRow[] }> {
  const mine = check(await service().from(PLAYERS).select("lobby_id").eq("user_id", uid), "mine") as { lobby_id: string }[];
  const open = check(await service().from(LOBBIES).select(LOBBY_COLS).eq("status", "lobby").eq("listed", true).gte("created_at", since).order("created_at", { ascending: false }).limit(50), "open") as LobbyRow[];
  const mineIds = mine.map((m) => m.lobby_id).filter((id) => !open.some((l) => l.id === id));
  const own = mineIds.length ? (check(await service().from(LOBBIES).select(LOBBY_COLS).in("id", mineIds), "own") as LobbyRow[]) : [];
  const lobbies = [...own, ...open];
  return { lobbies, players: await namedPlayersOf(lobbies.map((l) => l.id)) };
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
  const [players, messages, answers, b, prompts] = await Promise.all([
    namedPlayersOf([lobby.id]),
    service().from(MESSAGES).select("id,lobby_id,user_id,body,created_at").eq("lobby_id", lobby.id).order("id", { ascending: false }).limit(MESSAGE_LIMIT),
    service().from(ANSWERS).select("lobby_id,user_id,round,choice,correct,ms,points").eq("lobby_id", lobby.id),
    blocks ? Promise.resolve(blocks) : blocksTouching(uid),
    lobby.status === "lobby" ? Promise.resolve([]) : promptsOf(lobby.id),
  ]);
  const msgs = (check(messages, "messages") as LobbyMessageRow[]).reverse();
  return assembleLobby(lobby, players, msgs, check(answers, "answers") as LobbyAnswerRow[], b, uid, now, prompts);
}

export async function memberLobby(uid: string, lobbyId: unknown): Promise<LobbyRow> {
  const id = lobbyIdOf(lobbyId);
  const lobby = await lobbyById(id);
  if (!lobby) throw new GroupsError("not_found", 404);
  const rows = check(await service().from(PLAYERS).select("user_id").eq("lobby_id", id).eq("user_id", uid).limit(1), "member") as unknown[];
  if (rows.length === 0) throw new GroupsError("not_found", 404);
  return lobby;
}

export function guestSecret(): string | null {
  const s = process.env.LOBBY_GUEST_SECRET;
  return s && s.length >= 32 ? s : null;
}

export async function lobbyUser(req: NextRequest): Promise<string | null> {
  const token = bearer(req.headers.get("authorization"));
  if (token && isGuestToken(token)) {
    const secret = guestSecret();
    return secret ? verifyGuestToken(token, secret, Date.now())?.sub ?? null : null;
  }
  return requestUser(req);
}

export async function authed(req: NextRequest, withBody = true): Promise<{ uid: string; body: Record<string, unknown> | null } | NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await lobbyUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  return { uid, body: withBody ? await readBody(req) : null };
}

export function lobbyFail(err: unknown, where: string): NextResponse {
  if (err instanceof GroupsError) return json({ error: err.code }, err.status);
  console.error(`[academy/lobbies] ${where}:`, err instanceof Error ? err.message : err);
  return json({ error: "sync_unavailable" }, 503);
}

export { check as checkLobby };
