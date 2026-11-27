import type { NextRequest, NextResponse } from "next/server";
import { blocksTouching, configured, GroupsError, json, readBody, requestUser, service } from "./groups-server";
import { bearer, isGuestToken, liveGuest } from "./lobby-guests";
import { uuidOrNull, type BlockRow } from "./groups";
import { botsEnabled, gameTiming, STANDING_LOBBY_MS, STANDING_RESULTS_MS } from "./lobby-bots";
import { revealEntries } from "./lobby-reveal";
import { corpusLookup } from "./lang-lookup";
import { langCorpus } from "./groups-server";
import { LANG_CODES } from "./lang-systems";
import {
  allReady,
  audienceEnabled,
  nightRound,
  stealBonus,
  hostLeaveDecision,
  endEnabled,
  NEXT_GAME_MS,
  nextGameDue,
  MIN_READY,
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
  isRace,
  raceDecision,
  raceOver,
  type RaceDecision,
  seatAllowed,
  type LobbySeat,
} from "./lobbies";

export const LOBBIES = "lobbies";
export const PLAYERS = "lobby_players";
export const SCREENS = "lobby_screens";
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
export const LOBBY_COLS = `${LOBBY_BASE_COLS}${revealEnabled() ? ",reveal_seconds" : ""}${setupEnabled() ? ",playlist,mix,start_at" : ""}${endEnabled() ? ",ended_at" : ""}` as typeof LOBBY_BASE_COLS;
const PLAYER_BASE_COLS = "lobby_id,user_id,display_name,ready,score,last_seen,joined_at,is_bot,skill,flag";
export const PLAYER_COLS = `${PLAYER_BASE_COLS}${setupEnabled() ? ",continues" : ""}${endEnabled() ? ",total" : ""}` as typeof PLAYER_BASE_COLS;

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
    if (res.error.message.includes("lobby_closed")) throw new GroupsError("not_found", 404);
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

export async function closeLobbies(ids: string[], now: number): Promise<void> {
  if (!ids.length) return;
  const update = { status: "done", ...(setupEnabled() ? { start_at: null } : {}), ...(endEnabled() ? { ended_at: new Date(now).toISOString() } : {}) };
  check(await service().from(LOBBIES).update(update).in("id", ids).neq("status", "done"), "close");
}

export async function closeHostedLobbies(uid: string, now: number): Promise<void> {
  const rows = check(await service().from(LOBBIES).select("id").eq("host_id", uid).neq("status", "done").is("standing_slot", null), "hosted open") as { id: string }[];
  await closeLobbies(rows.map((r) => r.id), now);
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
  if (isRace(lobby.game)) {
    const raced = check(await service().from(LOBBIES).update({ status: "playing", started_at: new Date(now + LEAD_MS).toISOString(), ...(setupEnabled() ? { start_at: null } : {}) }).eq("id", lobby.id).eq("status", "lobby").select(LOBBY_COLS), "start race") as LobbyRow[];
    return raced[0] ? { ok: true, lobby: raced[0] } : { ok: false, error: "lobby_started" };
  }
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
  if (decision.correct && nightRound(lobby)?.final) {
    const [answers, seats] = await Promise.all([
      check(await service().from(ANSWERS).select("user_id,correct").eq("lobby_id", lobby.id).eq("round", round), "final answers") as { user_id: string; correct: boolean }[],
      check(await service().from(PLAYERS).select("user_id,score").eq("lobby_id", lobby.id), "final scores") as { user_id: string; score: number }[],
    ]);
    decision.points = decision.points * 2 + stealBonus(uid, seats, answers);
  }
  const res = await service().rpc("lobby_answer", { p_lobby: lobby.id, p_user: uid, p_round: round, p_choice: choice, p_correct: decision.correct, p_ms: decision.ms, p_points: decision.points });
  if (res.error) throw new Error(res.error.message);
  if (res.data === "not_member") return { ok: false, error: "not_member" };
  if (res.data === "already") return { ok: false, error: "already_answered" };
  return decision;
}

export type RaceResult = { ok: true; score: number; lobby: LobbyRow } | { ok: false; error: "not_playing" | "bad_score" | "not_member" | "already_answered" };

export async function submitRaceScore(lobby: LobbyRow, uid: string, score: unknown, now: number): Promise<RaceResult> {
  const decision: RaceDecision = raceDecision(lobby, score, now);
  if (!decision.ok) return decision;
  const res = await service().rpc("lobby_answer", { p_lobby: lobby.id, p_user: uid, p_round: 0, p_choice: "score", p_correct: true, p_ms: decision.ms, p_points: decision.score });
  if (res.error) throw new Error(res.error.message);
  if (res.data === "not_member") return { ok: false, error: "not_member" };
  if (res.data === "already") return { ok: false, error: "already_answered" };
  return { ok: true, score: decision.score, lobby: await closeRace(lobby) };
}

export async function closeRace(lobby: LobbyRow): Promise<LobbyRow> {
  if (!isRace(lobby.game) || lobby.status !== "playing") return lobby;
  const [players, answers] = await Promise.all([playersOf([lobby.id]), service().from(ANSWERS).select("user_id").eq("lobby_id", lobby.id)]);
  if (!raceOver(players, check(answers, "race answers") as { user_id: string }[])) return lobby;
  const rows = check(await service().from(LOBBIES).update({ status: "done" }).eq("id", lobby.id).eq("status", "playing").select(LOBBY_COLS), "race done") as LobbyRow[];
  return rows[0] ?? { ...lobby, status: "done" };
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
  return iso(gameEndMs({ ...lobby, started_at: lobby.started_at }) + NEXT_GAME_MS);
}

export async function againHosted(lobby: LobbyRow, now: number, force = false): Promise<LobbyRow> {
  if (!setupEnabled() || lobby.standing_slot || !lobby.playlist || !lobby.started_at || !nextGameDue(lobby, now, force)) return lobby;
  const game = nextGame(lobby);
  const t = gameTiming(game);
  const seed = generateSeed();
  const claimed = check(
    await service()
      .from(LOBBIES)
      .update({ status: "lobby", started_at: null, seed, game, rounds: t.rounds, round_seconds: t.roundSeconds, start_at: null })
      .eq("id", lobby.id)
      .eq("status", "done")
      .eq("started_at", lobby.started_at)
      .select(LOBBY_COLS),
    "again claim",
  ) as LobbyRow[];
  if (!claimed[0]) return (await lobbyById(lobby.id)) ?? lobby;
  const players = await playersOf([lobby.id]);
  const here = players.filter((p) => p.is_bot || now - Date.parse(p.last_seen) < STALE_MS).map((p) => p.user_id);
  check(await service().from(ANSWERS).delete().eq("lobby_id", lobby.id), "again answers");
  check(await service().from(PROMPTS).delete().eq("lobby_id", lobby.id), "again prompts");
  if (duelEnabled()) check(await service().from(POWERS).delete().eq("lobby_id", lobby.id), "again powers");
  if (endEnabled()) for (const p of players) if (p.score) check(await service().from(PLAYERS).update({ total: (p.total ?? 0) + p.score }).eq("lobby_id", lobby.id).eq("user_id", p.user_id), "again totals");
  check(await service().from(PLAYERS).update({ score: 0, ready: false, continues: 0 }).eq("lobby_id", lobby.id), "again scores");
  if (here.length) check(await service().from(PLAYERS).update({ ready: true }).eq("lobby_id", lobby.id).in("user_id", here), "again ready");
  if (here.length < MIN_READY) return claimed[0];
  const armed = check(await service().from(LOBBIES).update({ start_at: new Date(now).toISOString() }).eq("id", lobby.id).eq("status", "lobby").eq("seed", seed).select(LOBBY_COLS), "again arm") as LobbyRow[];
  return armed[0] ?? claimed[0];
}

export async function armAutoStart(lobby: LobbyRow, want: boolean, now: number): Promise<LobbyRow> {
  if (!setupEnabled() || lobby.standing_slot || lobby.status !== "lobby") return lobby;
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
  return autoStart(await armAutoStart(lobby, allReady(await playersOf([lobby.id]), now), now), now);
}

export async function memberLobby(uid: string, lobbyId: unknown, screenOk = false, hostOk = false): Promise<LobbyRow> {
  const id = lobbyIdOf(lobbyId);
  const lobby = await lobbyById(id);
  if (!lobby) throw new GroupsError("not_found", 404);
  if (hostOk && lobby.host_id === uid) return lobby;
  if (!seatAllowed(await seatOf(id, uid, screenOk), screenOk)) throw new GroupsError("not_found", 404);
  return lobby;
}

async function seatOf(lobbyId: string, uid: string, screenOk: boolean): Promise<LobbySeat> {
  const rows = check(await service().from(PLAYERS).select("user_id").eq("lobby_id", lobbyId).eq("user_id", uid).limit(1), "member") as unknown[];
  if (rows.length) return "player";
  if (!screenOk) return null;
  const screens = check(await service().from(SCREENS).select("user_id").eq("lobby_id", lobbyId).eq("user_id", uid).limit(1), "screen") as unknown[];
  return screens.length ? "screen" : null;
}

export type HandOff = "handoff" | "closed" | "moved";

export async function handOffHost(lobby: LobbyRow, uid: string, now: number): Promise<HandOff> {
  const tried = new Set<string>();
  for (;;) {
    const players = (await playersOf([lobby.id])).filter((p) => !tried.has(p.user_id));
    const decision = hostLeaveDecision(uid, players, now);
    if (decision.kind === "close") {
      await closeLobbies([lobby.id], now);
      return "closed";
    }
    tried.add(decision.to);
    const seat = check(await service().from(PLAYERS).select("user_id").eq("lobby_id", lobby.id).eq("user_id", decision.to).limit(1), "handoff seat check") as unknown[];
    if (!seat.length) continue;
    const moved = check(await service().from(LOBBIES).update({ host_id: decision.to }).eq("id", lobby.id).eq("host_id", uid).select("id"), "handoff") as unknown[];
    if (!moved.length) return "moved";
    check(await service().from(PLAYERS).delete().eq("lobby_id", lobby.id).eq("user_id", uid), "handoff seat");
    check(await service().from(SCREENS).delete().eq("lobby_id", lobby.id).eq("user_id", uid), "handoff screen");
    return "handoff";
  }
}

export async function freshScreens(lobbyIds: string[], now: number): Promise<Set<string>> {
  if (!lobbyIds.length) return new Set();
  const rows = check(await service().from(SCREENS).select("lobby_id,last_seen").in("lobby_id", lobbyIds), "screens seen") as { lobby_id: string; last_seen: string }[];
  return new Set(rows.filter((r) => now - Date.parse(r.last_seen) < STALE_MS).map((r) => r.lobby_id));
}

export function roomTopic(lobbyId: string): string {
  return `lobby-room:${lobbyId}`;
}

export function roomRealtime(lobbyId: string): { url: string; key: string; topic: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key, topic: roomTopic(lobbyId) } : null;
}

export async function broadcastRoom(lobbyId: string, payload: unknown): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: roomTopic(lobbyId), event: "stoa", payload, private: false }] }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function addAudience(lobbyId: string, uid: string): Promise<void> {
  const res = await service().from(SCREENS).insert({ lobby_id: lobbyId, user_id: uid, role: "audience" });
  if (res.error && /duplicate key|unique/i.test(res.error.message)) return;
  check(res, "audience insert");
}

export async function screensOf(lobbyId: string): Promise<string[]> {
  const q = service().from(SCREENS).select("user_id").eq("lobby_id", lobbyId);
  return (check(await (audienceEnabled() ? q.eq("role", "screen") : q), "screens") as { user_id: string }[]).map((r) => r.user_id);
}

export async function addScreen(lobbyId: string, uid: string): Promise<void> {
  const res = await service().from(SCREENS).insert({ lobby_id: lobbyId, user_id: uid });
  if (res.error && /duplicate key|unique/i.test(res.error.message)) return;
  check(res, "screen insert");
}

export function guestSecret(): string | null {
  const s = process.env.LOBBY_GUEST_SECRET;
  return s && s.length >= 32 ? s : null;
}

export const GUEST_REVOKED = "lobby_guest_revoked";

export async function guestRevoked(sub: string): Promise<boolean> {
  const rows = check(await service().from(GUEST_REVOKED).select("guest_id").eq("guest_id", sub).limit(1), "revoked") as unknown[];
  return rows.length > 0;
}

export async function revokeGuest(sub: string): Promise<void> {
  check(await service().from(GUEST_REVOKED).upsert({ guest_id: sub }, { onConflict: "guest_id", ignoreDuplicates: true }), "revoke");
}

export async function lobbyUser(req: NextRequest): Promise<string | null> {
  const token = bearer(req.headers.get("authorization"));
  if (token && isGuestToken(token)) {
    const secret = guestSecret();
    return secret ? (await liveGuest(token, secret, Date.now(), guestRevoked))?.sub ?? null : null;
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
