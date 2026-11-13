import { service } from "./groups-server";
import { corpusLookup } from "./lang-lookup";
import { gameEndMs, generateLobbyCode, generateSeed, REVEAL_SECONDS, roundAt, STALE_MS, visiblePrompts, type LobbyPlayerRow, type LobbyRow } from "./lobbies";
import {
  botChoice,
  botTileChoice,
  tileSubmitMs,
  BOTS,
  botsEnabled,
  chatLine,
  FILL_SEATS,
  fillDue,
  pickBots,
  planAnswer,
  readyDelayMs,
  seatsToFill,
  standingBotTarget,
  standingStep,
  STANDING_SLOTS,
  TICK_LEASE_MS,
  type BotProfile,
  type BotSkill,
} from "./lobby-bots";
import { ANSWERS, checkLobby, LOBBIES, LOBBY_COLS, MESSAGES, PLAYERS, playersOf, PROMPTS, promptsOf, settle, startLobby, submitAnswer } from "./lobbies-server";

const byId = new Map(BOTS.map((b) => [b.userId, b]));

async function claimTick(lobbyId: string, now: number): Promise<boolean> {
  const cutoff = new Date(now - TICK_LEASE_MS).toISOString();
  const rows = checkLobby(
    await service().from(LOBBIES).update({ tick_at: new Date(now).toISOString() }).eq("id", lobbyId).or(`tick_at.is.null,tick_at.lt.${cutoff}`).select("id"),
    "tick lease",
  ) as unknown[];
  return rows.length > 0;
}

async function addBots(lobbyId: string, bots: BotProfile[]): Promise<void> {
  for (const b of bots) {
    const res = await service().from(PLAYERS).insert({ lobby_id: lobbyId, user_id: b.userId, display_name: b.name, is_bot: true, skill: b.skill, flag: b.flag });
    if (res.error && /duplicate key|unique|lobby_full|lobby_started/i.test(res.error.message)) continue;
    checkLobby(res, "bot insert");
  }
}

async function say(lobbyId: string, userId: string, body: string): Promise<void> {
  checkLobby(await service().from(MESSAGES).insert({ lobby_id: lobbyId, user_id: userId, body }), "bot chat");
}

async function spokeSince(lobbyId: string, since: string): Promise<Set<string>> {
  const rows = checkLobby(await service().from(MESSAGES).select("user_id").eq("lobby_id", lobbyId).gte("created_at", since), "bot chat seen") as { user_id: string }[];
  return new Set(rows.map((r) => r.user_id));
}

export async function fillLobby(lobby: LobbyRow, players: LobbyPlayerRow[], target: number): Promise<number> {
  const humans = players.filter((p) => !p.is_bot).length;
  const bots = players.filter((p) => p.is_bot).length;
  const n = seatsToFill(humans, bots, target);
  if (n === 0) return 0;
  await addBots(lobby.id, pickBots(`${lobby.id}:${lobby.seed}`, n, new Set(players.map((p) => p.user_id))));
  return n;
}

async function resetStanding(lobby: LobbyRow, players: LobbyPlayerRow[], now: number): Promise<LobbyRow | null> {
  const slot = STANDING_SLOTS.find((s) => s.slot === lobby.standing_slot);
  const timing = slot ? { rounds: slot.rounds, round_seconds: slot.roundSeconds, reveal_seconds: REVEAL_SECONDS } : {};
  const rows = checkLobby(
    await service().from(LOBBIES).update({ status: "lobby", started_at: null, seed: generateSeed(), created_at: new Date(now).toISOString(), ...timing }).eq("id", lobby.id).eq("status", lobby.status).select(LOBBY_COLS),
    "standing reset",
  ) as LobbyRow[];
  if (!rows[0]) return null;
  checkLobby(await service().from(ANSWERS).delete().eq("lobby_id", lobby.id), "standing answers");
  checkLobby(await service().from(PROMPTS).delete().eq("lobby_id", lobby.id), "standing prompts");
  const stale = players.filter((p) => !p.is_bot && now - Date.parse(p.last_seen) >= STALE_MS).map((p) => p.user_id);
  if (stale.length) checkLobby(await service().from(PLAYERS).delete().eq("lobby_id", lobby.id).in("user_id", stale), "standing stale");
  checkLobby(await service().from(PLAYERS).update({ score: 0, ready: false }).eq("lobby_id", lobby.id), "standing scores");
  const humans = players.filter((p) => !p.is_bot && !stale.includes(p.user_id)).length;
  const bots = players.filter((p) => p.is_bot);
  const extra = bots.length - standingBotTarget(humans);
  if (extra > 0) {
    const drop = bots.filter((b) => b.user_id !== rows[0].host_id).slice(0, extra).map((b) => b.user_id);
    if (drop.length) checkLobby(await service().from(PLAYERS).delete().eq("lobby_id", lobby.id).in("user_id", drop), "standing trim");
  }
  return rows[0];
}

async function readyBots(lobby: LobbyRow, players: LobbyPlayerRow[], now: number): Promise<void> {
  const since = Date.parse(lobby.created_at);
  const due = players.filter((p) => p.is_bot && !p.ready && now - Math.max(since, Date.parse(p.joined_at)) >= readyDelayMs(lobby.id, p.user_id)).map((p) => p.user_id);
  if (due.length === 0) return;
  checkLobby(await service().from(PLAYERS).update({ ready: true, last_seen: new Date(now).toISOString() }).eq("lobby_id", lobby.id).in("user_id", due), "bot ready");
  const spoke = await spokeSince(lobby.id, lobby.created_at);
  for (const uid of due) {
    const line = spoke.has(uid) ? null : chatLine("greet", `${lobby.id}:${lobby.created_at}:${uid}`);
    if (line) await say(lobby.id, uid, line);
  }
}

async function answerBots(lobby: LobbyRow, players: LobbyPlayerRow[], now: number): Promise<void> {
  const round = roundAt(lobby, now);
  if (!round || round.index < 0 || round.reveal) return;
  const answered = new Set(
    (checkLobby(await service().from(ANSWERS).select("user_id").eq("lobby_id", lobby.id).eq("round", round.index), "bot answers") as { user_id: string }[]).map((r) => r.user_id),
  );
  const waiting = players.filter((p) => p.is_bot && !answered.has(p.user_id));
  if (waiting.length === 0) return;
  const prompt = visiblePrompts(await promptsOf(lobby.id), round.index, false).find((p) => p.round === round.index);
  if (!prompt) return;
  const elapsed = now - Date.parse(round.startsAt);
  for (const bot of waiting) {
    const key = `${lobby.id}:${lobby.started_at}:${round.index}:${bot.user_id}`;
    const plan = planAnswer((bot.skill as BotSkill) ?? byId.get(bot.user_id)?.skill ?? "medium", key, lobby.round_seconds);
    const atMs = prompt.mode === "tiles" ? tileSubmitMs(lobby.round_seconds, plan.atMs) : plan.atMs;
    if (!plan.answers || elapsed < atMs) continue;
    const skill = (bot.skill as BotSkill) ?? "medium";
    const choice = prompt.mode === "tiles" ? botTileChoice(prompt.choices, prompt.gloss, lobby.root, corpusLookup, skill, key) : botChoice(prompt, lobby.root, corpusLookup, plan, key);
    await submitAnswer(lobby, bot.user_id, round.index, choice, Date.parse(round.startsAt) + atMs);
  }
}

async function signOff(lobby: LobbyRow, players: LobbyPlayerRow[]): Promise<void> {
  if (!lobby.started_at) return;
  const end = new Date(gameEndMs({ ...lobby, started_at: lobby.started_at })).toISOString();
  const spoke = await spokeSince(lobby.id, end);
  for (const bot of players.filter((p) => p.is_bot && !spoke.has(p.user_id))) {
    const line = chatLine("signoff", `${lobby.id}:${lobby.started_at}:${bot.user_id}`);
    if (line) await say(lobby.id, bot.user_id, line);
  }
}

export function botLobby(lobby: Pick<LobbyRow, "standing_slot" | "bot_fill">): boolean {
  return botsEnabled() && (!!lobby.standing_slot || lobby.bot_fill === true);
}

export async function tickLobby(lobby: LobbyRow, now: number): Promise<LobbyRow> {
  if (!botLobby(lobby) || !(await claimTick(lobby.id, now))) return lobby;
  let current = await settle(lobby, now);
  let players = await playersOf([current.id]);
  if (current.standing_slot) {
    const step = standingStep(current, now);
    if (step === "reset") {
      current = (await resetStanding(current, players, now)) ?? current;
      players = await playersOf([current.id]);
    } else if (step === "start" && players.some((p) => p.ready)) {
      const started = await startLobby(current, now);
      if (started.ok) current = started.lobby;
    }
    if (current.status === "lobby") {
      const humans = players.filter((p) => !p.is_bot).length;
      if (await fillLobby(current, players, humans + standingBotTarget(humans))) players = await playersOf([current.id]);
    }
  } else if (fillDue(current, now) && (await fillLobby(current, players, FILL_SEATS))) {
    players = await playersOf([current.id]);
  }
  if (current.status === "lobby") await readyBots(current, players, now);
  if (current.status === "playing") await answerBots(current, players, now);
  if (current.status === "done") await signOff(current, players);
  return current;
}

let lastEnsure = 0;
let lastStanding: LobbyRow[] = [];
export const ENSURE_EVERY_MS = 1000;

export async function ensureStanding(now: number): Promise<LobbyRow[]> {
  if (!botsEnabled()) return [];
  if (now - lastEnsure < ENSURE_EVERY_MS) return lastStanding;
  lastEnsure = now;
  const have = checkLobby(await service().from(LOBBIES).select(LOBBY_COLS).not("standing_slot", "is", null), "standing") as LobbyRow[];
  const missing = STANDING_SLOTS.filter((s) => !have.some((l) => l.standing_slot === s.slot));
  for (const s of missing) {
    const host = pickBots(s.slot, 1, new Set())[0];
    const res = await service()
      .from(LOBBIES)
      .upsert(
        { code: generateLobbyCode(), host_id: host.userId, name: s.name, game: s.game, root: s.root, targets: s.targets, seed: generateSeed(), listed: true, rounds: s.rounds, round_seconds: s.roundSeconds, reveal_seconds: REVEAL_SECONDS, standing_slot: s.slot, created_at: new Date(now).toISOString() },
        { onConflict: "standing_slot", ignoreDuplicates: true },
      )
      .select(LOBBY_COLS);
    const row = (checkLobby(res, "standing insert") as LobbyRow[])[0];
    if (row) {
      await addBots(row.id, [host]);
      have.push(row);
    }
  }
  const out: LobbyRow[] = [];
  for (const l of have) out.push(await tickLobby(l, now));
  lastStanding = out;
  return out;
}
