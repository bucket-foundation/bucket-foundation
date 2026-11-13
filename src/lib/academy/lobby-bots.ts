import { parseTile, tappedChoice, tileKnown, TILE_ROUND_SECONDS } from "./lobby-tiles";
import { gameEndMs, LOBBY_CAP, type LobbyGame, type LobbyPrompt, type LobbyRow } from "./lobbies";

export type BotSkill = "easy" | "medium" | "hard";

export interface BotProfile {
  userId: string;
  name: string;
  flag: string;
  skill: BotSkill;
}

export interface StandingSlot {
  slot: string;
  name: string;
  game: LobbyGame;
  root: string;
  targets: string[];
  rounds: number;
  roundSeconds: number;
  playlist?: LobbyGame[];
  mix?: boolean;
}

export function gameTiming(game: LobbyGame): { rounds: number; roundSeconds: number } {
  if (game === "tiles") return { rounds: 8, roundSeconds: TILE_ROUND_SECONDS };
  if (game === "live") return { rounds: 7, roundSeconds: 7 };
  if (game === "duel") return { rounds: 10, roundSeconds: 8 };
  return { rounds: 6, roundSeconds: 8 };
}

export interface SkillProfile {
  accuracy: number;
  silence: number;
  from: number;
  to: number;
}

export const SKILLS: Record<BotSkill, SkillProfile> = {
  easy: { accuracy: 0.45, silence: 0.15, from: 0.4, to: 0.85 },
  medium: { accuracy: 0.7, silence: 0.05, from: 0.25, to: 0.65 },
  hard: { accuracy: 0.9, silence: 0, from: 0.12, to: 0.45 },
};

export const FILL_WAIT_MS = 8000;
export const FILL_SEATS = 4;
export const STANDING_SEATS = 5;
export const STANDING_LOBBY_MS = 12_000;
export const STANDING_RESULTS_MS = 10_000;
export const TICK_LEASE_MS = 800;
export const READY_FROM_MS = 1200;
export const READY_TO_MS = 3500;
export const CHAT_CHANCE = 0.35;

export const STANDING_SLOTS: StandingSlot[] = [
  { slot: "daily-romance", name: "Daily words: Romance", game: "daily", root: "en", targets: ["es", "fr", "it", "pt"], rounds: 6, roundSeconds: 8 },
  { slot: "daily-world", name: "Daily words: World", game: "daily", root: "en", targets: ["es", "de", "ja", "ar"], rounds: 6, roundSeconds: 8 },
  { slot: "live-romance", name: "Live: Romance", game: "live", root: "en", targets: ["es", "fr", "it", "pt"], rounds: 7, roundSeconds: 7 },
  { slot: "tiles-romance", name: "Tiles: Romance", game: "tiles", root: "en", targets: ["es", "fr", "it", "pt"], rounds: 8, roundSeconds: TILE_ROUND_SECONDS },
  { slot: "tiles-world", name: "Tiles: World", game: "tiles", root: "en", targets: ["es", "de", "ja", "ar"], rounds: 8, roundSeconds: TILE_ROUND_SECONDS },
  { slot: "live-germanic", name: "Live: Germanic", game: "live", root: "en", targets: ["de", "nl", "sv"], rounds: 7, roundSeconds: 7 },
  { slot: "duel-world", name: "Flag Duel: World", game: "duel", root: "en", targets: ["es", "fr", "de", "ja", "ar", "ru"], rounds: 10, roundSeconds: 8 },
  { slot: "set-romance", name: "Game set: Romance", game: "flags", root: "en", targets: ["es", "fr", "it", "pt"], rounds: 6, roundSeconds: 8, playlist: ["flags", "daily", "tiles", "same-word"] },
  { slot: "mix-world", name: "Random mix: World", game: "daily", root: "en", targets: ["es", "fr", "de", "ja", "ar", "ko"], rounds: 6, roundSeconds: 8, playlist: ["daily", "same-word", "flags", "live", "tiles"], mix: true },
];

export function slotEnabled(s: StandingSlot, reveal: boolean, setup: boolean, duel = false): boolean {
  if (s.game === "duel") return duel && reveal;
  if (s.playlist) return setup && reveal;
  return s.game !== "tiles" || reveal;
}

const ROSTER: [string, string][] = [
  ["Lucía", "ES"], ["Mateo", "AR"], ["Camille", "FR"], ["Giulia", "IT"], ["João", "BR"], ["Inês", "PT"],
  ["Lena", "DE"], ["Daan", "NL"], ["Astrid", "SE"], ["Yuki", "JP"], ["Min-jun", "KR"], ["Wei", "CN"],
  ["Priya", "IN"], ["Omar", "EG"], ["Nikos", "GR"], ["Olga", "UA"], ["Sofía", "MX"], ["Liam", "IE"],
  ["Amara", "NG"], ["Chloe", "CA"], ["Kai", "NZ"], ["Elif", "TR"], ["Mai", "VN"], ["Tomás", "CL"],
];

const SKILL_ORDER: BotSkill[] = ["medium", "easy", "hard", "medium", "easy", "hard"];

export const GREETINGS = ["hi all", "hola", "good luck", "ready when you are", "salut", "ciao"];
export const SIGNOFFS = ["gg", "nice one", "close game", "again?", "that was fun", "well played"];

export function botsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.POLINGUAL_LOBBY_BOTS === "on";
}

export function unit(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return (h >>> 0) / 2 ** 32;
}

function hex(n: number, len: number): string {
  return n.toString(16).padStart(len, "0").slice(-len);
}

export function botUserId(index: number): string {
  return `00000000-b07b-4000-8000-${hex(index + 1, 12)}`;
}

export const BOTS: BotProfile[] = ROSTER.map(([name, flag], i) => ({ userId: botUserId(i), name, flag, skill: SKILL_ORDER[i % SKILL_ORDER.length] }));

export function pickBots(key: string, count: number, taken: ReadonlySet<string>): BotProfile[] {
  return BOTS.filter((b) => !taken.has(b.userId))
    .map((b) => ({ b, k: unit(`${key}:${b.userId}`) }))
    .sort((x, y) => x.k - y.k)
    .slice(0, Math.max(0, count))
    .map((x) => x.b);
}

export function seatsToFill(humans: number, bots: number, target: number): number {
  return Math.max(0, Math.min(LOBBY_CAP - humans - bots, target - humans - bots));
}

export function standingBotTarget(humans: number): number {
  return Math.max(1, Math.min(LOBBY_CAP - humans, STANDING_SEATS - humans));
}

export function readyDelayMs(lobbyId: string, userId: string): number {
  return READY_FROM_MS + Math.round(unit(`ready:${lobbyId}:${userId}`) * (READY_TO_MS - READY_FROM_MS));
}

export interface BotPlan {
  answers: boolean;
  correct: boolean;
  atMs: number;
}

export function planAnswer(skill: BotSkill, key: string, roundSeconds: number): BotPlan {
  const s = SKILLS[skill];
  const len = roundSeconds * 1000;
  const at = s.from + (s.to - s.from) * unit(`at:${key}`);
  return { answers: unit(`speak:${key}`) >= s.silence, correct: unit(`right:${key}`) < s.accuracy, atMs: Math.round(at * len) };
}

export type FormLookup = (lang: string, form: string) => readonly { forms: Record<string, string> }[];

export function knownChoice(prompt: Pick<LobbyPrompt, "mode" | "lang" | "gloss" | "choices">, root: string, lookup: FormLookup): string | null {
  if (prompt.mode === "flag") {
    const hits = prompt.choices.filter((lang) => lookup(lang, prompt.gloss).some((i) => !!i.forms[root]));
    return hits.length === 1 ? hits[0] : null;
  }
  if (prompt.mode === "meaning") {
    if (!prompt.lang) return null;
    const lang = prompt.lang;
    const hits = prompt.choices.filter((c) => lookup(lang, prompt.gloss).some((i) => i.forms[root] === c));
    return hits.length === 1 ? hits[0] : null;
  }
  if (prompt.mode === "mixed") {
    const hits = prompt.choices.filter((c) => {
      const t = parseTile(c);
      return lookup(t.lang, t.form).some((i) => i.forms[root] === prompt.gloss);
    });
    return hits.length === 1 ? hits[0] : null;
  }
  if (!prompt.lang) return null;
  const lang = prompt.lang;
  const hits = prompt.choices.filter((c) => lookup(lang, c).some((i) => i.forms[root] === prompt.gloss));
  return hits.length === 1 ? hits[0] : null;
}

export function botChoice(prompt: Pick<LobbyPrompt, "mode" | "lang" | "gloss" | "choices">, root: string, lookup: FormLookup, plan: BotPlan, key: string): string {
  const known = knownChoice(prompt, root, lookup);
  const pool = known && !plan.correct ? prompt.choices.filter((c) => c !== known) : prompt.choices;
  if (known && plan.correct) return known;
  return pool[Math.floor(unit(`pick:${key}`) * pool.length)] ?? prompt.choices[0];
}

export function tileSubmitMs(roundSeconds: number, plannedMs: number): number {
  const len = roundSeconds * 1000;
  return Math.round(len * 0.6 + Math.min(1, plannedMs / len) * len * 0.28);
}

export function botTileChoice(choices: readonly string[], gloss: string, root: string, lookup: FormLookup, skill: BotSkill, key: string): string {
  const known = new Set(tileKnown(choices.map(parseTile), gloss, root, lookup));
  const acc = SKILLS[skill].accuracy;
  const taps: number[] = [];
  choices.forEach((_, i) => {
    const roll = unit(`tile:${key}:${i}`);
    if (known.has(i) ? roll < acc + (1 - acc) / 2 : roll < (1 - acc) / 6) taps.push(i);
  });
  return tappedChoice(taps);
}

export function chatLine(kind: "greet" | "signoff", key: string): string | null {
  if (unit(`chat:${kind}:${key}`) >= CHAT_CHANCE) return null;
  const list = kind === "greet" ? GREETINGS : SIGNOFFS;
  return list[Math.floor(unit(`line:${kind}:${key}`) * list.length)];
}

export type StandingStep = "start" | "reset" | "wait";

export function standingStep(lobby: Pick<LobbyRow, "status" | "created_at" | "started_at" | "rounds" | "round_seconds" | "reveal_seconds">, now: number): StandingStep {
  if (lobby.status === "lobby") return now - Date.parse(lobby.created_at) >= STANDING_LOBBY_MS ? "start" : "wait";
  if (!lobby.started_at) return "reset";
  const end = gameEndMs({ ...lobby, started_at: lobby.started_at });
  return now >= end + STANDING_RESULTS_MS ? "reset" : "wait";
}

export function fillDue(lobby: Pick<LobbyRow, "status" | "created_at"> & { bot_fill?: boolean }, now: number, force = false): boolean {
  if (lobby.status !== "lobby" || !lobby.bot_fill) return false;
  return force || now - Date.parse(lobby.created_at) >= FILL_WAIT_MS;
}
