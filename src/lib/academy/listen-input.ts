import type { InputItem } from "./input-selector";
import { MAX_EXPOSURE_SECONDS, MAX_LEMMAS, type ExposureInput } from "./learn-log";

const LEMMA = /^\S{1,40}$/;
const KEY = /[^A-Za-z0-9._:/-]/g;

export interface Captions {
  items: readonly InputItem[];
}

function key(prefix: string, id: string): string {
  return `${prefix}:${id.replace(KEY, "-")}`.slice(0, 128);
}

function captionLemmas(c: Captions | null | undefined): string[] {
  if (!c) return [];
  return c.items.flatMap((i) => i.tokens.map((t) => t.lemma)).filter((l) => LEMMA.test(l));
}

export function audioCoverage(lemmas: readonly string[], p: (lemma: string) => number): number {
  if (!lemmas.length) return 0;
  const sum = lemmas.reduce((s, l) => s + Math.min(1, Math.max(0, p(l))), 0);
  return Math.round((sum / lemmas.length) * 1e4) / 1e4;
}

function chunks(seconds: number): number[] {
  const out: number[] = [];
  let left = Math.max(0, Math.round(seconds));
  while (left > 0) {
    const s = Math.min(MAX_EXPOSURE_SECONDS, left);
    out.push(s);
    left -= s;
  }
  return out;
}

export function radioExposures(stationId: string, startedAt: number, listenedMs: number, p: (lemma: string) => number, captions?: Captions | null): ExposureInput[] {
  const lemmas = captionLemmas(captions);
  const coverage = lemmas.length ? audioCoverage(lemmas, p) : 0;
  const seen = Array.from(new Set(lemmas)).slice(0, MAX_LEMMAS);
  const unit = key("radio", stationId);
  return chunks(listenedMs / 1000).map((seconds, i) => ({
    item: key(unit, `${Math.floor(startedAt / 1000)}.${i}`),
    unit,
    lemmas_seen: seen,
    taps: [],
    seconds,
    coverage_pred: coverage,
    completed: false,
  }));
}

export function clipExposure(clip: InputItem, listenedMs: number, completed: boolean, p: (lemma: string) => number): ExposureInput | null {
  const seconds = Math.min(MAX_EXPOSURE_SECONDS, Math.max(0, Math.round(listenedMs / 1000)));
  if (clip.kind !== "audio" || seconds <= 0) return null;
  const lemmas = captionLemmas({ items: [clip] });
  return {
    item: key("clip", clip.id),
    unit: key("clip", clip.id),
    lemmas_seen: Array.from(new Set(lemmas)).slice(0, MAX_LEMMAS),
    taps: [],
    seconds,
    coverage_pred: audioCoverage(lemmas, p),
    completed,
  };
}
