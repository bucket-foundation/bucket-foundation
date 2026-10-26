import type { Rating } from "./fsrs";

export type QuestionKind = "pick" | "calculate" | "order" | "spot-error" | "match";

interface QuestionBase {
  id: string;
  atom: string;
  kind: QuestionKind;
  prompt: string;
  explain?: string;
}

export interface PickQuestion extends QuestionBase {
  kind: "pick";
  options: string[];
  answer: number;
}

export interface CalculateQuestion extends QuestionBase {
  kind: "calculate";
  answer: number;
  tol?: number;
  relTol?: number;
  unit?: string;
}

export interface OrderQuestion extends QuestionBase {
  kind: "order";
  steps: string[];
}

export interface SpotErrorQuestion extends QuestionBase {
  kind: "spot-error";
  steps: string[];
  error: number;
  fix: string;
}

export interface MatchQuestion extends QuestionBase {
  kind: "match";
  pairs: { term: string; meaning: string }[];
}

export type Question = PickQuestion | CalculateQuestion | OrderQuestion | SpotErrorQuestion | MatchQuestion;

export type Response =
  | { kind: "pick"; choice: number }
  | { kind: "calculate"; value: number | string }
  | { kind: "order"; order: number[] }
  | { kind: "spot-error"; step: number }
  | { kind: "match"; pairs: Record<string, string> };

export interface GradeResult {
  correct: boolean;
  score: number;
  rating: Rating;
}

export interface QuestionDeck {
  branch: string;
  version: string;
  questions: Question[];
}

export interface PresentedQuestion {
  question: Question;
  order: number[];
  meanings?: number[];
}

const KINDS: QuestionKind[] = ["pick", "calculate", "order", "spot-error", "match"];

function nonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function distinct(xs: string[]): boolean {
  return new Set(xs.map((x) => x.trim().toLowerCase())).size === xs.length;
}

export function validateQuestion(q: Question, atomIds?: Set<string>): string[] {
  const errs: string[] = [];
  const at = (m: string) => errs.push(`${q.id ?? "?"}: ${m}`);
  if (!nonEmpty(q.id)) at("missing id");
  if (!nonEmpty(q.atom)) at("missing atom");
  else if (atomIds && !atomIds.has(q.atom)) at(`unknown atom ${q.atom}`);
  if (!KINDS.includes(q.kind)) at(`unknown kind ${q.kind}`);
  if (!nonEmpty(q.prompt)) at("missing prompt");
  switch (q.kind) {
    case "pick":
      if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(nonEmpty)) at("pick needs 2+ options");
      else if (!distinct(q.options)) at("pick options repeat");
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options?.length ?? 0)) at("pick answer out of range");
      break;
    case "calculate":
      if (typeof q.answer !== "number" || !Number.isFinite(q.answer)) at("calculate answer must be a finite number");
      if (q.tol !== undefined && !(q.tol >= 0)) at("tol must be >= 0");
      if (q.relTol !== undefined && !(q.relTol >= 0 && q.relTol < 1)) at("relTol must be in [0,1)");
      break;
    case "order":
      if (!Array.isArray(q.steps) || q.steps.length < 3 || !q.steps.every(nonEmpty)) at("order needs 3+ steps");
      else if (!distinct(q.steps)) at("order steps repeat");
      break;
    case "spot-error":
      if (!Array.isArray(q.steps) || q.steps.length < 2 || !q.steps.every(nonEmpty)) at("spot-error needs 2+ steps");
      if (!Number.isInteger(q.error) || q.error < 0 || q.error >= (q.steps?.length ?? 0)) at("spot-error index out of range");
      if (!nonEmpty(q.fix)) at("spot-error needs a fix");
      break;
    case "match":
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) at("match needs 2+ pairs");
      else {
        if (!q.pairs.every((p) => nonEmpty(p.term) && nonEmpty(p.meaning))) at("match pair is empty");
        else if (!distinct(q.pairs.map((p) => p.term)) || !distinct(q.pairs.map((p) => p.meaning))) at("match terms or meanings repeat");
      }
      break;
  }
  return errs;
}

export function loadQuestionDeck(raw: unknown, atomIds?: Iterable<string>): QuestionDeck {
  const deck = raw as QuestionDeck;
  if (!deck || !nonEmpty(deck.branch) || !Array.isArray(deck.questions)) throw new Error("question deck: missing branch or questions");
  const ids = atomIds ? new Set(atomIds) : undefined;
  const seen = new Set<string>();
  const errs: string[] = [];
  for (const q of deck.questions) {
    errs.push(...validateQuestion(q, ids));
    if (seen.has(q.id)) errs.push(`${q.id}: duplicate id`);
    seen.add(q.id);
  }
  if (errs.length) throw new Error(`question deck ${deck.branch}: ${errs.join("; ")}`);
  return deck;
}

export function questionsFor(deck: QuestionDeck, atom: string, kind?: QuestionKind): Question[] {
  return deck.questions.filter((q) => q.atom === atom && (!kind || q.kind === kind));
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledIndices(n: number, seed: string): number[] {
  const r = rng(hashSeed(seed));
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx;
}

export function present(q: Question, seed: string): PresentedQuestion {
  const key = `${seed}:${q.id}`;
  switch (q.kind) {
    case "pick":
      return { question: q, order: shuffledIndices(q.options.length, key) };
    case "order":
      return { question: q, order: shuffledIndices(q.steps.length, key) };
    case "match":
      return { question: q, order: q.pairs.map((_, i) => i), meanings: shuffledIndices(q.pairs.length, key) };
    case "spot-error":
      return { question: q, order: q.steps.map((_, i) => i) };
    default:
      return { question: q, order: [] };
  }
}

function result(score: number): GradeResult {
  const s = Math.max(0, Math.min(1, score));
  return { correct: s === 1, score: s, rating: s === 1 ? 3 : s >= 0.5 ? 2 : 1 };
}

export function parseNumber(v: number | string): number {
  if (typeof v === "number") return v;
  const t = v.trim().replace(/,/g, "").replace(/\s+/g, "").replace(/[×x]10\^?/i, "e").replace(/%$/, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
  return Number(t);
}

function gradeCalculate(q: CalculateQuestion, value: number | string): GradeResult {
  const x = parseNumber(value);
  if (!Number.isFinite(x)) return result(0);
  const tol = Math.max(q.tol ?? 0, Math.abs(q.answer) * (q.relTol ?? 0), 1e-9);
  return result(Math.abs(x - q.answer) <= tol ? 1 : 0);
}

function gradeOrder(q: OrderQuestion, order: number[]): GradeResult {
  const n = q.steps.length;
  if (!Array.isArray(order) || order.length !== n || new Set(order).size !== n || !order.every((i) => Number.isInteger(i) && i >= 0 && i < n)) return result(0);
  let pairs = 0;
  let good = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      pairs++;
      if (order[i] < order[j]) good++;
    }
  return result(good / pairs);
}

function gradeMatch(q: MatchQuestion, given: Record<string, string>): GradeResult {
  if (!given || typeof given !== "object") return result(0);
  const hits = q.pairs.filter((p) => given[p.term] === p.meaning).length;
  return result(hits / q.pairs.length);
}

export function gradeQuestion(q: Question, r: Response): GradeResult {
  if (r.kind !== q.kind) return result(0);
  switch (q.kind) {
    case "pick":
      return result((r as { choice: number }).choice === q.answer ? 1 : 0);
    case "calculate":
      return gradeCalculate(q, (r as { value: number | string }).value);
    case "order":
      return gradeOrder(q, (r as { order: number[] }).order);
    case "spot-error":
      return result((r as { step: number }).step === q.error ? 1 : 0);
    case "match":
      return gradeMatch(q, (r as { pairs: Record<string, string> }).pairs);
  }
}
