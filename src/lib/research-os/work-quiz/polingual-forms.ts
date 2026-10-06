import { CARD_KEY_SEPARATOR, FACT_JOIN, factId } from "./fact";
import { pick, shuffle, stamp, type FormMaker, type SampledQuestion } from "./forms";
import type { Rng } from "./generate";
import { LIMITS, countTokens, parityOk } from "./limits";
import { LANGUAGE_FORMS, type Depth, type LanguageForm } from "./space";
import type { QuestionWord, QuizQuestion, SourceRef } from "./types";

export interface RawSense {
  g?: string;
  p?: string;
  t?: readonly string[];
}

export interface RawWord {
  s: string;
  l: string;
  g: string;
  p?: string;
  ipa?: string;
  c?: string;
  senses?: readonly RawSense[];
}

export interface RawSubset {
  manifest: { languages: readonly string[]; language_names: Readonly<Record<string, string>> };
  attribution: { data: string; license: string; wiktionary_url: string };
  words: readonly RawWord[];
}

export type Script = "latin" | "cyrillic" | "greek" | "arabic" | "hebrew" | "devanagari" | "tamil" | "thai" | "hangul" | "kana" | "han" | "other";

export interface WordCell {
  lang: string;
  concept: string;
  pos: string;
  word: string;
  folded: string;
  gloss: string;
  ipa: string;
  script: Script;
  shared: boolean;
  senseWords: ReadonlySet<string>;
}

export interface WordSet {
  languages: readonly string[];
  names: Readonly<Record<string, string>>;
  scripts: Readonly<Record<string, Script>>;
  credit: string;
  wiktionaryUrl: string;
  cells: readonly WordCell[];
  byLang: Readonly<Record<string, readonly WordCell[]>>;
  fill: Readonly<Record<string, readonly WordCell[]>>;
  conceptPos: Readonly<Record<string, string>>;
  byConcept: Readonly<Record<string, readonly WordCell[]>>;
}

export const LANGUAGE_CHOICES: Readonly<Record<Depth, number>> = { 1: 2, 2: 3, 3: 4 };
export const GLOSS_TOKENS = 8;
export const MIN_GLOSS_TOKENS = 3;
export const WORD_TOKENS = 3;
export const MIN_STRICT_PAIRS = 200;
export const SOURCE_LANGUAGE = "en";
export const MIN_PAIR_LANGUAGES = 3;
export const VAGUE_GLOSS = /^(terms?|relating to|to do with|used|of,|any of|any)\b|\b(specifically|etc)$/i;
export const MIN_OTHER_SENSES = 2;
export const SENSE_KEY_CHARS = 25;
export const MARKED_TAGS: readonly string[] = ["plural-only", "form-of", "alt-of", "archaic", "obsolete", "abbreviation", "rare", "dated", "slang", "vulgar", "derogatory", "offensive", "misspelling", "dialectal", "historical", "poetic", "figuratively", "colloquial", "informal"];

export const FAMILY_TIERS: readonly (readonly string[])[] = [
  ["es", "fr", "it", "pt", "la"],
  ["de", "en", "nl", "sv"],
  ["cs", "pl", "ru", "el"],
  ["fi", "tr", "id", "vi"],
  ["ar", "fa", "he"],
  ["hi", "sa", "ta"],
  ["zh", "ja", "ko", "th"],
];

const SCRIPT_RANGES: readonly [number, number, Script][] = [
  [0x0041, 0x024f, "latin"],
  [0x1e00, 0x1eff, "latin"],
  [0x0370, 0x03ff, "greek"],
  [0x1f00, 0x1fff, "greek"],
  [0x0400, 0x052f, "cyrillic"],
  [0x0590, 0x05ff, "hebrew"],
  [0x0600, 0x06ff, "arabic"],
  [0x0750, 0x077f, "arabic"],
  [0xfb50, 0xfdff, "arabic"],
  [0xfe70, 0xfeff, "arabic"],
  [0x0900, 0x097f, "devanagari"],
  [0x0b80, 0x0bff, "tamil"],
  [0x0e00, 0x0e7f, "thai"],
  [0x1100, 0x11ff, "hangul"],
  [0x3130, 0x318f, "hangul"],
  [0xac00, 0xd7af, "hangul"],
  [0x3040, 0x30ff, "kana"],
  [0x3400, 0x4dbf, "han"],
  [0x4e00, 0x9fff, "han"],
  [0xf900, 0xfaff, "han"],
];

function charScript(code: number): Script | null {
  for (const [lo, hi, script] of SCRIPT_RANGES) if (code >= lo && code <= hi) return script;
  return null;
}

export function scriptOf(word: string): Script {
  const found = new Set<Script>();
  for (const ch of word) {
    const s = charScript(ch.codePointAt(0)!);
    if (s) found.add(s);
  }
  if (found.has("kana")) return "kana";
  return found.size === 1 ? Array.from(found)[0] : "other";
}

export function fold(word: string): string {
  return word.normalize("NFKD").replace(/[\u0300-\u036f\u0591-\u05c7\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, "").toLowerCase().trim();
}

const plain = (gloss: string) => gloss.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
const firstPart = (gloss: string) => plain(gloss).split(/[,;/]/)[0].trim().replace(/[.!?…]+$/, "").trim();

export function headword(gloss: string): string {
  return firstPart(gloss).toLowerCase().replace(/^(to|a|an|the)\s+/, "");
}

export function strictMatch(w: RawWord): boolean {
  if (!w.c) return false;
  return w.l === SOURCE_LANGUAGE ? fold(w.s) === w.c : headword(w.g) === w.c;
}

const senseKey = (gloss: string) => gloss.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, SENSE_KEY_CHARS);
const mentions = (gloss: string, concept: string) => new RegExp(`(^|[^a-z])${concept}`, "i").test(gloss);

export function conceptPos(words: readonly RawWord[]): Record<string, string> {
  const counts: Record<string, Record<string, number>> = {};
  const source: Record<string, RawWord> = {};
  for (const w of words) {
    if (!w.c || !w.p || !strictMatch(w)) continue;
    if (w.l === SOURCE_LANGUAGE) source[w.c] = w;
    else (counts[w.c] ??= {})[w.p] = (counts[w.c][w.p] ?? 0) + 1;
  }
  const out: Record<string, string> = {};
  for (const c of Object.keys(counts)) {
    const ranked = Object.entries(counts[c]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const tied = ranked.filter(([, n]) => n === ranked[0][1]).map(([p]) => p);
    const pos = tied.length === 1 ? tied[0] : tied.find((p) => p === source[c]?.p);
    if (pos && (!source[c] || sourceSense(source[c], pos) !== null)) out[c] = pos;
  }
  return out;
}

export function sourceSense(w: RawWord, pos: string): string | null {
  if (w.p === pos) return w.g;
  return (w.senses ?? []).find((s) => s.p === pos && s.g)?.g ?? null;
}

export function corroborated(w: RawWord): boolean {
  const key = senseKey(w.g);
  const same = (w.senses ?? []).filter((s) => senseKey(s.g ?? "") === key);
  const others = (w.senses ?? []).filter((s) => senseKey(s.g ?? "") !== key);
  if (same.some((s) => (s.p && s.p !== w.p) || (s.t ?? []).some((t) => MARKED_TAGS.includes(t)))) return false;
  return others.length < MIN_OTHER_SENSES || others.some((s) => mentions(s.g ?? "", w.c ?? ""));
}

export function cleanMatch(w: RawWord, pos: Readonly<Record<string, string>>): boolean {
  if (!w.c || !strictMatch(w) || !pos[w.c]) return false;
  return w.l === SOURCE_LANGUAGE ? sourceSense(w, pos[w.c]) !== null : w.p === pos[w.c] && corroborated(w);
}

function shortGloss(w: RawWord, pos: string): string {
  if (w.l !== SOURCE_LANGUAGE) return firstPart(w.g).toLowerCase();
  const samePos = (w.senses ?? []).filter((x) => x.p === pos);
  if (samePos.filter((x) => (x.t ?? []).some((t) => MARKED_TAGS.includes(t))).length * 2 >= Math.max(1, samePos.length)) return "";
  const cut = plain(sourceSense(w, pos) ?? "").split(";")[0].trim().replace(/[.!?]+$/, "");
  const tokens = countTokens(cut);
  if (/[…":]/.test(cut) || VAGUE_GLOSS.test(cut) || tokens < MIN_GLOSS_TOKENS || tokens > GLOSS_TOKENS) return "";
  return mentions(cut, w.c ?? "") ? "" : cut;
}

export function cleanIpa(ipa: string | undefined): string {
  return (ipa ?? "").split("/")[0].replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
}

function senseWords(w: RawWord): Set<string> {
  const out = new Set<string>();
  for (const g of [w.g, ...(w.senses ?? []).map((s) => s.g ?? "")]) for (const m of g.toLowerCase().match(/[a-z]+/g) ?? []) out.add(m);
  return out;
}

const refSafe = (s: string) => !s.includes(FACT_JOIN) && !s.includes(CARD_KEY_SEPARATOR);

function usable(w: RawWord): boolean {
  const word = w.s.trim();
  return word.length > 0 && word.length <= LIMITS.tokenChars && refSafe(word) && refSafe(w.c ?? "") && scriptOf(word) !== "other" && countTokens(word) <= WORD_TOKENS;
}

function group<T>(xs: readonly T[], key: (x: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const x of xs) (out[key(x)] ??= []).push(x);
  return out;
}

function mode(xs: readonly Script[]): Script {
  const n = new Map<Script, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  return Array.from(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "other";
}

export function buildWordSet(raw: RawSubset): WordSet {
  const languages = [...raw.manifest.languages];
  const known = new Set(languages);
  const surfaces = new Map<string, Set<string>>();
  const homographs = new Map<string, RawWord[]>();
  for (const w of raw.words) {
    const f = fold(w.s);
    if (!surfaces.has(f)) surfaces.set(f, new Set());
    surfaces.get(f)!.add(w.l);
    const k = `${w.l}:${f}`;
    if (!homographs.has(k)) homographs.set(k, []);
    homographs.get(k)!.push(w);
  }
  const pos = conceptPos(raw.words);
  const toCell = (w: RawWord): WordCell => {
    const word = w.s.trim();
    const senses = new Set<string>();
    for (const o of homographs.get(`${w.l}:${fold(w.s)}`) ?? []) {
      for (const sense of Array.from(senseWords(o))) senses.add(sense);
      if (o.c) senses.add(o.c);
    }
    return { lang: w.l, concept: w.c!, pos: (w.l === SOURCE_LANGUAGE ? pos[w.c!] : undefined) ?? w.p ?? "", word, folded: fold(word), gloss: shortGloss(w, pos[w.c!] ?? w.p ?? ""), ipa: cleanIpa(w.ipa), script: scriptOf(word), shared: surfaces.get(fold(word))!.size > 1, senseWords: senses };
  };
  const sole = (match: (w: RawWord) => boolean): Map<string, RawWord> => {
    const found = group(raw.words.filter((w) => known.has(w.l) && match(w)), (w) => `${w.l}:${w.c}`);
    const out = new Map<string, RawWord>();
    for (const key of Object.keys(found).sort()) if (found[key].length === 1 && usable(found[key][0])) out.set(key, found[key][0]);
    return out;
  };
  const clean = sole((w) => cleanMatch(w, pos));
  const loose = sole(strictMatch);
  const cells = Array.from(clean.values()).map(toCell);
  const filler = [...cells, ...Array.from(loose).filter(([key]) => !clean.has(key)).map(([, w]) => toCell(w))];
  const byLang = group(cells, (c) => c.lang);
  const scripts: Record<string, Script> = {};
  for (const l of languages) scripts[l] = mode((byLang[l] ?? []).map((c) => c.script));
  return {
    languages,
    names: raw.manifest.language_names,
    scripts,
    credit: `${raw.attribution.data}, ${raw.attribution.license}`,
    wiktionaryUrl: raw.attribution.wiktionary_url,
    cells,
    byLang,
    fill: group(filler, (c) => c.lang),
    conceptPos: pos,
    byConcept: group(cells, (c) => c.concept),
  };
}

export function pairTargets(set: WordSet, from: WordCell): WordCell[] {
  const cells = set.byConcept[from.concept] ?? [];
  if (new Set(cells.map((c) => c.lang)).size < MIN_PAIR_LANGUAGES) return [];
  return cells.filter((c) => c.lang !== from.lang && c.folded !== from.folded && c.pos === from.pos);
}

export function strictPairs(set: WordSet): number {
  return set.cells.reduce((n, c) => n + pairTargets(set, c).length, 0);
}

export function knownLanguages(set: WordSet, languages: readonly string[] | undefined): string[] {
  return Array.from(new Set(languages ?? [])).filter((l) => (set.byLang[l] ?? []).length > 0);
}

export function wordSource(set: WordSet, c: WordCell): SourceRef {
  return { kind: "word", ref: `${c.lang}:${c.concept}`, label: set.credit, href: `${set.wiktionaryUrl}/wiki/${encodeURIComponent(c.word)}` };
}

export function wordFactId(c: WordCell): string {
  return factId("word", `${c.lang}:${c.concept}`);
}

function choose(rng: Rng, answer: string, pool: readonly string[], count: number): string[] | null {
  const chosen = [answer];
  for (const p of pool) {
    if (chosen.length === count) break;
    if (!chosen.includes(p) && parityOk([...chosen, p])) chosen.push(p);
  }
  return chosen.length === count ? shuffle(rng, chosen) : null;
}

function rivals(set: WordSet, answer: WordCell, ok: (c: WordCell) => boolean = () => true): WordCell[] {
  const seen = new Set([answer.folded]);
  const out: WordCell[] = [];
  for (const c of set.fill[answer.lang] ?? []) {
    if (c.concept === answer.concept || c.script !== answer.script || seen.has(c.folded)) continue;
    if (c.senseWords.has(answer.concept) || answer.senseWords.has(c.concept) || !ok(c)) continue;
    seen.add(c.folded);
    out.push(c);
  }
  return out;
}

export function wordMeta(set: WordSet, shown: WordCell | null, choices: WordCell | null): QuestionWord {
  return { lang: shown?.lang ?? null, choicesLang: choices?.lang ?? null, credit: set.credit, href: set.wiktionaryUrl };
}

function question(form: LanguageForm, set: WordSet, answer: WordCell, body: Pick<QuizQuestion, "prompt" | "lines" | "choices" | "answer" | "explain">, depth: Depth, factIds: string[], word: QuestionWord): SampledQuestion | null {
  if (!body.choices || body.choices.filter((c) => c === body.answer).length !== 1) return null;
  return stamp({ id: "", type: form, tolerance: 0, limitSec: 0, sources: [wordSource(set, answer)], word, ...body }, form, depth, factIds);
}

function wordChoices(set: WordSet, rng: Rng, answer: WordCell, depth: Depth, ok?: (c: WordCell) => boolean): string[] | null {
  return choose(rng, answer.word, shuffle(rng, rivals(set, answer, ok)).map((c) => c.word), LANGUAGE_CHOICES[depth]);
}

const meaning = (set: WordSet, languages: readonly string[]): FormMaker => (_src, rng, depth) => {
  const pool = (set.byLang[pick(rng, languages)] ?? []).filter((c) => c.gloss);
  if (pool.length === 0) return null;
  const a = pick(rng, pool);
  const choices = wordChoices(set, rng, a, depth);
  const name = set.names[a.lang];
  return question("meaning", set, a, { prompt: `Which ${name} word means "${a.gloss}"?`, lines: [], choices, answer: a.word, explain: `${a.word} is ${name} for "${a.gloss}".` }, depth, [wordFactId(a)], wordMeta(set, null, a));
};

const sound = (set: WordSet, languages: readonly string[]): FormMaker => (_src, rng, depth) => {
  const pool = (set.byLang[pick(rng, languages)] ?? []).filter((c) => c.ipa);
  if (pool.length === 0) return null;
  const a = pick(rng, pool);
  const choices = wordChoices(set, rng, a, depth, (c) => c.ipa !== "" && c.ipa !== a.ipa);
  const name = set.names[a.lang];
  return question("sound", set, a, { prompt: `Which ${name} word sounds like this?`, lines: [`/${a.ipa}/`], choices, answer: a.word, explain: `${a.word} is said /${a.ipa}/ in ${name}.` }, depth, [wordFactId(a)], wordMeta(set, null, a));
};

export function languageRivals(set: WordSet, a: WordCell): string[][] {
  const tier = FAMILY_TIERS.find((t) => t.includes(a.lang)) ?? [];
  const bare = a.script === "latin" && a.word.normalize("NFKD") === a.word && Array.from(a.word).every((ch) => ch.charCodeAt(0) < 0x80);
  const others = set.languages.filter((l) => l !== a.lang && !(a.lang === "zh" && l === "ja") && !(bare && tier.includes(l)));
  const sameScript = others.filter((l) => set.scripts[l] === set.scripts[a.lang] || (a.script === "kana" && set.scripts[l] === "han"));
  const family = others.filter((l) => tier.includes(l) && !sameScript.includes(l));
  const near = [...sameScript, ...family];
  return [sameScript.filter((l) => tier.includes(l)), sameScript.filter((l) => !tier.includes(l)), family, others.filter((l) => !near.includes(l))];
}

const language = (set: WordSet, languages: readonly string[]): FormMaker => (_src, rng, depth) => {
  const pool = (set.byLang[pick(rng, languages)] ?? []).filter((c) => !c.shared && (c.lang !== "ja" || c.script === "kana"));
  if (pool.length === 0) return null;
  const a = pick(rng, pool);
  const name = set.names[a.lang];
  const ordered = languageRivals(set, a).flatMap((ls) => shuffle(rng, ls)).map((l) => set.names[l]);
  const choices = choose(rng, name, ordered, LANGUAGE_CHOICES[depth]);
  return question("language", set, a, { prompt: "Which language is this word?", lines: [a.word], choices, answer: name, explain: `${a.word} is ${name} for "${a.concept}".` }, depth, [wordFactId(a)], wordMeta(set, null, null));
};

const pair = (set: WordSet, languages: readonly string[]): FormMaker => (_src, rng, depth) => {
  const pool = set.byLang[pick(rng, languages)] ?? [];
  if (pool.length === 0) return null;
  const from = pick(rng, pool);
  const targets = pairTargets(set, from);
  if (targets.length === 0) return null;
  const preferred = targets.filter((c) => languages.includes(c.lang));
  const a = pick(rng, preferred.length > 0 ? preferred : targets);
  const choices = wordChoices(set, rng, a, depth, (c) => c.folded !== from.folded);
  const [fromName, name] = [set.names[from.lang], set.names[a.lang]];
  return question(
    "pair",
    set,
    a,
    { prompt: `Which ${name} word matches this ${fromName} word?`, lines: [from.word], choices, answer: a.word, explain: `${from.word} in ${fromName} and ${a.word} in ${name} both mean "${from.concept}".` },
    depth,
    [wordFactId(from), wordFactId(a)],
    wordMeta(set, from, a),
  );
};

const LANGUAGE_MAKERS: Readonly<Record<LanguageForm, (set: WordSet, languages: readonly string[]) => FormMaker>> = { meaning, sound, language, pair };

export function languageMakers(set: WordSet, languages: readonly string[] | undefined): Partial<Record<LanguageForm, FormMaker>> {
  const known = knownLanguages(set, languages);
  if (known.length === 0) return {};
  const out: Partial<Record<LanguageForm, FormMaker>> = {};
  for (const form of LANGUAGE_FORMS) if (form !== "pair" || strictPairs(set) >= MIN_STRICT_PAIRS) out[form] = LANGUAGE_MAKERS[form](set, known);
  return out;
}
