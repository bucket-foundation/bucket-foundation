import type { Card, Rating } from "@/lib/academy/fsrs";
import type { AnswerFields, AttemptRow, CardRow, QuizMode } from "./db";
import { generateQuestion, seededRng } from "./generate";
import { gradeAnswer, nextCard, normalizeResponse } from "./grade";
import { questionText } from "./learn-match";
import { toPublic, type LearnLink, type PublicQuestion, type QuizQuestion, type SourceRef, type WorkSources } from "./types";

export const REVIEW_SHARE = 0.5;

export interface QuizDeps {
  loadSources(): Promise<WorkSources>;
  matchLearn(text: string): LearnLink | null;
  dueCards(learnerId: string, now: Date, limit: number): Promise<CardRow[]>;
  issueAttempt(learnerId: string, question: QuizQuestion, mode: QuizMode): Promise<AttemptRow>;
  openAttempt?(learnerId: string, mode: QuizMode, now: Date): Promise<AttemptRow | null>;
  loadAttempt(learnerId: string, id: string): Promise<AttemptRow | null>;
  answerAttempt(learnerId: string, id: string, fields: AnswerFields, answeredAt: string): Promise<AttemptRow | null>;
  loadCard(learnerId: string, questionId: string): Promise<CardRow | null>;
  writeCard(learnerId: string, question: QuizQuestion, card: Card, previous: CardRow | null): Promise<boolean>;
}

export type IssueResult =
  | { status: "issued"; attemptId: string; mode: QuizMode; fromReview: boolean; question: PublicQuestion }
  | { status: "empty"; reason: "no_sources" | "nothing_due" };

export interface QuizResult {
  attemptId: string;
  correct: boolean;
  timedOut: boolean;
  skipped: boolean;
  response: string | null;
  answer: string;
  explain: string;
  sources: SourceRef[];
  learn: LearnLink | null;
  elapsedMs: number;
  reviewDueAt: string | null;
  reviewSaved: boolean;
}

export type AnswerOutcome = { status: "ok"; result: QuizResult } | { status: "not_found" } | { status: "invalid"; error: string };

export function parseMode(raw: string | null): QuizMode | null {
  return raw === "surprise" || raw === "review" || raw === "manual" ? raw : null;
}

export async function issueQuestion(deps: QuizDeps, learnerId: string, mode: QuizMode, now: Date): Promise<IssueResult> {
  const open = deps.openAttempt ? await deps.openAttempt(learnerId, mode, now) : null;
  if (open) return { status: "issued", attemptId: open.id, mode, fromReview: false, question: toPublic(open.question) };
  const seed = `${learnerId}|${now.toISOString()}`;
  const rng = seededRng(seed);
  const due = await deps.dueCards(learnerId, now, 1);
  let question: QuizQuestion | null = null;
  let fromReview = false;
  if (due.length > 0 && (mode === "review" || rng() < REVIEW_SHARE)) {
    question = due[0].question;
    fromReview = true;
  } else if (mode === "review") {
    return { status: "empty", reason: "nothing_due" };
  } else {
    question = generateQuestion(await deps.loadSources(), seed);
    if (!question && due.length > 0) {
      question = due[0].question;
      fromReview = true;
    }
  }
  if (!question) return { status: "empty", reason: "no_sources" };
  if (!fromReview) question = { ...question, learn: deps.matchLearn(questionText(question)) };
  const row = await deps.issueAttempt(learnerId, question, mode);
  return { status: "issued", attemptId: row.id, mode, fromReview, question: toPublic(question) };
}

function resultFrom(row: AttemptRow, reviewDueAt: string | null, reviewSaved: boolean): QuizResult {
  return {
    attemptId: row.id,
    correct: Boolean(row.correct),
    timedOut: Boolean(row.timed_out),
    skipped: Boolean(row.skipped),
    response: row.response,
    answer: row.question.answer,
    explain: row.question.explain,
    sources: row.question.sources,
    learn: row.question.learn ?? null,
    elapsedMs: row.elapsed_ms ?? 0,
    reviewDueAt,
    reviewSaved,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function scheduleReview(deps: QuizDeps, learnerId: string, question: QuizQuestion, rating: Rating, now: Date): Promise<{ dueAt: string | null; saved: boolean }> {
  for (let tries = 0; tries < 2; tries++) {
    const previous = await deps.loadCard(learnerId, question.id);
    const card = nextCard(previous?.card ?? null, rating, now.getTime());
    if (!card) return { dueAt: null, saved: true };
    if (await deps.writeCard(learnerId, question, card, previous)) return { dueAt: new Date(card.due ?? now.getTime()).toISOString(), saved: true };
  }
  return { dueAt: null, saved: false };
}

export async function answerQuestion(deps: QuizDeps, learnerId: string, body: Record<string, unknown>, now: Date): Promise<AnswerOutcome> {
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : "";
  if (!UUID.test(attemptId)) return { status: "invalid", error: "attempt_id_required" };
  const attempt = await deps.loadAttempt(learnerId, attemptId);
  if (!attempt) return { status: "not_found" };
  if (attempt.answered_at) return { status: "ok", result: resultFrom(attempt, null, true) };
  const q = attempt.question;
  const elapsedMs = Math.max(0, now.getTime() - new Date(attempt.issued_at).getTime());
  const skipped = body.skip === true;
  let fields: AnswerFields;
  let rating: Rating | null = null;
  if (skipped) {
    fields = { response: null, correct: false, timed_out: false, skipped: true, elapsed_ms: elapsedMs, rating: null };
  } else {
    const response = normalizeResponse(q, body.response);
    if (response === null && body.response !== undefined && body.response !== null && body.response !== "") {
      return { status: "invalid", error: "response_not_a_choice" };
    }
    const g = gradeAnswer(q, response, elapsedMs);
    rating = g.rating;
    fields = { response, correct: g.correct, timed_out: g.timedOut, skipped: false, elapsed_ms: elapsedMs, rating };
  }
  const claimed = await deps.answerAttempt(learnerId, attemptId, fields, now.toISOString());
  if (!claimed) {
    const stored = await deps.loadAttempt(learnerId, attemptId);
    return stored ? { status: "ok", result: resultFrom(stored, null, true) } : { status: "not_found" };
  }
  if (rating === null) return { status: "ok", result: resultFrom(claimed, null, true) };
  const review = await scheduleReview(deps, learnerId, q, rating, now);
  return { status: "ok", result: resultFrom(claimed, review.dueAt, review.saved) };
}
