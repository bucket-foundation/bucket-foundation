import { dayKey } from "./engine";
import { inputEvidence, knownCount, type LemmaEvidence } from "./learner-model";

export const INPUT_COVERAGE = 0.9;
export const STREAK_INPUT_SECONDS = 300;

const DAY_MS = 86_400_000;

export interface MetricRow {
  kind?: string;
  lang?: string;
  reviewed_at: number;
  tz?: string;
  seconds?: number;
  coverage_pred?: number;
  started?: number;
  ended?: number;
  lemmas_seen?: readonly string[];
  taps?: readonly string[];
}

export interface MetricCard {
  stability?: number | null;
  lastReview?: number | null;
}

export interface LangMetrics {
  inputSeconds: number;
  inputHours: number;
  knownWords: number;
}

export function countsAsInput(r: MetricRow, lang: string): boolean {
  return r.kind === "exposure" && r.lang === lang && typeof r.seconds === "number" && r.seconds > 0 && typeof r.coverage_pred === "number" && r.coverage_pred >= INPUT_COVERAGE;
}

export function inputSeconds(rows: readonly MetricRow[], lang: string): number {
  let sum = 0;
  for (const r of rows) if (countsAsInput(r, lang)) sum += r.seconds as number;
  return sum;
}

export function inputDays(rows: readonly MetricRow[], lang: string): string[] {
  const input = rows.filter((r) => countsAsInput(r, lang));
  const days = new Set<string>();
  for (const s of rows) {
    if (s.kind !== "session" || s.lang !== lang || typeof s.started !== "number" || typeof s.ended !== "number") continue;
    let sum = 0;
    for (const r of input) if (r.reviewed_at >= s.started && r.reviewed_at <= s.ended) sum += r.seconds as number;
    if (sum >= STREAK_INPUT_SECONDS) days.add(dayKey(s.ended, s.tz));
  }
  return Array.from(days).sort();
}

export function epochDay(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function streakFromDays(days: Iterable<string>, today: string): { streak: number; studiedToday: boolean } {
  const set = new Set<number>();
  for (const d of Array.from(days)) set.add(epochDay(d));
  const t = epochDay(today);
  const studiedToday = set.has(t);
  let cur = studiedToday ? t : t - 1;
  let streak = 0;
  while (set.has(cur)) {
    streak++;
    cur--;
  }
  return { streak, studiedToday };
}

export function lemmaEvidence(lang: string, cards: Readonly<Record<string, MetricCard>>, rows: readonly MetricRow[]): Record<string, LemmaEvidence> {
  const prefix = `${lang}:`;
  const out: Record<string, LemmaEvidence> = {};
  for (const [id, c] of Object.entries(cards)) {
    if (!id.startsWith(prefix)) continue;
    out[id.slice(prefix.length)] = { stability: c.stability ?? null, lastReview: c.lastReview ?? null };
  }
  const ev = inputEvidence(rows.filter((r) => r.lang === lang).map((r) => ({ kind: r.kind, reviewed_at: r.reviewed_at, lemmas_seen: r.lemmas_seen, taps: r.taps })));
  for (const [l, e] of Object.entries(ev)) out[l] = { ...out[l], ...e };
  return out;
}

export function langMetrics(lang: string, cards: Readonly<Record<string, MetricCard>>, rows: readonly MetricRow[], now: number, tier = 0): LangMetrics {
  const secs = inputSeconds(rows, lang);
  return {
    inputSeconds: secs,
    inputHours: Math.floor(secs / 360) / 10,
    knownWords: Math.round(knownCount(lemmaEvidence(lang, cards, rows), now, tier)),
  };
}

