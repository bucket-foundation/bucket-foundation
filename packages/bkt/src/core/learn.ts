import { buildEncompassingMap, withLeverage, type Atom, type EncEdge } from "../../../../src/lib/academy/engine";
import { gradeAnswer, log10Distance, normalizeResponse } from "../../../../src/lib/research-os/work-quiz/grade";
import { checkLimits } from "../../../../src/lib/research-os/work-quiz/limits";
import type { LearnAtom } from "../../../../src/lib/research-os/work-quiz/learn-match";
import { resourceForQuestion } from "../../../../src/lib/research-os/work-quiz/resources";
import { toPublic, type LearnResource, type QuizQuestion } from "../../../../src/lib/research-os/work-quiz/types";
import { attemptId, type DailyQuizStore } from "../daily-quiz";
import { answerQuiz, answerReview, pickSession, quizQuestions } from "../deck";
import type { GradeResult, Question, Rating } from "../grade";
import type { Pack, PackDeck } from "../pack/export";
import { SHORT_FIELDS, type ShortFile } from "../short-fields";
import { deckOf, type Store } from "../store";

export class LearnError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface PublicQuestion {
  itemId: string;
  prompt: string;
  choices: string[];
  limitSec: number;
  long: boolean;
}

export interface ReviewCard {
  id: string;
  title: string;
  prompt: string;
  answer: string;
  long: boolean;
}

export interface DeckProgress extends PackDeck {
  introduced: number;
  due: number;
  xp: number;
}

export interface QuizOutcome extends GradeResult {
  answer: string;
}

export interface DailyOutcome extends GradeResult {
  log10Distance: number | null;
  answer: string;
  explain: string;
  sources: QuizQuestion["sources"];
  resource: LearnResource | null;
}

export const fitsScreen = (q: { prompt: string; choices?: readonly string[] | null }) => checkLimits({ prompt: q.prompt, choices: q.choices ? [...q.choices] : null }).length === 0;

export const publicQuestion = (q: Question): PublicQuestion => ({ itemId: q.itemId, prompt: q.prompt, choices: q.choices, limitSec: q.limitSec, long: !fitsScreen(q) });

export function quizSession(store: Store, now: number, size: number, seed: string, shorts: ShortFile = SHORT_FIELDS): Question[] {
  return quizQuestions(store, pickSession(store, now, size, seed, shorts), seed, shorts);
}

export class Encompassing {
  private atoms: Map<string, Atom[]>;
  private built = new Map<string, Record<string, EncEdge[]>>();
  constructor(
    private store: Store,
    content: Pick<Pack, "atoms"> = {},
  ) {
    this.atoms = new Map(Object.entries(content.atoms ?? {}).map(([d, a]) => [d, withLeverage(a)]));
  }
  deckAtoms(deck: string): Atom[] | undefined {
    return this.atoms.get(deck);
  }
  forItem(itemId: string): Record<string, EncEdge[]> {
    const it = this.store.items().find((i) => i.id === itemId);
    const deck = it ? deckOf(it.branch) : "";
    if (!this.built.has(deck)) this.built.set(deck, buildEncompassingMap(this.atoms.get(deck) ?? []));
    return this.built.get(deck)!;
  }
}

export function gradeQuiz(store: Store, enc: Encompassing, q: Question, choice: unknown, elapsedMs: number, now: number): QuizOutcome {
  if (choice !== null && (typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice >= q.choices.length)) throw new LearnError("bad choice", 400);
  const r = answerQuiz(store, q, choice as number | null, elapsedMs, now, enc.forItem(q.itemId));
  return { ...r, answer: q.choices[q.answerIndex] };
}

export function dueCards(store: Store, now: number, size: number): ReviewCard[] {
  const byId = new Map(store.items().map((i) => [i.id, i]));
  return store
    .dueItemIds(now, size)
    .map((id) => byId.get(id))
    .filter((i) => !!i)
    .map((i) => ({ id: i!.id, title: i!.title, prompt: i!.prompt, answer: i!.answer, long: !fitsScreen({ prompt: i!.prompt }) }));
}

export function rateCard(store: Store, enc: Encompassing, itemId: unknown, rating: unknown, elapsedMs: number, now: number): { due: number | null } {
  if (typeof itemId !== "string" || !store.items().some((i) => i.id === itemId)) throw new LearnError("unknown item", 404);
  if (rating !== 1 && rating !== 2 && rating !== 3 && rating !== 4) throw new LearnError("rating must be 1..4", 400);
  answerReview(store, itemId, rating as Rating, elapsedMs, now, enc.forItem(itemId));
  return { due: store.card(itemId)?.due ?? null };
}

export function deckProgress(store: Store, decks: PackDeck[], now: number): DeckProgress[] {
  return decks.map((d) => {
    const state = store.learnState(d.id);
    const cards = Object.values(state.cards);
    return { ...d, introduced: cards.length, due: cards.filter((c) => c.due != null && c.due <= now).length, xp: state.stats.xp };
  });
}

export function dailyQuestions(daily: DailyQuizStore, day: string, o: { fit?: boolean } = {}): { questions: ReturnType<typeof toPublic>[]; answered: string[] } | null {
  const quiz = daily.get(day);
  if (!quiz) return null;
  return { questions: quiz.questions.filter((q) => !o.fit || checkLimits(q).length === 0).map(toPublic), answered: [...daily.answered(day)] };
}

export type Recorder = (q: QuizQuestion, correct: boolean, rating: number, elapsedMs: number, at: number, extra: { questionId: string; log10Distance: number | null }) => void;

export function answerDaily(daily: DailyQuizStore, record: Recorder, day: string, id: unknown, raw: unknown, elapsedMs: number, now: number, atoms: readonly LearnAtom[] = []): DailyOutcome {
  const q = daily.get(day)?.questions.find((x) => x.id === id);
  if (!q) throw new LearnError("no such question", 404);
  if (daily.answered(day).has(q.id)) throw new LearnError("already answered", 409);
  const response = normalizeResponse(q, raw);
  const g = gradeAnswer(q, response, elapsedMs);
  const distance = q.log10Tolerance === undefined ? null : log10Distance(q.answer, response);
  try {
    record(q, g.correct, g.rating, elapsedMs, now, { questionId: attemptId(day, q.id), log10Distance: distance });
  } catch (e) {
    if (/UNIQUE constraint failed/i.test((e as Error).message)) throw new LearnError("already answered", 409);
    throw e;
  }
  return { ...g, log10Distance: distance, answer: q.answer, explain: q.explain, sources: q.sources, resource: resourceForQuestion(q, atoms) };
}
