import { FAMILY_TEACH } from "./TeachRound";
import { OUR_TRIVIA } from "./TriviaRound";
import type { RoundModule } from "./types";

export type { RoundModule, RoundProps } from "./types";
export { FAMILY_TEACH, OUR_TRIVIA };

export const FAMILY_ROUNDS: readonly RoundModule[] = [FAMILY_TEACH, OUR_TRIVIA];

export function familyRound(id: string): RoundModule | undefined {
  return FAMILY_ROUNDS.find((r) => r.id === id);
}
