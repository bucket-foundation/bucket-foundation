import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LANGUAGE_NAMES } from "../../../../src/lib/research-os/work-quiz/languages";
import { buildWordSet, cleanIpa, fold, rejection, scriptOf, usableWord, type RawSubset, type RawWord, type Script, type WordCell } from "../../../../src/lib/research-os/work-quiz/polingual-forms";
import { assertClean, buildDenylist, type Denylist } from "./rights";

export const WORD_PACK_BUDGET_BYTES = 1024 * 1024;
export const LICENCE_FILE = "packages/bkt/licences/CC-BY-SA-3.0.txt";
export const LICENCE_TITLE = "Attribution-ShareAlike 3.0 Unported";
export const WORD_CHANGES =
  "Changes made by Bucket: the pack keeps the words that pass its checks, one short definition and up to four further senses for each word, one pronunciation, and a shortened etymology. Bucket offers the changed word list under the same licence.";
export const SEVERAL_WORDS = "several words for one concept";
export const BAD_FORM = "word form the quiz cannot show";
export const OUTSIDE_LANGUAGE = "language outside the set";
export const WORDS_FILE = "learning/app/polingual/subset.json";
export const SENSES_KEPT = 4;
export const SENSE_CHARS = 160;
export const SHARE_ALIKE = /CC[- ]BY[- ]SA/i;
export const SOURCE_NAME = /Wiktionary/;
export const LICENCE_URL = "https://creativecommons.org/licenses/by-sa/3.0/";

export interface WordAttribution {
  data: string;
  license: string;
  credit: string;
  source_url: string;
  wiktionary_url: string;
}

export interface PackWord {
  lang: string;
  concept: string;
  word: string;
  pos: string;
  gloss: string;
  ipa: string;
  script: Script;
  shared: boolean;
  senseWords: string[];
  meaning: string;
  senses: string[];
  etymology: string;
  quiz: boolean;
}

export interface WordCounts {
  rows: number;
  words: number;
  quiz: number;
  lessonOnly: number;
  rejected: Record<string, number>;
  languages: number;
  concepts: number;
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

export function packWord(cell: WordCell, raw: RawEntry, languageName: string): PackWord {
  return {
    lang: cell.lang,
    concept: cell.concept,
    word: cell.word,
    pos: cell.pos,
    gloss: cell.gloss,
    ipa: cell.ipa,
    script: cell.script,
    shared: cell.shared,
    senseWords: [...cell.senseWords].sort(),
    meaning: raw.g.trim(),
    senses: otherSenses(raw),
    etymology: cleanEtymology(raw.e, languageName, cell.word),
    quiz: true,
  };
}

export function lessonOnlyWord(raw: RawEntry, languageName: string): PackWord {
  const word = raw.s.trim();
  const cell: WordCell = { lang: raw.l, concept: raw.c!, pos: raw.p ?? "", word, folded: fold(word), gloss: "", ipa: cleanIpa(raw.ipa), script: scriptOf(word), shared: false, senseWords: new Set() };
  return { ...packWord(cell, raw, languageName), quiz: false };
}

export function checkLicenceText(text: string): string {
  if (!text.includes(LICENCE_TITLE) || text.length < 10_000) throw new Error(`word pack: ${LICENCE_FILE} must hold the full ${LICENCE_TITLE} licence text`);
  return text;
}

export function wordPackChecksum(pack: WordPack): string {
  const { version: _v, sha256: _s, ...body } = pack;
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export function assembleWords(raw: RawWords, deny: Denylist, licenceText: string): WordPack {
  const attribution = checkAttribution(raw.attribution);
  const set = buildWordSet(raw);
  const known = new Set(set.languages);
  const tally: Record<string, number> = {};
  const count = (why: string) => (tally[why] = (tally[why] ?? 0) + 1);
  const groups = new Map<string, RawEntry[]>();
  for (const w of raw.words) {
    const why = known.has(w.l) ? rejection(w, set.conceptPos) : OUTSIDE_LANGUAGE;
    if (why) count(why);
    else groups.set(`${w.l}\u0000${w.c}`, [...(groups.get(`${w.l}\u0000${w.c}`) ?? []), w]);
  }
  const nameOf = (lang: string) => {
    const name = LANGUAGE_NAMES[lang];
    if (!name) throw new Error(`word pack: no language name for ${lang}`);
    return name;
  };
  const sole = new Map<string, RawEntry>();
  const extra: PackWord[] = [];
  for (const [key, group] of groups) {
    const usable = group.filter(usableWord);
    for (let i = usable.length; i < group.length; i++) count(BAD_FORM);
    if (group.length === 1 && usable.length === 1) sole.set(key, group[0]);
    else {
      const seen = new Set<string>();
      for (const w of usable) {
        count(SEVERAL_WORDS);
        if (seen.has(fold(w.s))) continue;
        seen.add(fold(w.s));
        extra.push(lessonOnlyWord(w, nameOf(w.l)));
      }
    }
  }
  const checked = set.cells.map((cell) => {
    const row = sole.get(`${cell.lang}\u0000${cell.concept}`);
    if (!row || row.s.trim() !== cell.word) throw new Error(`word pack: no single source row for ${cell.lang} ${cell.word}`);
    return packWord(cell, row, nameOf(cell.lang));
  });
  if (checked.length !== sole.size) throw new Error(`word pack: ${sole.size} rows pass the checks and the quiz set holds ${checked.length}`);
  if (checked.length === 0) throw new Error(`word pack: ${WORDS_FILE} gave no word that passes the quiz checks`);
  const words = [...checked, ...extra];
  const languages = set.languages.filter((l) => words.some((w) => w.lang === l));
  const counts: WordCounts = {
    rows: raw.words.length,
    words: words.length,
    quiz: checked.length,
    lessonOnly: extra.length,
    rejected: Object.fromEntries(Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    languages: languages.length,
    concepts: new Set(words.map((w) => w.concept)).size,
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

export function rejectionRows(c: WordCounts): [string, number][] {
  return Object.entries(c.rejected);
}

export function describeWordCounts(c: WordCounts): string {
  return `${c.words} words kept of ${c.rows} rows (${c.quiz} for lessons and the quiz, ${c.lessonOnly} for lessons only), ${c.languages} languages, ${c.concepts} concepts, ${c.withIpa} with IPA, ${c.withEtymology} with etymology`;
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
  console.log(`  ${describeWordCounts(pack.counts)}`);
  for (const [why, n] of rejectionRows(pack.counts)) console.log(`  ${String(n).padStart(5)}  ${why}`);
}
