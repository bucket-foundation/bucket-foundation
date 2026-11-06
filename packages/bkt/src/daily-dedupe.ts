import type { QuizQuestion } from "../../../src/lib/research-os/work-quiz/types";

export const HISTORY_DAYS = 30;
export const NEAR_OVERLAP = 0.6;
export const MIN_TOKENS = 3;
export const SAME_ANSWER_OVERLAP = 0.4;

const STOP = new Set(
  "a an the of to in on at by for from with and or is are was were be does do did how many much what which who when where why per each one into that this it its as".split(" "),
);
const ALIAS: Record<string, string> = { gigabyte: "gb", gigabytes: "gb", megabyte: "mb", megabytes: "mb", terabyte: "tb", terabytes: "tb", dimensions: "dimension", dims: "dimension" };

const stem = (t: string) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);

export function promptTokens(prompt: string): Set<string> {
  const words = prompt
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/[^a-z0-9./$%-]+/g, " ")
    .split(" ")
    .map((w) => w.replace(/^[.\-]+|[.\-?]+$/g, ""))
    .filter((w) => w && !STOP.has(w));
  return new Set(words.map((w) => ALIAS[w] ?? stem(ALIAS[w] ?? w)));
}

export function overlap(a: Set<string>, b: Set<string>): number {
  const small = a.size <= b.size ? a : b;
  const big = small === a ? b : a;
  if (small.size === 0) return 0;
  let n = 0;
  for (const t of small) if (big.has(t)) n++;
  return n / small.size;
}

const sameAnswer = (a: Pick<QuizQuestion, "type" | "answer">, b: Pick<QuizQuestion, "type" | "answer">) => {
  if (a.type !== b.type) return false;
  const x = Number(a.answer);
  const y = Number(b.answer);
  if (Number.isFinite(x) && Number.isFinite(y) && x > 0 && y > 0) return Math.abs(Math.log10(x) - Math.log10(y)) < 0.05;
  return a.answer.trim().toLowerCase() === b.answer.trim().toLowerCase();
};

export type Asked = Pick<QuizQuestion, "type" | "prompt" | "answer">;

export function nearDuplicate(a: Asked, b: Asked): boolean {
  const ta = promptTokens(a.prompt);
  const tb = promptTokens(b.prompt);
  if (Math.min(ta.size, tb.size) < MIN_TOKENS) return a.prompt.trim().toLowerCase() === b.prompt.trim().toLowerCase();
  const o = overlap(ta, tb);
  return o >= NEAR_OVERLAP || (o >= SAME_ANSWER_OVERLAP && sameAnswer(a, b));
}

export function dropRepeats<T extends Asked>(questions: readonly T[], history: readonly Asked[]): { kept: T[]; dropped: T[] } {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const q of questions) {
    if (history.some((h) => nearDuplicate(q, h)) || kept.some((k) => nearDuplicate(q, k))) dropped.push(q);
    else kept.push(q);
  }
  return { kept, dropped };
}

export function priorDays(day: string, n = HISTORY_DAYS): string[] {
  const t = Date.parse(`${day}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(t - (i + 1) * 86_400_000).toISOString().slice(0, 10));
}
