import { CROCKFORD, hiddenUsers, type BlockRow } from "./groups";
import type { LangItem } from "./lang-systems";

export type LobbyStatus = "lobby" | "playing" | "done";
export const LOBBY_GAMES = ["daily", "same-word", "flags", "live"] as const;
export type LobbyGame = (typeof LOBBY_GAMES)[number];
export type PromptMode = "form" | "flag";

export const LOBBY_CODE_LENGTH = 6;
export const LOBBY_CAP = 8;
export const MIN_READY = 2;
export const MAX_HOSTED = 3;
export const LEAD_MS = 3000;
export const DEFAULT_ROUNDS = 8;
export const DEFAULT_ROUND_SECONDS = 10;
export const MESSAGE_LIMIT = 50;
export const MESSAGE_MAX = 200;
export const STALE_MS = 45_000;
export const OPEN_WINDOW_MS = 30 * 60_000;
export const CHAT_PER_MINUTE = 20;
export const JOIN_PER_MINUTE = 10;
export const CREATE_PER_MINUTE = 3;
export const SEEN_EVERY_MS = 10_000;
export const CHOICES = 4;
export const BASE_POINTS = 100;
export const SPEED_POINTS = 100;

export interface LobbyRow {
  id: string;
  code: string;
  host_id: string;
  name: string;
  game: LobbyGame;
  root: string;
  targets: string[];
  seed: string;
  status: LobbyStatus;
  listed: boolean;
  rounds: number;
  round_seconds: number;
  started_at: string | null;
  version: number;
  created_at: string;
  standing_slot?: string | null;
  bot_fill?: boolean;
}

export interface LobbyPlayerRow {
  lobby_id: string;
  user_id: string;
  display_name: string;
  ready: boolean;
  score: number;
  last_seen: string;
  joined_at: string;
  handle?: string | null;
  is_bot?: boolean;
  skill?: string | null;
  flag?: string | null;
}

export interface LobbyMessageRow {
  id: number;
  lobby_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface LobbyAnswerRow {
  lobby_id: string;
  user_id: string;
  round: number;
  choice: string;
  correct: boolean;
  ms: number;
  points: number;
}

export interface LobbyPromptRow {
  lobby_id: string;
  round: number;
  lang: string;
  item_id: string;
  mode: PromptMode;
  gloss: string;
  choices: string[];
  answer: string;
}

export interface LobbyPrompt {
  round: number;
  mode: PromptMode;
  lang: string | null;
  gloss: string;
  choices: string[];
  answer: string | null;
}

export interface LobbyPlayer {
  userId: string;
  name: string;
  handle: string | null;
  ready: boolean;
  score: number;
  isHost: boolean;
  isMe: boolean;
  online: boolean;
  answered: boolean;
  bot: boolean;
  skill: string | null;
  flag: string | null;
}

export interface LobbyMessage {
  id: number;
  from: string;
  name: string;
  body: string;
  at: string;
}

export interface LobbyRound {
  index: number;
  startsAt: string;
  endsAt: string;
}

export interface LobbyRoundResult {
  round: number;
  userId: string;
  correct: boolean;
  ms: number;
  points: number;
}

export interface LobbySummary {
  id: string;
  code: string;
  name: string;
  game: LobbyGame;
  root: string;
  targets: string[];
  status: LobbyStatus;
  players: number;
  bots: number;
  standing: boolean;
  host: string;
  hostHandle: string | null;
  isMember: boolean;
}

export interface LobbyState {
  id: string;
  code: string;
  name: string;
  game: LobbyGame;
  root: string;
  targets: string[];
  seed: string;
  status: LobbyStatus;
  listed: boolean;
  rounds: number;
  roundSeconds: number;
  startedAt: string | null;
  version: number;
  now: string;
  isHost: boolean;
  players: LobbyPlayer[];
  messages: LobbyMessage[];
  round: LobbyRound | null;
  prompts: LobbyPrompt[];
  results: LobbyRoundResult[];
  standing: boolean;
  botFill: boolean;
  botsEnabled: boolean;
  nextStartAt: string | null;
}

export function generateLobbyCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(LOBBY_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < LOBBY_CODE_LENGTH; i++) out += CROCKFORD[bytes[i] & 31];
  return out;
}

export function normalizeLobbyCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (s.length !== LOBBY_CODE_LENGTH) return null;
  for (const ch of s) if (!CROCKFORD.includes(ch)) return null;
  return s;
}

export function generateSeed(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(8);
  let v = BigInt(0);
  for (let i = 0; i < bytes.length; i++) v = (v << BigInt(8)) | BigInt(bytes[i]);
  return (v === BigInt(0) ? BigInt(1) : v).toString();
}

const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export interface LobbyConfig {
  name: string;
  game: LobbyGame;
  root: string;
  targets: string[];
  rounds: number;
  roundSeconds: number;
  listed: boolean;
}

function clampInt(input: unknown, lo: number, hi: number, fallback: number): number | null {
  if (input === undefined || input === null) return fallback;
  if (typeof input !== "number" || !Number.isInteger(input) || input < lo || input > hi) return null;
  return input;
}

export function normalizeLobbyConfig(body: Record<string, unknown> | null): LobbyConfig | null {
  if (!body) return null;
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  const root = typeof body.root === "string" && LANG.test(body.root) ? body.root : null;
  const raw = Array.isArray(body.targets) ? body.targets : null;
  if (!root || !raw || raw.length < 1 || raw.length > 8) return null;
  if (!raw.every((t) => typeof t === "string" && LANG.test(t))) return null;
  const targets = (raw as string[]).filter((t, i, all) => t !== root && all.indexOf(t) === i);
  if (targets.length === 0) return null;
  const rounds = clampInt(body.rounds, 3, 20, DEFAULT_ROUNDS);
  const roundSeconds = clampInt(body.roundSeconds, 5, 30, DEFAULT_ROUND_SECONDS);
  if (rounds === null || roundSeconds === null) return null;
  if (name.length > 40) return null;
  const game = body.game === undefined ? "daily" : (LOBBY_GAMES as readonly unknown[]).includes(body.game) ? (body.game as LobbyGame) : null;
  if (!game) return null;
  if (game === "same-word" && targets.length < 2) return null;
  return { name: name || "Polingual lobby", game, root, targets, rounds, roundSeconds, listed: body.listed !== false };
}

export function normalizeMessage(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.replace(/\s+/g, " ").trim();
  return s.length >= 1 && s.length <= MESSAGE_MAX ? s : null;
}

export function seededRandom(seed: string): () => number {
  let x = BigInt.asUintN(64, BigInt(/^[0-9]+$/.test(seed) ? seed : "1")) || BigInt(1);
  return () => {
    x ^= x << BigInt(13);
    x = BigInt.asUintN(64, x);
    x ^= x >> BigInt(7);
    x ^= x << BigInt(17);
    x = BigInt.asUintN(64, x);
    return Number(x >> BigInt(11)) / 2 ** 53;
  };
}

function shuffled<T>(xs: readonly T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildPrompts(items: readonly LangItem[], lobby: Pick<LobbyRow, "id" | "seed" | "root" | "targets" | "rounds"> & { game?: LobbyGame }, flagPool: readonly string[] = []): LobbyPromptRow[] {
  if (lobby.game === "same-word") return sameWordPrompts(items, lobby);
  const forms = formPrompts(items, lobby);
  if (lobby.game !== "flags") return forms;
  const rand = seededRandom(`${lobby.seed}1`);
  const langs = [...lobby.targets, ...flagPool.filter((l) => l !== lobby.root && !lobby.targets.includes(l))];
  return forms
    .map((p) => {
      const item = items.find((i) => i.id === p.item_id);
      const others = shuffled(langs.filter((l) => l !== p.lang && item?.forms[l] !== p.answer), rand).slice(0, CHOICES - 1);
      return { ...p, mode: "flag" as const, gloss: p.answer, choices: shuffled([p.lang, ...others], rand), answer: p.lang };
    })
    .filter((p) => p.choices.length >= 2)
    .map((p, round) => ({ ...p, round }));
}

function sameWordPrompts(items: readonly LangItem[], lobby: Pick<LobbyRow, "id" | "seed" | "root" | "targets" | "rounds">): LobbyPromptRow[] {
  const rand = seededRandom(lobby.seed);
  const langs = lobby.targets.slice().sort();
  const shared = items.filter((i) => i.kind === "word" && i.forms[lobby.root] && langs.every((l) => i.forms[l] && i.forms[l] !== i.forms[lobby.root]));
  const out: LobbyPromptRow[] = [];
  for (const item of shuffled(shared.slice(0, 400), rand)) {
    for (const lang of langs) {
      if (out.length >= lobby.rounds) return out;
      const pool = items.filter((p) => p.kind === "word" && p.forms[lang] && p.id !== item.id && p.forms[lang] !== item.forms[lang]);
      const near = shuffled(pool.filter((p) => p.category === item.category).slice(0, 60), rand).map((p) => p.forms[lang]);
      const foils = near.filter((f, i) => near.indexOf(f) === i).slice(0, CHOICES - 1);
      if (foils.length === 0) continue;
      out.push({ lobby_id: lobby.id, round: out.length, lang, item_id: item.id, mode: "form", gloss: item.forms[lobby.root], choices: shuffled([item.forms[lang], ...foils], rand), answer: item.forms[lang] });
    }
  }
  return out;
}

function formPrompts(items: readonly LangItem[], lobby: Pick<LobbyRow, "id" | "seed" | "root" | "targets" | "rounds">): LobbyPromptRow[] {
  const rand = seededRandom(lobby.seed);
  const langs = lobby.targets.slice().sort();
  const pools = new Map(langs.map((l) => [l, items.filter((i) => i.kind === "word" && i.forms[l] && i.forms[lobby.root] && i.forms[l] !== i.forms[lobby.root])]));
  const used = new Set<string>();
  const out: LobbyPromptRow[] = [];
  const order = new Map(langs.map((l) => [l, shuffled((pools.get(l) ?? []).slice(0, 400), rand)]));
  for (let k = 0, misses = 0; out.length < lobby.rounds && misses < langs.length; k++) {
    const lang = langs[k % langs.length];
    const queue = order.get(lang) ?? [];
    let item: LangItem | undefined;
    while (queue.length && !item) {
      const next = queue.shift() as LangItem;
      if (!used.has(next.id)) item = next;
    }
    if (!item) {
      misses++;
      continue;
    }
    misses = 0;
    used.add(item.id);
    const answer = item.forms[lang];
    const gloss = item.forms[lobby.root];
    const pool = pools.get(lang) ?? [];
    const same = pool.filter((p) => p.category === item!.category);
    const foils: string[] = [];
    const taken = new Set([answer.toLowerCase()]);
    for (const p of [...shuffled(same, rand), ...shuffled(pool.slice(0, 400), rand)]) {
      if (foils.length >= CHOICES - 1) break;
      const f = p.forms[lang];
      if (p.forms[lobby.root]?.toLowerCase() === gloss.toLowerCase() || taken.has(f.toLowerCase())) continue;
      taken.add(f.toLowerCase());
      foils.push(f);
    }
    if (foils.length === 0) continue;
    out.push({ lobby_id: lobby.id, round: out.length, lang, item_id: item.id, mode: "form", gloss, choices: shuffled([answer, ...foils], rand), answer });
  }
  return out;
}

export function visiblePrompts(rows: readonly LobbyPromptRow[], current: number | null, done: boolean): LobbyPrompt[] {
  return rows
    .filter((r) => done || (current !== null && r.round <= current))
    .sort((a, b) => a.round - b.round)
    .map((r) => {
      const open = done || (current !== null && r.round < current);
      return { round: r.round, mode: r.mode ?? "form", lang: open || r.mode !== "flag" ? r.lang : null, gloss: r.gloss, choices: r.choices, answer: open ? r.answer : null };
    });
}

export function hostedSince(now: number): string {
  return new Date(now - OPEN_WINDOW_MS).toISOString();
}

export function seenDue(lastSeen: string, now: number): boolean {
  return now - Date.parse(lastSeen) >= SEEN_EVERY_MS;
}

export type StartDecision = "ok" | "not_host" | "not_lobby" | "need_ready";

export function startDecision(lobby: Pick<LobbyRow, "host_id" | "status">, players: readonly Pick<LobbyPlayerRow, "ready">[], uid: string): StartDecision {
  if (lobby.host_id !== uid) return "not_host";
  if (lobby.status !== "lobby") return "not_lobby";
  return players.filter((p) => p.ready).length >= MIN_READY ? "ok" : "need_ready";
}

export type JoinLobbyDecision = "already" | "ok" | "full" | "started";

export function joinLobbyDecision(lobby: Pick<LobbyRow, "status"> & { standing_slot?: string | null }, players: readonly Pick<LobbyPlayerRow, "user_id">[], uid: string): JoinLobbyDecision {
  if (players.some((p) => p.user_id === uid)) return "already";
  if (lobby.status !== "lobby" && !lobby.standing_slot) return "started";
  return players.length >= LOBBY_CAP ? "full" : "ok";
}

export function roundAt(lobby: Pick<LobbyRow, "started_at" | "rounds" | "round_seconds">, now: number): LobbyRound | null {
  if (!lobby.started_at) return null;
  const start = Date.parse(lobby.started_at);
  const len = lobby.round_seconds * 1000;
  if (now < start) return { index: -1, startsAt: lobby.started_at, endsAt: lobby.started_at };
  const index = Math.floor((now - start) / len);
  if (index >= lobby.rounds) return null;
  return { index, startsAt: new Date(start + index * len).toISOString(), endsAt: new Date(start + (index + 1) * len).toISOString() };
}

export function finished(lobby: Pick<LobbyRow, "started_at" | "rounds" | "round_seconds" | "status">, now: number): boolean {
  if (lobby.status !== "playing" || !lobby.started_at) return lobby.status === "done";
  return now >= Date.parse(lobby.started_at) + lobby.rounds * lobby.round_seconds * 1000;
}

export function points(correct: boolean, ms: number, roundSeconds: number): number {
  if (!correct) return 0;
  const len = roundSeconds * 1000;
  const left = Math.max(0, Math.min(1, 1 - ms / len));
  return BASE_POINTS + Math.round(SPEED_POINTS * left);
}

export type AnswerDecision = { ok: true; correct: boolean; ms: number; points: number } | { ok: false; error: "not_playing" | "wrong_round" | "bad_choice" };

export function answerDecision(lobby: Pick<LobbyRow, "status" | "started_at" | "rounds" | "round_seconds">, prompt: Pick<LobbyPromptRow, "round" | "choices" | "answer"> | null, round: number, choice: string, now: number): AnswerDecision {
  if (lobby.status !== "playing") return { ok: false, error: "not_playing" };
  const current = roundAt(lobby, now);
  if (!current || current.index !== round) return { ok: false, error: "wrong_round" };
  if (!prompt || prompt.round !== round || !prompt.choices.includes(choice)) return { ok: false, error: "bad_choice" };
  const correct = choice === prompt.answer;
  const ms = Math.max(0, now - Date.parse(current.startsAt));
  return { ok: true, correct, ms, points: points(correct, ms, lobby.round_seconds) };
}

export function nextHost(players: readonly Pick<LobbyPlayerRow, "user_id" | "joined_at">[], leaving: string): string | null {
  const rest = players.filter((p) => p.user_id !== leaving).sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  return rest[0]?.user_id ?? null;
}

export function assembleLobby(
  lobby: LobbyRow,
  players: readonly LobbyPlayerRow[],
  messages: readonly LobbyMessageRow[],
  answers: readonly LobbyAnswerRow[],
  blocks: readonly BlockRow[],
  uid: string,
  now: number,
  prompts: readonly LobbyPromptRow[] = [],
  nextStartAt: string | null = null,
): LobbyState {
  const hidden = hiddenUsers(blocks, uid);
  const names = new Map(players.map((p) => [p.user_id, p.display_name]));
  const round = lobby.status === "playing" ? roundAt(lobby, now) : null;
  const answeredNow = new Set(answers.filter((a) => round && a.round === round.index).map((a) => a.user_id));
  const revealed = answers.filter((a) => !round || a.round < round.index || a.user_id === uid);
  return {
    id: lobby.id,
    code: lobby.code,
    name: lobby.name,
    game: lobby.game ?? "daily",
    root: lobby.root,
    targets: lobby.targets,
    seed: lobby.seed,
    status: lobby.status,
    listed: lobby.listed,
    rounds: lobby.rounds,
    roundSeconds: lobby.round_seconds,
    startedAt: lobby.started_at,
    version: lobby.version,
    now: new Date(now).toISOString(),
    isHost: lobby.host_id === uid,
    players: players
      .filter((p) => !hidden.has(p.user_id))
      .map((p) => ({
        userId: p.user_id,
        name: p.display_name,
        handle: p.handle ?? null,
        ready: p.ready,
        score: p.score,
        isHost: p.user_id === lobby.host_id,
        isMe: p.user_id === uid,
        online: now - Date.parse(p.last_seen) < STALE_MS,
        answered: answeredNow.has(p.user_id),
        bot: p.is_bot === true,
        skill: p.is_bot ? p.skill ?? null : null,
        flag: p.flag ?? null,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    messages: messages
      .filter((m) => !hidden.has(m.user_id))
      .slice(-MESSAGE_LIMIT)
      .map((m) => ({ id: m.id, from: m.user_id, name: names.get(m.user_id) ?? "", body: m.body, at: m.created_at })),
    round,
    prompts: visiblePrompts(prompts, round && round.index >= 0 ? round.index : null, lobby.status === "done"),
    results: revealed.map((a) => ({ round: a.round, userId: a.user_id, correct: a.correct, ms: a.ms, points: a.points })),
    standing: !!lobby.standing_slot,
    botFill: lobby.bot_fill === true,
    botsEnabled: false,
    nextStartAt: lobby.standing_slot && lobby.status === "lobby" ? nextStartAt : null,
  };
}

export function lobbySummary(lobby: LobbyRow, players: readonly LobbyPlayerRow[], uid: string): LobbySummary {
  return {
    id: lobby.id,
    code: lobby.code,
    name: lobby.name,
    game: lobby.game ?? "daily",
    root: lobby.root,
    targets: lobby.targets,
    status: lobby.status,
    players: players.length,
    bots: players.filter((p) => p.is_bot).length,
    standing: !!lobby.standing_slot,
    host: players.find((p) => p.user_id === lobby.host_id)?.display_name ?? "",
    hostHandle: players.find((p) => p.user_id === lobby.host_id)?.handle ?? null,
    isMember: players.some((p) => p.user_id === uid),
  };
}

export function openLobbies(lobbies: readonly LobbyRow[], players: readonly LobbyPlayerRow[], blocks: readonly BlockRow[], uid: string, now: number, bots = false): LobbySummary[] {
  const hidden = hiddenUsers(blocks, uid);
  const blockedLobbies = new Set(blocks.filter((b) => b.blocker_id === uid && b.target_group_id).map((b) => b.target_group_id as string));
  const byLobby = new Map<string, LobbyPlayerRow[]>();
  for (const p of players) byLobby.set(p.lobby_id, [...(byLobby.get(p.lobby_id) ?? []), p]);
  return lobbies
    .filter((l) => {
      const ps = byLobby.get(l.id) ?? [];
      const mine = ps.some((p) => p.user_id === uid);
      if (l.standing_slot) return bots && (mine || ps.length < LOBBY_CAP);
      if (mine) return l.status !== "done";
      return l.listed && l.status === "lobby" && !hidden.has(l.host_id) && !blockedLobbies.has(l.id) && ps.length > 0 && ps.length < LOBBY_CAP && now - Date.parse(l.created_at) < OPEN_WINDOW_MS;
    })
    .map((l) => lobbySummary(l, byLobby.get(l.id) ?? [], uid))
    .sort((a, b) => Number(b.isMember) - Number(a.isMember) || Number(b.standing) - Number(a.standing) || b.players - a.players);
}
