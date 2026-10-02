import type { EncEdge } from "../../../src/lib/academy/engine";
import { buildQuestion, gradeChoice, isDue, seededRandom, type GradeResult, type Item, type Question, type Rating } from "./grade";
import { buildShortQuestion, hasShort, SHORT_FIELDS, withShort, type ShortFile } from "./short-fields";
import type { Store } from "./store";

export const LONG_FALLBACK_BELOW = 20;

export function pickSession(store: Store, now: number, size: number, seed: string, shorts: ShortFile = SHORT_FIELDS): Item[] {
  const all = store.items().map((i) => withShort(i, shorts));
  const byId = new Map(all.map((i) => [i.id, i]));
  const shortCount = new Map<string, number>();
  for (const i of all) if (hasShort(i)) shortCount.set(i.branch, (shortCount.get(i.branch) ?? 0) + 1);
  const atomKey = (i: Item) => `${i.branch}|${i.atomId}`;
  const firstShort = new Map<string, string>();
  for (const i of all) if (hasShort(i) && !firstShort.has(atomKey(i))) firstShort.set(atomKey(i), i.id);
  const resolve = (id: string) => {
    const i = byId.get(id);
    return i ? (firstShort.get(atomKey(i)) ?? id) : undefined;
  };
  const rand = seededRandom(seed);
  const random = (ids: string[]) => {
    const rest = ids.slice();
    const out: string[] = [];
    while (rest.length) out.push(rest.splice(Math.floor(rand() * rest.length), 1)[0]);
    return out;
  };
  const scheduled = [...store.dueItemIds(now, size * 4), ...store.newItemIds(size * 4)].map(resolve).filter((id): id is string => !!id);
  const isShort = (id: string) => hasShort(byId.get(id)!);
  const thinDeck = (id: string) => (shortCount.get(byId.get(id)!.branch) ?? 0) < LONG_FALLBACK_BELOW;
  const ordered = [
    ...scheduled.filter(isShort),
    ...random(all.filter(hasShort).map((i) => i.id)),
    ...scheduled.filter((id) => !isShort(id) && thinDeck(id)),
    ...scheduled.filter((id) => !isShort(id) && !thinDeck(id)),
    ...random(all.filter((i) => !hasShort(i)).map((i) => i.id)),
  ];
  const ids: string[] = [];
  for (const id of ordered) if (ids.length < size && !ids.includes(id)) ids.push(id);
  return ids.map((id) => byId.get(id)!);
}

export function quizQuestions(store: Store, items: Item[], seed: string, shorts: ShortFile = SHORT_FIELDS): Question[] {
  const all = store.items().map((i) => withShort(i, shorts));
  const pool = all.filter(hasShort);
  return items.flatMap((i) => {
    const item = withShort(i, shorts);
    const q = hasShort(item) ? buildShortQuestion(item, pool, seed) : null;
    return [q ?? { ...buildQuestion(item, all, seed), long: true }];
  });
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
