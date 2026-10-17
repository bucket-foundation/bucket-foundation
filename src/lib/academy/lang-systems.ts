import { DAY_MS, FSRS, type Card, type Rating } from "./fsrs";
import { dayKey, grade, makeFsrs, normalizeState, type EngineState } from "./engine";

export interface LangInfo {
  name: string;
  bcp47: string;
  latin: boolean;
}

export const LANGS: Record<string, LangInfo> = {
  en: { name: "English", bcp47: "en-US", latin: true },
  es: { name: "Spanish", bcp47: "es-ES", latin: true },
  fr: { name: "French", bcp47: "fr-FR", latin: true },
  it: { name: "Italian", bcp47: "it-IT", latin: true },
  pt: { name: "Portuguese", bcp47: "pt-PT", latin: true },
  de: { name: "German", bcp47: "de-DE", latin: true },
  nl: { name: "Dutch", bcp47: "nl-NL", latin: true },
  sv: { name: "Swedish", bcp47: "sv-SE", latin: true },
  pl: { name: "Polish", bcp47: "pl-PL", latin: true },
  fi: { name: "Finnish", bcp47: "fi-FI", latin: true },
  ru: { name: "Russian", bcp47: "ru-RU", latin: false },
  el: { name: "Greek", bcp47: "el-GR", latin: false },
  ar: { name: "Arabic", bcp47: "ar-SA", latin: false },
  hi: { name: "Hindi", bcp47: "hi-IN", latin: false },
  ja: { name: "Japanese", bcp47: "ja-JP", latin: false },
  zh: { name: "Mandarin", bcp47: "zh-CN", latin: false },
  ko: { name: "Korean", bcp47: "ko-KR", latin: false },
};

export const LANG_CODES = Object.keys(LANGS);
export const MAX_TARGETS = 6;
export const NEW_PER_LANG_PER_DAY = 5;
export const PLACEMENT_TIERS = [0, 2, 4, 6, 8, 10];
export const PLACEMENT_MAX_ITEMS = 12;
export const UNIT_UNLOCK_SHARE = 0.8;

export const PRESETS: { name: string; targets: string[] }[] = [
  { name: "Romance", targets: ["fr", "es", "it"] },
  { name: "East Asian", targets: ["zh", "ja"] },
  { name: "Germanic", targets: ["de", "nl", "sv"] },
  { name: "Iberian", targets: ["es", "pt"] },
];

export interface LangSystem {
  id: string;
  name: string;
  root: string;
  targets: string[];
  createdAt: number;
  placement: Record<string, number>;
}

export interface Reading {
  roman?: string;
  kana?: string;
  ipa?: string;
}

export type ItemKind = "word" | "phrase" | "gender" | "conj";

export interface FalseFriend {
  lang: string;
  word: string;
  means: string;
  looksLike: string;
  itemId?: string;
  crossWith?: { lang: string; word: string; means: string };
}

export interface LangItem {
  id: string;
  kind: ItemKind;
  baseId: string;
  tier: number;
  unit: number;
  category: string;
  gloss: string;
  forms: Record<string, string>;
  readings: Record<string, Reading>;
  root: string | null;
  cognateLangs: string[];
  note?: string;
  example: Record<string, string>;
  sentences: Record<string, string[]>;
  gender: Record<string, string>;
  conj: Record<string, string[]>;
  falseFriends: Record<string, FalseFriend>;
}

export interface PoolSentence {
  t: Record<string, string>;
  r: Record<string, string>;
  jaTokens?: string[];
}

export interface LangUnit {
  index: number;
  id: string;
  title: string;
  grammar: ("gender" | "conj")[];
}

export interface LangCorpus {
  items: LangItem[];
  byId: Map<string, LangItem>;
  attribution: string;
  sources: string[];
  pool: Record<string, PoolSentence>;
  persons: Record<string, string[]>;
  falseFriends: FalseFriend[];
  units: LangUnit[];
}

export interface LangCard extends Card {
  introduced?: string;
  placed?: boolean;
}

interface RawCoreAtom {
  id: string;
  gloss?: string;
  category?: string;
  tier?: number;
  forms?: Record<string, { word?: string; ipa?: string }>;
  note?: string;
  example?: Record<string, string>;
}
interface RawConcept {
  root?: string | null;
  cognateLangs?: string[];
}
interface RawPhrase {
  id: string;
  en?: string;
  category?: string;
  forms?: Record<string, string>;
}
export interface RawLayers {
  meta?: { attribution?: string[] };
  forms?: Record<string, Record<string, string>>;
  readings?: Record<string, Record<string, Reading>>;
  sentences?: { byItem?: Record<string, Record<string, string[]>>; pool?: Record<string, PoolSentence> };
  gender?: Record<string, Record<string, string>>;
  conjugation?: Record<string, Record<string, { infinitive: string; present: string[] }>>;
  persons?: Record<string, string[]>;
  falseFriends?: FalseFriend[];
}

export const UNITS: { id: string; title: string; categories: string[]; grammar: ("gender" | "conj")[]; verbTierMax?: number; verbTierMin?: number }[] = [
  { id: "numbers", title: "Numbers", categories: ["number"], grammar: [] },
  { id: "greetings", title: "Greetings", categories: ["ph:greeting", "ph:courtesy"], grammar: [] },
  { id: "people", title: "People and family", categories: ["family", "ph:intro"], grammar: ["gender"] },
  { id: "colors", title: "Colors", categories: ["color"], grammar: [] },
  { id: "food", title: "Food and drink", categories: ["food", "ph:dining"], grammar: ["gender"] },
  { id: "verbs-1", title: "Core verbs 1", categories: ["verb"], verbTierMax: 6, grammar: ["conj"] },
  { id: "animals", title: "Animals", categories: ["animal"], grammar: ["gender"] },
  { id: "body", title: "The body", categories: ["body"], grammar: ["gender"] },
  { id: "describe", title: "Describing things", categories: ["adjective", "ph:basics"], grammar: [] },
  { id: "home", title: "Home and objects", categories: ["object", "ph:shopping"], grammar: ["gender"] },
  { id: "time", title: "Time", categories: ["time", "ph:time"], grammar: ["gender"] },
  { id: "nature", title: "Nature", categories: ["nature"], grammar: ["gender"] },
  { id: "verbs-2", title: "Core verbs 2", categories: ["verb"], verbTierMin: 7, grammar: ["conj"] },
  { id: "travel", title: "Getting around", categories: ["ph:survival", "ph:direction", "ph:smalltalk"], grammar: [] },
];

export const ARTICLES: Record<string, Record<string, string>> = {
  es: { m: "el", f: "la" },
  fr: { m: "le", f: "la" },
  it: { m: "il", f: "la" },
  pt: { m: "o", f: "a" },
  de: { m: "der", f: "die", n: "das" },
  nl: { de: "de", het: "het" },
};

const PHRASE_TIER: Record<string, number> = { greeting: 1, courtesy: 1, intro: 3, basics: 4, smalltalk: 5, survival: 6, dining: 7, shopping: 7, direction: 8, time: 8 };

function unitFor(category: string, kind: "word" | "phrase", tier: number): number {
  const key = kind === "phrase" ? `ph:${category}` : category;
  const i = UNITS.findIndex((u) => u.categories.includes(key) && (u.verbTierMax === undefined || tier <= u.verbTierMax) && (u.verbTierMin === undefined || tier >= u.verbTierMin));
  return i < 0 ? UNITS.length - 1 : i;
}

function articleFor(lang: string, gender: string, noun: string): string | null {
  const a = ARTICLES[lang]?.[gender];
  if (!a) return null;
  if ((lang === "fr" || lang === "it") && /^[aeiouhàâéèêîôûœAEIOUH]/.test(noun)) return `l'${noun}`;
  return `${a} ${noun}`;
}

export function buildLangCorpus(
  core: { atoms?: RawCoreAtom[] } | null,
  cognates: { concepts?: Record<string, RawConcept>; meta?: { attribution?: string } } | null,
  phrases: { phrases?: RawPhrase[] } | null,
  layers: RawLayers | null = null
): LangCorpus {
  const concepts = cognates?.concepts ?? {};
  const fix = layers?.forms ?? {};
  const ffs = layers?.falseFriends ?? [];
  const items: LangItem[] = [];
  const blank = (): Pick<LangItem, "sentences" | "gender" | "conj" | "falseFriends"> => ({ sentences: {}, gender: {}, conj: {}, falseFriends: {} });

  for (const a of core?.atoms ?? []) {
    const c = concepts[a.id];
    const forms: Record<string, string> = {};
    for (const [l, f] of Object.entries(a.forms ?? {})) if (f?.word) forms[l] = f.word;
    for (const [l, m] of Object.entries(fix)) if (m[a.id]) forms[l] = m[a.id];
    const cognateLangs = (c?.cognateLangs ?? []).filter((l) => forms[l]);
    const tier = a.tier ?? 0;
    const category = a.category ?? "word";
    const item: LangItem = {
      id: a.id,
      kind: "word",
      baseId: a.id,
      tier,
      unit: unitFor(category, "word", tier),
      category,
      gloss: a.gloss ?? a.id,
      forms,
      readings: { ...(layers?.readings?.[a.id] ?? {}) },
      root: c?.root && cognateLangs.length >= 2 ? c.root : null,
      cognateLangs: cognateLangs.length >= 2 ? cognateLangs : [],
      note: a.note,
      example: { ...(a.example ?? {}) },
      ...blank(),
    };
    item.sentences = { ...(layers?.sentences?.byItem?.[a.id] ?? {}) };
    for (const [l, g] of Object.entries(layers?.gender ?? {})) if (g[a.id]) item.gender[l] = g[a.id];
    for (const [l, t] of Object.entries(layers?.conjugation?.[a.id] ?? {})) item.conj[l] = t.present;
    for (const f of ffs) if (f.itemId === a.id && forms[f.lang] && forms[f.lang].toLowerCase() === f.word.toLowerCase()) item.falseFriends[f.lang] = f;
    items.push(item);

    const genderForms: Record<string, string> = {};
    for (const [l, g] of Object.entries(item.gender)) {
      const w = articleFor(l, g, forms[l] ?? "");
      if (w && forms[l]) genderForms[l] = w;
    }
    if (Object.keys(genderForms).length) {
      items.push({ ...item, id: `g-${a.id}`, kind: "gender", forms: { ...forms, ...genderForms }, readings: {}, sentences: {}, falseFriends: {}, tier: tier + 0.5 });
    }
    if (Object.keys(item.conj).length) {
      const conjForms: Record<string, string> = { ...forms };
      for (const [l, t] of Object.entries(layers?.conjugation?.[a.id] ?? {})) conjForms[l] = t.infinitive;
      items.push({ ...item, id: `c-${a.id}`, kind: "conj", forms: conjForms, readings: {}, sentences: {}, falseFriends: {}, tier: tier + 0.5 });
    }
  }
  for (const p of phrases?.phrases ?? []) {
    const id = `ph-${p.id}`;
    const tier = PHRASE_TIER[p.category ?? ""] ?? 5;
    items.push({
      id,
      kind: "phrase",
      baseId: id,
      tier,
      unit: unitFor(p.category ?? "", "phrase", tier),
      category: p.category ?? "phrase",
      gloss: p.en ?? p.forms?.en ?? p.id,
      forms: { ...(p.forms ?? {}) },
      readings: { ...(layers?.readings?.[id] ?? {}) },
      root: null,
      cognateLangs: [],
      example: {},
      ...blank(),
    });
  }
  const kindOrder: Record<ItemKind, number> = { word: 0, phrase: 1, gender: 2, conj: 2 };
  items.sort((x, y) => x.unit - y.unit || x.tier - y.tier || kindOrder[x.kind] - kindOrder[y.kind]);
  return {
    items,
    byId: new Map(items.map((i) => [i.id, i])),
    attribution: cognates?.meta?.attribution ?? "Language data from Wiktionary contributors via Kaikki (kaikki.org), CC-BY-SA 3.0.",
    sources: layers?.meta?.attribution ?? [],
    pool: layers?.sentences?.pool ?? {},
    persons: layers?.persons ?? {},
    falseFriends: ffs,
    units: UNITS.map((u, index) => ({ index, id: u.id, title: u.title, grammar: u.grammar })),
  };
}

export function langName(code: string): string {
  return LANGS[code]?.name ?? code;
}

export function systemName(root: string, targets: string[]): string {
  const preset = PRESETS.find((p) => p.targets.length === targets.length && p.targets.every((t) => targets.includes(t)));
  if (preset) return `${preset.name} from ${langName(root)}`;
  return `${targets.map(langName).join(" + ")} from ${langName(root)}`;
}

export type SystemError = "no-targets" | "too-many" | "unknown-language" | "root-in-targets" | "duplicate";

export function validateSystem(root: string, targets: string[], existing: LangSystem[] = []): SystemError | null {
  const t = Array.from(new Set(targets));
  if (t.length === 0) return "no-targets";
  if (t.length > MAX_TARGETS) return "too-many";
  if (!LANGS[root] || t.some((x) => !LANGS[x])) return "unknown-language";
  if (t.includes(root)) return "root-in-targets";
  const key = [...t].sort().join(",");
  if (existing.some((s) => s.root === root && [...s.targets].sort().join(",") === key)) return "duplicate";
  return null;
}

export function createSystem(root: string, targets: string[], existing: LangSystem[] = [], now: number = Date.now()): LangSystem {
  const err = validateSystem(root, targets, existing);
  if (err) throw new Error(err);
  const t = Array.from(new Set(targets));
  let id = `${root}-${t.join("-")}`;
  let n = 2;
  while (existing.some((s) => s.id === id)) id = `${root}-${t.join("-")}-${n++}`;
  return { id, name: systemName(root, t), root, targets: t, createdAt: now, placement: {} };
}

export function progressBranch(system: LangSystem): string {
  return `lang-sys-${system.id}`.slice(0, 64);
}

export function cardId(lang: string, itemId: string): string {
  return `${lang}:${itemId}`;
}

export function parseCardId(id: string): { lang: string; itemId: string } {
  const i = id.indexOf(":");
  return i < 0 ? { lang: "", itemId: id } : { lang: id.slice(0, i), itemId: id.slice(i + 1) };
}

export function usable(item: LangItem, root: string, lang: string): boolean {
  if (!item.forms[root] || !item.forms[lang]) return false;
  if (item.kind === "gender") return !!item.gender[lang];
  if (item.kind === "conj") return !!item.conj[lang];
  return true;
}

export const isVocab = (item: LangItem) => item.kind === "word" || item.kind === "phrase";

export function sharedRootLangs(item: LangItem, system: LangSystem): string[] {
  if (!item.root) return [];
  const pool = new Set([system.root, ...system.targets]);
  return item.cognateLangs.filter((l) => pool.has(l));
}

const ARABIC_VOWELS = /[ً-ْٰـ]/g;

export function normalizeAnswer(s: string, lang = ""): string {
  let t = s.trim().toLowerCase();
  if (lang === "ar") t = t.replace(ARABIC_VOWELS, "");
  else t = t.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
  return t
    .replace(/[¿¡!?.,;:"'«»()。、！？؟،]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

export type Verdict = "exact" | "close" | "wrong";

export function judgeTyped(given: string, expected: string | string[], lang = ""): Verdict {
  const exps = Array.isArray(expected) ? expected : [expected];
  const raw = given.trim().toLowerCase().replace(/[.!?。？！]+$/, "");
  if (!raw) return "wrong";
  let best: Verdict = "wrong";
  for (const exp of exps) {
    const e0 = exp.trim().toLowerCase().replace(/[.!?。？！]+$/, "");
    if (raw === e0) return "exact";
    if (lang === "ar" && raw.replace(ARABIC_VOWELS, "") === e0.replace(ARABIC_VOWELS, "")) return "exact";
    const g = normalizeAnswer(given, lang);
    const e = normalizeAnswer(exp, lang);
    if (g === e || (e.length >= 5 && editDistance(g, e) <= 1)) best = "close";
  }
  return best;
}

export function verdictRating(v: Verdict, hesitated = false): Rating {
  if (v === "wrong") return 1;
  if (v === "close") return 2;
  return hesitated ? 2 : 3;
}

export type ExerciseKind =
  | "intro"
  | "choose"
  | "reverse"
  | "listen"
  | "translate"
  | "type-heard"
  | "speak"
  | "cloze"
  | "cognate"
  | "match"
  | "sentence"
  | "wordbank"
  | "gender"
  | "conjugate"
  | "false-friend";

export interface Exercise {
  kind: ExerciseKind;
  itemId: string;
  lang: string;
  root: string;
  prompt: string;
  promptLang: string;
  answer: string;
  answerLang: string;
  accept?: string[];
  options?: string[];
  pairs?: { lang: string; word: string; reading?: Reading }[];
  cloze?: { before: string; after: string };
  family?: { lang: string; word: string }[];
  note?: string;
  promptReading?: Reading;
  answerReading?: Reading;
  tokens?: string[];
  sentenceId?: string;
  person?: string;
  falseFriend?: FalseFriend;
}

export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function distractors(corpus: LangCorpus, item: LangItem, optionLang: string, otherLang: string, rng: Rng, n = 3): string[] {
  const right = item.forms[optionLang];
  const other = item.forms[otherLang];
  const kind = item.kind === "phrase" ? "phrase" : "word";
  const same = corpus.items.filter(
    (x) =>
      x.baseId !== item.baseId &&
      x.kind === kind &&
      x.forms[optionLang] &&
      x.forms[otherLang] &&
      normalizeAnswer(x.forms[optionLang], optionLang) !== normalizeAnswer(right, optionLang) &&
      normalizeAnswer(x.forms[otherLang], otherLang) !== normalizeAnswer(other ?? "", otherLang)
  );
  const close = same.filter((x) => x.category === item.category);
  const pool = shuffle(close.length >= n ? close : same, rng);
  const out: string[] = [];
  for (const x of pool) {
    const w = x.forms[optionLang];
    if (!out.some((o) => normalizeAnswer(o, optionLang) === normalizeAnswer(w, optionLang))) out.push(w);
    if (out.length >= n) break;
  }
  return out;
}

function clozeFor(item: LangItem, lang: string): { before: string; after: string } | null {
  const word = item.forms[lang];
  const sentence = item.example[lang];
  if (item.kind === "word" && sentence) {
    const idx = sentence.toLowerCase().indexOf(word.toLowerCase());
    if (idx >= 0) return { before: sentence.slice(0, idx), after: sentence.slice(idx + word.length) };
  }
  return null;
}

export function tokenize(text: string, lang: string, jaTokens?: string[]): string[] {
  if (lang === "ja" && jaTokens?.length) return jaTokens.filter((t) => !/^[\s。、！？]$/.test(t));
  if (lang === "zh" || lang === "ja") return Array.from(text).filter((c) => !/[\s。，、！？.,!?]/.test(c));
  return text.split(/\s+/).filter(Boolean);
}

export function joinTokens(tokens: string[], lang: string): string {
  return lang === "zh" || lang === "ja" ? tokens.join("") : tokens.join(" ");
}

export function sentenceFor(corpus: LangCorpus, item: LangItem, lang: string, root: string, rng: Rng): { id: string; s: PoolSentence } | null {
  const ids = (item.sentences[lang] ?? []).filter((id) => corpus.pool[id]?.t[lang] && corpus.pool[id]?.t[root]);
  if (!ids.length) return null;
  const id = ids[Math.floor(rng() * ids.length)];
  return { id, s: corpus.pool[id] };
}

function sentenceDistractors(corpus: LangCorpus, lang: string, root: string, avoid: string, rng: Rng, n = 3): string[] {
  const ids = shuffle(Object.keys(corpus.pool).filter((id) => id !== avoid && corpus.pool[id].t[lang] && corpus.pool[id].t[root] !== corpus.pool[avoid]?.t[root]), rng);
  const out: string[] = [];
  for (const id of ids) {
    const t = corpus.pool[id].t[lang];
    if (!out.includes(t) && t !== corpus.pool[avoid]?.t[lang]) out.push(t);
    if (out.length >= n) break;
  }
  return out;
}

export function readingOf(item: LangItem, lang: string): Reading | undefined {
  return item.readings[lang];
}

export function relevantNote(note: string | undefined, system: LangSystem): string | undefined {
  if (!note) return undefined;
  const names = system.targets.map((l) => LANGS[l]?.name).filter(Boolean) as string[];
  if (system.targets.includes("zh")) names.push("Chinese");
  return names.some((n) => note.includes(n)) ? note : undefined;
}

export function exerciseFor(
  corpus: LangCorpus,
  system: LangSystem,
  item: LangItem,
  lang: string,
  card: LangCard | undefined,
  rng: Rng,
  opts: { speech?: boolean; afterIntro?: boolean } = {}
): Exercise {
  const root = system.root;
  const target = item.forms[lang];
  const rootWord = item.forms[root];
  const tr = readingOf(item, lang);
  const rr = readingOf(item, root);
  const base = { itemId: item.id, lang, root, note: relevantNote(item.note, system) };
  const reps = card?.reps ?? 0;
  const latin = LANGS[lang]?.latin ?? true;
  const family = sharedRootLangs(item, system).filter((l) => l !== lang).map((l) => ({ lang: l, word: item.forms[l] }));
  const ff = item.falseFriends[lang];

  if (item.kind === "gender") return genderExercise(item, lang, root, rng);
  if (item.kind === "conj") return conjExercise(corpus, item, lang, root, reps, rng);

  if (!card && !opts.afterIntro) {
    return { ...base, kind: "intro", prompt: rootWord, promptLang: root, answer: target, answerLang: lang, family, answerReading: tr, promptReading: rr, falseFriend: ff };
  }
  const choices = (right: string, l: string, other: string) => shuffle([right, ...distractors(corpus, item, l, other, rng)], rng);
  const toTarget = (kind: ExerciseKind, extra: Partial<Exercise> = {}): Exercise => ({ ...base, kind, prompt: rootWord, promptLang: root, answer: target, answerLang: lang, promptReading: rr, answerReading: tr, ...extra });
  const toRoot = (kind: ExerciseKind): Exercise => ({ ...base, kind, prompt: target, promptLang: lang, answer: rootWord, answerLang: root, promptReading: tr, answerReading: rr, options: choices(rootWord, root, lang) });
  const lapsed = !!card && (card.lapses ?? 0) > 0 && card.state === "relearning";
  const roll = rng();

  if (ff && reps >= 1 && roll < 0.35) {
    const options = shuffle([rootWord, ff.looksLike, ...distractors(corpus, item, root, lang, rng, 2)].filter((x, i, a) => a.indexOf(x) === i), rng);
    return { ...base, kind: "false-friend", prompt: target, promptLang: lang, answer: rootWord, answerLang: root, options, promptReading: tr, falseFriend: ff };
  }
  if (reps <= 1 || lapsed) {
    if (family.length > 0 && sharedRootLangs(item, system).includes(lang)) return toTarget("cognate", { options: choices(target, lang, root), family });
    return toTarget("choose", { options: choices(target, lang, root) });
  }
  if (reps === 2) return roll < 0.5 ? toRoot("listen") : toRoot("reverse");

  const sent = item.kind === "word" ? sentenceFor(corpus, item, lang, root, rng) : null;
  if (sent && roll < 0.45) {
    const text = sent.s.t[lang];
    const common = { ...base, prompt: sent.s.t[root], promptLang: root, answer: text, answerLang: lang, sentenceId: sent.id, answerReading: sent.s.r[lang] ? { roman: sent.s.r[lang] } : undefined, promptReading: sent.s.r[root] ? { roman: sent.s.r[root] } : undefined };
    const toks = tokenize(text, lang, sent.s.jaTokens);
    if (roll < 0.25 && toks.length >= 3 && toks.length <= 12) {
      const other = sentenceDistractors(corpus, lang, root, sent.id, rng, 1)[0];
      const extra = other ? shuffle(tokenize(other, lang, corpus.pool[Object.keys(corpus.pool).find((k) => corpus.pool[k].t[lang] === other) ?? ""]?.jaTokens), rng).filter((t) => !toks.includes(t)).slice(0, 2) : [];
      return { ...common, kind: "wordbank", tokens: shuffle([...toks, ...extra], rng), accept: [joinTokens(toks, lang)] };
    }
    return { ...common, kind: "sentence", options: shuffle([text, ...sentenceDistractors(corpus, lang, root, sent.id, rng)], rng) };
  }
  const cloze = clozeFor(item, lang);
  if (cloze && roll < 0.6) return toTarget("cloze", { options: choices(target, lang, root), cloze });
  if (!latin) return roll < 0.8 ? toRoot("listen") : toTarget("choose", { options: choices(target, lang, root) });
  if (opts.speech && roll < 0.7) return toTarget("speak");
  if (roll < 0.85) return toTarget("translate");
  return { ...base, kind: "type-heard", prompt: target, promptLang: lang, answer: target, answerLang: lang, answerReading: tr };
}

function genderExercise(item: LangItem, lang: string, root: string, rng: Rng): Exercise {
  const noun = item.forms[lang].replace(/^(el|la|le|il|o|a|der|die|das|de|het) /, "").replace(/^l'/, "");
  const g = item.gender[lang];
  const table = ARTICLES[lang];
  const answer = table[g];
  const options = shuffle(Array.from(new Set(Object.values(table))), rng);
  const elided = item.forms[lang].startsWith("l'");
  return {
    kind: "gender",
    itemId: item.id,
    lang,
    root,
    prompt: noun,
    promptLang: lang,
    answer,
    answerLang: lang,
    options,
    note: elided ? `Before a vowel the article shortens to l': ${item.forms[lang]}.` : `${item.forms[lang]}`,
    cloze: { before: "", after: ` ${noun}` },
    promptReading: { roman: item.forms[root] },
  };
}

function conjExercise(corpus: LangCorpus, item: LangItem, lang: string, root: string, reps: number, rng: Rng): Exercise {
  const table = item.conj[lang];
  const persons = corpus.persons[lang] ?? ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"];
  const p = Math.floor(rng() * 6);
  const answer = table[p];
  const accept = [answer];
  const ex: Exercise = {
    kind: "conjugate",
    itemId: item.id,
    lang,
    root,
    prompt: item.forms[lang],
    promptLang: lang,
    answer,
    answerLang: lang,
    accept,
    person: persons[p],
    note: persons.map((pr, i) => `${pr} ${table[i]}`).join(", "),
    promptReading: { roman: item.forms[root] },
  };
  if (reps <= 1) {
    const others = shuffle(Array.from(new Set(table)).filter((f) => f !== answer), rng).slice(0, 3);
    ex.options = shuffle([answer, ...others], rng);
  }
  return ex;
}

export function matchExercise(corpus: LangCorpus, system: LangSystem, item: LangItem, rng: Rng): Exercise | null {
  const langs = system.targets.filter((l) => item.forms[l]);
  if (langs.length < 2 || !item.forms[system.root]) return null;
  return {
    kind: "match",
    itemId: item.id,
    lang: langs[0],
    root: system.root,
    prompt: item.forms[system.root],
    promptLang: system.root,
    answer: "",
    answerLang: langs[0],
    pairs: shuffle(langs.map((l) => ({ lang: l, word: item.forms[l], reading: item.readings[l] })), rng),
    family: sharedRootLangs(item, system).map((l) => ({ lang: l, word: item.forms[l] })),
    note: relevantNote(item.note, system),
  };
}

function cardsOf(state: EngineState): Record<string, LangCard> {
  return state.cards as Record<string, LangCard>;
}

export function newToday(state: EngineState, lang: string, now: number = Date.now()): number {
  const dk = dayKey(now);
  return Object.entries(cardsOf(state)).filter(([id, c]) => parseCardId(id).lang === lang && c.introduced === dk && !c.placed).length;
}

export interface UnitStatus {
  unit: LangUnit;
  total: number;
  started: number;
  unlocked: boolean;
  done: boolean;
}

export function unitStatus(system: LangSystem, corpus: LangCorpus, state: EngineState, lang: string): UnitStatus[] {
  const cards = cardsOf(state);
  const out: UnitStatus[] = [];
  let prevDone = true;
  for (const unit of corpus.units) {
    const items = corpus.items.filter((i) => i.unit === unit.index && isVocab(i) && usable(i, system.root, lang));
    const started = items.filter((i) => cards[cardId(lang, i.id)]).length;
    const done = items.length === 0 || started / items.length >= UNIT_UNLOCK_SHARE;
    out.push({ unit, total: items.length, started, unlocked: prevDone, done });
    prevDone = prevDone && done;
  }
  return out;
}

export interface SessionCard {
  itemId: string;
  lang: string;
}

export function interleave(cards: SessionCard[]): SessionCard[] {
  const byLang = new Map<string, SessionCard[]>();
  for (const c of cards) {
    if (!byLang.has(c.lang)) byLang.set(c.lang, []);
    byLang.get(c.lang)!.push(c);
  }
  const out: SessionCard[] = [];
  let last = "";
  while (out.length < cards.length) {
    const queues = Array.from(byLang.entries()).filter(([, q]) => q.length > 0).sort((a, b) => b[1].length - a[1].length);
    const pick = queues.find(([l]) => l !== last) ?? queues[0];
    out.push(pick[1].shift()!);
    last = pick[0];
  }
  return out;
}

function grammarReady(item: LangItem, lang: string, cards: Record<string, LangCard>): boolean {
  const base = cards[cardId(lang, item.baseId)];
  return !!base && (base.reps ?? 0) >= 2;
}

export function planSession(system: LangSystem, corpus: LangCorpus, state: EngineState, now: number = Date.now(), size = 14): SessionCard[] {
  const cards = cardsOf(state);
  const due = Object.entries(cards)
    .map(([id, c]) => ({ ...parseCardId(id), c }))
    .filter((x) => system.targets.includes(x.lang) && corpus.byId.has(x.itemId) && x.c.due != null && x.c.due <= now)
    .sort((a, b) => (a.c.due ?? 0) - (b.c.due ?? 0))
    .slice(0, size)
    .map((x) => ({ itemId: x.itemId, lang: x.lang }));

  const room = Math.max(0, size - due.length);
  const fresh: SessionCard[] = [];
  const budget = new Map(system.targets.map((l) => [l, Math.max(0, NEW_PER_LANG_PER_DAY - newToday(state, l, now))]));
  const unlocked = new Map(system.targets.map((l) => [l, new Set(unitStatus(system, corpus, state, l).filter((u) => u.unlocked).map((u) => u.unit.index))]));
  for (const item of corpus.items) {
    if (fresh.length >= room) break;
    for (const l of system.targets) {
      if (fresh.length >= room) break;
      if ((budget.get(l) ?? 0) <= 0) continue;
      if (!usable(item, system.root, l)) continue;
      if (!unlocked.get(l)!.has(item.unit)) continue;
      if (isVocab(item) && item.tier < (system.placement[l] ?? 0)) continue;
      if (!isVocab(item) && !grammarReady(item, l, cards)) continue;
      if (cards[cardId(l, item.id)]) continue;
      fresh.push({ itemId: item.id, lang: l });
      budget.set(l, (budget.get(l) ?? 0) - 1);
    }
  }
  return [...interleave(due), ...fresh];
}

export function gradeCard(state: EngineState, lang: string, itemId: string, rating: Rating, now: number = Date.now()): EngineState {
  const id = cardId(lang, itemId);
  const wasNew = !state.cards[id];
  const next = grade(state, [], {}, id, rating, "recall", now);
  if (wasNew) (next.cards[id] as LangCard).introduced = dayKey(now);
  else if ((state.cards[id] as LangCard).introduced) (next.cards[id] as LangCard).introduced = (state.cards[id] as LangCard).introduced;
  return next;
}

export interface PlacementAnswer {
  tier: number;
  correct: boolean;
}

export interface PlacementStep {
  done: boolean;
  tier: number;
  nextTier?: number;
}

export function placementStep(answers: PlacementAnswer[], maxItems = PLACEMENT_MAX_ITEMS): PlacementStep {
  const tierAt = (i: number) => (i < PLACEMENT_TIERS.length ? PLACEMENT_TIERS[i] : PLACEMENT_TIERS[PLACEMENT_TIERS.length - 1] + 1);
  let lo = 0;
  let hi = PLACEMENT_TIERS.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const t = PLACEMENT_TIERS[mid];
    const at = answers.filter((a) => a.tier === t);
    const right = at.filter((a) => a.correct).length;
    const wrong = at.length - right;
    const decided = right >= 2 || wrong >= 2 || answers.length >= maxItems;
    if (!decided) return { done: false, tier: tierAt(lo), nextTier: t };
    if (right > wrong) lo = mid + 1;
    else hi = mid;
  }
  return { done: true, tier: tierAt(lo) };
}

export function placementItem(system: LangSystem, corpus: LangCorpus, lang: string, tier: number, seen: Set<string>, rng: Rng): LangItem | null {
  const exact = corpus.items.filter((i) => i.kind === "word" && i.tier === tier && usable(i, system.root, lang) && !seen.has(i.id));
  const near = exact.length ? exact : corpus.items.filter((i) => i.kind === "word" && Math.abs(i.tier - tier) <= 1 && usable(i, system.root, lang) && !seen.has(i.id));
  return near.length ? shuffle(near, rng)[0] : null;
}

export function placementOptions(corpus: LangCorpus, item: LangItem, lang: string, root: string, rng: Rng): string[] {
  return shuffle([item.forms[lang], ...distractors(corpus, item, lang, root, rng)], rng);
}

export function applyPlacement(state: EngineState, system: LangSystem, corpus: LangCorpus, lang: string, tier: number, now: number = Date.now()): EngineState {
  const next = normalizeState(state);
  const fsrs: FSRS = makeFsrs(next);
  for (const item of corpus.items) {
    if (!isVocab(item) || item.tier >= tier || !usable(item, system.root, lang)) continue;
    const id = cardId(lang, item.id);
    if (next.cards[id]) continue;
    const c = fsrs.review({ state: "new" }, 3, now) as LangCard;
    c.placed = true;
    c.introduced = dayKey(now);
    next.cards[id] = c;
  }
  return next;
}

export interface QueueEntry {
  itemId: string;
  lang: string;
  stage: "intro" | "check" | "review" | "match";
}

export const CHECK_GAP = 3;
export const MAX_TRIES = 2;

export function buildQueue(system: LangSystem, corpus: LangCorpus, state: EngineState, now: number = Date.now(), size = 14): QueueEntry[] {
  const plan = planSession(system, corpus, state, now, size);
  const out: QueueEntry[] = [];
  const pendingChecks: { at: number; e: QueueEntry }[] = [];
  for (const c of plan) {
    const isNew = !state.cards[cardId(c.lang, c.itemId)];
    const vocab = isVocab(corpus.byId.get(c.itemId)!);
    out.push({ ...c, stage: isNew && vocab ? "intro" : isNew ? "check" : "review" });
    if (isNew && vocab) pendingChecks.push({ at: out.length + CHECK_GAP, e: { ...c, stage: "check" } });
    while (pendingChecks.length && pendingChecks[0].at <= out.length) out.push(pendingChecks.shift()!.e);
  }
  for (const p of pendingChecks) out.push(p.e);

  if (system.targets.length >= 2) {
    const seen = new Map<string, Set<string>>();
    const note = (itemId: string, lang: string) => {
      if (!seen.has(itemId)) seen.set(itemId, new Set());
      seen.get(itemId)!.add(lang);
    };
    for (const e of out) note(e.itemId, e.lang);
    for (const id of Object.keys(state.cards)) {
      const { lang, itemId } = parseCardId(id);
      if (system.targets.includes(lang)) note(itemId, lang);
    }
    const candidates = Array.from(seen.entries()).filter(([itemId, langs]) => {
      const item = corpus.byId.get(itemId);
      if (!item || !isVocab(item) || !item.forms[system.root]) return false;
      const covered = system.targets.filter((l) => item.forms[l]);
      return covered.length >= 2 && covered.every((l) => langs.has(l)) && new Set(covered.map((l) => item.forms[l])).size === covered.length;
    });
    const roots = (id: string) => sharedRootLangs(corpus.byId.get(id)!, system).length;
    candidates.sort((a, b) => roots(b[0]) - roots(a[0]));
    if (candidates.length) out.push({ itemId: candidates[0][0], lang: system.targets[0], stage: "match" });
  }
  return out;
}

export function requeueAfterMiss(queue: QueueEntry[], index: number, entry: QueueEntry): QueueEntry[] {
  const same = (e: QueueEntry) => e.itemId === entry.itemId && e.lang === entry.lang;
  if (queue.slice(index + 1).some((e) => same(e) && e.stage !== "match")) return queue;
  if (queue.filter((e) => same(e) && (e.stage === "check" || e.stage === "review")).length >= MAX_TRIES) return queue;
  const at = Math.min(queue.length, index + 1 + CHECK_GAP);
  return [...queue.slice(0, at), entry, ...queue.slice(at)];
}

export interface SystemsDoc {
  systems: LangSystem[];
  removed: Record<string, number>;
}

export function normalizeSystemsDoc(raw: unknown): SystemsDoc {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<SystemsDoc>;
  return {
    systems: Array.isArray(d.systems) ? d.systems.filter((s) => s && typeof s.id === "string") : [],
    removed: d.removed && typeof d.removed === "object" ? { ...d.removed } : {},
  };
}

export function mergeSystems(a: SystemsDoc, b: SystemsDoc): SystemsDoc {
  const removed: Record<string, number> = { ...a.removed };
  for (const [id, t] of Object.entries(b.removed)) removed[id] = Math.max(removed[id] ?? 0, t);
  const byId = new Map<string, LangSystem>();
  for (const s of [...a.systems, ...b.systems]) {
    const cur = byId.get(s.id);
    if (!cur) {
      byId.set(s.id, { ...s, placement: Object.fromEntries(Object.entries(s.placement).sort()) });
      continue;
    }
    const placement = { ...cur.placement };
    for (const [l, t] of Object.entries(s.placement)) placement[l] = Math.max(placement[l] ?? 0, t);
    byId.set(s.id, { ...cur, createdAt: Math.min(cur.createdAt, s.createdAt), placement: Object.fromEntries(Object.entries(placement).sort()) });
  }
  const systems = Array.from(byId.values())
    .filter((s) => (removed[s.id] ?? -1) < s.createdAt)
    .sort((x, y) => x.createdAt - y.createdAt);
  return { systems, removed };
}

export interface LangProgress {
  lang: string;
  total: number;
  started: number;
  mastered: number;
  due: number;
  retention: number;
  placedAt: number | null;
  grammarStarted: number;
  grammarTotal: number;
}

export function langProgress(system: LangSystem, corpus: LangCorpus, state: EngineState, now: number = Date.now()): LangProgress[] {
  const fsrs = new FSRS();
  const cards = cardsOf(state);
  return system.targets.map((lang) => {
    const all = corpus.items.filter((i) => usable(i, system.root, lang));
    const items = all.filter(isVocab);
    const grammar = all.filter((i) => !isVocab(i));
    let started = 0;
    let mastered = 0;
    let due = 0;
    let rSum = 0;
    for (const i of all) {
      const c = cards[cardId(lang, i.id)];
      if (!c) continue;
      if (c.due != null && c.due <= now) due++;
      if (!isVocab(i)) continue;
      started++;
      if (fsrs.mastery(c) >= 0.8) mastered++;
      const elapsed = Math.max(0, (now - (c.lastReview ?? now)) / DAY_MS);
      rSum += fsrs.retrievability(elapsed, c.stability ?? 0);
    }
    return {
      lang,
      total: items.length,
      started,
      mastered,
      due,
      retention: started ? rSum / started : 0,
      placedAt: system.placement[lang] ?? null,
      grammarStarted: grammar.filter((i) => cards[cardId(lang, i.id)]).length,
      grammarTotal: grammar.length,
    };
  });
}

export interface SystemSummary {
  started: number;
  total: number;
  due: number;
  xp: number;
  streak: number;
  sharedRootItems: number;
}

export function systemSummary(system: LangSystem, corpus: LangCorpus, state: EngineState, now: number = Date.now()): SystemSummary {
  const per = langProgress(system, corpus, state, now);
  return {
    started: per.reduce((s, p) => s + p.started, 0),
    total: per.reduce((s, p) => s + p.total, 0),
    due: per.reduce((s, p) => s + p.due, 0),
    xp: state.stats.xp,
    streak: state.stats.streak,
    sharedRootItems: corpus.items.filter((i) => i.kind === "word" && sharedRootLangs(i, system).length >= 2).length,
  };
}

export function readingsByForm(corpus: LangCorpus, lang: string): Record<string, Reading> {
  const out: Record<string, Reading> = {};
  for (const i of corpus.items) if (isVocab(i) && i.forms[lang] && i.readings[lang] && !out[i.forms[lang]]) out[i.forms[lang]] = i.readings[lang];
  for (const s of Object.values(corpus.pool)) if (s.t[lang] && s.r[lang] && !out[s.t[lang]]) out[s.t[lang]] = { roman: s.r[lang] };
  return out;
}

export function falseFriendsFor(corpus: LangCorpus, system: LangSystem): FalseFriend[] {
  const langs = new Set(system.targets);
  return corpus.falseFriends.filter((f) => langs.has(f.lang));
}
