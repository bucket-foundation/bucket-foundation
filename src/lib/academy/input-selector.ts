import type { LangCorpus } from "./lang-systems";

export const MIN_UNIT_TOKENS = 40;
export const TEXT_BAND: readonly [number, number] = [0.95, 0.98];
export const MEDIA_FLOOR = 0.9;
export const MAX_NEW = 3;
export const NEW_SHARE = 0.05;
export const UNKNOWN_BELOW = 0.5;

export interface SelectorWeights {
  due: number;
  frequency: number;
  repeat: number;
  continuity: number;
}

export const UNFITTED_SELECTOR_WEIGHTS: SelectorWeights = { due: 2, frequency: 1, repeat: 3, continuity: 1.5 };

export interface InputToken {
  surface: string;
  lemma: string;
}

export interface InputItem {
  id: string;
  kind: "sentence" | "passage" | "audio" | "video_segment";
  lang: string;
  lemmas: string[];
  tokens: InputToken[];
  text: string;
  translation?: string;
  media?: { videoId: string; start: number; end: number };
}

export interface InputUnit {
  id: string;
  kind: "sentence_set" | "episode" | "passage";
  itemIds: string[];
  targetLemmas: string[];
  tokenCount: number;
}

export interface InputBundle {
  format: "polingual-input";
  lang: string;
  items: InputItem[];
  units: InputUnit[];
}

export interface Learner {
  p: (lemma: string) => number;
  due: ReadonlySet<string>;
  rank: (lemma: string) => number | null;
  recent: Readonly<Record<string, number>>;
  lastVideo: string | null;
}

export interface Plan {
  unit: string;
  tokens: number;
  media: boolean;
  coverage: number;
  newWords: string[];
  glossed: string[];
  eligible: boolean;
  score: number;
}

export function parseBundle(raw: unknown): InputBundle | null {
  const b = raw as Partial<InputBundle> | null;
  if (!b || b.format !== "polingual-input" || typeof b.lang !== "string" || !Array.isArray(b.items) || !Array.isArray(b.units)) return null;
  return b as InputBundle;
}

export function unitLemmas(unit: InputUnit, items: ReadonlyMap<string, InputItem>): string[] {
  return unit.itemIds.flatMap((id) => (items.get(id)?.tokens ?? []).map((t) => t.lemma));
}

export function unitVideo(unit: InputUnit, items: ReadonlyMap<string, InputItem>): string | null {
  return items.get(unit.itemIds[0])?.media?.videoId ?? null;
}

const rankBonus = (rank: number | null) => (rank === null ? 0 : 1000 / (1000 + Math.max(1, rank)));

export function planUnit(unitId: string, lemmas: readonly string[], targets: readonly string[], media: boolean, video: string | null, l: Learner, w: SelectorWeights = UNFITTED_SELECTOR_WEIGHTS): Plan {
  const n = lemmas.length;
  const distinct = Array.from(new Set(lemmas)).sort();
  const unknown = distinct.filter((x) => l.p(x) < UNKNOWN_BELOW);
  const pool = new Set(targets.length ? targets : distinct);
  const room = Math.min(MAX_NEW, Math.floor(NEW_SHARE * n));
  const byFreq = unknown.filter((x) => pool.has(x)).sort((a, b) => (l.rank(a) ?? Infinity) - (l.rank(b) ?? Infinity) || (a < b ? -1 : a > b ? 1 : 0));
  const newWords = byFreq.slice(0, Math.max(0, room));
  const keep = new Set(newWords);
  const glossed = unknown.filter((x) => !keep.has(x));
  const g = new Set(glossed);
  const coverage = n ? lemmas.reduce((s, x) => s + (g.has(x) ? 1 : Math.min(1, Math.max(0, l.p(x)))), 0) / n : 0;
  const band = media ? coverage >= MEDIA_FLOOR : coverage >= TEXT_BAND[0] && coverage <= TEXT_BAND[1];
  const k = newWords.length;
  const eligible = n >= MIN_UNIT_TOKENS && band && k >= 1 && k <= MAX_NEW && k <= NEW_SHARE * n;
  const dueHits = distinct.filter((x) => l.due.has(x)).length;
  const freq = newWords.reduce((s, x) => s + rankBonus(l.rank(x)), 0);
  const score = w.due * dueHits + w.frequency * freq - w.repeat * (l.recent[unitId] ?? 0) + (video && video === l.lastVideo ? w.continuity : 0);
  return { unit: unitId, tokens: n, media, coverage, newWords, glossed, eligible, score };
}

export function rawCoverage(lemmas: readonly string[], l: Learner): number {
  return lemmas.length ? lemmas.reduce((s, x) => s + Math.min(1, Math.max(0, l.p(x))), 0) / lemmas.length : 0;
}

export function planBundle(bundle: InputBundle, l: Learner, w: SelectorWeights = UNFITTED_SELECTOR_WEIGHTS): Plan[] {
  const items = new Map(bundle.items.map((i) => [i.id, i]));
  return bundle.units.map((u) => planUnit(u.id, unitLemmas(u, items), u.targetLemmas, u.kind === "episode", unitVideo(u, items), l, w));
}

export function select(plans: readonly Plan[], l: Learner, lemmasOf: (unit: string) => readonly string[]): { plan: Plan; fallback: boolean } | null {
  const ok = plans.filter((p) => p.eligible).sort((a, b) => b.score - a.score || (a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0));
  if (ok.length) return { plan: ok[0], fallback: false };
  const big = plans.filter((p) => p.tokens >= MIN_UNIT_TOKENS);
  if (!big.length) return null;
  let best = big[0];
  let bestCov = rawCoverage(lemmasOf(best.unit), l);
  for (const p of big.slice(1)) {
    const c = rawCoverage(lemmasOf(p.unit), l);
    if (c > bestCov || (c === bestCov && p.unit < best.unit)) {
      best = p;
      bestCov = c;
    }
  }
  const all = Array.from(new Set(lemmasOf(best.unit))).filter((x) => l.p(x) < UNKNOWN_BELOW).sort();
  return { plan: { ...best, newWords: [], glossed: all, coverage: 1 }, fallback: true };
}

export function lemmaCardMap(corpus: LangCorpus, lang: string): Map<string, string> {
  const out = new Map<string, string>();
  const items = corpus.items.filter((i) => i.kind === "word" && i.forms[lang]).sort((a, b) => a.tier - b.tier || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const i of items) {
    const key = i.forms[lang].normalize("NFC").toLowerCase().trim();
    if (key && !out.has(key)) out.set(key, `${lang}:${i.id}`);
  }
  return out;
}

export function resolverFrom(maps: Readonly<Record<string, ReadonlyMap<string, string>>>): (lang: string, lemma: string) => string | null {
  return (lang, lemma) => maps[lang]?.get(lemma.normalize("NFC").toLowerCase()) ?? null;
}

export async function loadBundle(lang: string, base = "/input", fetcher: typeof fetch = fetch): Promise<InputBundle | null> {
  try {
    const manifest = (await (await fetcher(`${base}/manifest.json`)).json()) as { langs?: Record<string, { file?: string }> };
    const file = manifest.langs?.[lang]?.file;
    if (!file || !/^[a-z]{2,3}\.[0-9a-f]{8,64}\.json$/.test(file)) return null;
    return parseBundle(await (await fetcher(`${base}/${file}`)).json());
  } catch {
    return null;
  }
}
