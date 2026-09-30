import type { EncEdge } from "../../../src/lib/academy/engine";
import { buildQuestion, gradeChoice, isDue, seededRandom, type GradeResult, type Item, type Question, type Rating } from "./grade";
import type { Store } from "./store";

export function pickSession(store: Store, now: number, size: number, seed: string): Item[] {
  const byId = new Map(store.items().map((i) => [i.id, i]));
  const ids = store.dueItemIds(now, size);
  if (ids.length < size) ids.push(...store.newItemIds(size - ids.length));
  if (ids.length < size) {
    const rand = seededRandom(seed);
    const rest = [...byId.keys()].filter((id) => !ids.includes(id));
    while (ids.length < size && rest.length) ids.push(rest.splice(Math.floor(rand() * rest.length), 1)[0]);
  }
  return ids.map((id) => byId.get(id)).filter((i): i is Item => !!i);
}

export function quizQuestions(store: Store, items: Item[], seed: string): Question[] {
  const pool = store.items();
  return items.map((i) => buildQuestion(i, pool, seed));
}

export function answerQuiz(store: Store, q: Question, choice: number | null, elapsedMs: number, now: number, enc: Record<string, EncEdge[]> = {}): GradeResult {
  const result = gradeChoice(q, choice, elapsedMs);
  const response = choice === null ? null : (q.choices[choice] ?? null);
  store.recordAttempt({ itemId: q.itemId, mode: "quiz", response, correct: result.correct, rating: result.rating, elapsedMs, at: now });
  store.gradeItem(q.itemId, result.rating, now, enc);
  return result;
}

export function answerReview(store: Store, itemId: string, rating: Rating, elapsedMs: number, now: number, enc: Record<string, EncEdge[]> = {}) {
  store.recordAttempt({ itemId, mode: "review", response: null, correct: rating > 1, rating, elapsedMs, at: now });
  store.gradeItem(itemId, rating, now, enc);
}

export function dueNow(store: Store, itemId: string, now: number): boolean {
  return isDue(store.card(itemId), now);
}
