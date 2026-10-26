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
  reason: "fitted" | "too-few-reviews" | "too-few-cards";
  scoredReviews: number;
  distinctCards: number;
  lossBefore: number;
  lossAfter: number;
}

const EPS = 1e-6;
const PRIOR = 1e-2;

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

const clampW = (i: number, v: number) => Math.min(Math.max(v, FSRS_W_BOUNDS[i][0]), FSRS_W_BOUNDS[i][1]);

export function fitFsrsWeights(
  log: ReviewEntry[],
  opts: { gate?: FitGate; rounds?: number; initial?: number[] } = {},
): FitResult {
  const gate = opts.gate ?? FSRS_FIT_GATE;
  const start = (opts.initial ?? FSRS_DEFAULT_W).slice();
  const scoredReviews = predictions(start, log).length;
  const distinctCards = new Set(log.map((r) => r.cardId)).size;
  const lossBefore = logLoss(start, log);
  const base = { scoredReviews, distinctCards, lossBefore };
  if (scoredReviews < gate.minReviews) {
    return { ...base, w: [...FSRS_DEFAULT_W], fitted: false, reason: "too-few-reviews", lossAfter: lossBefore };
  }
  if (distinctCards < gate.minCards) {
    return { ...base, w: [...FSRS_DEFAULT_W], fitted: false, reason: "too-few-cards", lossAfter: lossBefore };
  }

  const w = start.map((v, i) => clampW(i, v));
  const step = FSRS_W_BOUNDS.map(() => 0.5);
  const move = (i: number, v: number, d: number) =>
    FSRS_W_BOUNDS[i][0] > 0 ? v * Math.exp(d) : v + d * ((FSRS_W_BOUNDS[i][1] - FSRS_W_BOUNDS[i][0]) / 10);
  let best = objective(w, log);
  const rounds = opts.rounds ?? 40;
  for (let round = 0; round < rounds; round++) {
    let improved = false;
    for (let i = 0; i < w.length; i++) {
      for (const dir of [1, -1]) {
        const prev = w[i];
        const cand = clampW(i, move(i, prev, dir * step[i]));
        if (cand === prev) continue;
        w[i] = cand;
        const value = objective(w, log);
        if (value < best - 1e-12) {
          best = value;
          improved = true;
          step[i] *= 1.5;
          break;
        }
        w[i] = prev;
      }
    }
    if (!improved) for (let i = 0; i < step.length; i++) step[i] *= 0.5;
  }
  return { ...base, w, fitted: true, reason: "fitted", lossAfter: logLoss(w, log) };
}
