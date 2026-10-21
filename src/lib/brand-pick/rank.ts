import { DIRECTION_IDS, type DirectionId } from "./directions";
import type { Answer } from "./answers";

export interface Ranked {
  id: DirectionId;
  strength: number;
  score: number;
  wins: number;
  losses: number;
}

export const PRIOR_GAMES = 1;
const ITERATIONS = 500;
const TOLERANCE = 1e-10;

export function bradleyTerry(answers: Answer[], ids: readonly DirectionId[] = DIRECTION_IDS): Ranked[] {
  const n = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const wins = new Array<number>(n).fill(0);
  const losses = new Array<number>(n).fill(0);
  const games: number[][] = ids.map(() => new Array<number>(n).fill(0));
  for (const a of answers) {
    if (a.choice === null) continue;
    const loser = a.choice === a.a ? a.b : a.a;
    const w = index.get(a.choice);
    const l = index.get(loser);
    if (w === undefined || l === undefined) continue;
    wins[w] += 1;
    losses[l] += 1;
    games[w][l] += 1;
    games[l][w] += 1;
  }
  let p = new Array<number>(n).fill(1);
  for (let it = 0; it < ITERATIONS; it++) {
    const next = p.map((pi, i) => {
      let denom = PRIOR_GAMES / (pi + 1);
      for (let j = 0; j < n; j++) if (games[i][j] > 0) denom += games[i][j] / (pi + p[j]);
      return (wins[i] + PRIOR_GAMES / 2) / denom;
    });
    const delta = next.reduce((m, v, i) => Math.max(m, Math.abs(v - p[i])), 0);
    p = next;
    if (delta < TOLERANCE) break;
  }
  return ids
    .map((id, i) => ({ id, strength: p[i], score: p[i] / (p[i] + 1), wins: wins[i], losses: losses[i] }))
    .sort((x, y) => y.strength - x.strength || x.id.localeCompare(y.id));
}
