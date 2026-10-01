import { FSRS, type Card, type Rating } from "../../academy/fsrs";
import type { QuizQuestion } from "./types";

export const GRACE_MS = 3000;
export const FAST_FRACTION = 0.4;
export const FERMI_LOG10_TOLERANCE = 0.5;
export const FERMI_CLOSE_LOG10 = 0.15;
const LOG10_EPSILON = 1e-9;

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

export function log10Distance(answer: string, response: string | null): number | null {
  if (response === null) return null;
  const got = Number(response);
  const want = Number(answer);
  if (!Number.isFinite(got) || !Number.isFinite(want) || got <= 0 || want <= 0) return null;
  return Math.abs(Math.log10(got) - Math.log10(want));
}

export function isCorrect(q: Pick<QuizQuestion, "choices" | "answer" | "tolerance" | "log10Tolerance">, response: string | null): boolean {
  if (response === null) return false;
  if (q.choices) return response === q.answer;
  if (q.log10Tolerance !== undefined) {
    const d = log10Distance(q.answer, response);
    return d !== null && d <= q.log10Tolerance + LOG10_EPSILON;
  }
  const got = Number(response);
  const want = Number(q.answer);
  return Number.isFinite(got) && Number.isFinite(want) && Math.abs(got - want) <= q.tolerance;
}

export function gradeAnswer(q: Pick<QuizQuestion, "choices" | "answer" | "tolerance" | "limitSec" | "log10Tolerance">, response: string | null, elapsedMs: number): GradeResult {
  const limitMs = q.limitSec * 1000;
  const timedOut = elapsedMs > limitMs + GRACE_MS || (response === null && elapsedMs >= limitMs);
  const correct = !timedOut && isCorrect(q, response);
  if (q.log10Tolerance !== undefined && !q.choices) {
    const d = log10Distance(q.answer, response);
    return { correct, timedOut, rating: !correct ? 1 : d !== null && d <= FERMI_CLOSE_LOG10 + LOG10_EPSILON ? 4 : 3 };
  }
  const rating: Rating = !correct ? 1 : elapsedMs < limitMs * FAST_FRACTION ? 4 : 3;
  return { correct, timedOut, rating };
}

const fsrs = new FSRS();

export function nextCard(existing: Card | null, rating: Rating, now: number): Card | null {
  if (!existing && rating > 1) return null;
  return fsrs.review(existing, rating, now);
}
