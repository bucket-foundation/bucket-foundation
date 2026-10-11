import { checkLimits } from "../../../../src/lib/research-os/work-quiz/limits";
import type { SampledQuestion } from "../../../../src/lib/research-os/work-quiz/forms";
import { seededRng } from "../../../../src/lib/research-os/work-quiz/generate";
import { languageDir, type Dir } from "../../../../src/lib/research-os/work-quiz/languages";
import { fold, languageMakers, wordFactId, type Script, type WordCell, type WordSet } from "../../../../src/lib/research-os/work-quiz/polingual-forms";
import { LANGUAGE_FORMS } from "../../../../src/lib/research-os/work-quiz/space";
import type { PackWord, WordPack } from "../pack/words";

export const LESSON_WORDS = 8;
export const MIN_THEME_WORDS = 4;
export const WORD_DECK_PREFIX = "words-";
export const CONCEPT_PAGE = LESSON_WORDS;
export const MIXED_THEME = "mixed";

export const THEMES: readonly { id: string; title: string; concepts: readonly string[] }[] = [
  { id: "body", title: "Body", concepts: ["arm", "back", "belly", "blood", "bone", "breast", "ear", "eye", "foot", "hair", "hand", "head", "heart", "leg", "liver", "mouth", "neck", "nose", "skin", "tongue", "tooth"] },
  { id: "people", title: "People", concepts: ["child", "father", "friend", "god", "guest", "husband", "king", "man", "mother", "people", "person", "wife", "woman"] },
  { id: "animals", title: "Animals", concepts: ["bird", "cat", "cow", "dog", "fish", "horse", "snake", "worm"] },
  { id: "food", title: "Food", concepts: ["bread", "egg", "fruit", "honey", "meat", "milk", "salt", "wine"] },
  { id: "plants", title: "Plants", concepts: ["flower", "grass", "leaf", "root", "seed", "tree", "wood"] },
  { id: "sky", title: "Sky and weather", concepts: ["cloud", "day", "ice", "light", "lightning", "moon", "night", "rain", "sky", "snow", "star", "sun", "thunder", "wind"] },
  { id: "land", title: "Land and water", concepts: ["ash", "dust", "earth", "fire", "gold", "ground", "hill", "iron", "lake", "metal", "mountain", "ocean", "river", "road", "rock", "sand", "sea", "silver", "smoke", "stone", "water", "way"] },
  { id: "colors", title: "Colors", concepts: ["black", "blue", "brown", "green", "red", "white", "yellow"] },
  { id: "numbers", title: "Numbers", concepts: ["count", "five", "four", "number", "one", "ten", "three", "two"] },
  { id: "qualities", title: "Qualities", concepts: ["bad", "big", "cold", "deep", "dry", "empty", "free", "full", "good", "heavy", "high", "hot", "left", "long", "narrow", "near", "new", "old", "right", "round", "sharp", "short", "small", "sweet", "thick", "thin", "true", "warm", "wet", "wide", "young"] },
  { id: "actions", title: "Actions", concepts: ["burn", "come", "cry", "die", "drink", "eat", "fall", "fly", "give", "go", "hear", "kill", "know", "laugh", "live", "love", "play", "read", "run", "say", "see", "sit", "sleep", "speak", "stand", "swim", "take", "think", "walk", "work", "write"] },
  { id: "life", title: "Life and ideas", concepts: ["book", "death", "door", "dream", "fear", "house", "law", "letter", "life", "name", "peace", "song", "soul", "spirit", "time", "truth", "war", "word", "year"] },
  { id: MIXED_THEME, title: "Mixed words", concepts: [] },
];

const THEME_OF = new Map(THEMES.flatMap((t, i) => t.concepts.map((c): [string, number] => [c, i])));
const MIXED_INDEX = THEMES.length - 1;

export const POS_NAMES: Readonly<Record<string, string>> = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", num: "number", pron: "pronoun", prep: "preposition", name: "name" };

export function themeIndex(concept: string): number {
  return THEME_OF.get(concept) ?? MIXED_INDEX;
}

export function themeTitle(concept: string): string {
  return THEMES[themeIndex(concept)].title;
}

export interface WordLicence {
  credit: WordCredit;
  changes: string;
  title: string;
  text: string;
}

export interface WordCredit {
  text: string;
  licence: string;
  licenceHref: string;
  href: string;
  sourceHref: string;
}

export interface WordView {
  lang: string;
  name: string;
  dir: Dir;
  script: Script;
  concept: string;
  word: string;
  ipa: string;
  pos: string;
  meaning: string;
  senses: string[];
  etymology: string;
  href: string;
  quiz: boolean;
}

export interface LessonWord extends WordView {
  theme: string;
  others: WordView[];
}

export interface WordDeck {
  id: string;
  lang: string;
  name: string;
  dir: Dir;
  words: number;
  quiz: number;
  lessons: number;
}

export interface WordLesson {
  n: number;
  title: string;
  concepts: string[];
  quiz: number;
}

export interface LessonPage {
  deck: WordDeck;
  n: number;
  of: number;
  title: string;
  words: LessonWord[];
}

export interface ConceptRow {
  concept: string;
  theme: string;
  pos: string;
  words: WordView[][];
}

export interface ConceptPage {
  page: number;
  of: number;
  concepts: number;
  languages: { code: string; name: string; dir: Dir }[];
  rows: ConceptRow[];
}

export function wordSetFromPack(pack: WordPack): WordSet {
  const cells: WordCell[] = pack.words.filter((w) => w.quiz).map((w) => ({ lang: w.lang, concept: w.concept, pos: w.pos, word: w.word, folded: fold(w.word), gloss: w.gloss, ipa: w.ipa, script: w.script, shared: w.shared, senseWords: new Set(w.senseWords) }));
  const byLang: Record<string, WordCell[]> = {};
  const byConcept: Record<string, WordCell[]> = {};
  for (const c of cells) {
    (byLang[c.lang] ??= []).push(c);
    (byConcept[c.concept] ??= []).push(c);
  }
  return { languages: pack.languages, names: pack.names, scripts: pack.scripts, credit: `${pack.attribution.data}, ${pack.attribution.license}`, wiktionaryUrl: pack.attribution.wiktionary_url, cells, byLang, conceptPos: pack.conceptPos, byConcept };
}

export function wordCredit(pack: Pick<WordPack, "attribution" | "licenceUrl">): WordCredit {
  const a = pack.attribution;
  return {
    text: `Words, definitions, IPA and etymology from ${a.data}, ${a.license}, shortened and filtered by Bucket. Full entries at ${a.wiktionary_url.replace(/^https:\/\//, "")}.`,
    licence: a.license,
    licenceHref: pack.licenceUrl,
    href: a.wiktionary_url,
    sourceHref: a.source_url,
  };
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

const pairKey = (lang: string, concept: string) => `${lang}:${concept}`;
const rowKey = (lang: string, concept: string, word: string) => `${lang}:${concept}:${word}`;

export class WordBook {
  readonly set: WordSet;
  readonly credit: WordCredit;
  readonly version: string;
  readonly licence: WordLicence;
  private rows = new Map<string, PackWord>();
  private byLang: Record<string, WordCell[]> = {};
  private byPair = new Map<string, WordCell[]>();
  private plans = new Map<string, { lesson: WordLesson; cells: WordCell[] }[]>();

  constructor(pack: WordPack) {
    this.set = wordSetFromPack(pack);
    this.credit = wordCredit(pack);
    this.version = pack.version;
    this.licence = { credit: this.credit, changes: pack.changes, title: `Creative Commons ${pack.attribution.license}`, text: pack.licenceText };
    const checked = new Map(this.set.cells.map((c) => [pairKey(c.lang, c.concept), c]));
    for (const w of pack.words) {
      this.rows.set(rowKey(w.lang, w.concept, w.word), w);
      const cell: WordCell = w.quiz ? checked.get(pairKey(w.lang, w.concept))! : { lang: w.lang, concept: w.concept, pos: w.pos, word: w.word, folded: fold(w.word), gloss: "", ipa: w.ipa, script: w.script, shared: false, senseWords: new Set() };
      (this.byLang[w.lang] ??= []).push(cell);
      this.byPair.set(pairKey(w.lang, w.concept), [...(this.byPair.get(pairKey(w.lang, w.concept)) ?? []), cell]);
    }
  }

  inQuiz(cell: WordCell): boolean {
    return this.rows.get(rowKey(cell.lang, cell.concept, cell.word))?.quiz === true;
  }

  words(lang: string): WordCell[] {
    return this.byLang[lang] ?? [];
  }

  languages(): string[] {
    return this.set.languages.filter((l) => this.words(l).length > 0);
  }

  known(chosen: readonly string[]): string[] {
    const have = new Set(this.languages());
    return Array.from(new Set(chosen)).filter((l) => have.has(l));
  }

  resolveDeck(raw: string): string | null {
    const want = raw.trim().toLowerCase().replace(new RegExp(`^${WORD_DECK_PREFIX}`), "");
    return this.languages().find((l) => l === want || this.set.names[l].toLowerCase() === want) ?? null;
  }

  private plan(lang: string): { lesson: WordLesson; cells: WordCell[] }[] {
    const cached = this.plans.get(lang);
    if (cached) return cached;
    const cells = this.words(lang)
      .map((c, i) => ({ c, i }))
      .sort((a, b) => themeIndex(a.c.concept) - themeIndex(b.c.concept) || a.c.concept.localeCompare(b.c.concept) || a.i - b.i)
      .map((x) => x.c);
    const groups: { title: string; cells: WordCell[] }[] = [];
    const loose: WordCell[] = [];
    THEMES.forEach((t, i) => {
      const own = cells.filter((c) => themeIndex(c.concept) === i);
      if (i === MIXED_INDEX || own.length < MIN_THEME_WORDS) loose.push(...own);
      else balanced(own, LESSON_WORDS).forEach((part, k, all) => groups.push({ title: all.length > 1 ? `${t.title} ${k + 1}` : t.title, cells: part }));
    });
    balanced(loose, LESSON_WORDS).forEach((part, k, all) => groups.push({ title: all.length > 1 ? `${THEMES[MIXED_INDEX].title} ${k + 1}` : THEMES[MIXED_INDEX].title, cells: part }));
    const out = groups.map((g, i) => ({ lesson: { n: i + 1, title: g.title, concepts: g.cells.map((c) => c.concept), quiz: g.cells.filter((c) => this.inQuiz(c)).length }, cells: g.cells }));
    this.plans.set(lang, out);
    return out;
  }

  deck(lang: string): WordDeck {
    return { id: `${WORD_DECK_PREFIX}${lang}`, lang, name: this.set.names[lang], dir: languageDir(lang), words: this.words(lang).length, quiz: (this.set.byLang[lang] ?? []).length, lessons: this.plan(lang).length };
  }

  decks(chosen: readonly string[]): WordDeck[] {
    return this.known(chosen).map((l) => this.deck(l));
  }

  lessons(lang: string): WordLesson[] {
    return this.plan(lang).map((p) => p.lesson);
  }

  lessonCells(lang: string, n: number): WordCell[] {
    return this.plan(lang)[n - 1]?.cells ?? [];
  }

  view(cell: WordCell): WordView {
    const row = this.rows.get(rowKey(cell.lang, cell.concept, cell.word))!;
    return {
      lang: cell.lang,
      name: this.set.names[cell.lang],
      dir: languageDir(cell.lang),
      script: cell.script,
      concept: cell.concept,
      word: cell.word,
      ipa: cell.ipa,
      pos: POS_NAMES[cell.pos] ?? cell.pos,
      meaning: row.meaning,
      senses: row.senses,
      etymology: row.etymology,
      href: `${this.set.wiktionaryUrl}/wiki/${encodeURIComponent(cell.word)}`,
      quiz: row.quiz,
    };
  }

  private inLanguage(concept: string, lang: string): WordCell[] {
    return this.byPair.get(pairKey(lang, concept)) ?? [];
  }

  lesson(lang: string, n: number, chosen: readonly string[]): LessonPage | null {
    const part = this.plan(lang)[n - 1];
    if (!part) return null;
    const others = this.known(chosen).filter((l) => l !== lang);
    const words = part.cells.map((c): LessonWord => ({
      ...this.view(c),
      theme: themeTitle(c.concept),
      others: others.flatMap((l) => this.inLanguage(c.concept, l).map((o) => this.view(o))),
    }));
    return { deck: this.deck(lang), n, of: this.plan(lang).length, title: part.lesson.title, words };
  }

  private conceptOrder(chosen: readonly string[]): string[] {
    const langs = this.known(chosen);
    const cover = (c: string) => langs.filter((l) => this.inLanguage(c, l).length > 0).length;
    return Array.from(new Set(Array.from(this.rows.values(), (w) => w.concept)))
      .filter((c) => cover(c) > 0)
      .sort((a, b) => cover(b) - cover(a) || themeIndex(a) - themeIndex(b) || a.localeCompare(b));
  }

  concepts(chosen: readonly string[], page: number): ConceptPage {
    const langs = this.known(chosen);
    const order = this.conceptOrder(chosen);
    const of = Math.max(1, Math.ceil(order.length / CONCEPT_PAGE));
    const at = Math.min(Math.max(1, page), of);
    const rows = order.slice((at - 1) * CONCEPT_PAGE, at * CONCEPT_PAGE).map((concept): ConceptRow => ({
      concept,
      theme: themeTitle(concept),
      pos: POS_NAMES[this.set.conceptPos[concept]] ?? this.set.conceptPos[concept] ?? "",
      words: langs.map((l) => this.inLanguage(concept, l).map((c) => this.view(c))),
    }));
    return { page: at, of, concepts: order.length, languages: langs.map((l) => ({ code: l, name: this.set.names[l], dir: languageDir(l) })), rows };
  }

  conceptCells(chosen: readonly string[], page: number): WordCell[] {
    const langs = this.known(chosen);
    return this.concepts(chosen, page).rows.flatMap((r) => langs.flatMap((l) => this.inLanguage(r.concept, l)));
  }

  questions(cells: readonly WordCell[], chosen: readonly string[], seed: string): SampledQuestion[] {
    const prefer = this.known(chosen);
    const out: SampledQuestion[] = [];
    const seen = new Set<string>();
    cells.filter((c) => this.inQuiz(c)).forEach((cell, i) => {
      const makers = languageMakers(this.set, [cell.lang], (c) => c === cell, prefer);
      for (let k = 0; k < LANGUAGE_FORMS.length; k++) {
        const form = LANGUAGE_FORMS[(i + k) % LANGUAGE_FORMS.length];
        const q = makers[form]?.({ beads: [], prs: [], notes: [], repoUrl: null }, seededRng(`${seed}|${wordFactId(cell)}|${form}`), 1) ?? null;
        if (!q || seen.has(q.id) || checkLimits(q).length > 0) continue;
        if (form === "pair" && !prefer.includes(q.word?.choicesLang ?? "")) continue;
        seen.add(q.id);
        out.push(q);
        return;
      }
    });
    return out;
  }

  studyCells(lang: string, size: number, started: ReadonlySet<string>, due: ReadonlySet<string>): WordCell[] {
    const all = this.plan(lang).flatMap((p) => p.cells).filter((c) => this.inQuiz(c));
    const rank = (c: WordCell) => (due.has(wordFactId(c)) ? 0 : started.has(wordFactId(c)) ? 2 : 1);
    return all.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).slice(0, size).map((x) => x.c);
  }
}
