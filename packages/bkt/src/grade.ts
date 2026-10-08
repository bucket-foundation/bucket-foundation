import { FSRS, type Card, type Rating } from "../../../src/lib/academy/fsrs";
import { LIMITS } from "../../../src/lib/research-os/work-quiz/limits";

export type { Card, Rating };

import { createHash } from "node:crypto";

export const LEGACY_DECKS: Record<string, string> = { biophysics: "05-biophysics" };

export function deckOf(branch: string): string {
  return LEGACY_DECKS[branch] ?? branch;
}

export function promptHash(prompt: string): string {
  return createHash("sha1").update(prompt.trim()).digest("hex").slice(0, 10);
}

export function contentItemId(branch: string, atomId: string, prompt: string, answer?: string): string {
  const hash = answer === undefined ? promptHash(prompt) : promptHash(`${prompt.trim()}\n${answer.trim()}`);
  return `${deckOf(branch)}/${atomId}/${hash}`;
}

export function contentItemIds(rows: { branch: string; atomId: string; prompt: string; answer: string }[]): string[] {
  const count = new Map<string, number>();
  const key = (r: { branch: string; atomId: string; prompt: string }) => JSON.stringify([deckOf(r.branch), r.atomId, r.prompt.trim()]);
  for (const r of rows) count.set(key(r), (count.get(key(r)) ?? 0) + 1);
  return rows.map((r) => (count.get(key(r))! > 1 ? contentItemId(r.branch, r.atomId, r.prompt, r.answer) : contentItemId(r.branch, r.atomId, r.prompt)));
}

export const GRACE_MS = 1500;
export const FAST_FRACTION = 0.4;

export interface Item {
  id: string;
  atomId: string;
  branch: string;
  title: string;
  level: string;
  prompt: string;
  answer: string;
  shortPrompt?: string;
  shortAnswer?: string;
}

export interface Question {
  itemId: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  limitSec: number;
  long?: boolean;
}

export interface GradeResult {
  correct: boolean;
  timedOut: boolean;
  rating: Rating;
}

export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function limitFor(item: Pick<Item, "answer" | "prompt">): number {
  const words = (item.prompt + " " + item.answer).split(/\s+/).length;
  return Math.min(90, Math.max(20, Math.round(words * 0.6)));
}

export function buildQuestion(item: Item, pool: Item[], seed: string, choiceCount: number = LIMITS.choices): Question {
  const rand = seededRandom(seed + ":" + item.id);
  const others = pool.filter((o) => o.id !== item.id && o.answer !== item.answer);
  const sameBranch = others.filter((o) => o.branch === item.branch);
  const source = sameBranch.length >= choiceCount - 1 ? sameBranch : others;
  const distractors: string[] = [];
  for (const o of shuffle(source, rand)) {
    if (distractors.length >= choiceCount - 1) break;
    if (!distractors.includes(o.answer)) distractors.push(o.answer);
  }
  const choices = shuffle([item.answer, ...distractors], rand);
  return { itemId: item.id, prompt: item.prompt, choices, answerIndex: choices.indexOf(item.answer), limitSec: limitFor(item) };
}

export function gradeChoice(q: Pick<Question, "answerIndex" | "limitSec" | "choices">, choice: number | null, elapsedMs: number): GradeResult {
  const limitMs = q.limitSec * 1000;
  const valid = choice !== null && Number.isInteger(choice) && choice >= 0 && choice < q.choices.length;
  const timedOut = elapsedMs > limitMs + GRACE_MS || (!valid && elapsedMs >= limitMs);
  const correct = !timedOut && valid && choice === q.answerIndex;
  const rating: Rating = !correct ? 1 : elapsedMs < limitMs * FAST_FRACTION ? 4 : 3;
  return { correct, timedOut, rating };
}

export function selfRating(key: string): Rating | null {
  const map: Record<string, Rating> = { "1": 1, "2": 2, "3": 3, "4": 4, a: 1, h: 2, g: 3, e: 4 };
  return map[key] ?? null;
}

const fsrs = new FSRS();

export function schedule(existing: Card | null, rating: Rating, now: number): Card {
  return fsrs.review(existing, rating, now);
}

export function isDue(card: Card | null, now: number): boolean {
  return !card || card.due == null || card.due <= now;
}
