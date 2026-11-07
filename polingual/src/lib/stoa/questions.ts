import { LANGS } from "../words";

export type QuestionKind = "pick_word" | "which_language" | "translate";
export type LiveQuestion = {
  idx: number;
  round: 1 | 2 | 3;
  kind: QuestionKind;
  prompt: Record<string, string | number>;
  options: string[];
  answer: number;
};
export type RoomSettings = { home: string; targets: string[]; rounds: 3; per_round: 5; window_ms: 20000 };
export type QuestionBuilder = (seed: number, settings: RoomSettings) => LiveQuestion[] | null;

export const ROUNDS = 3;
export const PER_ROUND = 5;
export const WINDOW_MS = 20_000;

export function parseSettings(raw: unknown): RoomSettings | null {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const home = typeof o.home === "string" ? o.home : "en";
  if (!LANGS[home]) return null;
  if (!Array.isArray(o.targets) || o.targets.length < 1 || o.targets.length > 12) return null;
  const targets = [...new Set(o.targets)];
  if (!targets.every((t): t is string => typeof t === "string" && Boolean(LANGS[t]) && t !== home)) return null;
  return { home, targets, rounds: ROUNDS, per_round: PER_ROUND, window_ms: WINDOW_MS };
}
