export const KNOWN_R = 0.9;
export const TAP_WINDOW_DAYS = 7;
export const EXPOSURE_LAMBDA = 0;
export const PRIOR_HALF_RANK = 500;
export const PRIOR_SLOPE = 2;
export const DERIVED_RANK_FACTOR = 2;

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

export interface Known {
  p: number;
  known: boolean;
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

export function frequencyPrior(freq: FreqPrior | null | undefined, tier: number): number {
  if (!freq) return 0;
  const rank = freq.derived ? freq.rank * DERIVED_RANK_FACTOR : freq.rank;
  const half = PRIOR_HALF_RANK * (1 + Math.max(0, tier));
  return 1 / (1 + Math.pow(rank / half, PRIOR_SLOPE));
}

export function exposureGain(n: number, lambda: number = EXPOSURE_LAMBDA): number {
  return n > 0 && lambda > 0 ? 1 - Math.exp(-lambda * n) : 0;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function known(e: LemmaEvidence, now: number, tier: number, lambda: number = EXPOSURE_LAMBDA): Known {
  if (typeof e.lastTap === "number" && now - e.lastTap >= 0 && now - e.lastTap < TAP_WINDOW_DAYS * DAY_MS) return { p: 0, known: false, source: "tap" };
  if (typeof e.stability === "number" && e.stability > 0 && typeof e.lastReview === "number") {
    const r = clamp01(retrievability((now - e.lastReview) / DAY_MS, e.stability));
    return { p: r, known: r >= KNOWN_R, source: "card" };
  }
  const prior = frequencyPrior(e.freq, tier);
  const gain = exposureGain(e.exposures ?? 0, lambda);
  const p = clamp01(1 - (1 - prior) * (1 - gain));
  return { p, known: p >= KNOWN_R, source: gain > 0 ? "exposure" : "prior" };
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

export function knownCount(lemmas: Readonly<Record<string, LemmaEvidence>>, now: number, tier: number, lambda: number = EXPOSURE_LAMBDA): number {
  let sum = 0;
  for (const id of Object.keys(lemmas).sort()) sum += known(lemmas[id], now, tier, lambda).p;
  return sum;
}
