import type { EngineState } from "./engine";
import { applyPlacement, exerciseFor, isVocab, LANGS, normalizeAnswer, sentenceDistractors, shuffle, tokenize, usable, type Exercise, type LangCard, type LangCorpus, type LangItem, type LangSystem, type Rng } from "./lang-systems";

export type CefrBand = "A1" | "A2" | "B1" | "B2";
export type CefrLevel = "pre-A1" | CefrBand;
export type CefrTask = "recognize" | "recall" | "listen" | "cloze" | "grammar" | "reading";
export type CefrMapping = "proxy" | "none";

export interface TopWord {
  rank: number;
  word: string;
  meaning: string;
  pos?: string;
  ipa?: string | null;
  zipf?: number | null;
  band: string;
}

export interface BandSpec {
  band: CefrBand;
  tierMin: number;
  tierMax: number;
  sentenceLevel: number;
  pastTense: boolean;
  tasks: CefrTask[];
}

export const CEFR_BANDS: BandSpec[] = [
  { band: "A1", tierMin: 0, tierMax: 3, sentenceLevel: 1, pastTense: false, tasks: ["recognize", "recall", "listen", "cloze", "grammar", "recognize", "recall", "reading"] },
  { band: "A2", tierMin: 4, tierMax: 6, sentenceLevel: 1, pastTense: false, tasks: ["recall", "recognize", "cloze", "listen", "grammar", "reading", "recall", "cloze"] },
  { band: "B1", tierMin: 7, tierMax: 8, sentenceLevel: 2, pastTense: true, tasks: ["recall", "cloze", "reading", "grammar", "listen", "recall", "reading", "recall"] },
  { band: "B2", tierMin: 9, tierMax: 10, sentenceLevel: 3, pastTense: true, tasks: ["recall", "reading", "grammar", "recall", "cloze", "listen", "reading", "recall"] },
];

export const BAND_ITEMS = 8;
export const BAND_PASS = 6;
export const BAND_FAIL = 3;
export const BAND_RECALL_PASS = 1;
export const PLACE_MIN_BANDS = 2;
export const SKIP_CONFIDENCE = 0.5;
export const CEFR_MAX_ITEMS = BAND_ITEMS * CEFR_BANDS.length;
export const NO_CEFR_LANGS = new Set(["la", "grc", "sa"]);
export const WORD_TASKS: ReadonlySet<CefrTask> = new Set<CefrTask>(["recognize", "recall", "listen", "cloze"]);
export const TOP_PREFIX = "top:";

const FALLBACK: Record<CefrTask, CefrTask[]> = {
  recognize: ["recognize"],
  recall: ["recall", "recognize"],
  listen: ["listen", "recall", "recognize"],
  cloze: ["cloze", "recall", "recognize"],
  grammar: ["grammar", "recall", "recognize"],
  reading: ["reading", "cloze", "recall", "recognize"],
};

export interface CefrAnswer {
  band: CefrBand;
  task: CefrTask;
  itemId: string;
  correct: boolean;
}

export interface BandResult {
  band: CefrBand;
  asked: number;
  right: number;
  recallRight: number;
  passed: boolean;
  failed: boolean;
  confidence: number;
}

export interface CefrStep {
  done: boolean;
  level: CefrLevel;
  bands: BandResult[];
  next?: { band: CefrBand; task: CefrTask };
  unknownFrom?: CefrBand;
}

export interface CefrPlacement {
  level: CefrLevel;
  mapping: CefrMapping;
  floorTier: number;
  placeIds: string[];
  bands: BandResult[];
  unknownFrom?: CefrBand;
}

export interface PlacementSource {
  system: LangSystem;
  corpus: LangCorpus;
  lang: string;
  top?: TopWord[] | null;
}

export function wilsonLower(right: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = right / n;
  const z2 = z * z;
  const v = (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return Math.round(Math.max(0, v) * 100) / 100;
}

export function topBands(top: TopWord[]): Map<number, CefrBand> {
  const out = new Map<number, CefrBand>();
  const b1 = top.filter((w) => w.band === "B1" && (w.zipf ?? 0) > 0).map((w) => w.zipf as number).sort((a, b) => a - b);
  const median = b1.length ? b1[Math.floor(b1.length / 2)] : null;
  for (const w of top) {
    if (w.band === "A1" || w.band === "A2") out.set(w.rank, w.band);
    else if (w.band === "B1") out.set(w.rank, median !== null && (w.zipf ?? 0) > 0 && (w.zipf as number) < median ? "B2" : "B1");
  }
  return out;
}

export function shortGloss(meaning: string): string {
  return meaning.split(";")[0].replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

export function bandResult(band: CefrBand, answers: CefrAnswer[]): BandResult {
  const at = answers.filter((a) => a.band === band);
  const right = at.filter((a) => a.correct).length;
  const wrong = at.length - right;
  const recallRight = at.filter((a) => a.correct && a.task === "recall").length;
  const passed = right >= BAND_PASS && recallRight >= BAND_RECALL_PASS;
  const failed = !passed && (wrong >= BAND_FAIL || at.length >= BAND_ITEMS);
  return { band, asked: at.length, right, recallRight, passed, failed, confidence: wilsonLower(right, at.length) };
}

export function cefrStep(answers: CefrAnswer[], available: readonly CefrBand[] = CEFR_BANDS.map((b) => b.band)): CefrStep {
  const bands: BandResult[] = [];
  let level: CefrLevel = "pre-A1";
  for (const spec of CEFR_BANDS) {
    if (!available.includes(spec.band)) return { done: true, level, bands, unknownFrom: spec.band };
    const r = bandResult(spec.band, answers);
    bands.push(r);
    if (r.passed) {
      level = spec.band;
      continue;
    }
    if (r.failed) return { done: true, level, bands };
    return { done: false, level, bands, next: { band: spec.band, task: spec.tasks[r.asked] } };
  }
  return { done: true, level, bands };
}

function specOf(band: CefrBand): BandSpec {
  return CEFR_BANDS.find((b) => b.band === band)!;
}

function usesTop(src: PlacementSource): src is PlacementSource & { top: TopWord[] } {
  return !!src.top?.length && src.system.root === "en";
}

export function topPool(top: TopWord[], band: CefrBand): TopWord[] {
  const bands = topBands(top);
  return top.filter((w) => bands.get(w.rank) === band && w.word && shortGloss(w.meaning));
}

export function corpusPool(system: LangSystem, corpus: LangCorpus, lang: string, band: CefrBand): LangItem[] {
  const spec = specOf(band);
  return corpus.items.filter((i) => isVocab(i) && i.tier >= spec.tierMin && i.tier <= spec.tierMax && usable(i, system.root, lang));
}

export function bandsAvailable(src: PlacementSource): CefrBand[] {
  return CEFR_BANDS.filter((b) => (usesTop(src) ? topPool(src.top, b.band).length : corpusPool(src.system, src.corpus, src.lang, b.band).length) >= BAND_ITEMS).map((b) => b.band);
}

const PROBE_CARD = (reps: number): LangCard => ({ state: "review", reps, lapses: 0, stability: 3, difficulty: 5, lastReview: 0, due: 0 }) as LangCard;

interface Probe {
  id: string;
  target: string;
  gloss: string;
  reading?: { roman?: string; kana?: string; ipa?: string };
}

function probes(src: PlacementSource, band: CefrBand): Probe[] {
  const { system, corpus, lang } = src;
  if (usesTop(src)) return topPool(src.top, band).map((w) => ({ id: `${TOP_PREFIX}${w.rank}`, target: w.word, gloss: shortGloss(w.meaning), reading: w.ipa ? { ipa: w.ipa.replace(/^\/|\/$/g, "") } : undefined }));
  return corpusPool(system, corpus, lang, band).map((i) => ({ id: i.id, target: i.forms[lang], gloss: i.forms[system.root], reading: i.readings[lang] }));
}

function others(all: Probe[], p: Probe, key: "target" | "gloss", rng: Rng, n = 3): string[] {
  const out: string[] = [];
  for (const q of shuffle(all, rng)) {
    if (out.length >= n) break;
    if (q.id === p.id || q.target === p.target || q.gloss === p.gloss || out.includes(q[key])) continue;
    out.push(q[key]);
  }
  return out;
}

function sentencesWith(corpus: LangCorpus, lang: string, root: string, word: string, level?: number): string[] {
  const w = normalizeAnswer(word, lang);
  return Object.keys(corpus.pool).filter((id) => {
    const s = corpus.pool[id];
    if (!s.t[lang] || !s.t[root] || (level !== undefined && (s.lv?.[lang] ?? 1) !== level)) return false;
    return tokenize(s.t[lang], lang, s.jaTokens).some((t) => normalizeAnswer(t, lang) === w);
  });
}

function build(task: CefrTask, spec: BandSpec, src: PlacementSource, seen: ReadonlySet<string>, rng: Rng): Exercise | null {
  const { system, corpus, lang } = src;
  const root = system.root;
  const all = probes(src, spec.band);
  const pool = shuffle(all.filter((p) => !seen.has(p.id)), rng);
  const base = (p: Probe) => ({ itemId: p.id, lang, root });
  if (task === "recognize" || task === "recall") {
    const p = pool[0];
    if (!p) return null;
    const ex = { ...base(p), prompt: p.gloss, promptLang: root, answer: p.target, answerLang: lang, answerReading: p.reading };
    if (task === "recognize") return { ...ex, kind: "choose", options: shuffle([p.target, ...others(all, p, "target", rng)], rng) };
    const latin = LANGS[lang]?.latin ?? true;
    const accept = latin ? [p.target] : Array.from(new Set([p.target, p.reading?.kana, p.reading?.roman].filter((x): x is string => !!x && !!x.trim())));
    return { ...ex, kind: "translate", accept };
  }
  if (task === "listen") {
    const p = pool[0];
    if (!p) return null;
    return { ...base(p), kind: "listen", prompt: p.target, promptLang: lang, answer: p.gloss, answerLang: root, promptReading: p.reading, options: shuffle([p.gloss, ...others(all, p, "gloss", rng)], rng) };
  }
  if (task === "cloze") {
    for (const p of pool.slice(0, 40)) {
      const ids = sentencesWith(corpus, lang, root, p.target);
      if (!ids.length) continue;
      const s = corpus.pool[ids[Math.floor(rng() * ids.length)]];
      const text = s.t[lang];
      const at = text.toLowerCase().indexOf(p.target.toLowerCase());
      if (at < 0) continue;
      return { ...base(p), kind: "cloze", prompt: s.t[root], promptLang: root, answer: p.target, answerLang: lang, cloze: { before: text.slice(0, at), after: text.slice(at + p.target.length) }, options: shuffle([p.target, ...others(all, p, "target", rng)], rng) };
    }
    return null;
  }
  if (task === "grammar") {
    const forms = corpus.items.filter((i) => (i.kind === "gender" || i.kind === "conj") && i.tier >= spec.tierMin && i.tier <= spec.tierMax + 0.5 && usable(i, root, lang) && !seen.has(i.id));
    const wanted = spec.pastTense ? forms.filter((i) => i.kind === "conj" && i.conjPast[lang]) : forms;
    const item = shuffle(wanted.length ? wanted : forms, rng)[0];
    if (!item) return null;
    return exerciseFor(corpus, system, item, lang, PROBE_CARD(spec.pastTense ? 3 : 1), rng);
  }
  for (const p of pool.slice(0, 40)) {
    const ids = sentencesWith(corpus, lang, root, p.target, spec.sentenceLevel);
    if (!ids.length) continue;
    const id = ids[Math.floor(rng() * ids.length)];
    const s = corpus.pool[id];
    const wrong = sentenceDistractors(corpus, lang, root, id, rng);
    if (wrong.length < 3) continue;
    return { ...base(p), kind: "sentence", level: spec.sentenceLevel, sentenceId: id, prompt: s.t[root], promptLang: root, answer: s.t[lang], answerLang: lang, options: shuffle([s.t[lang], ...wrong], rng), answerReading: s.r[lang] ? { roman: s.r[lang] } : undefined };
  }
  return null;
}

export function cefrQuestion(src: PlacementSource, band: CefrBand, task: CefrTask, seen: ReadonlySet<string>, rng: Rng, opts: { speech?: boolean } = {}): { task: CefrTask; ex: Exercise } | null {
  const spec = specOf(band);
  for (const t of FALLBACK[task].filter((x) => x !== "listen" || opts.speech !== false)) {
    const ex = build(t, spec, src, seen, rng);
    if (ex) return { task: t, ex };
  }
  return null;
}

export function bareForm(form: string, lang: string): string {
  return normalizeAnswer(form.replace(/^(el|la|los|las|le|les|il|lo|gli|o|a|os|as|der|die|das|de|het|en|ett|un|une|una|uno) /i, "").replace(/^l'/i, ""), lang);
}

export function checkedCorpusIds(src: PlacementSource, answers: CefrAnswer[], bands: ReadonlySet<CefrBand>): string[] {
  const { system, corpus, lang } = src;
  const right = answers.filter((a) => a.correct && WORD_TASKS.has(a.task) && bands.has(a.band));
  const words = new Set<string>();
  const ids = new Set<string>();
  for (const a of right) {
    if (a.itemId.startsWith(TOP_PREFIX)) {
      const w = src.top?.find((x) => `${TOP_PREFIX}${x.rank}` === a.itemId);
      if (w) words.add(bareForm(w.word, lang));
    } else if (corpus.byId.get(a.itemId) && isVocab(corpus.byId.get(a.itemId)!)) ids.add(a.itemId);
  }
  if (words.size) for (const i of corpus.items) if (isVocab(i) && usable(i, system.root, lang) && words.has(bareForm(i.forms[lang], lang))) ids.add(i.id);
  return Array.from(ids);
}

export function corpusTopBands(src: PlacementSource): Map<string, CefrBand> {
  const out = new Map<string, CefrBand>();
  if (!usesTop(src)) return out;
  const bands = topBands(src.top);
  const byWord = new Map<string, CefrBand>();
  for (const w of src.top) {
    const b = bands.get(w.rank);
    const k = bareForm(w.word, src.lang);
    if (b && !byWord.has(k)) byWord.set(k, b);
  }
  for (const i of src.corpus.items) {
    if (!isVocab(i) || !usable(i, src.system.root, src.lang)) continue;
    const b = byWord.get(bareForm(i.forms[src.lang], src.lang));
    if (b) out.set(i.id, b);
  }
  return out;
}

export function trustedBands(bands: BandResult[]): Set<CefrBand> {
  const out = new Set<CefrBand>();
  bands.forEach((b, k) => {
    if (b.passed && b.confidence >= SKIP_CONFIDENCE) for (const s of CEFR_BANDS.slice(0, k + 1)) out.add(s.band);
  });
  return out;
}

export function skipFloor(bands: BandResult[]): number {
  let floor = 0;
  for (let k = 0; k + 2 < CEFR_BANDS.length; k++) {
    const above = [bands[k + 1], bands[k + 2]];
    if (above.every((b) => b?.passed && b.confidence >= SKIP_CONFIDENCE)) floor = CEFR_BANDS[k + 1].tierMin;
    else break;
  }
  return floor;
}

export function cefrPlacement(src: PlacementSource, answers: CefrAnswer[], step: CefrStep): CefrPlacement {
  const passed = step.bands.filter((b) => b.passed);
  const mapping: CefrMapping = NO_CEFR_LANGS.has(src.lang) ? "none" : "proxy";
  const out = { level: step.level, mapping, bands: step.bands, ...(step.unknownFrom ? { unknownFrom: step.unknownFrom } : {}) };
  if (passed.length < PLACE_MIN_BANDS) return { ...out, floorTier: 0, placeIds: [] };
  const trusted = trustedBands(step.bands);
  const ids = new Set(checkedCorpusIds(src, answers, new Set(passed.map((b) => b.band))));
  corpusTopBands(src).forEach((band, id) => {
    if (trusted.has(band)) ids.add(id);
  });
  return { ...out, floorTier: skipFloor(step.bands), placeIds: Array.from(ids) };
}

export function applyCefrPlacement(state: EngineState, system: LangSystem, corpus: LangCorpus, lang: string, placement: CefrPlacement, now: number = Date.now()): EngineState {
  return applyPlacement(state, system, corpus, lang, placement.floorTier, now, new Set(placement.placeIds));
}

export function levelLabel(placement: Pick<CefrPlacement, "level" | "mapping">): string {
  if (placement.mapping === "none") return `band ${placement.level}`;
  return placement.level;
}
