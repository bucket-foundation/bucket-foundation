import { seededRandom } from "../grade";
import type { Bank, FrozenItem } from "./bank";

export const PAIRS_PER_PROBE = 20;
export const THINK_MS = 20_000;
export const RETEST_MS = 7 * 24 * 60 * 60 * 1000;

export interface AiAnswer {
  choice: number | null;
  correct: boolean;
  rationale: string;
}

export interface AiScores {
  bankVersion: string;
  model: string;
  scoredAt: string;
  answers: Record<string, AiAnswer>;
}

export type Condition = "solo" | "pair";

export interface ProbeSlot {
  pairId: string;
  itemId: string;
  condition: Condition;
}

export function pairKey(item: FrozenItem, ai: AiAnswer): string {
  return `${item.tier}|${ai.correct ? 1 : 0}`;
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickPairs(bank: Bank, ai: AiScores, eligible: Set<string>, used: Set<string>, seed: string, pairs = PAIRS_PER_PROBE): ProbeSlot[] {
  if (ai.bankVersion !== bank.version) throw new Error(`AI scores are for bank ${ai.bankVersion}, bank is ${bank.version}`);
  const rand = seededRandom(seed);
  const groups = new Map<string, FrozenItem[]>();
  for (const item of bank.items) {
    const a = ai.answers[item.id];
    if (!a || !eligible.has(item.id) || used.has(item.id)) continue;
    const k = pairKey(item, a);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  const candidates: [FrozenItem, FrozenItem][] = [];
  for (const k of [...groups.keys()].sort()) {
    const g = shuffle(groups.get(k)!, rand);
    for (let i = 0; i + 1 < g.length; i += 2) candidates.push([g[i], g[i + 1]]);
  }
  const chosen = shuffle(candidates, rand).slice(0, pairs);
  if (chosen.length < pairs) throw new Error(`only ${chosen.length} matched pairs left, probe needs ${pairs}`);
  const slots: ProbeSlot[] = [];
  chosen.forEach(([x, y], n) => {
    const pairId = `p${n}`;
    const [solo, pair] = rand() < 0.5 ? [x, y] : [y, x];
    slots.push({ pairId, itemId: solo.id, condition: "solo" }, { pairId, itemId: pair.id, condition: "pair" });
  });
  return shuffle(slots, rand);
}

export function displayOrder(item: FrozenItem, seed: string): number[] {
  return shuffle(item.choices.map((_, i) => i), seededRandom(`${seed}:${item.id}`));
}

export function retestDue(t: number): number {
  return t + RETEST_MS;
}

export function aiVisible(condition: Condition, elapsedMs: number): boolean {
  return condition === "pair" && elapsedMs >= THINK_MS;
}
