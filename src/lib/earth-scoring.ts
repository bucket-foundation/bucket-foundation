// earth-scoring.ts — the data engine behind /earth.
//
// Pure functions only (no React, no DOM) so the control panel can call them
// inside `useMemo` and stay frameloop="demand" friendly. Two jobs:
//
//   1. Sequential colour ramp built from the Bucket palette (bone → gold →
//      teal) — used for BOTH the single-indicator explore mode and the
//      composite-score ranking mode, so the globe reads consistently.
//   2. min-max normalization + direction-flip + weighted composite scoring,
//      exactly as described in world-indicators-scoring.json's `normalization`
//      note: "min-max per indicator across all countries; flip lower-is-better;
//      weighted sum -> 0..100 composite score".

export type Direction = "higher" | "lower" | "neutral";

export interface ScoredCountry {
  id: string;
  iso3: string;
  title: string;
  lat: number;
  lng: number;
  /** 0..100 composite, or NaN when the country has no usable weighted values */
  score: number;
  /** the 2–3 highest-weighted raw indicator readings, for the table */
  top: Array<{ label: string; value: number; weight: number }>;
}

// ── Colour ramp ────────────────────────────────────────────────────────────
// Defined ONCE here. A bone → gold → teal sequential ramp, all drawn from the
// CSS palette in globals.css:
//   --bone        #EFE8D4   (low)
//   --gold-bright #D9A43A   (mid)
//   --aegean      #2E6B6B   (high)
// We interpolate in sRGB — good enough at this density and keeps it dependency
// free (the brief asks us to write the ramp ourselves, no chroma/d3-scale).
const RAMP_STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [0xef, 0xe8, 0xd4]], // bone
  [0.5, [0xd9, 0xa4, 0x3a]], // gold-bright
  [1.0, [0x2e, 0x6b, 0x6b]], // aegean / teal
];

/** Dim grey for missing values — reads as "no data", non-interactive feel. */
export const NO_DATA_COLOR = "#8A8478";
/** Terra-red for the biophysics Blue Zones overlay (matches BRANCH_COLOR). */
export const BLUE_ZONE_COLOR = "#8E3E3E";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function toHex(c: number): string {
  const v = Math.max(0, Math.min(255, Math.round(c)));
  return v.toString(16).padStart(2, "0");
}

/**
 * Map t∈[0,1] to a hex colour along the bone→gold→teal ramp. Values outside
 * [0,1] are clamped. NaN → NO_DATA_COLOR.
 */
export function rampColor(t: number): string {
  if (!Number.isFinite(t)) return NO_DATA_COLOR;
  const x = Math.max(0, Math.min(1, t));
  let lo = RAMP_STOPS[0];
  let hi = RAMP_STOPS[RAMP_STOPS.length - 1];
  for (let i = 0; i < RAMP_STOPS.length - 1; i++) {
    if (x >= RAMP_STOPS[i][0] && x <= RAMP_STOPS[i + 1][0]) {
      lo = RAMP_STOPS[i];
      hi = RAMP_STOPS[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const local = (x - lo[0]) / span;
  const r = lerp(lo[1][0], hi[1][0], local);
  const g = lerp(lo[1][1], hi[1][1], local);
  const b = lerp(lo[1][2], hi[1][2], local);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** CSS gradient string for the legend swatch — the same three stops. */
export const RAMP_CSS_GRADIENT =
  "linear-gradient(90deg, #EFE8D4 0%, #D9A43A 50%, #2E6B6B 100%)";

// ── Single-indicator explore mode ───────────────────────────────────────────

export interface IndicatorStats {
  min: number;
  max: number;
  /** position of the global average along [0,1], or null if avg unknown */
  avgT: number | null;
  avg: number | null;
}

/**
 * Compute min/max for one indicator across the countries that actually have a
 * (finite) value for it, plus where the global average sits on the ramp.
 */
export function indicatorStats(
  values: number[],
  globalAvg: number | null | undefined
): IndicatorStats {
  const present = values.filter((v) => Number.isFinite(v));
  if (present.length === 0) {
    return { min: 0, max: 1, avgT: null, avg: null };
  }
  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min;
  const avg = typeof globalAvg === "number" && Number.isFinite(globalAvg) ? globalAvg : null;
  const avgT = avg !== null && span > 0 ? Math.max(0, Math.min(1, (avg - min) / span)) : avg !== null ? 0.5 : null;
  return { min, max, avg, avgT };
}

/** Normalize a single value into [0,1] along [min,max]. NaN-safe. */
export function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return NaN;
  const span = max - min;
  if (span <= 0) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / span));
}

// ── Composite-score ranking mode ─────────────────────────────────────────────

export interface ScoringInput {
  countries: Array<{
    id: string;
    iso3: string;
    title: string;
    lat: number;
    lng: number;
    values: Record<string, number>;
  }>;
  /** weight per indicator label; 0 / missing = excluded */
  weights: Record<string, number>;
  /** direction per indicator label */
  directions: Record<string, Direction>;
}

/**
 * The engine. For each weighted, non-neutral indicator:
 *   - min-max normalize across the countries that have a finite value
 *   - flip when the indicator is "lower"-is-better (1 - t)
 *   - weighted sum, divided by the total weight of the indicators a country
 *     actually had data for (so a missing column doesn't unfairly zero a
 *     country) → rescaled to 0..100.
 * Countries with no usable weighted values get score = NaN (rendered grey,
 * sorted last).
 */
export function computeScores(input: ScoringInput): ScoredCountry[] {
  const { countries, weights, directions } = input;

  // Active = weighted, positive, and NOT neutral.
  const activeLabels = Object.keys(weights).filter((label) => {
    const w = weights[label];
    if (!w || w <= 0) return false;
    if (directions[label] === "neutral") return false;
    return true;
  });

  // Per-indicator min/max over countries that have a finite reading.
  const ranges: Record<string, { min: number; max: number }> = {};
  for (const label of activeLabels) {
    let min = Infinity;
    let max = -Infinity;
    for (const c of countries) {
      const v = c.values[label];
      if (Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    ranges[label] = Number.isFinite(min) ? { min, max } : { min: 0, max: 1 };
  }

  const scored: ScoredCountry[] = countries.map((c) => {
    let weightedSum = 0;
    let usedWeight = 0;
    const contributions: Array<{ label: string; value: number; weight: number }> = [];
    for (const label of activeLabels) {
      const raw = c.values[label];
      if (!Number.isFinite(raw)) continue;
      const { min, max } = ranges[label];
      let t = normalize(raw, min, max);
      if (directions[label] === "lower") t = 1 - t; // flip lower-is-better
      const w = weights[label];
      weightedSum += t * w;
      usedWeight += w;
      contributions.push({ label, value: raw, weight: w });
    }
    const score = usedWeight > 0 ? (weightedSum / usedWeight) * 100 : NaN;
    // top 2–3 highest-weighted raw readings (for the table)
    const top = contributions
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
    return {
      id: c.id,
      iso3: c.iso3,
      title: c.title,
      lat: c.lat,
      lng: c.lng,
      score,
      top,
    };
  });

  return scored;
}

/** Rank (1-based) ignoring NaN scores; ties broken by score desc then name. */
export function rankScores(scored: ScoredCountry[]): ScoredCountry[] {
  return [...scored].sort((a, b) => {
    const an = Number.isFinite(a.score);
    const bn = Number.isFinite(b.score);
    if (an && !bn) return -1;
    if (!an && bn) return 1;
    if (!an && !bn) return a.title.localeCompare(b.title);
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });
}
