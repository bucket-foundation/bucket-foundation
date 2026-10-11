import type { Database } from "bun:sqlite";
import { CARD_KEY_SEPARATOR, FACT_JOIN } from "../../../../src/lib/research-os/work-quiz/fact";
import type { SampledQuestion } from "../../../../src/lib/research-os/work-quiz/forms";
import { seededRng } from "../../../../src/lib/research-os/work-quiz/generate";
import { LANGUAGE_NAMES, languageDir, textDir, type Dir } from "../../../../src/lib/research-os/work-quiz/languages";
import { checkLimits, countTokens, LIMITS } from "../../../../src/lib/research-os/work-quiz/limits";
import { cleanIpa, fold, GLOSS_TOKENS, headword, languageMakers, MIN_GLOSS_TOKENS, scriptOf, VAGUE_GLOSS, wordFactId, WORD_TOKENS, type Script, type WordCell } from "../../../../src/lib/research-os/work-quiz/polingual-forms";
import { LANGUAGE_FORMS } from "../../../../src/lib/research-os/work-quiz/space";
import { deckMeta, listInstalled, openDeckDb, type DeckManifest, type InstalledDeck } from "../decks";
import { SENSE_CHARS, SENSES_KEPT, type PackWord, type WordPack } from "../pack/words";
import { LESSON_WORDS, POS_NAMES, WordBook, type WordCredit, type WordLesson } from "./words";

export const DECK_LESSON_WORDS = 2000;
export const DECK_SCAN_FACTOR = 25;
export const DECK_LESSON_TITLE = "Common words";
export const SENSE_WORD_CHARS = 600;
export const SENSE_JOIN = " · ";
export const LESSON_POS: ReadonlySet<string> = new Set(["noun", "verb", "adj", "adv", "num", "pron", "prep"]);
export const CONCEPT_SHAPE = /^[a-z][a-z' -]{0,31}$/;
export const WORD_SEARCH_LIMIT = 20;
export const WORD_SEARCH_MAX = 50;
export const WORD_QUERY_CHARS = 80;
export const BUNDLED_DECK = "bundled";
export const FORM_OF =
  /^(?:[\w'-]+[ /]){0,6}?(?:inflection|plural|singular|dual|forms?|participle|gerund|infinitive|imperative|indicative|subjunctive|supine|tense|person|genitive|dative|accusative|ablative|vocative|nominative|locative|instrumental|comparative|superlative|diminutive|augmentative|spelling|romanization|transliteration|abbreviation|initialism|acronym|synonym|misspelling|variant|contraction|clipping|ellipsis|degree|definite|indefinite|conjugation|declension) of\b/i;

export interface DeckWord {
  id: number;
  surface: string;
  folded: string;
  ipa: string;
  pos: string;
  meaning: string;
  head: string;
  shared: number;
}

export interface WordHit {
  lang: string;
  name: string;
  dir: Dir;
  script: Script;
  word: string;
  ipa: string;
  pos: string;
  meaning: string;
  href: string;
  deck: string;
}

export interface WordSearch {
  query: string;
  hits: WordHit[];
  languages: number;
  words: number;
  credit: WordCredit;
}

const WORD_COLUMNS = "w.id, w.surface, w.folded, w.ipa, w.pos, w.meaning, w.head, w.shared";

export class WordDeckFile {
  private db: Database | null = null;
  readonly lang: string;
  readonly name: string;

  constructor(readonly installed: InstalledDeck) {
    this.lang = installed.manifest.language!;
    this.name = LANGUAGE_NAMES[this.lang] ?? installed.manifest.language_name ?? this.lang;
  }

  get manifest(): DeckManifest {
    return this.installed.manifest;
  }

  private open(): Database {
    this.db ??= openDeckDb(this.installed.db);
    return this.db;
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  meta(): Record<string, string> {
    return deckMeta(this.open());
  }

  *top(limit: number): Generator<DeckWord> {
    const q = this.open().query<DeckWord, [number]>(`select ${WORD_COLUMNS} from words w order by w.id limit ?`);
    for (const row of q.iterate(limit)) yield row;
  }

  search(raw: string, limit: number): DeckWord[] {
    const tokens = searchTokens(raw);
    if (tokens.length === 0) return [];
    const phrase = tokens.map((t, i) => `"${t}"${i === tokens.length - 1 ? "*" : ""}`).join(" ");
    const whole = tokens.join(" ");
    const run = (match: string, n: number) =>
      this.open()
        .query<DeckWord, [string, string, number]>(`select ${WORD_COLUMNS} from words_fts f join words w on w.id = f.rowid where words_fts match ? order by (w.folded = ?) desc, w.id limit ?`)
        .all(match, whole, n);
    const byWord = run(`{surface folded} : ${phrase}`, limit);
    if (byWord.length >= limit) return byWord;
    const seen = new Set(byWord.map((r) => r.id));
    return [...byWord, ...run(`meaning : ${phrase}`, limit).filter((r) => !seen.has(r.id))].slice(0, limit);
  }
}

export function searchTokens(raw: string): string[] {
  return (fold(raw.slice(0, WORD_QUERY_CHARS)).match(/[\p{L}\p{N}\p{M}]+/gu) ?? []).slice(0, 6);
}

export function openWordDecks(home: string): WordDeckFile[] {
  return listInstalled(home)
    .filter((d) => d.manifest.kind === "words" && d.manifest.language !== null)
    .map((d) => new WordDeckFile(d))
    .sort((a, b) => a.lang.localeCompare(b.lang));
}

export function senses(meaning: string): string[] {
  return meaning.split(SENSE_JOIN).map((s) => s.trim()).filter(Boolean);
}

const plain = (gloss: string) => gloss.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
const firstPart = (gloss: string) => plain(gloss).split(/[,;/]/)[0].trim().replace(/[.!?…]+$/, "").trim();
const mentions = (gloss: string, concept: string) => new RegExp(`(^|[^a-z])${concept.replace(/[^a-z' -]/g, "")}`, "i").test(gloss);
const refSafe = (s: string) => !s.includes(FACT_JOIN) && !s.includes(CARD_KEY_SEPARATOR) && !s.includes(":");

export function deckIpa(raw: string): string {
  return cleanIpa(raw.trim().replace(/^[/[]+/, ""));
}

function englishGloss(first: string, concept: string): string {
  const cut = plain(first).split(";")[0].trim().replace(/[.!?]+$/, "");
  const tokens = countTokens(cut);
  if (/[…":]/.test(cut) || VAGUE_GLOSS.test(cut) || tokens < MIN_GLOSS_TOKENS || tokens > GLOSS_TOKENS) return "";
  return mentions(cut, concept) ? "" : cut;
}

export function lessonWord(lang: string, row: DeckWord): PackWord | null {
  const word = row.surface.trim();
  const parts = senses(row.meaning);
  if (parts.length === 0 || !LESSON_POS.has(row.pos) || FORM_OF.test(parts[0])) return null;
  const script = scriptOf(word);
  if (word.length === 0 || word.length > LIMITS.tokenChars || script === "other" || countTokens(word) > WORD_TOKENS || !refSafe(word)) return null;
  const concept = lang === "en" ? fold(word) : row.head.trim() || headword(parts[0]);
  if (!CONCEPT_SHAPE.test(concept) || countTokens(concept) > WORD_TOKENS || !refSafe(concept)) return null;
  const others = parts.slice(1);
  if (lang !== "en" && !mentions(parts[0], concept)) return null;
  if (lang !== "en" && others.length >= 2 && !others.some((s) => mentions(s, concept))) return null;
  const short = firstPart(parts[0]).toLowerCase();
  const gloss = lang === "en" ? englishGloss(parts[0], concept) : countTokens(short) <= GLOSS_TOKENS && short.length <= LIMITS.tokenChars * 2 ? short : "";
  const senseWords = new Set<string>([concept]);
  for (const m of row.meaning.slice(0, SENSE_WORD_CHARS).toLowerCase().match(/[a-z]+/g) ?? []) senseWords.add(m);
  const kept: string[] = [];
  for (const s of others) if (s !== parts[0] && !kept.includes(s) && s.length <= SENSE_CHARS && kept.length < SENSES_KEPT) kept.push(s);
  return { lang, concept, word, pos: row.pos, gloss, ipa: deckIpa(row.ipa), script, shared: row.shared === 1, senseWords: [...senseWords].sort(), meaning: parts[0], senses: kept, etymology: "" };
}

function mode(xs: readonly Script[]): Script {
  const n = new Map<Script, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  return Array.from(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "other";
}

export interface MergedWords {
  pack: WordPack;
  added: Map<string, PackWord[]>;
}

const pairKey = (lang: string, concept: string) => `${lang}:${concept}`;

export function mergeWordDecks(bundled: WordPack, decks: readonly { lang: string; rows: Iterable<DeckWord> }[], cap = DECK_LESSON_WORDS): MergedWords {
  const pairs = new Set(bundled.words.map((w) => pairKey(w.lang, w.concept)));
  const forms = new Set(bundled.words.map((w) => pairKey(w.lang, fold(w.word))));
  const spoken = new Map<string, Set<string>>();
  for (const w of bundled.words) spoken.set(fold(w.word), (spoken.get(fold(w.word)) ?? new Set()).add(w.lang));
  const conceptPos: Record<string, string> = { ...bundled.conceptPos };
  const added = new Map<string, PackWord[]>();
  for (const deck of [...decks].sort((a, b) => a.lang.localeCompare(b.lang))) {
    if (!LANGUAGE_NAMES[deck.lang] || added.has(deck.lang)) continue;
    const kept: PackWord[] = [];
    let scanned = 0;
    for (const row of deck.rows) {
      if (kept.length >= cap || scanned++ >= cap * DECK_SCAN_FACTOR) break;
      const w = lessonWord(deck.lang, row);
      if (!w) continue;
      const folded = fold(w.word);
      if (pairs.has(pairKey(w.lang, w.concept)) || forms.has(pairKey(w.lang, folded))) continue;
      if ((conceptPos[w.concept] ?? w.pos) !== w.pos) continue;
      conceptPos[w.concept] = w.pos;
      pairs.add(pairKey(w.lang, w.concept));
      forms.add(pairKey(w.lang, folded));
      spoken.set(folded, (spoken.get(folded) ?? new Set()).add(w.lang));
      kept.push(w);
    }
    if (kept.length > 0) added.set(deck.lang, kept);
  }
  if (added.size === 0) return { pack: bundled, added };
  const extra = Array.from(added.values()).flat();
  for (const w of extra) if ((spoken.get(fold(w.word))?.size ?? 0) > 1) w.shared = true;
  const words = [...bundled.words.map((w) => ((spoken.get(fold(w.word))?.size ?? 0) > 1 && !w.shared ? { ...w, shared: true } : w)), ...extra];
  const languages = [...bundled.languages, ...Array.from(added.keys()).filter((l) => !bundled.languages.includes(l))];
  const names = { ...bundled.names };
  const scripts = { ...bundled.scripts };
  for (const l of languages) {
    names[l] ??= LANGUAGE_NAMES[l];
    if (!scripts[l] || scripts[l] === "other") scripts[l] = mode(words.filter((w) => w.lang === l).map((w) => w.script));
  }
  const counts = { ...bundled.counts, words: words.length, languages: languages.length, concepts: new Set(words.map((w) => w.concept)).size, withIpa: words.filter((w) => w.ipa).length };
  return { pack: { ...bundled, languages, names, scripts, conceptPos, words, counts }, added };
}

function balanced<T>(xs: readonly T[], size: number): T[][] {
  const parts = Math.ceil(xs.length / size);
  const out: T[][] = [];
  let at = 0;
  for (let i = 0; i < parts; i++) {
    const take = Math.ceil((xs.length - at) / (parts - i));
    out.push(xs.slice(at, at + take));
    at += take;
  }
  return out;
}

export class DeckWordBook extends WordBook {
  readonly bundled: WordBook;
  readonly files: readonly WordDeckFile[];
  private fromDecks = new Set<string>();
  private deckPlans = new Map<string, { lesson: WordLesson; cells: WordCell[] }[]>();
  private cellAt = new Map<string, WordCell>();

  constructor(bundled: WordPack, decks: readonly WordDeckFile[], cap = DECK_LESSON_WORDS, merged: MergedWords = mergeWordDecks(bundled, decks.map((d) => ({ lang: d.lang, rows: d.top(cap * DECK_SCAN_FACTOR) })), cap)) {
    super(merged.pack);
    this.bundled = new WordBook(bundled);
    this.files = decks;
    for (const c of this.set.cells) this.cellAt.set(pairKey(c.lang, c.concept), c);
    for (const ws of merged.added.values()) for (const w of ws) this.fromDecks.add(wordFactId(this.cellAt.get(pairKey(w.lang, w.concept))!));
  }

  fromDeck(cell: WordCell): boolean {
    return this.fromDecks.has(wordFactId(cell));
  }

  protected override plan(lang: string): { lesson: WordLesson; cells: WordCell[] }[] {
    const cached = this.deckPlans.get(lang);
    if (cached) return cached;
    const own = this.bundled.lessons(lang).map((lesson) => ({ lesson, cells: lesson.concepts.map((c) => this.cellAt.get(pairKey(lang, c))!) }));
    const extra = (this.set.byLang[lang] ?? []).filter((c) => this.fromDeck(c));
    const more = balanced(extra, LESSON_WORDS).map((cells, k, all) => ({
      lesson: { n: own.length + k + 1, title: all.length > 1 ? `${DECK_LESSON_TITLE} ${k + 1}` : DECK_LESSON_TITLE, concepts: cells.map((c) => c.concept) },
      cells,
    }));
    const out = [...own, ...more];
    this.deckPlans.set(lang, out);
    return out;
  }

  override questions(cells: readonly WordCell[], chosen: readonly string[], seed: string): SampledQuestion[] {
    const prefer = this.known(chosen);
    const out: SampledQuestion[] = [];
    const seen = new Set<string>();
    cells.forEach((cell, i) => {
      const makers = languageMakers(this.set, [cell.lang], (c) => c === cell, prefer);
      for (let k = 0; k < LANGUAGE_FORMS.length; k++) {
        const form = LANGUAGE_FORMS[(i + k) % LANGUAGE_FORMS.length];
        const q = makers[form]?.({ beads: [], prs: [], notes: [], repoUrl: null }, seededRng(`${seed}|${wordFactId(cell)}|${form}`), 1) ?? null;
        if (!q || seen.has(q.id) || checkLimits(q).length > 0) continue;
        if (form === "pair" && (!prefer.includes(q.word?.choicesLang ?? "") || q.factIds.some((id) => this.fromDecks.has(id)))) continue;
        seen.add(q.id);
        out.push(q);
        return;
      }
    });
    return out;
  }

  close(): void {
    for (const d of this.files) d.close();
  }
}

export function wordBookFor(bundled: WordPack, home: string, o: { cap?: number; onError?: (message: string) => void } = {}): DeckWordBook {
  const cap = o.cap ?? DECK_LESSON_WORDS;
  const decks = openWordDecks(home);
  try {
    return new DeckWordBook(bundled, decks, cap);
  } catch (e) {
    for (const d of decks) d.close();
    o.onError?.(`an installed word deck did not open (${(e as Error).message}); run bkt doctor`);
    return new DeckWordBook(bundled, [], cap);
  }
}

function hitOf(book: WordBook, lang: string, name: string, w: { word: string; ipa: string; pos: string; meaning: string }, deck: string): WordHit {
  return { lang, name, dir: LANGUAGE_NAMES[lang] ? languageDir(lang) : textDir(w.word), script: scriptOf(w.word), word: w.word, ipa: w.ipa, pos: POS_NAMES[w.pos] ?? w.pos.replace(/_/g, " "), meaning: w.meaning, href: `${book.set.wiktionaryUrl}/wiki/${encodeURIComponent(w.word)}`, deck };
}

export function searchWords(book: WordBook, decks: readonly WordDeckFile[], raw: string, o: { limit?: number; lang?: string | null } = {}): WordSearch {
  const limit = Math.min(Math.max(1, o.limit ?? WORD_SEARCH_LIMIT), WORD_SEARCH_MAX);
  const query = raw.trim().slice(0, WORD_QUERY_CHARS);
  const tokens = searchTokens(query);
  const whole = tokens.join(" ");
  const want = o.lang?.trim().toLowerCase() || null;
  const inScope = (lang: string, name: string) => !want || lang === want || name.toLowerCase() === want;
  const found: { hit: WordHit; exact: boolean; rank: number }[] = [];
  const seen = new Set<string>();
  const push = (hit: WordHit, rank: number) => {
    const key = pairKey(hit.lang, fold(hit.word));
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ hit, exact: fold(hit.word) === whole, rank });
  };
  if (tokens.length > 0) {
    for (const d of decks) {
      if (!inScope(d.lang, d.name)) continue;
      for (const r of d.search(query, limit)) push(hitOf(book, d.lang, d.name, { word: r.surface, ipa: deckIpa(r.ipa), pos: r.pos, meaning: r.meaning }, d.manifest.id), r.id);
    }
    for (const c of book.set.cells) {
      if (!inScope(c.lang, book.set.names[c.lang] ?? c.lang)) continue;
      if (!(c.folded.startsWith(whole) || c.concept === whole || fold(c.gloss) === whole)) continue;
      const v = book.view(c);
      push(hitOf(book, c.lang, v.name, { word: v.word, ipa: v.ipa, pos: c.pos, meaning: v.meaning }, BUNDLED_DECK), 0);
    }
  }
  found.sort((a, b) => Number(b.exact) - Number(a.exact) || a.rank - b.rank || a.hit.lang.localeCompare(b.hit.lang) || a.hit.word.localeCompare(b.hit.word));
  const langs = new Set([...book.languages(), ...decks.map((d) => d.lang)]);
  const deckLangs = new Set(decks.map((d) => d.lang));
  const words = decks.reduce((n, d) => n + d.manifest.counts.cards, 0) + book.set.cells.filter((c) => !deckLangs.has(c.lang)).length;
  return { query, hits: found.slice(0, limit).map((f) => f.hit), languages: langs.size, words, credit: book.credit };
}

export function wordHitLine(h: WordHit): string {
  return [h.name, h.word, h.ipa ? `/${h.ipa}/` : "", h.pos, h.meaning].filter(Boolean).join("  ");
}
