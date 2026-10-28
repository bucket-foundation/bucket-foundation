import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LANGUAGE_NAMES } from "../../../../src/lib/research-os/work-quiz/languages";
import { countTokens, LIMITS } from "../../../../src/lib/research-os/work-quiz/limits";
import { buildWordSet, cleanIpa, rejection, scriptOf, usableWord, type RawSubset, type RawWord, type Script, type WordCell } from "../../../../src/lib/research-os/work-quiz/polingual-forms";
import { assertClean, buildDenylist, type Denylist } from "./rights";

export const WORD_PACK_BUDGET_BYTES = 4 * 1024 * 1024;
export const LICENCE_FILE = "packages/bkt/licences/CC-BY-SA-4.0.txt";
export const LICENCE_TITLE = "Attribution-ShareAlike 4.0 International";
export const WORD_CHANGES =
  "Changes made by Bucket: the pack leaves out entries that only point to another word, and keeps one short definition and up to four further senses for each word, one pronunciation, and a shortened etymology. Bucket offers the changed word list under the same licence.";
export const SEVERAL_WORDS = "several words for one concept";
export const BAD_FORM = "word form the quiz cannot show";
export const OUTSIDE_LANGUAGE = "language outside the set";
export const FORM_OF = "form of another word";
export const REPEATED = "repeated entry";
const GRAMMAR = new Set(["short", "long", "definite", "indefinite", "neuter", "masculine", "feminine", "common", "plural", "singular", "dual", "past", "present", "future", "first", "second", "third", "person", "first-person", "second-person", "third-person", "alternative", "obsolete", "archaic", "dated", "nonstandard", "active", "passive", "strong", "weak", "mixed", "simple", "perfect", "imperfect", "verbal", "nominative", "genitive", "dative", "accusative", "vocative", "ablative", "locative", "instrumental", "comparative", "superlative", "positive", "inflection", "participle", "form", "tense", "spelling", "romanization", "abbreviation", "gerund", "infinitive", "imperative", "contraction", "misspelling", "variant", "stem", "and", "degree", "case"]);
const FORM_HEADS = new Set(["plural", "singular", "dual", "inflection", "participle", "form", "tense", "spelling", "romanization", "abbreviation", "nominative", "genitive", "dative", "accusative", "vocative", "ablative", "locative", "instrumental", "comparative", "superlative", "gerund", "infinitive", "imperative", "contraction", "misspelling", "variant", "stem"]);

export function formOf(gloss: string): boolean {
  const at = gloss.toLowerCase().indexOf(" of ");
  if (at < 0) return false;
  const lead = gloss.toLowerCase().slice(0, at).split(/\s+/).filter(Boolean);
  return lead.length > 0 && lead.length <= 5 && lead.every((t) => GRAMMAR.has(t)) && FORM_HEADS.has(lead[lead.length - 1]);
}

export function shortMeaning(gloss: string): string {
  const cut = gloss.split(/[,;(]/)[0].replace(/\s+/g, " ").trim().replace(/[.!?:]+$/, "").trim();
  if (!cut || /[…"|+]/.test(cut) || countTokens(cut) > LIMITS.option || cut.length > LIMITS.tokenChars) return "";
  return cut;
}
export const WORDS_FILE = "learning/app/polingual/subset.json";
export const SENSES_KEPT = 4;
export const SENSE_CHARS = 160;
export const SHARE_ALIKE = /CC[- ]BY[- ]SA/i;
export const SOURCE_NAME = /Wiktionary/;
export const LICENCE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

export interface WordAttribution {
  data: string;
  license: string;
  credit: string;
  source_url: string;
  wiktionary_url: string;
}

export interface PackCell {
  gloss: string;
  shared: boolean;
  senseWords: string[];
}

export interface PackWord {
  lang: string;
  word: string;
  pos: string;
  script: Script;
  meaning: string;
  concept?: string;
  ipa?: string;
  senses?: string[];
  etymology?: string;
  short?: string;
  quiz?: true;
  strict?: true;
  cell?: PackCell;
}

export interface WordCounts {
  rows: number;
  words: number;
  quiz: number;
  lessonOnly: number;
  checked: number;
  strict: number;
  dropped: Record<string, number>;
  rejected: Record<string, number>;
  languages: number;
  concepts: number;
  fewest: [string, number];
  most: [string, number];
  withIpa: number;
  withEtymology: number;
}

export interface WordPack {
  version: string;
  sha256: string;
  source: string;
  attribution: WordAttribution;
  licenceUrl: string;
  licenceText: string;
  changes: string;
  languages: string[];
  names: Record<string, string>;
  scripts: Record<string, Script>;
  conceptPos: Record<string, string>;
  words: PackWord[];
  counts: WordCounts;
}

export type RawEntry = RawWord & { e?: string };
export type RawWords = Omit<RawSubset, "attribution" | "words"> & { attribution: WordAttribution; words: readonly RawEntry[] };

export function cleanEtymology(raw: string | undefined, languageName: string, word: string): string {
  const lines = (raw ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines[0] === "Etymology tree") {
    const end = lines.indexOf(`${languageName} ${word}`);
    lines.splice(0, end >= 0 ? end + 1 : 1);
  }
  const heading = lines.findIndex((l) => /^(Cognates|Doublets|Compare)$/.test(l));
  return (heading >= 0 ? lines.slice(0, heading) : lines).join(" ");
}

export function otherSenses(w: RawEntry): string[] {
  const out: string[] = [];
  for (const s of w.senses ?? []) {
    const g = (s.g ?? "").trim();
    if (!g || g === w.g.trim() || out.includes(g) || g.length > SENSE_CHARS) continue;
    if (out.length < SENSES_KEPT) out.push(g);
  }
  return out;
}

export function checkAttribution(a: WordAttribution | undefined): WordAttribution {
  if (!a || !SOURCE_NAME.test(a.data ?? "") || !SHARE_ALIKE.test(a.license ?? "")) throw new Error(`word pack: ${WORDS_FILE} must name Wiktionary and a CC-BY-SA licence in its attribution`);
  if (!/^https:\/\//.test(a.wiktionary_url ?? "") || !/^https:\/\//.test(a.source_url ?? "")) throw new Error(`word pack: ${WORDS_FILE} must give https links for its source`);
  return { data: a.data, license: a.license, credit: a.credit ?? "", source_url: a.source_url, wiktionary_url: a.wiktionary_url };
}

export function packWord(raw: RawEntry, languageName: string, cell: WordCell | null, strict: boolean): PackWord {
  const word = raw.s.trim();
  const meaning = raw.g.trim();
  const short = shortMeaning(meaning);
  const senses = otherSenses(raw);
  const etymology = cleanEtymology(raw.e, languageName, word);
  const ipa = cleanIpa(raw.ipa);
  return {
    lang: raw.l,
    word,
    pos: cell?.pos ?? raw.p ?? "",
    script: scriptOf(word),
    meaning,
    ...(raw.c ? { concept: raw.c } : {}),
    ...(ipa ? { ipa } : {}),
    ...(senses.length ? { senses } : {}),
    ...(etymology ? { etymology } : {}),
    ...(short ? { short } : {}),
    ...(cell || (short && usableWord(raw)) ? { quiz: true as const } : {}),
    ...(strict ? { strict: true as const } : {}),
    ...(cell ? { cell: { gloss: cell.gloss, shared: cell.shared, senseWords: [...cell.senseWords].sort() } } : {}),
  };
}

export function checkLicenceText(text: string): string {
  if (!text.includes(LICENCE_TITLE) || text.length < 10_000) throw new Error(`word pack: ${LICENCE_FILE} must hold the full ${LICENCE_TITLE} licence text`);
  return text;
}

export function wordPackChecksum(pack: WordPack): string {
  const { version: _v, sha256: _s, ...body } = pack;
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

const sorted = (tally: Record<string, number>) => Object.fromEntries(Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));

export function assembleWords(raw: RawWords, deny: Denylist, licenceText: string): WordPack {
  const attribution = checkAttribution(raw.attribution);
  const set = buildWordSet(raw);
  const known = new Set(set.languages);
  const rejected: Record<string, number> = {};
  const dropped: Record<string, number> = {};
  const bump = (tally: Record<string, number>, why: string) => (tally[why] = (tally[why] ?? 0) + 1);
  const nameOf = (lang: string) => {
    const name = LANGUAGE_NAMES[lang];
    if (!name) throw new Error(`word pack: no language name for ${lang}`);
    return name;
  };
  const clean = new Map<string, RawEntry[]>();
  for (const w of raw.words) {
    if (!known.has(w.l) || rejection(w, set.conceptPos)) continue;
    clean.set(`${w.l}\u0000${w.c}`, [...(clean.get(`${w.l}\u0000${w.c}`) ?? []), w]);
  }
  const cells = new Map(set.cells.map((c) => [`${c.lang}\u0000${c.concept}`, c]));
  const seen = new Set<string>();
  const words: PackWord[] = [];
  for (const w of raw.words) {
    const word = w.s.trim();
    const why = known.has(w.l) ? rejection(w, set.conceptPos) : OUTSIDE_LANGUAGE;
    const group = why ? [] : clean.get(`${w.l}\u0000${w.c}`)!;
    const cell = !why && group.length === 1 ? (cells.get(`${w.l}\u0000${w.c}`) ?? null) : null;
    if (cell && cell.word !== word) throw new Error(`word pack: no single source row for ${cell.lang} ${cell.word}`);
    const strict = !why && usableWord(w);
    if (why) bump(rejected, why);
    else if (!usableWord(w)) bump(rejected, BAD_FORM);
    else if (!cell) bump(rejected, SEVERAL_WORDS);
    if (!known.has(w.l) || !word || !w.g.trim()) bump(dropped, OUTSIDE_LANGUAGE);
    else if (formOf(w.g)) bump(dropped, FORM_OF);
    else if (seen.has(`${w.l}\u0000${w.c ?? ""}\u0000${word}`)) bump(dropped, REPEATED);
    else {
      seen.add(`${w.l}\u0000${w.c ?? ""}\u0000${word}`);
      words.push(packWord(w, nameOf(w.l), cell, strict));
    }
  }
  const checked = words.filter((w) => w.cell).length;
  if (checked !== set.cells.length) throw new Error(`word pack: ${checked} checked words ship and the quiz set holds ${set.cells.length}`);
  if (checked === 0) throw new Error(`word pack: ${WORDS_FILE} gave no word that passes the quiz checks`);
  const languages = set.languages.filter((l) => words.some((w) => w.lang === l));
  const perLanguage = languages.map((l): [string, number] => [l, words.filter((w) => w.lang === l).length]).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  const quiz = words.filter((w) => w.quiz).length;
  const counts: WordCounts = {
    rows: raw.words.length,
    words: words.length,
    quiz,
    lessonOnly: words.length - quiz,
    checked,
    strict: words.filter((w) => w.strict).length,
    dropped: sorted(dropped),
    rejected: sorted(rejected),
    languages: languages.length,
    concepts: new Set(words.filter((w) => w.strict).map((w) => w.concept)).size,
    fewest: perLanguage[0],
    most: perLanguage[perLanguage.length - 1],
    withIpa: words.filter((w) => w.ipa).length,
    withEtymology: words.filter((w) => w.etymology).length,
  };
  const names = Object.fromEntries(languages.map((l) => [l, LANGUAGE_NAMES[l]]));
  const scripts = Object.fromEntries(languages.map((l) => [l, set.scripts[l]]));
  const conceptPos = Object.fromEntries(Object.entries(set.conceptPos).sort(([a], [b]) => a.localeCompare(b)));
  const body = { source: WORDS_FILE, attribution, licenceUrl: LICENCE_URL, licenceText: checkLicenceText(licenceText), changes: WORD_CHANGES, languages, names, scripts, conceptPos, words, counts };
  const sha256 = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const pack: WordPack = { version: sha256.slice(0, 12), sha256, ...body };
  const { licenceText: _text, ...scanned } = pack;
  assertClean(deny, scanned, "the word pack");
  return pack;
}

export function buildWordPack(repo: string, deny: Denylist = buildDenylist(repo)): WordPack {
  return assembleWords(JSON.parse(readFileSync(join(repo, WORDS_FILE), "utf8")) as RawWords, deny, readFileSync(join(repo, LICENCE_FILE), "utf8"));
}

export function describeWordCounts(c: WordCounts): string[] {
  return [
    `${c.words} words in lessons of ${c.rows} rows: ${c.quiz} quiz-ready, ${c.lessonOnly} lesson only; ${c.strict} in the by-concept view across ${c.concepts} concepts, ${c.checked} of them in the checked quiz set`,
    `${c.languages} languages, from ${c.fewest[1]} words (${c.fewest[0]}) to ${c.most[1]} (${c.most[0]}); ${c.withIpa} with IPA, ${c.withEtymology} with etymology`,
    `dropped: ${JSON.stringify(c.dropped)}`,
    `kept out of the by-concept view: ${JSON.stringify(c.rejected)}`,
  ];
}

if (import.meta.main) {
  const repo = resolve(import.meta.dir, "../../../..");
  const pack = buildWordPack(repo);
  const text = JSON.stringify(pack);
  const bytes = Buffer.byteLength(text);
  if (bytes > WORD_PACK_BUDGET_BYTES) throw new Error(`word pack: ${bytes} bytes is over the ${WORD_PACK_BUDGET_BYTES} byte budget`);
  const outDir = resolve(import.meta.dir, "../../content");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "words.json"), text);
  console.log(`word pack ${pack.version}: ${bytes} bytes`);
  for (const l of describeWordCounts(pack.counts)) console.log(`  ${l}`);
}
