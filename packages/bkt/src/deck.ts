import type { EncEdge } from "../../../src/lib/academy/engine";
import { gradeChoice, isDue, seededRandom, type GradeResult, type Item, type Question, type Rating } from "./grade";
import { buildShortQuestion, hasShort, SHORT_FIELDS, withShort, type ShortFile } from "./short-fields";
import type { Store } from "./store";

export function quizPool(store: Store, shorts: ShortFile = SHORT_FIELDS): Item[] {
  return store.items().map((i) => withShort(i, shorts)).filter(hasShort);
}

export function pickSession(store: Store, now: number, size: number, seed: string, shorts: ShortFile = SHORT_FIELDS): Item[] {
  const pool = quizPool(store, shorts);
  const byId = new Map(pool.map((i) => [i.id, i]));
  const byAtom = new Map<string, string>();
  for (const i of pool) if (!byAtom.has(`${i.branch}|${i.atomId}`)) byAtom.set(`${i.branch}|${i.atomId}`, i.id);
  const all = new Map(store.items().map((i) => [i.id, i]));
  const quizzable = (id: string) => {
    const i = all.get(id);
    return i ? byAtom.get(`${i.branch}|${i.atomId}`) : undefined;
  };
  const ids: string[] = [];
  const take = (list: string[]) => {
    for (const id of list.map(quizzable)) if (id && ids.length < size && !ids.includes(id)) ids.push(id);
  };
  take(store.dueItemIds(now, size * 4));
  if (ids.length < size) take(store.newItemIds(size * 4));
  if (ids.length < size) {
    const rand = seededRandom(seed);
    const rest = [...byId.keys()].filter((id) => !ids.includes(id));
    while (ids.length < size && rest.length) ids.push(rest.splice(Math.floor(rand() * rest.length), 1)[0]);
  }
  return ids.map((id) => byId.get(id)).filter((i): i is Item => !!i);
}

export function quizQuestions(store: Store, items: Item[], seed: string, shorts: ShortFile = SHORT_FIELDS): Question[] {
  const pool = quizPool(store, shorts);
  return items.map((i) => buildShortQuestion(withShort(i, shorts), pool, seed)).filter((q): q is Question => q !== null);
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
