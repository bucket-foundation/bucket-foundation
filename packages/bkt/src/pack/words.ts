import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LANGUAGE_NAMES } from "../../../../src/lib/research-os/work-quiz/languages";
import { buildWordSet, type RawSubset, type RawWord, type Script, type WordCell } from "../../../../src/lib/research-os/work-quiz/polingual-forms";
import { assertClean, buildDenylist, type Denylist } from "./rights";

export const WORD_PACK_BUDGET_BYTES = 1024 * 1024;
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
}

export interface WordCounts {
  rows: number;
  words: number;
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

const cellKey = (lang: string, concept: string, word: string) => `${lang}\u0000${concept}\u0000${word}`;

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
  };
}

export function wordPackChecksum(pack: WordPack): string {
  const { version: _v, sha256: _s, ...body } = pack;
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export function assembleWords(raw: RawWords, deny: Denylist): WordPack {
  const attribution = checkAttribution(raw.attribution);
  const set = buildWordSet(raw);
  const rows = new Map<string, RawEntry[]>();
  for (const w of raw.words) {
    const k = cellKey(w.l, w.c ?? "", w.s.trim());
    rows.set(k, [...(rows.get(k) ?? []), w]);
  }
  const words = set.cells.map((cell) => {
    const found = rows.get(cellKey(cell.lang, cell.concept, cell.word)) ?? [];
    if (found.length !== 1) throw new Error(`word pack: ${found.length} source rows for ${cell.lang} ${cell.word}; each word needs one`);
    const name = LANGUAGE_NAMES[cell.lang];
    if (!name) throw new Error(`word pack: no language name for ${cell.lang}`);
    return packWord(cell, found[0], name);
  });
  if (words.length === 0) throw new Error(`word pack: ${WORDS_FILE} gave no word that passes the quiz checks`);
  const languages = set.languages.filter((l) => (set.byLang[l] ?? []).length > 0);
  const counts: WordCounts = {
    rows: raw.words.length,
    words: words.length,
    languages: languages.length,
    concepts: new Set(words.map((w) => w.concept)).size,
    withIpa: words.filter((w) => w.ipa).length,
    withEtymology: words.filter((w) => w.etymology).length,
  };
  const names = Object.fromEntries(languages.map((l) => [l, LANGUAGE_NAMES[l]]));
  const scripts = Object.fromEntries(languages.map((l) => [l, set.scripts[l]]));
  const conceptPos = Object.fromEntries(Object.entries(set.conceptPos).sort(([a], [b]) => a.localeCompare(b)));
  const body = { source: WORDS_FILE, attribution, licenceUrl: LICENCE_URL, languages, names, scripts, conceptPos, words, counts };
  const sha256 = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const pack: WordPack = { version: sha256.slice(0, 12), sha256, ...body };
  assertClean(deny, pack, "the word pack");
  return pack;
}

export function buildWordPack(repo: string, deny: Denylist = buildDenylist(repo)): WordPack {
  return assembleWords(JSON.parse(readFileSync(join(repo, WORDS_FILE), "utf8")) as RawWords, deny);
}

export function describeWordCounts(c: WordCounts): string {
  return `${c.words} words kept of ${c.rows} rows, ${c.languages} languages, ${c.concepts} concepts, ${c.withIpa} with IPA, ${c.withEtymology} with etymology`;
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
}
