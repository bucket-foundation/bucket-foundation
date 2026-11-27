import type { ClipLicence } from "./voice-atlas";
import { CROCKFORD, hiddenUsers, normalizeReportReason, uuidOrNull, type BlockRow, type ReportReason } from "./groups";
import type { LangItem, Reading } from "./lang-systems";
import { spyRounds } from "./ispy";
import { buildTilePrompts, parseTapped, tileKey, tileHistory, tileOutcome, tilePoints } from "./lobby-tiles";

export type LobbyStatus = "lobby" | "playing" | "done";
export const PROMPT_GAMES = ["daily", "same-word", "flags", "live", "tiles", "duel", "spy"] as const;
export const RACE_GAMES = ["mini", "word-groups", "match", "voice", "letters", "polyword", "flag-tiles", "babel", "shift", "snake", "atlas", "forehead", "ispy", "flag-duel"] as const;
export const LOBBY_GAMES = [...PROMPT_GAMES, ...RACE_GAMES] as const;
export type LobbyGame = (typeof LOBBY_GAMES)[number];
export type RaceGame = (typeof RACE_GAMES)[number];
export const RACE_ROUNDS = 10;
export const RACE_ROUND_SECONDS = 30;
export const RACE_SCORE_MAX = 100_000;
export const RACE_CLIENT_HEADER = "x-polingual-race";

export function isRace(game: LobbyGame | null | undefined): game is RaceGame {
  return (RACE_GAMES as readonly unknown[]).includes(game);
}

export function raceEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return flagOn(env.POLINGUAL_LOBBY_RACE);
}

export function raceGames(env: Record<string, string | undefined> = process.env): RaceGame[] {
  return raceEnabled(env) ? [...RACE_GAMES] : [];
}
export type PromptMode = "form" | "flag" | "tiles" | "mixed" | "meaning" | "spy" | "voice";
export type PowerKind = "double" | "fifty";
export const POWER_COST: Record<PowerKind, number> = { double: 2, fifty: 1 };
export const DUEL_ROUNDS = 10;
export type LobbySetup = "single" | "sequence" | "mix";
export const AUTO_START_MS = 15_000;
export const NEXT_GAME_MS = 60_000;

export const FAMILY_NIGHT: readonly { game: LobbyGame; label: string }[] = [
  { game: "daily", label: "Warm Up" },
  { game: "tiles", label: "Picture Race" },
  { game: "same-word", label: "Final" },
];

export const NIGHT_BREAK_MS = 150_000;
export const ATLAS_CLIPS = 5;
export const ATLAS_SLOT_MS = 12_000;
export const FOREHEAD_MS = 90_000;

export const FOREHEAD_CARD_MS = 15_000;

export type Interlude = { kind: "voice-atlas"; clip: number; endsAt: number } | { kind: "family-teach" } | { kind: "forehead"; card: number; endsAt: number } | { kind: "our-trivia" };

export function foreheadHolder(players: readonly Pick<LobbyPlayerRow, "user_id" | "is_bot">[], card: number): string | null {
  const humans = players.filter((p) => p.is_bot !== true).sort((a, b) => (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0));
  return humans.length ? humans[card % humans.length].user_id : null;
}

export function breakMs(lobby: { playlist?: readonly string[] | null; mix?: boolean; game: string | null }): number {
  const night = nightRound(lobby);
  return night && !night.final ? NIGHT_BREAK_MS : NEXT_GAME_MS;
}

export function interludeAt(lobby: { playlist?: readonly string[] | null; mix?: boolean; game: string | null; status: string; started_at: string | null; rounds: number; round_seconds: number; reveal_seconds?: number | null; ended_at?: string | null }, now: number): Interlude | null {
  if (lobby.status !== "done" || !lobby.started_at || lobby.ended_at) return null;
  const night = nightRound(lobby);
  if (!night || night.final) return null;
  const end = gameEndMs({ ...lobby, started_at: lobby.started_at, reveal_seconds: lobby.reveal_seconds ?? undefined });
  const since = now - end;
  if (since < 0) return null;
  if (night.index === 0) {
    const clip = Math.floor(since / ATLAS_SLOT_MS);
    return clip < ATLAS_CLIPS ? { kind: "voice-atlas", clip, endsAt: end + (clip + 1) * ATLAS_SLOT_MS } : { kind: "family-teach" };
  }
  if (since >= FOREHEAD_MS) return { kind: "our-trivia" };
  const card = Math.floor(since / FOREHEAD_CARD_MS);
  return { kind: "forehead", card, endsAt: end + (card + 1) * FOREHEAD_CARD_MS };
}

export type NightRound = { index: number; label: string; final: boolean; total: number };

export function nightRound(lobby: { playlist?: readonly string[] | null; mix?: boolean; game: string | null }): NightRound | null {
  const list = lobby.playlist ?? [];
  if (lobby.mix || list.length !== FAMILY_NIGHT.length || list.some((g, i) => g !== FAMILY_NIGHT[i].game)) return null;
  const index = list.indexOf(lobby.game ?? "");
  if (index < 0) return null;
  return { index, label: FAMILY_NIGHT[index].label, final: index === FAMILY_NIGHT.length - 1, total: FAMILY_NIGHT.length };
}

export function bonusQuestion(lobby: { status: string; playlist?: readonly string[] | null; mix?: boolean; game: string | null; rounds: number }, round: number): boolean {
  return lobby.status === "playing" && nightRound(lobby)?.final === true && round === lobby.rounds - 1;
}

export const STEAL_POINTS = 100;

export function stealBonus(uid: string, players: readonly { user_id: string; score: number }[], answers: readonly { user_id: string; correct: boolean }[]): number {
  const mine = players.find((p) => p.user_id === uid)?.score ?? 0;
  const ahead = new Set(players.filter((p) => p.user_id !== uid && p.score > mine).map((p) => p.user_id));
  return answers.some((a) => ahead.has(a.user_id) && !a.correct) ? STEAL_POINTS : 0;
}

export function nextGameDue(lobby: Pick<LobbyRow, "status" | "started_at" | "rounds" | "round_seconds" | "reveal_seconds" | "ended_at"> & { playlist?: readonly string[] | null; mix?: boolean; game?: string | null }, now: number, force = false): boolean {
  if (lobby.status !== "done" || !lobby.started_at || lobby.ended_at) return false;
  return force || now >= gameEndMs({ ...lobby, started_at: lobby.started_at }) + breakMs({ playlist: lobby.playlist, mix: lobby.mix, game: lobby.game ?? null });
}
export function setupGames(env: Record<string, string | undefined> = process.env): LobbyGame[] {
  const base: LobbyGame[] = ["daily", "same-word", "flags", "live", "tiles", "spy"];
  return duelEnabled(env) ? [...base, "duel"] : base;
}

export function flagOn(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "on";
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
export const NATIVE_PLAYS_HEADER = "x-polingual-plays";

export function revealEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return flagOn(env.POLINGUAL_LOBBY_REVEAL);
}

export function duelEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return flagOn(env.POLINGUAL_LOBBY_DUEL);
}

export function endEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return flagOn(env.POLINGUAL_LOBBY_END);
}

export function setupEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return flagOn(env.POLINGUAL_LOBBY_SETUP);
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
  guests_watch?: boolean;
  playlist?: LobbyGame[] | null;
  mix?: boolean;
  start_at?: string | null;
  ended_at?: string | null;
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
  total?: number;
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
  licence?: ClipLicence | null;
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
  licence?: ClipLicence;
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
  total?: number;
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
  ended?: boolean;
  canEnd?: boolean;
  setup: LobbySetup;
  playlist: LobbyGame[];
  coins: number;
  powers: { round: number; kind: PowerKind }[];
  guestsWatch?: boolean;
  bonusVotes?: BonusTally[];
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
  if (isRace(game)) {
    if (!raceEnabled()) return null;
    return { name: name || "Polingual lobby", game, root, targets, rounds: RACE_ROUNDS, roundSeconds: RACE_ROUND_SECONDS, revealSeconds: 0, listed: body.listed !== false, playlist: null, mix: false };
  }
  if (game === "same-word" && targets.length < 2) return null;
  const setup = normalizeSetup(body, game, targets);
  if (!setup) return null;
  const revealSeconds = (body.reveal === true || setup.playlist !== null) && revealEnabled() ? REVEAL_SECONDS : 0;
  return { name: name || "Polingual lobby", game: setup.game, root, targets, rounds, roundSeconds, revealSeconds, listed: body.listed !== false, playlist: setup.playlist, mix: setup.mix };
}

export type LobbySettingsPatch = { game: LobbyGame; targets: string[]; playlist?: LobbyGame[]; mix?: boolean };

export function normalizeLobbySettings(body: Record<string, unknown> | null, lobby: Pick<LobbyRow, "game" | "root" | "targets" | "status">): LobbySettingsPatch | null {
  if (!body || lobby.status !== "lobby" || isRace(lobby.game)) return null;
  let targets = lobby.targets;
  if (body.targets !== undefined) {
    const raw = body.targets;
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > 8 || !raw.every((t) => typeof t === "string" && LANG.test(t))) return null;
    targets = (raw as string[]).filter((t, i, all) => t !== lobby.root && all.indexOf(t) === i);
    if (targets.length === 0) return null;
  }
  const offered = setupGames() as readonly unknown[];
  const current: LobbyGame = offered.includes(lobby.game) ? (lobby.game as LobbyGame) : "daily";
  const game = body.game === undefined || body.game === null ? current : offered.includes(body.game) ? (body.game as LobbyGame) : null;
  if (!game) return null;
  if (!setupEnabled()) {
    if ((body.setup ?? "single") !== "single") return null;
    return game === "same-word" && targets.length < 2 ? null : { game, targets };
  }
  const setup = normalizeSetup(body, game, targets);
  if (!setup || (setup.game === "same-word" && targets.length < 2)) return null;
  return { game: setup.game, targets, playlist: setup.playlist ?? [setup.game], mix: setup.mix };
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

export function shuffled<T>(xs: readonly T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildPrompts(items: readonly LangItem[], lobby: Pick<LobbyRow, "id" | "seed" | "root" | "targets" | "rounds"> & { game?: LobbyGame; playlist?: LobbyGame[] | null }, flagPool: readonly string[] = []): LobbyPromptRow[] {
  if (isRace(lobby.game)) return [];
  if (lobby.game === "same-word") return sameWordPrompts(items, lobby);
  if (lobby.game === "tiles") return buildTilePrompts(items, lobby, flagPool, seededRandom(`${lobby.seed}7`));
  if (lobby.game === "duel") return duelPrompts(items, lobby, flagPool);
  if (lobby.game === "spy") return spyRounds(items, lobby).map((r) => ({ lobby_id: lobby.id, round: r.round, lang: r.lang, item_id: r.item_id, mode: r.mode, gloss: r.gloss, choices: r.choices, answer: r.answer }));
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
      const base: LobbyPrompt = { round: r.round, mode: r.mode ?? "form", lang: open || r.mode === "form" || r.mode === "meaning" || r.mode === "voice" ? r.lang : null, gloss: r.gloss, choices: r.choices, answer: open ? r.answer : null, ...(r.licence ? { licence: r.licence } : {}) };
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

type ReadySeat = Pick<LobbyPlayerRow, "ready"> & { is_bot?: boolean; last_seen?: string };

export function allReady(players: readonly ReadySeat[], now: number = Date.now()): boolean {
  const here = players.filter((p) => p.is_bot === true || !p.last_seen || now - Date.parse(p.last_seen) < STALE_MS);
  return here.length >= MIN_READY && here.some((p) => !p.is_bot) && here.every((p) => p.ready || p.is_bot === true);
}

export function startDecision(lobby: Pick<LobbyRow, "host_id" | "status">, players: readonly ReadySeat[], uid: string, now: number = Date.now()): StartDecision {
  if (lobby.host_id !== uid) return "not_host";
  if (lobby.status !== "lobby") return "not_lobby";
  return allReady(players, now) ? "ok" : "need_ready";
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

export type RaceDecision = { ok: true; score: number; ms: number } | { ok: false; error: "not_playing" | "bad_score" };

export function raceDecision(lobby: Clock & Pick<LobbyRow, "status" | "game">, score: unknown, now: number): RaceDecision {
  if (!isRace(lobby.game) || lobby.status !== "playing" || !lobby.started_at) return { ok: false, error: "not_playing" };
  const start = Date.parse(lobby.started_at);
  if (now < start || now >= gameEndMs({ ...lobby, started_at: lobby.started_at })) return { ok: false, error: "not_playing" };
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0) return { ok: false, error: "bad_score" };
  return { ok: true, score: Math.min(score, RACE_SCORE_MAX), ms: now - start };
}

export function raceOver(players: readonly Pick<LobbyPlayerRow, "user_id" | "is_bot">[], answers: readonly Pick<LobbyAnswerRow, "user_id">[]): boolean {
  const people = players.filter((p) => !p.is_bot);
  const done = new Set(answers.map((a) => a.user_id));
  return people.length > 0 && people.every((p) => done.has(p.user_id));
}

export function raceMs(answers: readonly Pick<LobbyAnswerRow, "user_id" | "ms">[], uid: string): number {
  return answers.find((a) => a.user_id === uid)?.ms ?? Number.MAX_SAFE_INTEGER;
}

export function raceVisible(lobby: Pick<LobbyRow, "game">, raceClient: boolean): boolean {
  return !isRace(lobby.game) || raceClient;
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
  const race = isRace(lobby.game);
  const answeredNow = new Set(answers.filter((a) => race || (round && !round.reveal && a.round === round.index)).map((a) => a.user_id));
  const revealed = answers.filter((a) => race || !round || a.round < round.index || (round.reveal && a.round === round.index) || a.user_id === uid);
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
        total: (p.total ?? 0) + p.score,
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
      .sort((a, b) => b.score - a.score || (race ? raceMs(answers, a.userId) - raceMs(answers, b.userId) : 0) || a.name.localeCompare(b.name)),
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
    ...(lobby.guests_watch === undefined ? {} : { guestsWatch: lobby.guests_watch === true }),
    botsEnabled: false,
    nextStartAt: lobby.ended_at ? null : nextStartAt,
    ended: !!lobby.ended_at,
    canEnd: endEnabled() && setupEnabled() && !lobby.standing_slot,
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

export const ABANDONED_PLAYING_MS = 5 * 60_000;

export type HostLeave = { kind: "handoff"; to: string } | { kind: "close" };

export function hostLeaveDecision(hostId: string, players: readonly Pick<LobbyPlayerRow, "user_id" | "last_seen" | "joined_at" | "is_bot">[], now: number): HostLeave {
  const next = players
    .filter((p) => p.user_id !== hostId && p.is_bot !== true && now - Date.parse(p.last_seen) < STALE_MS)
    .sort((a, b) => Date.parse(a.joined_at) - Date.parse(b.joined_at))[0];
  return next ? { kind: "handoff", to: next.user_id } : { kind: "close" };
}

export function abandonedLobby(lobby: Pick<LobbyRow, "id" | "status" | "standing_slot">, players: readonly Pick<LobbyPlayerRow, "lobby_id" | "last_seen" | "is_bot">[], now: number): boolean {
  if (lobby.standing_slot || lobby.status === "done") return false;
  const window = lobby.status === "playing" ? ABANDONED_PLAYING_MS : STALE_MS;
  return !players.some((p) => p.lobby_id === lobby.id && p.is_bot !== true && now - Date.parse(p.last_seen) < window);
}

export function openLobbies(lobbies: readonly LobbyRow[], players: readonly LobbyPlayerRow[], blocks: readonly BlockRow[], uid: string, now: number, bots = false, watched: ReadonlySet<string> = new Set()): LobbySummary[] {
  const hidden = hiddenUsers(blocks, uid);
  const blockedLobbies = new Set(blocks.filter((b) => b.blocker_id === uid && b.target_group_id).map((b) => b.target_group_id as string));
  const byLobby = new Map<string, LobbyPlayerRow[]>();
  for (const p of players) byLobby.set(p.lobby_id, [...(byLobby.get(p.lobby_id) ?? []), p]);
  return lobbies
    .filter((l) => {
      const ps = byLobby.get(l.id) ?? [];
      const mine = ps.some((p) => p.user_id === uid);
      if (l.standing_slot) return bots && (mine || ps.length < LOBBY_CAP);
      if (l.ended_at || (abandonedLobby(l, ps, now) && !watched.has(l.id))) return false;
      if (mine) return l.status !== "done";
      return l.listed && l.status === "lobby" && !hidden.has(l.host_id) && !blockedLobbies.has(l.id) && (ps.length > 0 || watched.has(l.id)) && ps.length < LOBBY_CAP && now - Date.parse(l.created_at) < OPEN_WINDOW_MS;
    })
    .map((l) => lobbySummary(l, byLobby.get(l.id) ?? [], uid))
    .sort((a, b) => Number(b.isMember) - Number(a.isMember) || Number(b.standing) - Number(a.standing) || b.players - a.players);
}

const NATIVE_GAMES: readonly LobbyGame[] = ["daily", "same-word", "flags", "live"];

export const NATIVE_DECLARABLE = ["tiles", "duel", "reveal", "playlist", "night"] as const;

export function nativePlays(header: string | null | undefined): Set<string> {
  return new Set((header ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => (NATIVE_DECLARABLE as readonly string[]).includes(s)));
}

export function nativePlayable(lobby: Pick<LobbyRow, "game" | "reveal_seconds" | "playlist"> & { mix?: boolean }, raceClient = false, plays: ReadonlySet<string> = new Set()): boolean {
  if (isRace(lobby.game)) return raceClient;
  const game = lobby.game ?? "daily";
  const games = lobby.playlist?.length ? lobby.playlist : [game];
  if (!games.every((g) => NATIVE_GAMES.includes(g) || plays.has(g))) return false;
  if (lobby.reveal_seconds && !plays.has("reveal")) return false;
  if (games.length === 1) return true;
  if (!plays.has("playlist")) return false;
  return !nightRound({ ...lobby, game }) || plays.has("night");
}

export const MESSAGE_REPORTS = "lobby_message_reports";

export interface MessageReport {
  lobbyId: string;
  messageId: number;
  reason: ReportReason;
}

export function normalizeMessageReport(body: Record<string, unknown> | null | undefined): MessageReport | null {
  const lobbyId = uuidOrNull(body?.lobbyId);
  const messageId = body?.messageId;
  const reason = normalizeReportReason(body?.reason);
  if (!lobbyId || !reason || typeof messageId !== "number" || !Number.isSafeInteger(messageId) || messageId <= 0) return null;
  return { lobbyId, messageId, reason };
}

export function messageReportDecision(uid: string, report: MessageReport, message: Pick<LobbyMessageRow, "lobby_id" | "user_id"> | null): "ok" | "not_found" | "self" {
  if (!message || message.lobby_id !== report.lobbyId) return "not_found";
  return message.user_id === uid ? "self" : "ok";
}

export type LobbySeat = "player" | "screen" | null;

export function wantsScreen(body: unknown): boolean {
  return typeof body === "object" && body !== null && (body as { screen?: unknown }).screen === true;
}

export const SCREEN_CAP = 3;
export const AUDIENCE_CAP = 40;
export const REACTIONS = ["👏", "😂", "😮", "❤️", "🔥", "🎉", "🤔", "👀"] as const;
export type Reaction = (typeof REACTIONS)[number];
export const AGE_BANDS = ["under13", "13to17", "18plus"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export function audienceEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return flagOn(env.POLINGUAL_LOBBY_AUDIENCE);
}

export type AudienceJoin = "player" | "audience" | "seat_open" | "under13" | "guests_off" | "closed";

export type AudienceViewer = { guest: true } | { guest: false; band: string | null };

export function audienceDecision(lobby: Pick<LobbyRow, "status" | "standing_slot" | "guests_watch">, playerIds: readonly string[], uid: string, viewer: AudienceViewer): AudienceJoin {
  if (playerIds.includes(uid)) return "player";
  if (lobby.status === "done" || lobby.standing_slot) return "closed";
  if (viewer.guest) {
    if (lobby.guests_watch !== true) return "guests_off";
  } else if (viewer.band !== "13to17" && viewer.band !== "18plus") return "under13";
  if (lobby.status === "lobby" && playerIds.length < LOBBY_CAP) return "seat_open";
  return "audience";
}

export type BonusTally = { round: number; choices: { choice: string; votes: number }[]; total: number };

export function bonusTallies(rows: readonly { round: number; user_id: string; choice: string }[]): BonusTally[] {
  const byRound = new Map<number, Map<string, string>>();
  for (const r of rows) {
    const voters = byRound.get(r.round) ?? new Map<string, string>();
    if (!voters.has(r.user_id)) voters.set(r.user_id, r.choice);
    byRound.set(r.round, voters);
  }
  return Array.from(byRound, ([round, voters]) => {
    const counts = new Map<string, number>();
    for (const c of Array.from(voters.values())) counts.set(c, (counts.get(c) ?? 0) + 1);
    const choices = Array.from(counts, ([choice, votes]) => ({ choice, votes })).sort((a, b) => b.votes - a.votes || a.choice.localeCompare(b.choice));
    return { round, choices, total: voters.size };
  }).sort((a, b) => a.round - b.round);
}

export function answerMultiplier(final: boolean, doubled: boolean): number {
  return final || doubled ? 2 : 1;
}

export type RoomSignal = { kind: "react"; emoji: Reaction } | { kind: "vote"; round: number; choice: string };

export function roomSignal(body: Record<string, unknown> | null): RoomSignal | null {
  if (!body) return null;
  if (typeof body.emoji === "string" && (REACTIONS as readonly string[]).includes(body.emoji)) return { kind: "react", emoji: body.emoji as Reaction };
  if (Number.isInteger(body.round) && (body.round as number) >= 0 && typeof body.choice === "string" && body.choice.length > 0 && body.choice.length <= 80) return { kind: "vote", round: body.round as number, choice: body.choice };
  return null;
}

export type ScreenJoin = "player" | "screen" | "add" | "full" | "closed";

export function screenJoinDecision(lobby: Pick<LobbyRow, "status">, playerIds: string[], screenIds: string[], uid: string): ScreenJoin {
  if (playerIds.includes(uid)) return "player";
  if (screenIds.includes(uid)) return "screen";
  if (lobby.status === "done") return "closed";
  return screenIds.length >= SCREEN_CAP ? "full" : "add";
}

export function seatAllowed(seat: LobbySeat, screenOk: boolean): boolean {
  return seat === "player" || (seat === "screen" && screenOk);
}
