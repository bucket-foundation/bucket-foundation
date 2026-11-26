import { KNOWN_R, known, type FrequencyPriors, type LemmaEvidence, UNSTUDIED_PRIORS, EXPOSURE_LAMBDA } from "./learner-model";
import type { Learner } from "./input-selector";

export const UNSTUDIED_COGNATE_WEIGHT = 0.5;

export type CognateIndex = Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;

export interface CognateFile {
  format: "polingual-cognates";
  lang: string;
  rule: string;
  credit: string;
  cognates: CognateIndex;
}

export type HeldP = (lang: string, lemma: string) => number;

export interface HeldCognate {
  lang: string;
  lemma: string;
  p: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

export function parseCognates(raw: unknown, lang: string): CognateIndex | null {
  const f = raw as Partial<CognateFile> | null;
  if (!f || f.format !== "polingual-cognates" || f.lang !== lang || typeof f.cognates !== "object" || f.cognates === null) return null;
  return f.cognates;
}

export function heldCognates(index: CognateIndex | null, lang: string, lemma: string, held: HeldP): HeldCognate[] {
  const out: HeldCognate[] = [];
  const byLang = index?.[lemma];
  if (!byLang) return out;
  for (const l of Object.keys(byLang).sort()) {
    if (l === lang) continue;
    for (const u of byLang[l]) {
      const p = clamp01(held(l, u));
      if (p >= KNOWN_R) out.push({ lang: l, lemma: u, p });
    }
  }
  return out;
}

export function recognised(index: CognateIndex | null, lang: string, lemma: string, held: HeldP): boolean {
  return heldCognates(index, lang, lemma, held).length > 0;
}

export function cognateAdjusted(p: number, isRecognised: boolean): number {
  const q = clamp01(p);
  return isRecognised ? Math.max(q, UNSTUDIED_COGNATE_WEIGHT) : q;
}

export function withCognates(learner: Learner, lang: string, index: CognateIndex | null, held: HeldP): Learner {
  if (!index) return learner;
  return { ...learner, p: (lemma) => cognateAdjusted(learner.p(lemma), recognised(index, lang, lemma, held)) };
}

export function cognateKnownCount(
  lang: string,
  lemmas: Readonly<Record<string, LemmaEvidence>>,
  index: CognateIndex | null,
  held: HeldP,
  now: number,
  tier: number,
  lambda: number = EXPOSURE_LAMBDA,
  priors: FrequencyPriors = UNSTUDIED_PRIORS,
): number {
  const ids = new Set([...Object.keys(lemmas), ...Object.keys(index ?? {})]);
  let sum = 0;
  for (const id of Array.from(ids).sort()) {
    const p = lemmas[id] ? known(lemmas[id], now, tier, lambda, priors).p : 0;
    sum += cognateAdjusted(p, recognised(index, lang, id, held));
  }
  return sum;
}

export interface HeldCard {
  stability?: number | null;
  lastReview?: number | null;
}

export function heldFrom(cardOf: (lang: string, lemma: string) => HeldCard | undefined, now: number): HeldP {
  return (lang, lemma) => {
    const c = cardOf(lang, lemma);
    return c ? known({ stability: c.stability ?? null, lastReview: c.lastReview ?? null }, now, 0).p : 0;
  };
}

export function heldFromCards(cards: Readonly<Record<string, HeldCard>>, now: number): HeldP {
  return heldFrom((lang, lemma) => cards[`${lang}:${lemma}`], now);
}

export async function loadCognates(lang: string, base = "/input/cognates", fetcher: typeof fetch = fetch): Promise<CognateIndex | null> {
  try {
    const r = await fetcher(`${base}/${encodeURIComponent(lang)}.json`);
    return r.ok ? parseCognates(await r.json(), lang) : null;
  } catch {
    return null;
  }
}
