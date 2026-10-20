import type { Atom, Depth, QuizItem } from "./engine";

export const MAX_QUESTIONS_DEFAULT = 18;
export const KNOWN_THRESHOLD = 0.62;
export const ITEMS_PER_LEVEL = 3;
export const PASS_PER_LEVEL = 2;
export const SLOW_CREDIT = 0.5;
export const HARDEST_FIRST: Depth[] = ["derive", "apply", "teach", "recall"];

const P_KNOWN = 0.92;
const P_MISSED = 0.08;
const P_UNTESTED = 0.2;
const P_UNCONFIRMED = 0.5;

interface Closures {
  reqC: Map<string, Set<string>>;
  unlC: Map<string, Set<string>>;
  between: Map<string, number>;
}

export function buildClosures(atoms: Atom[]): Closures {
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const reqC = new Map<string, Set<string>>();
  const unlC = new Map<string, Set<string>>();
  const walk = (id: string, field: "requires" | "unlocks", seen = new Set<string>()): Set<string> => {
    const a = byId.get(id);
    if (!a) return seen;
    (a[field] ?? []).forEach((n) => {
      if (byId.has(n) && !seen.has(n)) {
        seen.add(n);
        walk(n, field, seen);
      }
    });
    return seen;
  };
  atoms.forEach((a) => {
    reqC.set(a.id, walk(a.id, "requires"));
    unlC.set(a.id, walk(a.id, "unlocks"));
  });
  const between = new Map<string, number>();
  let maxB = 1;
  atoms.forEach((a) => {
    const b = (reqC.get(a.id)!.size + 1) * (unlC.get(a.id)!.size + 1) + (a.leverage ?? 0) * 3;
    between.set(a.id, b);
    if (b > maxB) maxB = b;
  });
  atoms.forEach((a) => between.set(a.id, between.get(a.id)! / maxB));
  return { reqC, unlC, between };
}

export function prerequisiteDepth(atoms: Atom[]): Map<string, number> {
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const depth = new Map<string, number>();
  const visit = (id: string, stack: Set<string>): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    if (stack.has(id)) return 0;
    stack.add(id);
    const reqs = (byId.get(id)?.requires ?? []).filter((r) => byId.has(r));
    const d = reqs.length ? 1 + Math.max(...reqs.map((r) => visit(r, stack))) : 0;
    stack.delete(id);
    depth.set(id, d);
    return d;
  };
  atoms.forEach((a) => visit(a.id, new Set()));
  return depth;
}

const QUIZ_WEIGHT: Record<string, number> = { recall: 0, apply: 0.5, teach: 0.75, derive: 1 };

export function hardestQuiz(a: Atom): QuizItem | null {
  for (const lvl of HARDEST_FIRST) {
    const q = (a.quiz ?? []).find((x) => x.level === lvl);
    if (q) return q;
  }
  return a.quiz?.[0] ?? null;
}

export function itemDifficulty(a: Atom, depth: number): number {
  return depth + (QUIZ_WEIGHT[hardestQuiz(a)?.level ?? "recall"] ?? 0);
}

export function placementLevels(atoms: Atom[], maxLevels: number): Atom[][] {
  const depth = prerequisiteDepth(atoms);
  const sorted = atoms.slice().sort((x, y) => itemDifficulty(x, depth.get(x.id) ?? 0) - itemDifficulty(y, depth.get(y.id) ?? 0) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const n = Math.max(1, Math.min(maxLevels, Math.floor(sorted.length / ITEMS_PER_LEVEL) || 1));
  const levels: Atom[][] = Array.from({ length: n }, () => []);
  sorted.forEach((a, i) => levels[Math.min(n - 1, Math.floor((i * n) / sorted.length))].push(a));
  return levels;
}

export interface DiagnosticItem {
  id: string;
  atom: Atom;
  level: Depth;
  prompt: string;
  answer: string;
  qIndex: number;
  total: number;
}

export interface Asked {
  id: string;
  correct: boolean;
  slow: boolean;
}

export interface Placement {
  known: string[];
  frontier: string[];
  detail: Record<string, number>;
  asked: Asked[];
  questionsAsked: number;
  placedCount: number;
  total: number;
  levelsPassed: number;
  levels: number;
}

export class Diagnostic {
  atoms: Atom[];
  byId: Map<string, Atom>;
  maxQ: number;
  levels: Atom[][];
  asked: Asked[] = [];
  private closures: Closures;
  private askedSet = new Set<string>();
  private probes: Atom[][];
  private level = 0;
  private stopped = false;
  private started = false;

  constructor(atoms: Atom[], opts: { maxQuestions?: number } = {}) {
    this.byId = new Map(atoms.map((a) => [a.id, a]));
    this.atoms = atoms.filter((a) => (a.quiz?.length ?? 0) > 0);
    this.maxQ = opts.maxQuestions ?? MAX_QUESTIONS_DEFAULT;
    this.closures = buildClosures(atoms);
    this.levels = placementLevels(this.atoms, Math.max(1, Math.floor(this.maxQ / ITEMS_PER_LEVEL)));
    this.probes = this.levels.map((lvl) =>
      lvl
        .slice()
        .sort((x, y) => (this.closures.between.get(y.id) ?? 0) - (this.closures.between.get(x.id) ?? 0) || (x.id < y.id ? -1 : 1))
        .slice(0, ITEMS_PER_LEVEL),
    );
    this.reset();
  }

  reset(): void {
    this.asked = [];
    this.askedSet = new Set();
    this.level = 0;
    this.stopped = false;
    this.started = false;
  }

  start(): this {
    this.reset();
    this.started = true;
    return this;
  }

  private tally(level: number): { credit: number; open: number; need: number } {
    const probes = this.probes[level] ?? [];
    let credit = 0;
    for (const a of this.asked) {
      if (!probes.some((p) => p.id === a.id) || !a.correct) continue;
      credit += a.slow ? SLOW_CREDIT : 1;
    }
    const open = probes.filter((p) => !this.askedSet.has(p.id)).length;
    return { credit, open, need: Math.min(PASS_PER_LEVEL, probes.length) };
  }

  private advance(): void {
    while (!this.stopped && this.level < this.probes.length) {
      const t = this.tally(this.level);
      if (t.credit >= t.need) {
        this.level++;
        continue;
      }
      if (t.credit + t.open < t.need || this.asked.length >= this.maxQ) this.stopped = true;
      return;
    }
  }

  levelsPassed(): number {
    return this.level;
  }

  p(id: string): number {
    const lvl = this.levels.findIndex((l) => l.some((a) => a.id === id));
    const passed = lvl >= 0 && lvl < this.level;
    const asked = this.asked.find((a) => a.id === id);
    if (asked && !asked.correct) return P_MISSED;
    if (passed) return P_KNOWN;
    return asked ? P_UNCONFIRMED : P_UNTESTED;
  }

  done(): boolean {
    if (!this.started) return false;
    return this.stopped || this.level >= this.probes.length || this.asked.length >= this.maxQ;
  }

  next(): DiagnosticItem | null {
    if (this.done()) return null;
    const a = (this.probes[this.level] ?? []).find((p) => !this.askedSet.has(p.id));
    return a ? this.payload(a) : null;
  }

  private payload(a: Atom): DiagnosticItem {
    const q = hardestQuiz(a);
    return {
      id: a.id,
      atom: a,
      level: (q?.level as Depth) ?? "recall",
      prompt: q?.prompt ?? a.title,
      answer: q?.answer ?? "",
      qIndex: this.asked.length + 1,
      total: Math.min(this.maxQ, this.atoms.length),
    };
  }

  answer(id: string, correct: boolean, meta: { slow?: boolean } = {}): void {
    if (this.askedSet.has(id) || !this.byId.has(id) || this.done()) return;
    if (!(this.probes[this.level] ?? []).some((p) => p.id === id)) return;
    this.askedSet.add(id);
    this.asked.push({ id, correct, slow: Boolean(meta.slow) });
    this.advance();
  }

  result(threshold: number = KNOWN_THRESHOLD): Placement {
    const known: string[] = [];
    const detail: Record<string, number> = {};
    this.atoms.forEach((a) => {
      const p = this.p(a.id);
      detail[a.id] = +p.toFixed(3);
      if (p >= threshold) known.push(a.id);
    });
    known.sort((x, y) => this.closures.reqC.get(x)!.size - this.closures.reqC.get(y)!.size || (x < y ? -1 : 1));
    const knownSet = new Set(known);
    const frontier = known.filter((id) => (this.byId.get(id)?.unlocks ?? []).some((u) => this.byId.has(u) && !knownSet.has(u)));
    return {
      known,
      frontier,
      detail,
      asked: this.asked.slice(),
      questionsAsked: this.asked.length,
      placedCount: known.length,
      total: this.atoms.length,
      levelsPassed: this.level,
      levels: this.probes.length,
    };
  }

  simulate(responder: (item: DiagnosticItem) => { correct: boolean; slow?: boolean }): Placement {
    this.start();
    while (!this.done()) {
      const item = this.next();
      if (!item) break;
      const r = responder(item);
      this.answer(item.id, r.correct, { slow: r.slow });
    }
    return this.result();
  }
}
