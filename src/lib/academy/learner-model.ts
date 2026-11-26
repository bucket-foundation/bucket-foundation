export const KNOWN_R = 0.9;
export const TAP_WINDOW_DAYS = 7;
export const EXPOSURE_LAMBDA = 0;

export interface FrequencyPriors {
  halfRank: number;
  slope: number;
  derivedRankFactor: number;
  cap: number;
}

export const DEFAULT_PRIORS: FrequencyPriors = { halfRank: 500, slope: 2, derivedRankFactor: 2, cap: 0.85 };

export const PRIOR_BOUNDS: { [K in keyof FrequencyPriors]: readonly [number, number] } = {
  halfRank: [50, 20_000],
  slope: [0.5, 5],
  derivedRankFactor: [1, 10],
  cap: [0, 0.89],
};

export function boundedPriors(p: Partial<FrequencyPriors>): FrequencyPriors {
  const out = { ...DEFAULT_PRIORS, ...p };
  for (const k of Object.keys(PRIOR_BOUNDS) as (keyof FrequencyPriors)[]) {
    const [lo, hi] = PRIOR_BOUNDS[k];
    out[k] = Number.isFinite(out[k]) ? Math.min(hi, Math.max(lo, out[k])) : DEFAULT_PRIORS[k];
  }
  return out;
}

const DAY_MS = 86_400_000;
const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

export interface FreqPrior {
  rank: number;
  derived: boolean;
}

export interface LemmaEvidence {
  stability?: number | null;
  lastReview?: number | null;
  lastTap?: number | null;
  exposures?: number;
  freq?: FreqPrior | null;
}

export type Probability = number;
export type HardCutAtKnownR = boolean;
export type SumOfProbabilities = number;

export interface Known {
  p: Probability;
  known: HardCutAtKnownR;
  source: "tap" | "card" | "exposure" | "prior";
}

export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + FACTOR * (Math.max(0, elapsedDays) / stability), DECAY);
}

export function freqFromRow(row: readonly unknown[]): FreqPrior | null {
  const rank = row[7];
  if (typeof rank !== "number" || !Number.isFinite(rank) || rank < 1) return null;
  return { rank, derived: row[8] === 1 };
}

function uncappedPrior(freq: FreqPrior, tier: number, p: FrequencyPriors): number {
  const rank = freq.derived ? freq.rank * p.derivedRankFactor : freq.rank;
  const half = p.halfRank * (1 + Math.max(0, tier));
  return 1 / (1 + Math.pow(rank / half, p.slope));
}

export function frequencyPrior(freq: FreqPrior | null | undefined, tier: number, priors: FrequencyPriors = DEFAULT_PRIORS): Probability {
  if (!freq) return 0;
  return Math.min(priors.cap, uncappedPrior(freq, tier, priors));
}

export function exposureGain(n: number, lambda: number = EXPOSURE_LAMBDA): number {
  return n > 0 && lambda > 0 ? 1 - Math.exp(-lambda * n) : 0;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function known(e: LemmaEvidence, now: number, tier: number, lambda: number = EXPOSURE_LAMBDA, priors: FrequencyPriors = DEFAULT_PRIORS): Known {
  if (typeof e.lastTap === "number" && now - e.lastTap >= 0 && now - e.lastTap < TAP_WINDOW_DAYS * DAY_MS) return { p: 0, known: false, source: "tap" };
  if (typeof e.stability === "number" && e.stability > 0 && typeof e.lastReview === "number") {
    const r = clamp01(retrievability((now - e.lastReview) / DAY_MS, e.stability));
    return { p: r, known: r >= KNOWN_R, source: "card" };
  }
  const prior = frequencyPrior(e.freq, tier, priors);
  const gain = exposureGain(e.exposures ?? 0, lambda);
  const p = clamp01(1 - (1 - prior) * (1 - gain));
  return { p, known: p >= KNOWN_R, source: gain > 0 ? "exposure" : "prior" };
}

export interface PriorObservation {
  source: "placement" | "review";
  freq: FreqPrior;
  tier: number;
  knew: boolean;
}

export function placementObservations(answers: readonly { freq: FreqPrior | null; tier: number; correct: boolean }[]): PriorObservation[] {
  return answers.flatMap((a) => (a.freq ? [{ source: "placement" as const, freq: a.freq, tier: a.tier, knew: a.correct }] : []));
}

export function firstReviewObservations(reviews: readonly { freq: FreqPrior | null; tier: number; rating: number; firstSeen: boolean }[]): PriorObservation[] {
  return reviews.flatMap((r) => (r.freq && r.firstSeen ? [{ source: "review" as const, freq: r.freq, tier: r.tier, knew: r.rating >= 3 }] : []));
}

export function priorLogLoss(obs: readonly PriorObservation[], priors: FrequencyPriors): number {
  let sum = 0;
  for (const o of obs) {
    const q = Math.min(1 - 1e-6, Math.max(1e-6, uncappedPrior(o.freq, o.tier, priors)));
    sum -= o.knew ? Math.log(q) : Math.log(1 - q);
  }
  return obs.length ? sum / obs.length : 0;
}

export const MIN_FIT_OBSERVATIONS = 200;

export function fitPriors(obs: readonly PriorObservation[], start: FrequencyPriors = DEFAULT_PRIORS): { priors: FrequencyPriors; loss: number; fitted: boolean } {
  if (obs.length < MIN_FIT_OBSERVATIONS) return { priors: start, loss: priorLogLoss(obs, start), fitted: false };
  let best = boundedPriors(start);
  let loss = priorLogLoss(obs, best);
  const grid = (k: "halfRank" | "slope" | "derivedRankFactor", n: number, log: boolean) => {
    const [lo, hi] = PRIOR_BOUNDS[k];
    return Array.from({ length: n }, (_, i) => (log ? lo * Math.pow(hi / lo, i / (n - 1)) : lo + ((hi - lo) * i) / (n - 1)));
  };
  for (let round = 0; round < 3; round++) {
    for (const [k, n, log] of [["halfRank", 60, true], ["slope", 46, false], ["derivedRankFactor", 37, false]] as const) {
      for (const v of grid(k, n, log)) {
        const cand = { ...best, [k]: v };
        const l = priorLogLoss(obs, cand);
        if (l < loss) {
          loss = l;
          best = cand;
        }
      }
    }
  }
  return { priors: best, loss, fitted: true };
}

export interface InputRow {
  kind?: string;
  reviewed_at: number;
  lemmas_seen?: readonly string[];
  taps?: readonly string[];
}

export function inputEvidence(rows: readonly InputRow[]): Record<string, Pick<LemmaEvidence, "lastTap" | "exposures">> {
  const out: Record<string, Pick<LemmaEvidence, "lastTap" | "exposures">> = {};
  for (const r of rows) {
    if (r.kind !== "exposure") continue;
    for (const l of Array.from(new Set(r.lemmas_seen ?? []))) out[l] = { ...out[l], exposures: (out[l]?.exposures ?? 0) + 1 };
    for (const l of Array.from(new Set(r.taps ?? []))) out[l] = { ...out[l], lastTap: Math.max(out[l]?.lastTap ?? -Infinity, r.reviewed_at) };
  }
  return out;
}

export function knownCount(lemmas: Readonly<Record<string, LemmaEvidence>>, now: number, tier: number, lambda: number = EXPOSURE_LAMBDA, priors: FrequencyPriors = DEFAULT_PRIORS): SumOfProbabilities {
  let sum = 0;
  for (const id of Object.keys(lemmas).sort()) sum += known(lemmas[id], now, tier, lambda, priors).p;
  return sum;
}
