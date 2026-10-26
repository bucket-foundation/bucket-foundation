import type { EngineState } from "./engine";
import { applyPlacement, clozeFor, distractors, exerciseFor, isVocab, LANGS, sentenceDistractors, shuffle, usable, type Exercise, type LangCard, type LangCorpus, type LangItem, type LangSystem, type Rng } from "./lang-systems";

export type CefrBand = "A1" | "A2" | "B1" | "B2";
export type CefrLevel = "pre-A1" | CefrBand;
export type CefrTask = "recognize" | "recall" | "listen" | "cloze" | "grammar" | "reading";
export type CefrMapping = "proxy" | "none";

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
export const CEFR_MAX_ITEMS = BAND_ITEMS * CEFR_BANDS.length;
export const NO_CEFR_LANGS = new Set(["la", "grc", "sa"]);
export const WORD_TASKS: ReadonlySet<CefrTask> = new Set<CefrTask>(["recognize", "recall", "listen", "cloze"]);

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

export function wilsonLower(right: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = right / n;
  const z2 = z * z;
  const v = (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return Math.round(Math.max(0, v) * 100) / 100;
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

export function bandPool(system: LangSystem, corpus: LangCorpus, lang: string, band: CefrBand): LangItem[] {
  const spec = specOf(band);
  return corpus.items.filter((i) => isVocab(i) && i.tier >= spec.tierMin && i.tier <= spec.tierMax && usable(i, system.root, lang));
}

export function bandsAvailable(system: LangSystem, corpus: LangCorpus, lang: string): CefrBand[] {
  return CEFR_BANDS.filter((b) => bandPool(system, corpus, lang, b.band).length >= BAND_ITEMS).map((b) => b.band);
}

const PROBE_CARD = (reps: number): LangCard => ({ state: "review", reps, lapses: 0, stability: 3, difficulty: 5, lastReview: 0, due: 0 }) as LangCard;

function recallAccept(item: LangItem, lang: string): string[] {
  const target = item.forms[lang];
  if (LANGS[lang]?.latin ?? true) return [target];
  const r = item.readings[lang];
  return Array.from(new Set([target, r?.kana, r?.roman].filter((x): x is string => !!x && !!x.trim())));
}

function build(task: CefrTask, spec: BandSpec, system: LangSystem, corpus: LangCorpus, lang: string, seen: ReadonlySet<string>, rng: Rng): Exercise | null {
  const root = system.root;
  const pool = shuffle(bandPool(system, corpus, lang, spec.band).filter((i) => !seen.has(i.id)), rng);
  const base = (item: LangItem) => ({ itemId: item.id, lang, root, promptReading: item.readings[root], answerReading: item.readings[lang] });
  if (task === "recognize" || task === "recall") {
    const item = pool[0];
    if (!item) return null;
    const ex = { ...base(item), prompt: item.forms[root], promptLang: root, answer: item.forms[lang], answerLang: lang };
    if (task === "recall") return { ...ex, kind: "translate", accept: recallAccept(item, lang) };
    return { ...ex, kind: "choose", options: shuffle([item.forms[lang], ...distractors(corpus, item, lang, root, rng)], rng) };
  }
  if (task === "listen") {
    const item = pool[0];
    if (!item) return null;
    return { ...base(item), kind: "listen", prompt: item.forms[lang], promptLang: lang, answer: item.forms[root], answerLang: root, promptReading: item.readings[lang], answerReading: item.readings[root], options: shuffle([item.forms[root], ...distractors(corpus, item, root, lang, rng)], rng) };
  }
  if (task === "cloze") {
    const item = pool.find((i) => clozeFor(i, lang));
    if (!item) return null;
    return { ...base(item), kind: "cloze", prompt: item.forms[root], promptLang: root, answer: item.forms[lang], answerLang: lang, cloze: clozeFor(item, lang)!, options: shuffle([item.forms[lang], ...distractors(corpus, item, lang, root, rng)], rng) };
  }
  if (task === "grammar") {
    const forms = corpus.items.filter((i) => (i.kind === "gender" || i.kind === "conj") && i.tier >= spec.tierMin && i.tier <= spec.tierMax + 0.5 && usable(i, root, lang) && !seen.has(i.id));
    const wanted = spec.pastTense ? forms.filter((i) => i.kind === "conj" && i.conjPast[lang]) : forms;
    const item = shuffle(wanted.length ? wanted : forms, rng)[0];
    if (!item) return null;
    return exerciseFor(corpus, system, item, lang, PROBE_CARD(spec.pastTense ? 3 : 1), rng);
  }
  for (const item of pool) {
    const ids = (item.sentences[lang] ?? []).filter((id) => corpus.pool[id]?.t[lang] && corpus.pool[id]?.t[root] && (corpus.pool[id].lv?.[lang] ?? 1) === spec.sentenceLevel);
    if (!ids.length) continue;
    const id = ids[Math.floor(rng() * ids.length)];
    const s = corpus.pool[id];
    const text = s.t[lang];
    const others = sentenceDistractors(corpus, lang, root, id, rng);
    if (others.length < 3) continue;
    return { itemId: item.id, lang, root, kind: "sentence", level: spec.sentenceLevel, sentenceId: id, prompt: s.t[root], promptLang: root, answer: text, answerLang: lang, options: shuffle([text, ...others], rng), answerReading: s.r[lang] ? { roman: s.r[lang] } : undefined };
  }
  return null;
}

export function cefrQuestion(system: LangSystem, corpus: LangCorpus, lang: string, band: CefrBand, task: CefrTask, seen: ReadonlySet<string>, rng: Rng, opts: { speech?: boolean } = {}): { task: CefrTask; ex: Exercise } | null {
  const spec = specOf(band);
  const chain = FALLBACK[task].filter((t) => t !== "listen" || opts.speech !== false);
  for (const t of chain) {
    const ex = build(t, spec, system, corpus, lang, seen, rng);
    if (ex) return { task: t, ex };
  }
  return null;
}

export function cefrPlacement(corpus: LangCorpus, lang: string, answers: CefrAnswer[], step: CefrStep): CefrPlacement {
  const passed = step.bands.filter((b) => b.passed);
  const mapping: CefrMapping = NO_CEFR_LANGS.has(lang) ? "none" : "proxy";
  const out = { level: step.level, mapping, bands: step.bands, ...(step.unknownFrom ? { unknownFrom: step.unknownFrom } : {}) };
  if (passed.length < PLACE_MIN_BANDS) return { ...out, floorTier: 0, placeIds: [] };
  const passedBands = new Set(passed.map((b) => b.band));
  const placeIds = Array.from(
    new Set(answers.filter((a) => a.correct && WORD_TASKS.has(a.task) && passedBands.has(a.band) && corpus.byId.get(a.itemId) && isVocab(corpus.byId.get(a.itemId)!)).map((a) => a.itemId))
  );
  const floorTier = CEFR_BANDS[passed.length - 2].tierMin;
  return { ...out, floorTier, placeIds };
}

export function applyCefrPlacement(state: EngineState, system: LangSystem, corpus: LangCorpus, lang: string, placement: CefrPlacement, now: number = Date.now()): EngineState {
  return applyPlacement(state, system, corpus, lang, placement.floorTier, now, new Set(placement.placeIds));
}

export function levelLabel(placement: Pick<CefrPlacement, "level" | "mapping">): string {
  if (placement.mapping === "none") return `band ${placement.level}`;
  return placement.level === "pre-A1" ? "pre-A1" : placement.level;
}
