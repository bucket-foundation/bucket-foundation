import type { LangCorpus } from "./lang-systems";

export const MIN_UNIT_TOKENS = 40;
export const TEXT_BAND: readonly [number, number] = [0.95, 0.98];
export const MEDIA_FLOOR = 0.9;
export const MAX_NEW = 3;
export const NEW_SHARE = 0.05;
export const UNKNOWN_BELOW = 0.5;
export const MIN_GLOSS_BUDGET = 2;
export const GLOSS_SHARE = 0.05;

export function glossBudget(tokens: number): number {
  return Math.max(MIN_GLOSS_BUDGET, GLOSS_SHARE * tokens);
}

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
  translationSource?: "human" | "machine";
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
  const eligible = n >= MIN_UNIT_TOKENS && band && k >= 1 && k <= MAX_NEW && k <= NEW_SHARE * n && glossed.length <= glossBudget(n);
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

export const BAND_RANKS: readonly number[] = [500, 1000, 2000, 4000, 8000];

export function bandsFor(knownWords: number): number[] {
  const i = BAND_RANKS.findIndex((b) => b > Math.max(0, knownWords));
  return i < 0 ? [BAND_RANKS[BAND_RANKS.length - 1]] : BAND_RANKS.slice(i, i + 2);
}

export type BandTok = readonly [number, number] | readonly [number, number, string];

export interface BandItem extends Omit<InputItem, "tokens" | "lemmas"> {
  tok: BandTok[];
}

export function expandBandItem(it: BandItem): InputItem | null {
  if (typeof it?.id !== "string" || typeof it.text !== "string" || !Array.isArray(it.tok)) return null;
  const cps = Array.from(it.text);
  const tokens: InputToken[] = [];
  for (const t of it.tok) {
    const [at, n, lemma] = t;
    if (!Number.isInteger(at) || !Number.isInteger(n) || at < 0 || n < 1 || at + n > cps.length) return null;
    const surface = cps.slice(at, at + n).join("");
    tokens.push({ surface, lemma: typeof lemma === "string" ? lemma : surface });
  }
  const { tok: _tok, ...rest } = it;
  void _tok;
  return { ...rest, tokens, lemmas: Array.from(new Set(tokens.map((t) => t.lemma))).sort() };
}

export function mergeBands(bundle: InputBundle, bands: readonly unknown[]): InputBundle {
  const items = new Map(bundle.items.map((i) => [i.id, i]));
  const unitIds = new Set(bundle.units.map((u) => u.id));
  const units = [...bundle.units];
  for (const raw of bands) {
    const b = raw as { format?: string; lang?: string; items?: BandItem[]; units?: InputUnit[] } | null;
    if (!b || b.format !== "polingual-input-band" || b.lang !== bundle.lang || !Array.isArray(b.items) || !Array.isArray(b.units)) continue;
    const fresh = new Map<string, InputItem>();
    for (const it of b.items) {
      if (items.has(it?.id)) continue;
      const x = expandBandItem(it);
      if (x) fresh.set(x.id, x);
    }
    for (const u of b.units) {
      if (!u || typeof u.id !== "string" || !Array.isArray(u.itemIds) || unitIds.has(u.id) || !u.itemIds.every((id) => items.has(id) || fresh.has(id))) continue;
      for (const id of u.itemIds) if (!items.has(id)) items.set(id, fresh.get(id)!);
      unitIds.add(u.id);
      units.push({ id: u.id, kind: u.kind, itemIds: u.itemIds, targetLemmas: Array.isArray(u.targetLemmas) ? u.targetLemmas : [], tokenCount: u.tokenCount });
    }
  }
  return { ...bundle, items: Array.from(items.values()), units };
}

const TAG = "[a-z]{2,3}(?:-[A-Za-z]{2,8})?";
const BUNDLE_FILE = new RegExp(`^${TAG}\\.[0-9a-f]{8,64}\\.json$`);
const BAND_FILE = new RegExp(`^${TAG}\\.b\\d{1,5}\\.p\\d{1,3}\\.[0-9a-f]{8,64}\\.json$`);
const LOOPBACK = /^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)(?::\d+)?(?:\/|$)/i;

export interface InputManifestLite {
  bandBase?: string | null;
  langs?: Record<string, { file?: string; graded?: { files?: Record<string, { file?: string }[]> } }>;
}

export function bandFileUrls(manifest: InputManifestLite, lang: string, bands: readonly number[], base: string | null | undefined, production: boolean): string[] {
  if (!base || !/^https?:\/\//.test(base) || (production && LOOPBACK.test(base))) return [];
  const files = manifest.langs?.[lang]?.graded?.files ?? {};
  const root = base.replace(/\/$/, "");
  return bands.flatMap((b) => (files[String(b)] ?? []).map((p) => p?.file).filter((f): f is string => typeof f === "string" && BAND_FILE.test(f)).map((f) => `${root}/${f}`));
}

export async function loadBundle(
  lang: string,
  base = "/input",
  fetcher: typeof fetch = fetch,
  bands: readonly number[] = [],
  bandBase: string | undefined = process.env.NEXT_PUBLIC_POLINGUAL_INPUT_BASE,
  production: boolean = process.env.NODE_ENV === "production",
): Promise<InputBundle | null> {
  try {
    const manifest = (await (await fetcher(`${base}/manifest.json`)).json()) as InputManifestLite;
    const file = manifest.langs?.[lang]?.file;
    if (!file || !BUNDLE_FILE.test(file)) return null;
    const bundle = parseBundle(await (await fetcher(`${base}/${file}`)).json());
    if (!bundle || !bands.length) return bundle;
    const urls = bandFileUrls(manifest, lang, bands, bandBase || manifest.bandBase, production);
    const parts = await Promise.all(urls.map((u) => fetcher(u).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    return mergeBands(bundle, parts);
  } catch {
    return null;
  }
}
