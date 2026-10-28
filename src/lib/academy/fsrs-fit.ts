import { DAY_MS, FSRS, FSRS_DEFAULT_W, type Card, type Rating } from "./fsrs";

export interface ReviewEntry {
  cardId: string;
  ts: number;
  rating: Rating;
}

export interface FitGate {
  minReviews: number;
  minCards: number;
}

export const FSRS_FIT_GATE: FitGate = { minReviews: 400, minCards: 30 };

export const FSRS_W_BOUNDS: ReadonlyArray<readonly [number, number]> = [
  [0.01, 100],
  [0.01, 100],
  [0.01, 100],
  [0.01, 100],
  [1, 10],
  [0.001, 4],
  [0.001, 4],
  [0.001, 0.75],
  [0, 4.5],
  [0, 0.8],
  [0.001, 3.5],
  [0.001, 5],
  [0.001, 0.25],
  [0.001, 0.9],
  [0, 4],
  [0, 1],
  [1, 6],
  [0, 2],
  [0, 2],
];

export interface FitResult {
  w: number[];
  fitted: boolean;
  reason: "fitted" | "too-few-reviews" | "too-few-cards" | "no-held-out-gain";
  scoredReviews: number;
  distinctCards: number;
  lossBefore: number;
  lossAfter: number;
  heldOutBefore: number;
  heldOutAfter: number;
}

const EPS = 1e-6;
const PRIOR = 1e-2;
export const HOLDOUT_EVERY = 5;

function groupByCard(log: ReviewEntry[]): ReviewEntry[][] {
  const byCard = new Map<string, ReviewEntry[]>();
  for (const r of log) {
    const list = byCard.get(r.cardId);
    if (list) list.push(r);
    else byCard.set(r.cardId, [r]);
  }
  return Array.from(byCard.keys())
    .sort()
    .map((id) => (byCard.get(id) as ReviewEntry[]).slice().sort((a, b) => a.ts - b.ts));
}

export function predictions(w: number[], log: ReviewEntry[]): { r: number; recalled: boolean }[] {
  const fsrs = new FSRS(w);
  const out: { r: number; recalled: boolean }[] = [];
  for (const reviews of groupByCard(log)) {
    let card: Card | null = null;
    for (const rev of reviews) {
      if (card && card.stability != null) {
        const elapsed = Math.max(0, (rev.ts - (card.lastReview ?? rev.ts)) / DAY_MS);
        out.push({ r: fsrs.retrievability(elapsed, card.stability), recalled: rev.rating > 1 });
      }
      card = fsrs.review(card, rev.rating, rev.ts);
    }
  }
  return out;
}

export function logLoss(w: number[], log: ReviewEntry[]): number {
  const preds = predictions(w, log);
  if (preds.length === 0) return 0;
  let sum = 0;
  for (const { r, recalled } of preds) {
    const p = Math.min(Math.max(r, EPS), 1 - EPS);
    sum -= recalled ? Math.log(p) : Math.log(1 - p);
  }
  return sum / preds.length;
}

function objective(w: number[], log: ReviewEntry[]): number {
  let prior = 0;
  for (let i = 0; i < w.length; i++) {
    const [lo, hi] = FSRS_W_BOUNDS[i];
    const z = (w[i] - FSRS_DEFAULT_W[i]) / (hi - lo);
    prior += z * z;
  }
  return logLoss(w, log) + PRIOR * prior;
}

export const MAX_WEIGHT_RATIO = 3;

export function weightCap(i: number): readonly [number, number] {
  const d = FSRS_DEFAULT_W[i];
  return [Math.max(FSRS_W_BOUNDS[i][0], d / MAX_WEIGHT_RATIO), Math.min(FSRS_W_BOUNDS[i][1], d * MAX_WEIGHT_RATIO)];
}

const clampW = (i: number, v: number) => {
  const [lo, hi] = weightCap(i);
  return Math.min(Math.max(v, lo), hi);
};

export function splitByCard(log: ReviewEntry[], every = HOLDOUT_EVERY): { train: ReviewEntry[]; test: ReviewEntry[] } {
  const ids = Array.from(new Set(log.map((r) => r.cardId))).sort();
  const held = new Set(ids.filter((_, k) => k % every === every - 1));
  return { train: log.filter((r) => !held.has(r.cardId)), test: log.filter((r) => held.has(r.cardId)) };
}

export interface FitOptions {
  gate?: FitGate;
  rounds?: number;
  initial?: number[];
}

function* fitSteps(log: ReviewEntry[], opts: FitOptions): Generator<void, FitResult, void> {
  const gate = opts.gate ?? FSRS_FIT_GATE;
  const start = (opts.initial ?? FSRS_DEFAULT_W).slice();
  const scoredReviews = predictions(start, log).length;
  const distinctCards = new Set(log.map((r) => r.cardId)).size;
  const { train, test } = splitByCard(log);
  const lossBefore = logLoss(start, train);
  const heldOutBefore = logLoss(start, test);
  const base = { scoredReviews, distinctCards, lossBefore, heldOutBefore };
  const keep = (reason: FitResult["reason"]): FitResult => ({
    ...base,
    w: [...FSRS_DEFAULT_W],
    fitted: false,
    reason,
    lossAfter: lossBefore,
    heldOutAfter: heldOutBefore,
  });
  if (scoredReviews < gate.minReviews) return keep("too-few-reviews");
  if (distinctCards < gate.minCards) return keep("too-few-cards");

  const w = start.map((v, i) => clampW(i, v));
  const step = FSRS_W_BOUNDS.map(() => 0.5);
  const move = (i: number, v: number, d: number) =>
    FSRS_W_BOUNDS[i][0] > 0 ? v * Math.exp(d) : v + d * ((FSRS_W_BOUNDS[i][1] - FSRS_W_BOUNDS[i][0]) / 10);
  let best = objective(w, train);
  const rounds = opts.rounds ?? 40;
  for (let round = 0; round < rounds; round++) {
    let improved = false;
    for (let i = 0; i < w.length; i++) {
      for (const dir of [1, -1]) {
        const prev = w[i];
        const cand = clampW(i, move(i, prev, dir * step[i]));
        if (cand === prev) continue;
        w[i] = cand;
        const value = objective(w, train);
        if (value < best - 1e-12) {
          best = value;
          improved = true;
          step[i] *= 1.5;
          break;
        }
        w[i] = prev;
      }
      yield;
    }
    if (!improved) for (let i = 0; i < step.length; i++) step[i] *= 0.5;
  }
  const heldOutAfter = logLoss(w, test);
  if (heldOutAfter >= heldOutBefore) return keep("no-held-out-gain");
  return { ...base, w, fitted: true, reason: "fitted", lossAfter: logLoss(w, train), heldOutAfter };
}

export function fitFsrsWeights(log: ReviewEntry[], opts: FitOptions = {}): FitResult {
  const it = fitSteps(log, opts);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

export interface FitRequest {
  log: ReviewEntry[];
  opts?: FitOptions;
}

export const runFitJob = (req: FitRequest): FitResult => fitFsrsWeights(req.log, req.opts);

export interface FitWorker {
  postMessage(req: FitRequest): void;
  onmessage: ((e: { data: FitResult }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  terminate(): void;
}

export function fitInWorker(spawn: () => FitWorker, log: ReviewEntry[], opts?: FitOptions): Promise<FitResult> {
  return new Promise((resolve, reject) => {
    const w = spawn();
    w.onmessage = (e) => {
      w.terminate();
      resolve(e.data);
    };
    w.onerror = (e) => {
      w.terminate();
      reject(e);
    };
    w.postMessage({ log, opts });
  });
}
