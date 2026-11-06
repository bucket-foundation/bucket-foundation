import type { QuizQuestion } from "../../../src/lib/research-os/work-quiz/types";

export const HISTORY_DAYS = 30;
export const NEAR_JACCARD = 0.5;
export const MIN_TOKENS = 3;
export const SAME_ANSWER_JACCARD = 0.35;

const STOP = new Set(
  "a an the of to in on at by for from with and or is are was were be does do did how many much what which who when where why per each one into that this it its as".split(" "),
);
const ALIAS: Record<string, string> = { gigabyte: "gb", gigabytes: "gb", megabyte: "mb", megabytes: "mb", terabyte: "tb", terabytes: "tb", dimensions: "dimension", dims: "dimension" };

const stem = (t: string) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);

export function promptNames(prompt: string): Set<string> {
  const words = prompt.replace(/[^A-Za-z0-9'-]+/g, " ").trim().split(" ").slice(1);
  return new Set(words.filter((w) => /^[A-Z][a-z]/.test(w)).map((w) => w.toLowerCase()));
}

export function promptNumbers(prompt: string): Set<string> {
  return new Set([...promptTokens(prompt)].filter((t) => /\d/.test(t)));
}

export function promptTokens(prompt: string): Set<string> {
  const words = prompt
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/(\d)-([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9./$%-]+/g, " ")
    .split(" ")
    .map((w) => w.replace(/^[.\-]+|[.\-?]+$/g, ""))
    .filter((w) => w && !STOP.has(w));
  return new Set(words.map((w) => ALIAS[w] ?? stem(ALIAS[w] ?? w)));
}

const shared = (a: Set<string>, b: Set<string>) => [...a].filter((t) => b.has(t)).length;

export function jaccard(a: Set<string>, b: Set<string>): number {
  const n = shared(a, b);
  const union = a.size + b.size - n;
  return union === 0 ? 0 : n / union;
}

const SCALE: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };

export function leadQuantity(prompt: string): number | string | null {
  const m = prompt
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .match(/\$?(\d+(?:\.\d+)?)([a-z]*)\b(?:\s+(thousand|million|billion|trillion)\b)?/);
  if (!m) return null;
  if (m[2]) return `${m[1]}${m[2]}`;
  return Number(m[1]) * (m[3] ? SCALE[m[3]] : 1);
}

const sameQuantity = (a: number | string | null, b: number | string | null) => {
  if (a === null || b === null) return true;
  if (typeof a === "number" && typeof b === "number") return a > 0 && b > 0 ? Math.abs(Math.log10(a / b)) < 0.05 : a === b;
  return a === b;
};

const disjointIdentity = (a: Set<string>, b: Set<string>) => a.size > 0 && b.size > 0 && shared(a, b) === 0;

const namesDiffer = (a: Set<string>, b: Set<string>) => a.size > 0 && b.size > 0 && (shared(a, b) < a.size || shared(a, b) < b.size);

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
  if (disjointIdentity(promptNumbers(a.prompt), promptNumbers(b.prompt))) return false;
  if (!sameQuantity(leadQuantity(a.prompt), leadQuantity(b.prompt))) return false;
  if (namesDiffer(promptNames(a.prompt), promptNames(b.prompt))) return false;
  const j = jaccard(ta, tb);
  return j >= NEAR_JACCARD || (j >= SAME_ANSWER_JACCARD && sameAnswer(a, b));
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
