import type { NextRequest, NextResponse } from "next/server";
import { blocksTouching, configured, GroupsError, json, readBody, requestUser, service } from "./groups-server";
import { bearer, isGuestToken, verifyGuestToken } from "./lobby-guests";
import { uuidOrNull, type BlockRow } from "./groups";
import { botsEnabled, gameTiming, STANDING_LOBBY_MS, STANDING_RESULTS_MS } from "./lobby-bots";
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
  STALE_MS,
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
  type PowerRow,
  revealEnabled,
  setupEnabled,
  duelEnabled,
  joinedRound,
  nextGame,
  generateSeed,
  AUTO_START_MS,
  gameEndMs,
} from "./lobbies";

export const LOBBIES = "lobbies";
export const PLAYERS = "lobby_players";
export const MESSAGES = "lobby_messages";
export const ANSWERS = "lobby_answers";
export const PROMPTS = "lobby_prompts";
export const PROFILES = "academy_profiles";
export const POWERS = "lobby_powers";

export async function powersOf(lobby: Pick<LobbyRow, "id" | "game">): Promise<PowerRow[]> {
  if (lobby.game !== "duel") return [];
  return check(await service().from(POWERS).select("lobby_id,user_id,round,kind").eq("lobby_id", lobby.id), "powers") as PowerRow[];
}
const LOBBY_BASE_COLS = "id,code,host_id,name,game,root,targets,seed,status,listed,rounds,round_seconds,started_at,version,created_at,standing_slot,bot_fill";
export const LOBBY_COLS = `${LOBBY_BASE_COLS}${revealEnabled() ? ",reveal_seconds" : ""}${setupEnabled() ? ",playlist,mix,start_at" : ""}` as typeof LOBBY_BASE_COLS;
const PLAYER_BASE_COLS = "lobby_id,user_id,display_name,ready,score,last_seen,joined_at,is_bot,skill,flag";
export const PLAYER_COLS = (setupEnabled() ? `${PLAYER_BASE_COLS},continues` : PLAYER_BASE_COLS) as typeof PLAYER_BASE_COLS;

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
  const rows = check(await service().from(LOBBIES).update({ status: "playing", started_at: startedAt, rounds: prompts.length, ...(setupEnabled() ? { start_at: null } : {}) }).eq("id", lobby.id).eq("status", "lobby").select(LOBBY_COLS), "start") as LobbyRow[];
  return rows[0] ? { ok: true, lobby: rows[0] } : { ok: false, error: "lobby_started" };
}

export type SubmitResult = AnswerDecision | { ok: false; error: "not_member" | "already_answered" | "out_of_lives" };

export async function submitAnswer(lobby: LobbyRow, uid: string, round: number, choice: string, now: number): Promise<SubmitResult> {
  const rows = check(await service().from(PROMPTS).select("round,choices,answer,mode").eq("lobby_id", lobby.id).eq("round", round).limit(1), "prompt") as Pick<LobbyPromptRow, "round" | "choices" | "answer" | "mode">[];
  const prompt = rows[0] ?? null;
  const tiles = prompt?.mode === "tiles";
  const prior = tiles ? (check(await service().from(ANSWERS).select("round,correct").eq("lobby_id", lobby.id).eq("user_id", uid), "prior") as { round: number; correct: boolean }[]) : [];
  const me = tiles ? (check(await service().from(PLAYERS).select(PLAYER_COLS).eq("lobby_id", lobby.id).eq("user_id", uid).limit(1), "joined") as LobbyPlayerRow[])[0] : null;
  const decision = tiles ? tileAnswerDecision(lobby, prompt, round, choice, now, prior, joinedRound(lobby, me?.joined_at), me?.continues ?? 0) : answerDecision(lobby, prompt, round, choice, now);
  if (!decision.ok) return decision;
  if (lobby.game === "duel" && decision.points > 0) {
    const boost = check(await service().from(POWERS).select("kind").eq("lobby_id", lobby.id).eq("user_id", uid).eq("round", round).eq("kind", "double").limit(1), "boost") as unknown[];
    if (boost.length) decision.points *= 2;
  }
  const res = await service().rpc("lobby_answer", { p_lobby: lobby.id, p_user: uid, p_round: round, p_choice: choice, p_correct: decision.correct, p_ms: decision.ms, p_points: decision.points });
  if (res.error) throw new Error(res.error.message);
  if (res.data === "not_member") return { ok: false, error: "not_member" };
  if (res.data === "already") return { ok: false, error: "already_answered" };
  return decision;
}

export async function lobbyState(lobby: LobbyRow, uid: string, now: number, blocks?: BlockRow[]): Promise<LobbyState> {
  const [players, messages, answers, b, prompts, powers] = await Promise.all([
    namedPlayersOf([lobby.id]),
    service().from(MESSAGES).select("id,lobby_id,user_id,body,created_at").eq("lobby_id", lobby.id).order("id", { ascending: false }).limit(MESSAGE_LIMIT),
    service().from(ANSWERS).select("lobby_id,user_id,round,choice,correct,ms,points").eq("lobby_id", lobby.id),
    blocks ? Promise.resolve(blocks) : blocksTouching(uid),
    lobby.status === "lobby" ? Promise.resolve([]) : promptsOf(lobby.id),
    lobby.status === "lobby" ? Promise.resolve([]) : powersOf(lobby),
  ]);
  const msgs = (check(messages, "messages") as LobbyMessageRow[]).reverse();
  const corpus = langCorpus();
  const describe = (row: LobbyPromptRow): RevealEntry[] => revealEntries(row, lobby.root, corpus?.byId.get(row.item_id) ?? null, corpusLookup);
  const state = assembleLobby(lobby, players, msgs, check(answers, "answers") as LobbyAnswerRow[], b, uid, now, prompts, nextStartOf(lobby), describe, powers);
  return { ...state, botsEnabled: botsEnabled() };
}

export function nextStartOf(lobby: LobbyRow): string | null {
  const iso = (ms: number) => new Date(ms).toISOString();
  if (lobby.standing_slot) {
    if (lobby.status === "lobby") return iso(Date.parse(lobby.created_at) + STANDING_LOBBY_MS);
    if (!lobby.started_at) return null;
    return iso(gameEndMs({ ...lobby, started_at: lobby.started_at }) + STANDING_RESULTS_MS + STANDING_LOBBY_MS);
  }
  if (lobby.status === "lobby") return lobby.start_at ?? null;
  if (!setupEnabled() || !lobby.playlist || !lobby.started_at) return null;
  return iso(gameEndMs({ ...lobby, started_at: lobby.started_at }) + STANDING_RESULTS_MS + AUTO_START_MS);
}

export async function againHosted(lobby: LobbyRow, now: number): Promise<LobbyRow> {
  if (!setupEnabled() || lobby.standing_slot || !lobby.playlist || lobby.status !== "done" || !lobby.started_at) return lobby;
  if (now < gameEndMs({ ...lobby, started_at: lobby.started_at }) + STANDING_RESULTS_MS) return lobby;
  const players = await playersOf([lobby.id]);
  const here = players.filter((p) => p.is_bot || now - Date.parse(p.last_seen) < STALE_MS).map((p) => p.user_id);
  const game = nextGame(lobby);
  const t = gameTiming(game);
  check(await service().from(ANSWERS).delete().eq("lobby_id", lobby.id), "again answers");
  check(await service().from(PROMPTS).delete().eq("lobby_id", lobby.id), "again prompts");
  if (duelEnabled()) check(await service().from(POWERS).delete().eq("lobby_id", lobby.id), "again powers");
  check(await service().from(PLAYERS).update({ score: 0, ready: false, continues: 0 }).eq("lobby_id", lobby.id), "again scores");
  if (here.length) check(await service().from(PLAYERS).update({ ready: true }).eq("lobby_id", lobby.id).in("user_id", here), "again ready");
  const rows = check(
    await service()
      .from(LOBBIES)
      .update({ status: "lobby", started_at: null, seed: generateSeed(), game, rounds: t.rounds, round_seconds: t.roundSeconds, start_at: here.length >= 2 ? new Date(now + AUTO_START_MS).toISOString() : null })
      .eq("id", lobby.id)
      .eq("status", "done")
      .select(LOBBY_COLS),
    "again",
  ) as LobbyRow[];
  if (!rows[0]) return (await lobbyById(lobby.id)) ?? lobby;
  return rows[0];
}

export async function armAutoStart(lobby: LobbyRow, readyCount: number, now: number): Promise<LobbyRow> {
  if (!setupEnabled() || lobby.standing_slot || lobby.status !== "lobby") return lobby;
  const want = readyCount >= 2;
  if (want === !!lobby.start_at) return lobby;
  const rows = check(await service().from(LOBBIES).update({ start_at: want ? new Date(now + AUTO_START_MS).toISOString() : null }).eq("id", lobby.id).eq("status", "lobby").select(LOBBY_COLS), "auto start") as LobbyRow[];
  return rows[0] ?? lobby;
}

export async function autoStart(lobby: LobbyRow, now: number): Promise<LobbyRow> {
  if (!setupEnabled() || lobby.standing_slot || lobby.status !== "lobby" || !lobby.start_at || now < Date.parse(lobby.start_at)) return lobby;
  const started = await startLobby(lobby, now);
  if (started.ok) return started.lobby;
  if (started.error === "no_words") check(await service().from(LOBBIES).update({ start_at: null }).eq("id", lobby.id), "auto start clear");
  return (await lobbyById(lobby.id)) ?? lobby;
}

export async function pace(lobby: LobbyRow, now: number): Promise<LobbyRow> {
  if (lobby.status === "done") lobby = await againHosted(lobby, now);
  if (!setupEnabled() || lobby.standing_slot || lobby.status !== "lobby") return lobby;
  const ready = (await playersOf([lobby.id])).filter((p) => p.ready).length;
  return autoStart(await armAutoStart(lobby, ready, now), now);
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
