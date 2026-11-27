import { buildPrompts, points, type LobbyPromptRow } from "@academy/lobbies";
import { LANG_CODES, type LangItem } from "@academy/lang-systems";
import { tileOutcome } from "@academy/lobby-tiles";
import type { Challenge } from "./share";

export const CHALLENGE_ROUND_SECONDS = 10;

export function challengePrompts(items: readonly LangItem[], c: Challenge): LobbyPromptRow[] {
  return buildPrompts(items, { id: "challenge", seed: c.seed, root: c.root, targets: c.targets, rounds: c.rounds, game: c.game, playlist: c.mixed ? [c.game] : null }, LANG_CODES);
}

export function judge(p: Pick<LobbyPromptRow, "mode" | "answer">, pick: string | readonly number[]): boolean {
  if (p.mode === "tiles") return Array.isArray(pick) && tileOutcome(p.answer, pick as number[]).perfect;
  return pick === p.answer;
}

export function challengePoints(p: Pick<LobbyPromptRow, "mode" | "answer">, pick: string | readonly number[], ms: number): number {
  return points(judge(p, pick), ms, CHALLENGE_ROUND_SECONDS);
}
