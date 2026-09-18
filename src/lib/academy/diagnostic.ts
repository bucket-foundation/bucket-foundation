/**
 * Adaptive placement, a port of learning/app/js/diagnostic.js. In ten to
 * twenty open questions it estimates what a person already knows so an
 * expert starts mid-graph and a beginner at the foundations. A per-atom
 * log-odds belief; each step asks the atom nearest 0.5, tie-broken toward
 * central atoms; "I knew it" floors the whole prerequisite closure to
 * confident-known, "I didn't" floors the dependent closure to
 * confident-unknown; stop at the cap or when no atom is uncertain. The
 * result is a starting estimate, never a rating.
 */
import type { Atom, Depth, QuizItem } from "./engine";

const W_CORRECT = 1.55;
const W_INCORRECT = 1.35;
const W_SLOW = 0.55;
const PROP_DECAY = 0.62;
const PROP_FLOOR = 0.18;
const INFER_FLOOR = 1.4;
const CLOSURE_BIAS = 0.15;
const UNCERTAIN_LO = 0.32;
const UNCERTAIN_HI = 0.68;
export const MAX_QUESTIONS_DEFAULT = 18;
export const KNOWN_THRESHOLD = 0.62;

const clamp01 = (x: number) => (x < 1e-4 ? 1e-4 : x > 1 - 1e-4 ? 1 - 1e-4 : x);
const logit = (p: number) => Math.log(clamp01(p) / (1 - clamp01(p)));
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

interface Closures {
  reqC: Map<string, Set<string>>;
  unlC: Map<string, Set<string>>;
  between: Map<string, number>;
}

/** Transitive prerequisite and dependent closures, and a centrality proxy in [0,1]. */
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
}

export class Diagnostic {
  atoms: Atom[];
  byId: Map<string, Atom>;
  maxQ: number;
  private closures: Closures;
  logodds = new Map<string, number>();
  asked: Asked[] = [];
  private askedSet = new Set<string>();
  private started = false;

  constructor(atoms: Atom[], opts: { maxQuestions?: number } = {}) {
    this.byId = new Map(atoms.map((a) => [a.id, a]));
    this.atoms = atoms.filter((a) => (a.quiz?.length ?? 0) > 0);
    this.maxQ = opts.maxQuestions ?? MAX_QUESTIONS_DEFAULT;
    this.closures = buildClosures(atoms);
    this.reset();
  }

  reset(): void {
    const prior = logit(0.4);
    this.logodds = new Map(this.atoms.map((a) => [a.id, prior]));
    this.asked = [];
    this.askedSet = new Set();
    this.started = false;
  }

  start(): this {
    this.reset();
    this.started = true;
    return this;
  }

  p(id: string): number {
    return sigmoid(this.logodds.get(id) ?? logit(0.4));
  }

  done(): boolean {
    if (!this.started) return false;
    if (this.asked.length >= this.maxQ) return true;
    if (this.askedSet.size >= this.atoms.length) return true;
    return !this.atoms.some((a) => {
      if (this.askedSet.has(a.id)) return false;
      const p = this.p(a.id);
      return p >= UNCERTAIN_LO && p <= UNCERTAIN_HI;
    });
  }

  /** The most informative unasked atom, or null when done. */
  next(): DiagnosticItem | null {
    if (this.done()) return null;
    const proven = this.asked.some((a) => a.correct);
    let maxReqC = 1;
    if (proven) this.atoms.forEach((a) => (maxReqC = Math.max(maxReqC, this.closures.reqC.get(a.id)!.size)));
    let best: Atom | null = null;
    let bestScore = Infinity;
    this.atoms.forEach((a) => {
      if (this.askedSet.has(a.id)) return;
      const p = this.p(a.id);
      let score = Math.abs(p - 0.5) - (this.closures.between.get(a.id) ?? 0) * 0.12;
      if (proven) score -= (this.closures.reqC.get(a.id)!.size / maxReqC) * CLOSURE_BIAS;
      if (score < bestScore) {
        bestScore = score;
        best = a;
      }
    });
    return best ? this.payload(best) : null;
  }

  private payload(a: Atom): DiagnosticItem {
    const order: Depth[] = ["recall", "apply", "derive", "teach"];
    let q: QuizItem | null = null;
    for (const lvl of order) {
      q = (a.quiz ?? []).find((x) => x.level === lvl) ?? null;
      if (q) break;
    }
    q = q ?? a.quiz?.[0] ?? null;
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

  /** Record "I knew it" (correct, optionally slow) or "I didn't", and propagate. Idempotent per atom. */
  answer(id: string, correct: boolean, meta: { slow?: boolean } = {}): void {
    if (this.askedSet.has(id) || !this.logodds.has(id)) return;
    this.askedSet.add(id);
    this.asked.push({ id, correct, slow: Boolean(meta.slow) });
    if (correct) {
      const base = meta.slow ? W_SLOW : W_CORRECT;
      this.logodds.set(id, this.logodds.get(id)! + base);
      if (meta.slow) this.propagate(this.closures.reqC.get(id), base);
      else this.inferKnown(this.closures.reqC.get(id));
    } else {
      this.logodds.set(id, this.logodds.get(id)! - W_INCORRECT);
      this.inferUnknown(this.closures.unlC.get(id));
    }
  }

  private propagate(closure: Set<string> | undefined, base: number): void {
    if (!closure) return;
    const nudge = base * PROP_DECAY;
    if (nudge < PROP_FLOOR) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid) || !this.logodds.has(cid)) return;
      this.logodds.set(cid, this.logodds.get(cid)! + nudge);
    });
  }

  private inferKnown(closure: Set<string> | undefined): void {
    if (!closure) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid) || !this.logodds.has(cid)) return;
      if (this.logodds.get(cid)! < INFER_FLOOR) this.logodds.set(cid, INFER_FLOOR);
    });
  }

  private inferUnknown(closure: Set<string> | undefined): void {
    if (!closure) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid) || !this.logodds.has(cid)) return;
      if (this.logodds.get(cid)! > -INFER_FLOOR) this.logodds.set(cid, -INFER_FLOOR);
    });
  }

  /** The atoms to mark known (P at or above the threshold), the frontier among them, and the detail. */
  result(threshold: number = KNOWN_THRESHOLD): Placement {
    const known: string[] = [];
    const detail: Record<string, number> = {};
    this.atoms.forEach((a) => {
      const p = this.p(a.id);
      detail[a.id] = +p.toFixed(3);
      if (p >= threshold) known.push(a.id);
    });
    known.sort((x, y) => this.closures.reqC.get(x)!.size - this.closures.reqC.get(y)!.size);
    const knownSet = new Set(known);
    const frontier = known.filter((id) => (this.byId.get(id)?.unlocks ?? []).some((u) => this.byId.has(u) && !knownSet.has(u)));
    return { known, frontier, detail, asked: this.asked.slice(), questionsAsked: this.asked.length, placedCount: known.length, total: this.atoms.length };
  }

  /** Run to completion with a responder; for tests and simulations. */
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
