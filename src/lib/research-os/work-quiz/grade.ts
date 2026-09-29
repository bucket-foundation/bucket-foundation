import { FSRS, type Card, type Rating } from "@/lib/academy/fsrs";
import type { QuizQuestion } from "./types";

export const GRACE_MS = 3000;
export const FAST_FRACTION = 0.4;

export interface GradeResult {
  correct: boolean;
  timedOut: boolean;
  rating: Rating;
}

export function normalizeResponse(q: Pick<QuizQuestion, "choices">, raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || v.length > 400) return null;
  if (q.choices) return q.choices.includes(v) ? v : null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? String(n) : null;
}

export function isCorrect(q: Pick<QuizQuestion, "choices" | "answer" | "tolerance">, response: string | null): boolean {
  if (response === null) return false;
  if (q.choices) return response === q.answer;
  const got = Number(response);
  const want = Number(q.answer);
  return Number.isFinite(got) && Number.isFinite(want) && Math.abs(got - want) <= q.tolerance;
}

export function gradeAnswer(q: Pick<QuizQuestion, "choices" | "answer" | "tolerance" | "limitSec">, response: string | null, elapsedMs: number): GradeResult {
  const limitMs = q.limitSec * 1000;
  const timedOut = elapsedMs > limitMs + GRACE_MS || (response === null && elapsedMs >= limitMs);
  const correct = !timedOut && isCorrect(q, response);
  const rating: Rating = !correct ? 1 : elapsedMs < limitMs * FAST_FRACTION ? 4 : 3;
  return { correct, timedOut, rating };
}

const fsrs = new FSRS();

export function nextCard(existing: Card | null, rating: Rating, now: number): Card | null {
  if (!existing && rating > 1) return null;
  return fsrs.review(existing, rating, now);
}
