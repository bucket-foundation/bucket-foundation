import { CROCKFORD, hiddenUsers, type BlockRow } from "./groups";
import type { LangItem, Reading } from "./lang-systems";
import { buildTilePrompts, parseTapped, tileKey, tileHistory, tileOutcome, tilePoints } from "./lobby-tiles";

export type LobbyStatus = "lobby" | "playing" | "done";
export const LOBBY_GAMES = ["daily", "same-word", "flags", "live", "tiles", "duel"] as const;
export type LobbyGame = (typeof LOBBY_GAMES)[number];
export type PromptMode = "form" | "flag" | "tiles" | "mixed" | "meaning";
export type PowerKind = "double" | "fifty";
export const POWER_COST: Record<PowerKind, number> = { double: 2, fifty: 1 };
export const DUEL_ROUNDS = 10;
export type LobbySetup = "single" | "sequence" | "mix";
export const AUTO_START_MS = 15_000;
export function setupGames(env: Record<string, string | undefined> = process.env): LobbyGame[] {
  const base: LobbyGame[] = ["daily", "same-word", "flags", "live", "tiles"];
  return duelEnabled(env) ? [...base, "duel"] : base;
}

export const LOBBY_CODE_LENGTH = 6;
export const LOBBY_CAP = 8;
export const MIN_READY = 2;
export const MAX_HOSTED = 3;
export const LEAD_MS = 3000;
export const DEFAULT_ROUNDS = 6;
export const DEFAULT_ROUND_SECONDS = 8;
export const REVEAL_SECONDS = 4;
export const WEB_CLIENT_HEADER = "x-polingual-client";

export function revealEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.POLINGUAL_LOBBY_REVEAL === "on";
}

export function duelEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.POLINGUAL_LOBBY_DUEL === "on";
}

export function setupEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.POLINGUAL_LOBBY_SETUP === "on";
}
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
  reveal_seconds?: number;
  started_at: string | null;
  version: number;
  created_at: string;
  standing_slot?: string | null;
  bot_fill?: boolean;
  playlist?: LobbyGame[] | null;
  mix?: boolean;
  start_at?: string | null;
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
  continues?: number;
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

export interface RevealEntry {
  lang: string;
  word: string;
  roman: string | null;
  reading: Reading | null;
  meaning: string;
  gloss: string;
  correct: boolean;
}

export interface LobbyPrompt {
  round: number;
  mode: PromptMode;
  lang: string | null;
  gloss: string;
  choices: string[];
  answer: string | null;
  reveal?: RevealEntry[];
  hide?: string[];
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
  firstRound: number;
  continues: number;
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
  reveal?: boolean;
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
  setup: LobbySetup;
  playlist: LobbyGame[];
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
  revealSeconds: number;
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
  setup: LobbySetup;
  playlist: LobbyGame[];
  coins: number;
  powers: { round: number; kind: PowerKind }[];
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
  revealSeconds: number;
  listed: boolean;
  playlist: LobbyGame[] | null;
  mix: boolean;
}

export function setupOf(lobby: Pick<LobbyRow, "playlist" | "mix">): LobbySetup {
  if (lobby.mix) return "mix";
  return (lobby.playlist?.length ?? 0) > 1 ? "sequence" : "single";
}

export function normalizeSetup(body: Record<string, unknown>, game: LobbyGame, targets: readonly string[]): { game: LobbyGame; playlist: LobbyGame[] | null; mix: boolean } | null {
  if (!setupEnabled()) return { game, playlist: null, mix: false };
  const setup = body.setup ?? "single";
  if (setup === "mix") return { game: setupGames().filter((g) => g !== "same-word" || targets.length >= 2)[0], playlist: setupGames().filter((g) => g !== "same-word" || targets.length >= 2), mix: true };
  if (setup === "single") return { game, playlist: [game], mix: false };
  if (setup !== "sequence" || !Array.isArray(body.games)) return null;
  const games = body.games.filter((g, i, all): g is LobbyGame => (setupGames() as readonly unknown[]).includes(g) && all.indexOf(g) === i);
  if (games.length < 2 || games.length !== body.games.length || games.length > 8) return null;
  if (games.includes("same-word") && targets.length < 2) return null;
  return { game: games[0], playlist: games, mix: false };
}

export function nextGame(lobby: Pick<LobbyRow, "game" | "playlist" | "mix" | "seed" | "targets">): LobbyGame {
  const list = lobby.playlist?.length ? lobby.playlist : [lobby.game ?? "daily"];
  if (!lobby.mix) return list[(list.indexOf(lobby.game) + 1) % list.length] ?? list[0];
  const others = list.filter((g) => g !== lobby.game && (g !== "same-word" || lobby.targets.length >= 2));
  const rand = seededRandom(`${lobby.seed}9`);
  for (let i = 0; i < 4; i++) rand();
  return others[Math.floor(rand() * others.length)] ?? list[0];
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
  if (!game || (game === "duel" && !duelEnabled())) return null;
  if (game === "same-word" && targets.length < 2) return null;
  const setup = normalizeSetup(body, game, targets);
  if (!setup) return null;
  const revealSeconds = (body.reveal === true || setup.playlist !== null) && revealEnabled() ? REVEAL_SECONDS : 0;
  return { name: name || "Polingual lobby", game: setup.game, root, targets, rounds, roundSeconds, revealSeconds, listed: body.listed !== false, playlist: setup.playlist, mix: setup.mix };
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

export function buildPrompts(items: readonly LangItem[], lobby: Pick<LobbyRow, "id" | "seed" | "root" | "targets" | "rounds"> & { game?: LobbyGame; playlist?: LobbyGame[] | null }, flagPool: readonly string[] = []): LobbyPromptRow[] {
  if (lobby.game === "same-word") return sameWordPrompts(items, lobby);
  if (lobby.game === "tiles") return buildTilePrompts(items, lobby, flagPool, seededRandom(`${lobby.seed}7`));
  if (lobby.game === "duel") return duelPrompts(items, lobby, flagPool);
  const forms = formPrompts(items, lobby);
  if (lobby.game !== "flags") return lobby.playlist && lobby.targets.length >= 2 ? mixedPrompts(items, forms, lobby) : forms;
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

export function meaningPrompt(items: readonly LangItem[], p: LobbyPromptRow, root: string, rand: () => number): LobbyPromptRow | null {
  const item = items.find((i) => i.id === p.item_id);
  if (!item) return null;
  const word = item.forms[p.lang];
  const answer = item.forms[root];
  const pool = items.filter((i) => i.kind === "word" && i.forms[root] && i.id !== item.id && i.forms[root].toLowerCase() !== answer.toLowerCase());
  const near = [...shuffled(pool.filter((i) => i.category === item.category).slice(0, 200), rand), ...shuffled(pool.slice(0, 400), rand)];
  const foils: string[] = [];
  const taken = new Set([answer.toLowerCase()]);
  for (const i of near) {
    if (foils.length >= CHOICES - 1) break;
    const f = i.forms[root];
    if (taken.has(f.toLowerCase()) || i.forms[p.lang] === word) continue;
    taken.add(f.toLowerCase());
    foils.push(f);
  }
  if (foils.length < 2) return null;
  return { ...p, mode: "meaning", gloss: word, choices: shuffled([answer, ...foils], rand), answer };
}

export function duelPrompts(items: readonly LangItem[], lobby: Pick<LobbyRow, "id" | "seed" | "root" | "targets" | "rounds">, flagPool: readonly string[]): LobbyPromptRow[] {
  const rand = seededRandom(`${lobby.seed}5`);
  const flags = buildPrompts(items, { ...lobby, game: "flags", rounds: lobby.rounds }, flagPool);
  const forms = formPrompts(items, { ...lobby, seed: `${lobby.seed}2` });
  const out: LobbyPromptRow[] = [];
  for (let r = 0, fi = 0, mi = 0; out.length < lobby.rounds && (fi < flags.length || mi < forms.length); r++) {
    const meaning = r % 2 === 1;
    const used = new Set(out.map((o) => o.item_id));
    if (meaning) {
      while (mi < forms.length) {
        const p = forms[mi++];
        if (used.has(p.item_id)) continue;
        const m = meaningPrompt(items, p, lobby.root, rand);
        if (m) {
          out.push({ ...m, round: out.length });
          break;
        }
      }
    } else {
      while (fi < flags.length) {
        const p = flags[fi++];
        if (used.has(p.item_id)) continue;
        out.push({ ...p, round: out.length });
        break;
      }
    }
  }
  return out;
}

export function fiftyHide(choices: readonly string[], answer: string, key: string): string[] {
  const rand = seededRandom(String(Array.from(key).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2_147_483_647, 7) + 1));
  return shuffled(choices.filter((c) => c !== answer), rand).slice(0, Math.max(0, choices.length - 2));
}

export interface PowerRow {
  lobby_id: string;
  user_id: string;
  round: number;
  kind: PowerKind;
}

export function coinsOf(answers: readonly Pick<LobbyAnswerRow, "user_id" | "correct">[], powers: readonly Pick<PowerRow, "user_id" | "kind">[], uid: string): number {
  const earned = answers.filter((a) => a.user_id === uid && a.correct).length;
  const spent = powers.filter((p) => p.user_id === uid).reduce((n, p) => n + POWER_COST[p.kind], 0);
  return Math.max(0, earned - spent);
}

export type PowerDecision = { ok: true; round: number } | { ok: false; error: "not_playing" | "wrong_round" | "no_coins" | "bad_request" };

export function powerDecision(lobby: Clock & Pick<LobbyRow, "status" | "game">, kind: unknown, coins: number, now: number): PowerDecision {
  if (kind !== "double" && kind !== "fifty") return { ok: false, error: "bad_request" };
  if (lobby.status !== "playing" || lobby.game !== "duel") return { ok: false, error: "not_playing" };
  const round = roundAt(lobby, now);
  if (!round || !round.reveal || round.index + 1 >= lobby.rounds) return { ok: false, error: "wrong_round" };
  if (coins < POWER_COST[kind]) return { ok: false, error: "no_coins" };
  return { ok: true, round: round.index + 1 };
}

export function mixedPrompts(items: readonly LangItem[], forms: readonly LobbyPromptRow[], lobby: Pick<LobbyRow, "seed" | "root" | "targets">): LobbyPromptRow[] {
  const rand = seededRandom(`${lobby.seed}3`);
  const byId = new Map(items.map((i) => [i.id, i]));
  const words = items.filter((i) => i.kind === "word" && i.forms[lobby.root]).slice(0, 2000);
  return forms.map((p) => {
    const item = byId.get(p.item_id);
    if (!item) return p;
    const answer = tileKey({ lang: p.lang, form: p.answer });
    const others = shuffled(lobby.targets.filter((l) => l !== p.lang), rand);
    const langs = Array.from({ length: CHOICES - 1 }, (_, i) => others[i % others.length]);
    const own = new Set(Object.values(item.forms).map((f) => f.toLowerCase()));
    const taken = new Set([answer]);
    const same = words.filter((w) => w.category === item.category);
    const foils: string[] = [];
    for (const lang of langs) {
      for (const w of [...shuffled(same.slice(0, 200), rand), ...shuffled(words.slice(0, 400), rand)]) {
        const f = w.forms[lang];
        if (!f || w.id === item.id || own.has(f.toLowerCase()) || w.forms[lobby.root].toLowerCase() === p.gloss.toLowerCase()) continue;
        const key = tileKey({ lang, form: f });
        if (taken.has(key) || key.length > 60) continue;
        taken.add(key);
        foils.push(key);
        break;
      }
    }
    if (foils.length === 0) return p;
    return { ...p, mode: "mixed" as const, choices: shuffled([answer, ...foils], rand), answer };
  });
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

export function visiblePrompts(rows: readonly LobbyPromptRow[], current: number | null, done: boolean, describe?: (row: LobbyPromptRow) => RevealEntry[], closed = false): LobbyPrompt[] {
  return rows
    .filter((r) => done || (current !== null && r.round <= current))
    .sort((a, b) => a.round - b.round)
    .map((r) => {
      const open = done || (current !== null && (r.round < current || (closed && r.round === current)));
      const base: LobbyPrompt = { round: r.round, mode: r.mode ?? "form", lang: open || r.mode === "form" || r.mode === "meaning" ? r.lang : null, gloss: r.gloss, choices: r.choices, answer: open ? r.answer : null };
      return open && describe ? { ...base, reveal: describe(r) } : base;
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

type Clock = Pick<LobbyRow, "started_at" | "rounds" | "round_seconds" | "reveal_seconds">;

export function gameEndMs(lobby: Clock & { started_at: string }): number {
  const gap = (lobby.reveal_seconds ?? 0) * 1000;
  return Date.parse(lobby.started_at) + lobby.rounds * lobby.round_seconds * 1000 + Math.max(0, lobby.rounds - 1) * gap;
}

export function roundAt(lobby: Clock, now: number): LobbyRound | null {
  if (!lobby.started_at) return null;
  const start = Date.parse(lobby.started_at);
  const len = lobby.round_seconds * 1000;
  const slot = len + (lobby.reveal_seconds ?? 0) * 1000;
  if (now < start) return { index: -1, startsAt: lobby.started_at, endsAt: lobby.started_at };
  const index = Math.floor((now - start) / slot);
  if (index >= lobby.rounds || now >= gameEndMs({ ...lobby, started_at: lobby.started_at })) return null;
  const startsAt = start + index * slot;
  const round: LobbyRound = { index, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(startsAt + len).toISOString() };
  return now - startsAt >= len ? { ...round, reveal: true } : round;
}

export function finished(lobby: Clock & Pick<LobbyRow, "status">, now: number): boolean {
  if (lobby.status !== "playing" || !lobby.started_at) return lobby.status === "done";
  return now >= gameEndMs({ ...lobby, started_at: lobby.started_at });
}

export function points(correct: boolean, ms: number, roundSeconds: number): number {
  if (!correct) return 0;
  const len = roundSeconds * 1000;
  const left = Math.max(0, Math.min(1, 1 - ms / len));
  return BASE_POINTS + Math.round(SPEED_POINTS * left);
}

export type AnswerDecision = { ok: true; correct: boolean; ms: number; points: number } | { ok: false; error: "not_playing" | "wrong_round" | "bad_choice" };

export function answerDecision(lobby: Clock & Pick<LobbyRow, "status">, prompt: Pick<LobbyPromptRow, "round" | "choices" | "answer"> | null, round: number, choice: string, now: number): AnswerDecision {
  if (lobby.status !== "playing") return { ok: false, error: "not_playing" };
  const current = roundAt(lobby, now);
  if (!current || current.index !== round || current.reveal) return { ok: false, error: "wrong_round" };
  if (!prompt || prompt.round !== round || !prompt.choices.includes(choice)) return { ok: false, error: "bad_choice" };
  const correct = choice === prompt.answer;
  const ms = Math.max(0, now - Date.parse(current.startsAt));
  return { ok: true, correct, ms, points: points(correct, ms, lobby.round_seconds) };
}

export function tileAnswerDecision(
  lobby: Clock & Pick<LobbyRow, "status">,
  prompt: Pick<LobbyPromptRow, "round" | "choices" | "answer"> | null,
  round: number,
  choice: string,
  now: number,
  prior: readonly { round: number; correct: boolean }[],
  first = 0,
  continues = 0,
): AnswerDecision | { ok: false; error: "out_of_lives" } {
  if (lobby.status !== "playing") return { ok: false, error: "not_playing" };
  const current = roundAt(lobby, now);
  if (!current || current.index !== round || current.reveal) return { ok: false, error: "wrong_round" };
  if (!prompt || prompt.round !== round) return { ok: false, error: "bad_choice" };
  const tapped = parseTapped(choice, prompt.choices.length);
  if (!tapped) return { ok: false, error: "bad_choice" };
  const history = tileHistory(prior, round, first, continues);
  if (history.lives <= 0) return { ok: false, error: "out_of_lives" };
  const outcome = tileOutcome(prompt.answer, tapped);
  return { ok: true, correct: outcome.perfect, ms: Math.max(0, now - Date.parse(current.startsAt)), points: tilePoints(outcome, history.combo) };
}

export function joinedRound(lobby: Clock, joinedAt: string | null | undefined): number {
  if (!joinedAt || !lobby.started_at) return 0;
  const r = roundAt(lobby, Date.parse(joinedAt));
  if (r) return Math.max(0, r.reveal ? r.index + 1 : r.index);
  return Date.parse(joinedAt) < Date.parse(lobby.started_at) ? 0 : lobby.rounds;
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
  describe?: (row: LobbyPromptRow) => RevealEntry[],
  powers: readonly PowerRow[] = [],
): LobbyState {
  const mine = powers.filter((p) => p.user_id === uid);
  const hidden = hiddenUsers(blocks, uid);
  const names = new Map(players.map((p) => [p.user_id, p.display_name]));
  const round = lobby.status === "playing" ? roundAt(lobby, now) : null;
  const answeredNow = new Set(answers.filter((a) => round && !round.reveal && a.round === round.index).map((a) => a.user_id));
  const revealed = answers.filter((a) => !round || a.round < round.index || (round.reveal && a.round === round.index) || a.user_id === uid);
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
    revealSeconds: lobby.reveal_seconds ?? 0,
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
        online: p.is_bot === true || now - Date.parse(p.last_seen) < STALE_MS,
        answered: answeredNow.has(p.user_id),
        bot: p.is_bot === true,
        skill: p.is_bot ? p.skill ?? null : null,
        flag: p.flag ?? null,
        firstRound: joinedRound(lobby, p.joined_at),
        continues: p.continues ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    messages: messages
      .filter((m) => !hidden.has(m.user_id))
      .slice(-MESSAGE_LIMIT)
      .map((m) => ({ id: m.id, from: m.user_id, name: names.get(m.user_id) ?? "", body: m.body, at: m.created_at })),
    round,
    prompts: visiblePrompts(prompts, round && round.index >= 0 ? round.index : null, lobby.status === "done", describe, round?.reveal === true).map((p) => {
      const row = prompts.find((r) => r.round === p.round);
      return mine.some((m) => m.round === p.round && m.kind === "fifty") && row ? { ...p, hide: fiftyHide(row.choices, row.answer, `${lobby.seed}:${p.round}:${uid}`) } : p;
    }),
    coins: coinsOf(answers, powers, uid),
    powers: mine.map((m) => ({ round: m.round, kind: m.kind })),
    results: revealed.map((a) => ({ round: a.round, userId: a.user_id, correct: a.correct, ms: a.ms, points: a.points })),
    standing: !!lobby.standing_slot,
    botFill: lobby.bot_fill === true,
    botsEnabled: false,
    nextStartAt,
    setup: setupOf(lobby),
    playlist: lobby.playlist ?? [lobby.game ?? "daily"],
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
    setup: setupOf(lobby),
    playlist: lobby.playlist ?? [lobby.game ?? "daily"],
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

const NATIVE_GAMES: readonly LobbyGame[] = ["daily", "same-word", "flags", "live"];

export function nativePlayable(lobby: Pick<LobbyRow, "game" | "reveal_seconds" | "playlist">): boolean {
  return NATIVE_GAMES.includes(lobby.game ?? "daily") && !lobby.reveal_seconds && !lobby.playlist;
}
