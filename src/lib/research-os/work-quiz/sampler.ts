import { createHash } from "node:crypto";
import { cardFields, compoundFactId, FACT_JOIN } from "./fact";
import { FORM_MAKERS, type SampledQuestion } from "./forms";
import { seededRng, type Rng } from "./generate";
import { checkLimits } from "./limits";
import { BLOCKED_FORMS, FORMS, allCells, cellId, type Cell, type Form } from "./space";
import type { QuizQuestion, WorkSources } from "./types";

export const QUIZ_SLOTS = 5;
export const REVIEW_SLOTS = 2;
export const CANDIDATES = 16;
export const MISS_WEIGHT = 2;
export const DAY_MS = 86_400_000;
export const RNG_RANGE = 4_294_967_296;

export interface DueCard {
  cardKey: string;
  factIds: string[];
  question: QuizQuestion;
  dueAt: number;
}

export interface CoverageRow {
  cell: string;
  factId: string;
  picks: number;
  misses: number;
  lastDay: string;
}

export interface SamplePick {
  cell: string;
  factIds: string[];
}

export interface SampleInput {
  day: string;
  sources: WorkSources;
  now?: number;
  due?: readonly DueCard[];
  coverage?: readonly CoverageRow[];
  slots?: number;
  reviewSlots?: number;
  exclude?: readonly string[];
}

export interface SampledQuiz {
  day: string;
  seed: string;
  questions: QuizQuestion[];
  picks: SamplePick[];
  reviewed: number;
  blocked: Form[];
}

export function daySeed(day: string): string {
  return createHash("sha256").update(day).digest("hex");
}

export function blockedForms(): Form[] {
  return FORMS.filter((f) => BLOCKED_FORMS[f]);
}

export function builtCells(): Cell[] {
  return allCells().filter((c) => FORM_MAKERS[c.form] && !BLOCKED_FORMS[c.form]);
}

function cellOf(q: SampledQuestion, format: Cell["format"]): Cell {
  return { form: q.form, format, depth: q.depth };
}

export function factWeights(coverage: readonly CoverageRow[], due: readonly DueCard[], now: number): Map<string, number> {
  const w = new Map<string, number>();
  const misses = new Map<string, number>();
  for (const r of coverage) for (const id of splitFactId(r.factId)) misses.set(id, (misses.get(id) ?? 0) + r.misses);
  for (const [id, n] of Array.from(misses)) w.set(id, 1 + MISS_WEIGHT * n);
  for (const c of due) {
    const overdue = Math.max(0, Math.floor((now - c.dueAt) / DAY_MS));
    for (const id of c.factIds) w.set(id, (w.get(id) ?? 1) + overdue);
  }
  return w;
}

function weightOf(q: SampledQuestion, weights: Map<string, number>): number {
  return q.factIds.reduce((n, id) => n + (weights.get(id) ?? 1), 0);
}

export function rngInt(rng: Rng): number {
  return Math.floor(rng() * RNG_RANGE);
}

export function weightedPick<T>(rng: Rng, xs: readonly T[], weight: (x: T) => number): T {
  const total = xs.reduce((n, x) => n + weight(x), 0);
  let r = total > 0 ? rngInt(rng) % total : 0;
  for (const x of xs) {
    if (r < weight(x)) return x;
    r -= weight(x);
  }
  return xs[xs.length - 1];
}

export function cellStats(coverage: readonly CoverageRow[]): Map<string, { picks: number; lastDay: string }> {
  const out = new Map<string, { picks: number; lastDay: string }>();
  for (const r of coverage) {
    const prev = out.get(r.cell) ?? { picks: 0, lastDay: "" };
    out.set(r.cell, { picks: prev.picks + r.picks, lastDay: r.lastDay > prev.lastDay ? r.lastDay : prev.lastDay });
  }
  return out;
}

export function sampleQuiz(input: SampleInput): SampledQuiz {
  const seed = daySeed(input.day);
  const rng = seededRng(seed);
  const now = input.now ?? Date.parse(`${input.day}T12:00:00Z`);
  const due = input.due ?? [];
  const coverage = input.coverage ?? [];
  const slots = input.slots ?? QUIZ_SLOTS;
  const used = new Set<string>(input.exclude ?? []);
  const questions: QuizQuestion[] = [];
  const picks: SamplePick[] = [];
  const overdue = due.filter((c) => c.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt || a.cardKey.localeCompare(b.cardKey));
  for (const c of overdue) {
    if (questions.length >= Math.min(input.reviewSlots ?? REVIEW_SLOTS, slots)) break;
    if (c.factIds.some((id) => used.has(id)) || checkLimits(c.question).length > 0) continue;
    c.factIds.forEach((id) => used.add(id));
    questions.push(c.question);
  }
  const reviewed = questions.length;
  const weights = factWeights(coverage, due, now);
  const stats = cellStats(coverage);
  const ranked = builtCells()
    .map((c) => ({ c, id: cellId(c), tie: rng(), ...(stats.get(cellId(c)) ?? { picks: 0, lastDay: "" }) }))
    .sort((a, b) => a.picks - b.picks || a.lastDay.localeCompare(b.lastDay) || a.tie - b.tie);
  for (const cell of ranked) {
    if (questions.length >= slots) break;
    const maker = FORM_MAKERS[cell.c.form]!;
    const found: SampledQuestion[] = [];
    for (let i = 0; i < CANDIDATES; i++) {
      const q = maker(input.sources, seededRng(`${seed}|${cell.id}|${i}`), cell.c.depth);
      if (q && q.factIds.every((id) => !used.has(id)) && !found.some((f) => f.id === q.id)) found.push(q);
    }
    if (found.length === 0) continue;
    const q = weightedPick(rng, found, (x) => weightOf(x, weights));
    q.factIds.forEach((id) => used.add(id));
    questions.push(q);
    picks.push({ cell: cellId(cellOf(q, cell.c.format)), factIds: q.factIds });
  }
  return { day: input.day, seed, questions, picks, reviewed, blocked: blockedForms() };
}

export function recordPicks(coverage: readonly CoverageRow[], picks: readonly SamplePick[], day: string): CoverageRow[] {
  const rows = new Map(coverage.map((r) => [`${r.cell}|${r.factId}`, { ...r }]));
  for (const p of picks) {
    const factId = compoundFactId(p.factIds);
    const k = `${p.cell}|${factId}`;
    const prev = rows.get(k) ?? { cell: p.cell, factId, picks: 0, misses: 0, lastDay: "" };
    rows.set(k, { ...prev, picks: prev.picks + 1, lastDay: day > prev.lastDay ? day : prev.lastDay });
  }
  return Array.from(rows.values());
}

export function splitFactId(id: string): string[] {
  return id.split(FACT_JOIN);
}

export function usedOn(coverage: readonly CoverageRow[], day: string): string[] {
  return Array.from(new Set(coverage.filter((r) => r.lastDay === day && r.picks > 0 && r.cell !== "miss").flatMap((r) => splitFactId(r.factId))));
}

export function dueFrom(question: QuizQuestion, dueAt: number): DueCard {
  const { fact_id, card_key } = cardFields(question);
  return { cardKey: card_key, factIds: splitFactId(fact_id), question, dueAt };
}
