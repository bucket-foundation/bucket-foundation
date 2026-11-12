import { usable, type LangCorpus } from "@academy/lang-systems";

const MASK = (BigInt(1) << BigInt(64)) - BigInt(1);
const FNV_OFFSET = BigInt("0xcbf29ce484222325");
const FNV_PRIME = BigInt("0x100000001b3");
const GOLDEN = BigInt("0x9E3779B97F4A7C15");
const B7 = BigInt(7);
const B13 = BigInt(13);
const B17 = BigInt(17);

export const DAILY_POOL = 400;
export const SAME_WORD_MEANINGS = 4;
export const SAME_WORD_LANGS = 3;
export const QUIZ_LENGTH = 10;

export const SWIFT_LANG_CODES = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "ru", "el", "ar", "hi", "ja", "zh", "ko", "he", "fa", "tr", "cs", "id", "vi", "th", "ta", "la", "grc", "sa", "ang"];

const FAMILIES = [
  ["es", "pt", "it", "fr", "en", "de", "nl", "sv", "pl", "cs", "fi", "tr", "id", "vi", "la", "ang"],
  ["ru", "el", "grc"],
  ["ar", "fa", "he"],
  ["hi", "sa", "ta", "th"],
  ["ja", "zh", "ko"],
];
const CLASSICAL = ["la", "ang", "grc", "sa"];

export class SeededRandom {
  private state: bigint;
  constructor(seed: bigint) {
    this.state = (seed & MASK) === BigInt(0) ? GOLDEN : seed & MASK;
  }
  next(): bigint {
    let s = this.state;
    s ^= (s << B13) & MASK;
    s ^= s >> B7;
    s ^= (s << B17) & MASK;
    this.state = s;
    return s;
  }
}

export function fnvHash(text: string): bigint {
  let h = FNV_OFFSET;
  for (const b of new TextEncoder().encode(text)) {
    h ^= BigInt(b);
    h = (h * FNV_PRIME) & MASK;
  }
  return h;
}

export function seedValue(seed: string): bigint {
  if (/^\d+$/.test(seed)) {
    const v = BigInt(seed);
    if (v <= MASK) return v;
  }
  return fnvHash(seed);
}

export function mixed<T>(xs: readonly T[], rng: SeededRandom): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Number(rng.next() % BigInt(i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter() : null;

function graphemes(s: string): string[] {
  if (!segmenter) return Array.from(s);
  return Array.from(segmenter.segment(s), (x) => x.segment);
}

const key = (s: string) => s.normalize("NFC");
const lower = (s: string) => key(s.toLowerCase());

function swiftLess(a: string, b: string): boolean {
  const x = Array.from(key(a), (c) => c.codePointAt(0)!);
  const y = Array.from(key(b), (c) => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] < y[i];
  return x.length < y.length;
}

const swiftCompare = (a: string, b: string) => (swiftLess(a, b) ? -1 : swiftLess(b, a) ? 1 : 0);

export interface GameWord {
  itemId: string;
  lang: string;
  form: string;
  gloss: string;
  root: string;
  rank: number;
}

export type PromptMode = "form" | "flag";

export interface GamePrompt {
  id: number;
  mode: PromptMode;
  word: GameWord;
  choices: string[];
  answer: string;
  group: number;
}

interface Entry {
  itemId: string;
  form: string;
  gloss: string;
  category: string;
}

export class GameDeck {
  readonly pools = new Map<string, Entry[]>();
  readonly index = new Map<string, Map<string, Entry>>();

  constructor(
    corpus: Pick<LangCorpus, "items">,
    readonly root: string,
    readonly targets: string[],
  ) {
    for (const l of targets) {
      const entries: Entry[] = [];
      for (const i of corpus.items) {
        if (i.kind !== "word" || !usable(i, root, l)) continue;
        const f = i.forms[l];
        const g = i.forms[root];
        if (!f || !g || key(f) === key(g)) continue;
        entries.push({ itemId: i.id, form: f, gloss: g, category: i.category });
      }
      this.pools.set(l, entries);
      const idx = new Map<string, Entry>();
      for (const e of entries) if (!idx.has(e.itemId)) idx.set(e.itemId, e);
      this.index.set(l, idx);
    }
  }

  word(itemId: string, lang: string): GameWord | null {
    const e = this.index.get(lang)?.get(itemId);
    return e ? { itemId: e.itemId, lang, form: e.form, gloss: e.gloss, root: this.root, rank: 2 } : null;
  }

  foils(word: GameWord, rng: SeededRandom, also: string[] = [], count = 3): string[] {
    const pool = this.pools.get(word.lang) ?? [];
    const category = this.index.get(word.lang)?.get(word.itemId)?.category;
    const form = lower(word.form);
    const gloss = lower(word.gloss);
    const chars = graphemes(word.form);
    const size = chars.length;
    const first = chars[0] === undefined ? undefined : key(chars[0]);
    const close = pool
      .filter((e) => lower(e.gloss) !== gloss && lower(e.form) !== form)
      .map((e) => {
        const g = graphemes(e.form);
        const head = g[0] === undefined ? undefined : key(g[0]);
        return { rank: (e.category === category ? 0 : 4) + Math.min(3, Math.abs(g.length - size)) + (head === first ? 0 : 1), entry: e };
      })
      .sort((a, b) => a.rank - b.rank || swiftCompare(a.entry.itemId, b.entry.itemId))
      .slice(0, 16)
      .map((x) => x.entry);
    const taken = new Set([form, ...also.map(lower)]);
    const out = also.filter((a) => lower(a) !== form);
    for (const e of mixed(close, rng)) {
      if (out.length >= count) continue;
      const k = lower(e.form);
      if (!taken.has(k)) {
        taken.add(k);
        out.push(e.form);
      }
    }
    return out.slice(0, count);
  }

  daily(count: number, rng: SeededRandom): GameWord[] {
    const langs = this.targets.slice().sort(swiftCompare);
    if (langs.length === 0) return [];
    const used = new Set<string>();
    const out: GameWord[] = [];
    let i = 0;
    const common = langs.map((l) => mixed((this.pools.get(l) ?? []).slice(0, DAILY_POOL), rng));
    const cursors = langs.map(() => 0);
    while (out.length < count && cursors.some((c, k) => c < common[k].length)) {
      const k = i % langs.length;
      i++;
      while (cursors[k] < common[k].length) {
        const e = common[k][cursors[k]];
        cursors[k]++;
        if (!used.has(e.itemId)) {
          used.add(e.itemId);
          out.push({ itemId: e.itemId, lang: langs[k], form: e.form, gloss: e.gloss, root: this.root, rank: 2 });
          break;
        }
      }
    }
    return out;
  }

  shared(): string[] {
    const first = this.targets[0];
    return first === undefined ? [] : (this.pools.get(first) ?? []).map((e) => e.itemId);
  }
}

export function formPrompt(id: number, word: GameWord, deck: GameDeck, rng: SeededRandom, also: string[] = [], group = 0): GamePrompt {
  const foils = deck.foils(word, rng, also);
  return { id, mode: "form", word, choices: mixed([word.form, ...foils], rng), answer: word.form, group };
}

export function lobbyRounds(deck: GameDeck, seed: bigint, count: number): GamePrompt[] {
  const rng = new SeededRandom(seed);
  return deck.daily(count, rng).map((w, i) => formPrompt(i, w, deck, rng));
}

export function sameWordRounds(deck: GameDeck, words: GameWord[], rng: SeededRandom): GamePrompt[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const id of [...words.filter((w) => w.root === deck.root).map((w) => w.itemId), ...deck.shared()]) {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  const out: GamePrompt[] = [];
  let group = 0;
  for (const id of ids) {
    if (group >= SAME_WORD_MEANINGS) continue;
    const family = deck.targets.map((l) => deck.word(id, l)).filter((w): w is GameWord => w !== null).slice(0, SAME_WORD_LANGS);
    if (family.length < 2 || new Set(family.map((w) => key(w.form))).size !== family.length) continue;
    for (const w of family) {
      const other = family.find((f) => f.lang !== w.lang)?.form;
      out.push(formPrompt(out.length, w, deck, rng, other === undefined ? [] : [other], group));
    }
    group++;
  }
  return out;
}

export function family(lang: string): string[] {
  return FAMILIES.find((f) => f.includes(lang)) ?? [lang];
}

export function distractors(lang: string, own: string[], rng: SeededRandom, excluding: Set<string> = new Set(), count = 3): string[] {
  const blocked = new Set([...excluding, lang, ...CLASSICAL.filter((c) => !own.includes(c))]);
  const kin = family(lang).filter((l) => !blocked.has(l));
  const near = [...mixed(kin.filter((l) => own.includes(l)), rng), ...mixed(kin.filter((l) => !own.includes(l)), rng)];
  if (near.length >= 2) return near.slice(0, count);
  const far = [
    ...mixed(own.filter((l) => !blocked.has(l) && !near.includes(l)), rng),
    ...mixed(SWIFT_LANG_CODES.filter((l) => !blocked.has(l) && !near.includes(l) && !own.includes(l)), rng),
  ];
  return [...near, ...far].slice(0, count);
}

export function balanced(words: GameWord[]): GameWord[] {
  const langs: string[] = [];
  const queues = new Map<string, GameWord[]>();
  for (const w of words) {
    if (!queues.has(w.lang)) {
      langs.push(w.lang);
      queues.set(w.lang, []);
    }
    queues.get(w.lang)!.push(w);
  }
  const turns: GameWord[] = [];
  while (turns.length < words.length) {
    for (const l of langs) {
      const w = queues.get(l)!.shift();
      if (w) turns.push(w);
    }
  }
  return turns
    .map((w, i) => ({ w, i }))
    .sort((a, b) => Math.min(a.w.rank, 2) - Math.min(b.w.rank, 2) || a.i - b.i)
    .map((x) => x.w);
}

export function flagRounds(words: GameWord[], own: string[], rng: SeededRandom, count = QUIZ_LENGTH, sameForm: (w: GameWord, lang: string) => boolean = () => false): GamePrompt[] {
  const seen = new Set<string>();
  const unique = balanced(words).filter((w) => {
    const k = lower(w.form);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const out: GamePrompt[] = [];
  for (const w of unique.slice(0, count)) {
    const clash = new Set(SWIFT_LANG_CODES.filter((l) => sameForm(w, l)));
    const wrong = distractors(w.lang, own, rng, clash);
    out.push({ id: out.length, mode: "flag", word: w, choices: mixed([w.lang, ...wrong], rng), answer: w.lang, group: 0 });
  }
  return out;
}

export type LobbyGame = "daily" | "same-word" | "flags" | "live";

export const LOBBY_GAMES: { id: LobbyGame; title: string; blurb: string }[] = [
  { id: "daily", title: "Daily words", blurb: "Pick the word in the target language." },
  { id: "same-word", title: "Same word", blurb: "One meaning across your languages." },
  { id: "flags", title: "Which language", blurb: "Name the language of each word." },
  { id: "live", title: "Live quiz", blurb: "Big-screen quiz with teams and a QR join." },
];

export function lobbyGame(raw: unknown): LobbyGame {
  return LOBBY_GAMES.some((g) => g.id === raw) ? (raw as LobbyGame) : "daily";
}

export function lobbyPrompts(corpus: Pick<LangCorpus, "items" | "byId">, lobby: { game?: unknown; root: string; targets: string[]; seed: string; rounds: number }): GamePrompt[] {
  const deck = new GameDeck(corpus, lobby.root, lobby.targets);
  const seed = seedValue(lobby.seed);
  const game = lobbyGame(lobby.game);
  if (game === "same-word") {
    const rng = new SeededRandom(seed);
    return sameWordRounds(deck, [], rng).slice(0, lobby.rounds);
  }
  if (game === "flags") {
    const rng = new SeededRandom(seed);
    const words = deck.daily(lobby.rounds, rng);
    const sameForm = (w: GameWord, l: string) => {
      const f = corpus.byId.get(w.itemId)?.forms[l];
      return l !== w.lang && !!f && lower(f) === lower(w.form);
    };
    return flagRounds(words, lobby.targets, rng, lobby.rounds, sameForm);
  }
  return lobbyRounds(deck, seed, lobby.rounds);
}
