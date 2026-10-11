import type { Database } from "bun:sqlite";
import { CARD_KEY_SEPARATOR, FACT_JOIN, factId } from "../../../../src/lib/research-os/work-quiz/fact";
import type { SampledQuestion } from "../../../../src/lib/research-os/work-quiz/forms";
import { LANGUAGE_NAMES, languageDir, textDir, type Dir } from "../../../../src/lib/research-os/work-quiz/languages";
import { countTokens, LIMITS } from "../../../../src/lib/research-os/work-quiz/limits";
import { cleanIpa, fold, scriptOf, WORD_TOKENS, type Script } from "../../../../src/lib/research-os/work-quiz/polingual-forms";
import { deckMeta, listInstalled, openCheckedDeck, SEARCH_ROW_CAP, type DeckManifest, type InstalledDeck } from "../decks";
import { SENSE_CHARS, SENSES_KEPT, shortMeaning, type PackWord, type WordPack } from "../pack/words";
import { POS_NAMES, WordBook, wordRef, type ConceptPage, type LessonCell, type LessonPage, type WordCredit, type WordDeck, type WordLesson, type WordView } from "./words";

export const DECK_LESSON_WORDS = 2000;
export const DECK_SCAN_FACTOR = 25;
export const SENSE_JOIN = " · ";
export const LESSON_POS: ReadonlySet<string> = new Set(["noun", "verb", "adj", "adv", "num", "pron", "prep"]);
export const WORD_SEARCH_LIMIT = 20;
export const WORD_SEARCH_MAX = 50;
export const WORD_QUERY_CHARS = 80;
export const BUNDLED_DECK = "bundled";
export const BUNDLED_TITLE = "Words that came with Bucket";
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

export interface DeckCredit {
  deck: string;
  title: string;
  source: string;
  sourceHref: string | null;
  licence: string;
  licenceHref: string | null;
  curator: string | null;
}

export type CreditWithDecks = WordCredit & { also?: DeckCredit[] };

export interface WordHit {
  lang: string;
  name: string;
  dir: Dir;
  script: Script;
  word: string;
  ipa: string;
  pos: string;
  meaning: string;
  href: string | null;
  deck: string;
  source: string;
  licence: string;
}

export interface WordSearch {
  query: string;
  hits: WordHit[];
  languages: number;
  words: number;
  credits: DeckCredit[];
}

const WORD_COLUMNS = "w.id, w.surface, w.folded, w.ipa, w.pos, w.meaning, w.head, w.shared";

export function deckCredit(m: DeckManifest): DeckCredit {
  return { deck: m.id, title: m.title, source: m.source, sourceHref: m.source_url, licence: m.licence, licenceHref: m.licence_url, curator: m.curator };
}

export function bundledCredit(c: WordCredit, source: string): DeckCredit {
  return { deck: BUNDLED_DECK, title: BUNDLED_TITLE, source, sourceHref: c.sourceHref, licence: c.licence, licenceHref: c.licenceHref, curator: null };
}

export function creditLine(c: DeckCredit): string {
  return `${c.title}: ${c.source}, ${c.licence}${c.curator ? `, curated by ${c.curator}` : ""}.`;
}

export class WordDeckFile {
  private db: Database | null = null;
  readonly lang: string;
  readonly name: string;
  opens = 0;

  constructor(readonly installed: InstalledDeck) {
    this.lang = installed.manifest.language!;
    this.name = LANGUAGE_NAMES[this.lang] ?? installed.manifest.language_name ?? this.lang;
  }

  get manifest(): DeckManifest {
    return this.installed.manifest;
  }

  get isOpen(): boolean {
    return this.db !== null;
  }

  private open(): Database {
    if (!this.db) {
      this.db = openCheckedDeck(this.installed.db, this.manifest);
      this.opens++;
    }
    return this.db;
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  credit(): DeckCredit {
    return deckCredit(this.manifest);
  }

  entryHref(word: string): string | null {
    const base = this.manifest.wiktionary_url;
    return base ? `${base}/wiki/${encodeURIComponent(word)}` : null;
  }

  meta(): Record<string, string> {
    return deckMeta(this.open());
  }

  *top(limit: number): Generator<DeckWord> {
    const q = this.open().query<DeckWord, [number]>(`select ${WORD_COLUMNS} from words w order by w.id limit ?`);
    for (const row of q.iterate(Math.max(0, Math.min(limit, DECK_LESSON_WORDS * DECK_SCAN_FACTOR)))) yield row;
  }

  search(raw: string, limit: number): DeckWord[] {
    const tokens = searchTokens(raw);
    if (tokens.length === 0) return [];
    const n = Math.max(1, Math.min(limit, WORD_SEARCH_MAX));
    const phrase = tokens.map((t, i) => `"${t}"${i === tokens.length - 1 ? "*" : ""}`).join(" ");
    const whole = tokens.join(" ");
    const run = (match: string) =>
      this.open()
        .query<DeckWord, [string, number, string, number]>(`select ${WORD_COLUMNS} from (select rowid from words_fts where words_fts match ? limit ?) f join words w on w.id = f.rowid order by (w.folded = ?) desc, w.id limit ?`)
        .all(match, SEARCH_ROW_CAP, whole, n);
    const byWord = run(`{surface folded} : ${phrase}`);
    if (byWord.length >= n) return byWord;
    const seen = new Set(byWord.map((r) => r.id));
    return [...byWord, ...run(`meaning : ${phrase}`).filter((r) => !seen.has(r.id))].slice(0, n);
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

const mentions = (gloss: string, concept: string) => new RegExp(`(^|[^a-z])${concept.replace(/[^a-z' -]/g, "")}`, "i").test(gloss);
const refSafe = (s: string) => !s.includes(FACT_JOIN) && !s.includes(CARD_KEY_SEPARATOR);

export function deckIpa(raw: string): string {
  return cleanIpa(raw.trim().replace(/^[/[]+/, ""));
}

export function lessonWord(lang: string, row: DeckWord): PackWord | null {
  const word = row.surface.trim();
  const parts = senses(row.meaning);
  if (parts.length === 0 || !LESSON_POS.has(row.pos) || FORM_OF.test(parts[0])) return null;
  const script = scriptOf(word);
  if (word.length === 0 || word.length > LIMITS.tokenChars || script === "other" || countTokens(word) > WORD_TOKENS || !refSafe(word)) return null;
  const short = shortMeaning(parts[0]);
  const ipa = deckIpa(row.ipa);
  const kept: string[] = [];
  for (const s of parts.slice(1)) if (s !== parts[0] && !kept.includes(s) && s.length <= SENSE_CHARS && kept.length < SENSES_KEPT) kept.push(s);
  return { lang, word, pos: row.pos, script, meaning: parts[0], ...(ipa ? { ipa } : {}), ...(kept.length ? { senses: kept } : {}), ...(short ? { short, quiz: true as const } : {}) };
}

const pairKey = (lang: string, concept: string) => `${lang}:${concept}`;

export function deckLessonWords(bundled: WordPack, lang: string, rows: Iterable<DeckWord>, cap = DECK_LESSON_WORDS): PackWord[] {
  if (!LANGUAGE_NAMES[lang] || !bundled.languages.includes(lang)) return [];
  const forms = new Set(bundled.words.filter((w) => w.lang === lang).map((w) => fold(w.word)));
  const held = new Set(bundled.words.filter((w) => w.lang === lang && w.strict && w.concept).map((w) => w.concept!));
  const kept: PackWord[] = [];
  let scanned = 0;
  for (const row of rows) {
    if (kept.length >= cap || scanned++ >= cap * DECK_SCAN_FACTOR) break;
    const w = lessonWord(lang, row);
    if (!w) continue;
    const folded = fold(w.word);
    if (forms.has(folded)) continue;
    forms.add(folded);
    const head = row.head.trim();
    if (lang !== "en" && head && bundled.conceptPos[head] === w.pos && !held.has(head) && refSafe(head) && mentions(w.meaning, head)) {
      held.add(head);
      w.concept = head;
      w.strict = true;
    }
    kept.push(w);
  }
  return kept;
}

export class DeckWordBook extends WordBook {
  readonly bundled: WordBook;
  readonly files: readonly WordDeckFile[];
  private inner: WordBook;
  private added = new Map<string, PackWord[]>();
  private byFact = new Map<string, WordDeckFile>();
  private byLanguage = new Map<string, WordDeckFile>();
  builds = 0;

  constructor(
    private pack: WordPack,
    files: readonly WordDeckFile[],
    private cap = DECK_LESSON_WORDS,
    private onError: (message: string) => void = () => {},
  ) {
    super(pack);
    this.bundled = this;
    this.inner = this;
    this.files = files;
    for (const f of files) if (LANGUAGE_NAMES[f.lang] && pack.languages.includes(f.lang) && !this.byLanguage.has(f.lang)) this.byLanguage.set(f.lang, f);
  }

  private ensure(langs: readonly string[]): WordBook {
    let grew = false;
    for (const lang of langs) {
      const file = this.byLanguage.get(lang);
      if (!file || this.added.has(lang)) continue;
      let words: PackWord[] = [];
      try {
        words = deckLessonWords(this.pack, lang, file.top(this.cap * DECK_SCAN_FACTOR), this.cap);
      } catch (e) {
        file.close();
        this.onError(`the installed ${file.manifest.title} deck did not open (${(e as Error).message}); run bkt doctor`);
      }
      this.added.set(lang, words);
      for (const w of words) this.byFact.set(factId("word", wordRef(w)), file);
      grew ||= words.length > 0;
    }
    if (grew) {
      this.inner = new WordBook({ ...this.pack, words: [...this.pack.words, ...Array.from(this.added.values()).flat()] });
      this.builds++;
    }
    return this.inner;
  }

  private base<T>(own: (b: WordBook) => T, mine: () => T): T {
    return this.inner === this ? mine() : own(this.inner);
  }

  loaded(): string[] {
    return Array.from(this.added.keys()).sort();
  }

  deckOf(cell: Pick<LessonCell, "ref">): WordDeckFile | null {
    return this.byFact.get(factId("word", cell.ref)) ?? null;
  }

  fromDeck(cell: Pick<LessonCell, "ref">): boolean {
    return this.deckOf(cell) !== null;
  }

  creditsFor(langs: readonly string[]): DeckCredit[] {
    return Array.from(new Set(langs)).flatMap((l) => {
      const f = this.byLanguage.get(l);
      return f && (this.added.get(l)?.length ?? 1) > 0 ? [f.credit()] : [];
    });
  }

  creditText(langs: readonly string[]): string {
    return [this.credit.text, ...this.creditsFor(langs).map(creditLine)].join(" ");
  }

  override languages(): string[] {
    return this.set.languages.filter((l) => super.words(l).length > 0);
  }

  override words(lang: string): LessonCell[] {
    this.ensure([lang]);
    return this.base((b) => b.words(lang), () => super.words(lang));
  }

  override deck(lang: string): WordDeck {
    this.ensure([lang]);
    return this.base((b) => b.deck(lang), () => super.deck(lang));
  }

  override decks(chosen: readonly string[]): WordDeck[] {
    this.ensure(this.known(chosen));
    return this.known(chosen).map((l) => this.deck(l));
  }

  override lessons(lang: string): WordLesson[] {
    this.ensure([lang]);
    return this.base((b) => b.lessons(lang), () => super.lessons(lang));
  }

  override lessonCells(lang: string, n: number): LessonCell[] {
    this.ensure([lang]);
    return this.base((b) => b.lessonCells(lang, n), () => super.lessonCells(lang, n));
  }

  override view(cell: LessonCell): WordView {
    const v = super.view(cell);
    const file = this.deckOf(cell);
    return file ? { ...v, href: file.entryHref(cell.word) ?? file.manifest.source_url ?? v.href } : v;
  }

  override lesson(lang: string, n: number, chosen: readonly string[]): LessonPage | null {
    this.ensure([lang, ...this.known(chosen)]);
    const page = this.base((b) => b.lesson(lang, n, chosen), () => super.lesson(lang, n, chosen));
    if (!page) return null;
    const cells = this.lessonCells(lang, n);
    return { ...page, words: page.words.map((w, i) => ({ ...w, href: this.view(cells[i]).href })) };
  }

  override conceptCount(): number {
    return this.base((b) => b.conceptCount(), () => super.conceptCount());
  }

  override concepts(chosen: readonly string[], page: number): ConceptPage {
    this.ensure(this.known(chosen));
    return this.base((b) => b.concepts(chosen, page), () => super.concepts(chosen, page));
  }

  override conceptCells(chosen: readonly string[], page: number): LessonCell[] {
    this.ensure(this.known(chosen));
    return this.base((b) => b.conceptCells(chosen, page), () => super.conceptCells(chosen, page));
  }

  override meaningPick(cell: LessonCell, seed: string): SampledQuestion | null {
    this.ensure([cell.lang]);
    return this.credited(this.base((b) => b.meaningPick(cell, seed), () => super.meaningPick(cell, seed)));
  }

  override questions(cells: readonly LessonCell[], chosen: readonly string[], seed: string): SampledQuestion[] {
    this.ensure(Array.from(new Set(cells.map((c) => c.lang))));
    return this.base((b) => b.questions(cells, chosen, seed), () => super.questions(cells, chosen, seed)).map((q) => this.credited(q)!);
  }

  override studyCells(lang: string, size: number, started: ReadonlySet<string>, due: ReadonlySet<string>): LessonCell[] {
    this.ensure([lang]);
    return this.base((b) => b.studyCells(lang, size, started, due), () => super.studyCells(lang, size, started, due));
  }

  private credited(q: SampledQuestion | null): SampledQuestion | null {
    if (!q) return null;
    const file = q.factIds.map((id) => this.byFact.get(id)).find((f) => f !== undefined);
    if (!file) return q;
    const label = `${file.manifest.source}, ${file.manifest.licence}`;
    const href = file.entryHref(q.type === "meaning" && q.lines[0] ? q.lines[0] : q.answer) ?? file.manifest.source_url ?? "";
    return { ...q, sources: q.sources.map((s) => ({ ...s, label, href })), word: q.word ? { ...q.word, credit: label, href: file.manifest.wiktionary_url ?? file.manifest.source_url ?? q.word.href } : q.word };
  }

  close(): void {
    for (const d of this.files) d.close();
  }
}

export function wordBookFor(bundled: WordPack, home: string, o: { cap?: number; onError?: (message: string) => void } = {}): DeckWordBook {
  return new DeckWordBook(bundled, openWordDecks(home), o.cap ?? DECK_LESSON_WORDS, o.onError);
}

export function searchWords(book: WordBook, decks: readonly WordDeckFile[], raw: string, o: { limit?: number; lang?: string | null; onError?: (message: string) => void } = {}): WordSearch {
  const limit = Math.min(Math.max(1, o.limit ?? WORD_SEARCH_LIMIT), WORD_SEARCH_MAX);
  const query = raw.trim().slice(0, WORD_QUERY_CHARS);
  const tokens = searchTokens(query);
  const whole = tokens.join(" ");
  const want = o.lang?.trim().toLowerCase() || null;
  const inScope = (lang: string, name: string) => !want || lang === want || name.toLowerCase() === want;
  const own = bundledCredit(book.credit, book.set.credit.split(",")[0]);
  const found: { hit: WordHit; exact: boolean; rank: number; credit: DeckCredit }[] = [];
  const seen = new Set<string>();
  const push = (hit: WordHit, rank: number, credit: DeckCredit) => {
    const key = pairKey(hit.lang, fold(hit.word));
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ hit, exact: fold(hit.word) === whole, rank, credit });
  };
  const shape = (lang: string, name: string, w: { word: string; ipa: string; pos: string; meaning: string }, href: string | null, c: DeckCredit): WordHit => ({
    lang,
    name,
    dir: LANGUAGE_NAMES[lang] ? languageDir(lang) : textDir(w.word),
    script: scriptOf(w.word),
    word: w.word,
    ipa: w.ipa,
    pos: POS_NAMES[w.pos] ?? w.pos.replace(/_/g, " "),
    meaning: w.meaning,
    href,
    deck: c.deck,
    source: c.source,
    licence: c.licence,
  });
  const searched = new Set<string>();
  if (tokens.length > 0) {
    for (const d of decks) {
      if (!inScope(d.lang, d.name)) continue;
      const credit = d.credit();
      try {
        for (const r of d.search(query, limit)) push(shape(d.lang, d.name, { word: r.surface, ipa: deckIpa(r.ipa), pos: r.pos, meaning: r.meaning }, d.entryHref(r.surface), credit), r.id, credit);
        searched.add(d.lang);
      } catch (e) {
        d.close();
        o.onError?.(`the installed ${d.manifest.title} deck did not open (${(e as Error).message}); run bkt doctor`);
      }
    }
    for (const lang of book.set.languages) {
      if (!inScope(lang, book.set.names[lang] ?? lang)) continue;
      for (const c of WordBook.prototype.words.call(book, lang) as LessonCell[]) {
        const folded = fold(c.word);
        if (!(folded.startsWith(whole) || c.concept === whole || fold(c.short) === whole)) continue;
        push(shape(lang, book.set.names[lang], { word: c.word, ipa: c.ipa, pos: c.pos, meaning: c.meaning }, `${book.set.wiktionaryUrl}/wiki/${encodeURIComponent(c.word)}`, own), 0, own);
      }
    }
  }
  found.sort((a, b) => Number(b.exact) - Number(a.exact) || a.rank - b.rank || a.hit.lang.localeCompare(b.hit.lang) || a.hit.word.localeCompare(b.hit.word));
  const top = found.slice(0, limit);
  const deckLangs = new Set(decks.map((d) => d.lang));
  const bundledWords = book.set.languages.reduce((n, l) => n + (deckLangs.has(l) ? 0 : (WordBook.prototype.words.call(book, l) as LessonCell[]).length), 0);
  const credits: DeckCredit[] = [];
  for (const f of top) if (!credits.some((c) => c.deck === f.credit.deck)) credits.push(f.credit);
  return { query, hits: top.map((f) => f.hit), languages: new Set([...book.set.languages, ...deckLangs]).size, words: decks.reduce((n, d) => n + d.manifest.counts.cards, 0) + bundledWords, credits };
}

export function wordHitLine(h: WordHit): string {
  return [h.name, h.word, h.ipa ? `/${h.ipa}/` : "", h.pos, h.meaning].filter(Boolean).join("  ");
}
