import type { NextRequest, NextResponse } from "next/server";
import { blocksTouching, configured, GroupsError, json, readBody, requestUser, service } from "./groups-server";
import { bearer, isGuestToken, verifyGuestToken } from "./lobby-guests";
import { uuidOrNull, type BlockRow } from "./groups";
import { botsEnabled, STANDING_LOBBY_MS } from "./lobby-bots";
import { revealEntries } from "./lobby-reveal";
import { corpusLookup } from "./lang-lookup";
import { langCorpus } from "./groups-server";
import { LANG_CODES } from "./lang-systems";
import {
  answerDecision,
  assembleLobby,
  tileAnswerDecision,
  type RevealEntry,
  buildPrompts,
  LEAD_MS,
  finished,
  generateLobbyCode,
  MESSAGE_LIMIT,
  type AnswerDecision,
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
export const LOBBY_COLS = "id,code,host_id,name,game,root,targets,seed,status,listed,rounds,round_seconds,started_at,version,created_at,standing_slot,bot_fill";
export const PLAYER_COLS = "lobby_id,user_id,display_name,ready,score,last_seen,joined_at,is_bot,skill,flag";

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
  const res = await service().from(PROFILES).select("user_id,handle,is_public").in("user_id", ids);
  if (res.error) {
    console.error("lobby handles", res.error.message);
    return new Map();
  }
  return new Map((res.data as { user_id: string; handle: string; is_public: boolean }[]).filter((r) => r.is_public === true).map((r) => [r.user_id, r.handle]));
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

export type StartResult = { ok: true; lobby: LobbyRow } | { ok: false; error: "no_words" | "lobby_started" };

export async function startLobby(lobby: LobbyRow, now: number): Promise<StartResult> {
  const prompts = buildPrompts(langCorpus()?.items ?? [], lobby, LANG_CODES);
  if (prompts.length < 3) return { ok: false, error: "no_words" };
  check(await service().from(PROMPTS).delete().eq("lobby_id", lobby.id), "prompts clear");
  check(await service().from(PROMPTS).insert(prompts), "prompts");
  const startedAt = new Date(now + LEAD_MS).toISOString();
  const rows = check(await service().from(LOBBIES).update({ status: "playing", started_at: startedAt, rounds: prompts.length }).eq("id", lobby.id).eq("status", "lobby").select(LOBBY_COLS), "start") as LobbyRow[];
  return rows[0] ? { ok: true, lobby: rows[0] } : { ok: false, error: "lobby_started" };
}

export type SubmitResult = AnswerDecision | { ok: false; error: "not_member" | "already_answered" | "out_of_lives" };

export async function submitAnswer(lobby: LobbyRow, uid: string, round: number, choice: string, now: number): Promise<SubmitResult> {
  const rows = check(await service().from(PROMPTS).select("round,choices,answer,mode").eq("lobby_id", lobby.id).eq("round", round).limit(1), "prompt") as Pick<LobbyPromptRow, "round" | "choices" | "answer" | "mode">[];
  const prompt = rows[0] ?? null;
  const prior = prompt?.mode === "tiles" ? (check(await service().from(ANSWERS).select("round,correct").eq("lobby_id", lobby.id).eq("user_id", uid), "prior") as { round: number; correct: boolean }[]) : [];
  const decision = prompt?.mode === "tiles" ? tileAnswerDecision(lobby, prompt, round, choice, now, prior) : answerDecision(lobby, prompt, round, choice, now);
  if (!decision.ok) return decision;
  const res = await service().rpc("lobby_answer", { p_lobby: lobby.id, p_user: uid, p_round: round, p_choice: choice, p_correct: decision.correct, p_ms: decision.ms, p_points: decision.points });
  if (res.error) throw new Error(res.error.message);
  if (res.data === "not_member") return { ok: false, error: "not_member" };
  if (res.data === "already") return { ok: false, error: "already_answered" };
  return decision;
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
  const corpus = langCorpus();
  const describe = (row: LobbyPromptRow): RevealEntry[] => revealEntries(row, lobby.root, corpus?.byId.get(row.item_id) ?? null, corpusLookup);
  const state = assembleLobby(lobby, players, msgs, check(answers, "answers") as LobbyAnswerRow[], b, uid, now, prompts, lobby.standing_slot ? new Date(Date.parse(lobby.created_at) + STANDING_LOBBY_MS).toISOString() : null, describe);
  return { ...state, botsEnabled: botsEnabled() };
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
