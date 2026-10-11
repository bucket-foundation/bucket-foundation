import { randomBytes } from "node:crypto";
import { gradeAnswer, normalizeResponse, type GradeResult } from "../../../src/lib/research-os/work-quiz/grade";
import { toPublic, type PublicQuestion, type QuizQuestion } from "../../../src/lib/research-os/work-quiz/types";
import { LearnError } from "./core/learn";
import { LESSON_WORDS, type ConceptPage, type LessonCell, type LessonPage, type WordBook, type WordCredit, type WordDeck, type WordLesson } from "./core/words";
import type { Route } from "./serve";
import type { WorkQuizStore } from "./work-quiz";

export const UNKNOWN_WORD_DECK = "unknown language; run bkt learn path for the list";
export const NO_WORD_LESSON = "no such lesson";
export const WORD_QUIZ_MAX = 50;
export const CONCEPT_QUIZ_MAX = 12;
export const ISSUED_MS = 60 * 60_000;

export interface WordDeckProgress extends WordDeck {
  started: number;
  due: number;
}

export interface WordLessonProgress extends WordLesson {
  words: string[];
  started: number;
}

export interface WordOutcome extends GradeResult {
  answer: string;
  explain: string;
  sources: QuizQuestion["sources"];
}

export interface WordQuiz {
  questions: PublicQuestion[];
  credit: WordCredit;
}

export type WordQuizPick = { deck: string; lesson?: number; size?: number } | { concepts: number };

export class WordSession {
  private issued = new Map<string, { q: QuizQuestion; at: number }>();
  private now: () => number;
  private seed: () => string;

  constructor(
    readonly book: WordBook,
    private wq: WorkQuizStore,
    o: { now?: () => number; seed?: () => string } = {},
  ) {
    this.now = o.now ?? Date.now;
    this.seed = o.seed ?? (() => randomBytes(8).toString("hex"));
  }

  private progress(): { started: Set<string>; due: Set<string> } {
    const at = this.now();
    const started = new Set<string>();
    const due = new Set<string>();
    for (const c of this.wq.wordCards())
      for (const id of c.factIds) {
        started.add(id);
        if (c.due <= at) due.add(id);
      }
    return { started, due };
  }

  private lang(raw: unknown): string {
    const lang = typeof raw === "string" ? this.book.resolveDeck(raw) : null;
    if (!lang) throw new LearnError(UNKNOWN_WORD_DECK, 404);
    return lang;
  }

  chosen(): string[] {
    return this.book.known(this.wq.languages());
  }

  decks(): WordDeckProgress[] {
    const p = this.progress();
    return this.book.decks(this.chosen()).map((d) => this.withProgress(d, p));
  }

  private withProgress(d: WordDeck, p: { started: Set<string>; due: Set<string> }): WordDeckProgress {
    const ids = this.book.words(d.lang).filter((c) => c.quiz).map((c) => this.book.factId(c));
    return { ...d, started: ids.filter((id) => p.started.has(id)).length, due: ids.filter((id) => p.due.has(id)).length };
  }

  lessons(deck: unknown): { deck: WordDeckProgress; lessons: WordLessonProgress[] } {
    const lang = this.lang(deck);
    const p = this.progress();
    const lessons = this.book.lessons(lang).map((l): WordLessonProgress => {
      const cells = this.book.lessonCells(lang, l.n);
      return { ...l, words: cells.map((c) => c.word), started: cells.filter((c) => c.quiz && p.started.has(this.book.factId(c))).length };
    });
    return { deck: this.withProgress(this.book.deck(lang), p), lessons };
  }

  lesson(deck: unknown, n: number): LessonPage {
    const page = this.book.lesson(this.lang(deck), n, this.chosen());
    if (!page) throw new LearnError(NO_WORD_LESSON, 404);
    return page;
  }

  concepts(page: number): ConceptPage {
    return this.book.concepts(this.chosen(), page);
  }

  private cells(pick: WordQuizPick): LessonCell[] {
    if ("concepts" in pick) return this.book.conceptCells(this.chosen(), pick.concepts).slice(0, CONCEPT_QUIZ_MAX);
    const lang = this.lang(pick.deck);
    if (pick.lesson !== undefined) {
      const cells = this.book.lessonCells(lang, pick.lesson);
      if (cells.length === 0) throw new LearnError(NO_WORD_LESSON, 404);
      return cells;
    }
    const p = this.progress();
    return this.book.studyCells(lang, Math.min(Math.max(1, pick.size ?? LESSON_WORDS), WORD_QUIZ_MAX), p.started, p.due);
  }

  quiz(pick: WordQuizPick): WordQuiz {
    const at = this.now();
    for (const [id, v] of this.issued) if (at - v.at > ISSUED_MS) this.issued.delete(id);
    const cells = this.cells(pick);
    const prefer = "concepts" in pick ? this.chosen() : Array.from(new Set([...this.chosen(), ...cells.map((c) => c.lang)]));
    const questions = this.book.questions(cells, prefer, this.seed());
    for (const q of questions) this.issued.set(q.id, { q, at });
    return { questions: questions.map(toPublic), credit: this.book.credit };
  }

  answer(id: unknown, raw: unknown, elapsedMs: number): WordOutcome {
    const open = typeof id === "string" ? this.issued.get(id) : undefined;
    if (!open) throw new LearnError("no open question", 404);
    this.issued.delete(id as string);
    const g = gradeAnswer(open.q, normalizeResponse(open.q, raw), elapsedMs);
    this.wq.record(open.q, g.correct, g.rating, elapsedMs, this.now(), { introduce: true });
    return { ...g, answer: open.q.answer, explain: open.q.explain, sources: open.q.sources };
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function guarded(run: () => unknown): Response {
  try {
    return json(run());
  } catch (e) {
    if (e instanceof LearnError) return json({ error: e.message }, e.status);
    throw e;
  }
}

function whole(raw: string | null, fallback: number | undefined, max: number): number | undefined {
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!/^\d{1,4}$/.test(raw) || n < 1 || n > max) throw new LearnError("give a whole number", 400);
  return n;
}

export function wordRoutes(session: WordSession): Record<string, Route> {
  const credit = session.book.credit;
  return {
    "GET /local/words/licence": () => json(session.book.licence),
    "GET /local/words/decks": () => guarded(() => ({ decks: session.decks(), chosen: session.chosen(), credit })),
    "GET /local/words/lessons": (_req, url) => guarded(() => ({ ...session.lessons(url.searchParams.get("deck")), credit })),
    "GET /local/words/lesson": (_req, url) => guarded(() => ({ ...session.lesson(url.searchParams.get("deck"), whole(url.searchParams.get("n"), 1, 9999)!), credit })),
    "GET /local/words/concepts": (_req, url) => guarded(() => ({ ...session.concepts(whole(url.searchParams.get("page"), 1, 9999)!), credit })),
    "GET /local/words/quiz": (_req, url) =>
      guarded(() => {
        const page = whole(url.searchParams.get("concepts"), undefined, 9999);
        if (page !== undefined) return session.quiz({ concepts: page });
        return session.quiz({ deck: url.searchParams.get("deck") ?? "", lesson: whole(url.searchParams.get("lesson"), undefined, 9999), size: whole(url.searchParams.get("n"), undefined, WORD_QUIZ_MAX) });
      }),
    "POST /local/words/answer": async (req) => {
      let b: Record<string, unknown> | null = null;
      try {
        const raw = (await req.json()) as unknown;
        b = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      } catch {
        b = null;
      }
      if (!b || typeof b.id !== "string") return json({ error: "id required" }, 400);
      const ms = b.elapsedMs;
      if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return json({ error: "elapsedMs required" }, 400);
      return guarded(() => session.answer(b!.id, b!.response, Math.min(ms, 3_600_000)));
    },
  };
}

