export const REAL_WORDS = 50;
export const PSEUDOWORDS = 20;
export const RANK_BANDS: readonly (readonly [number, number])[] = [
  [1, 1000],
  [1001, 2000],
  [2001, 4000],
  [4001, 6000],
  [6001, 8000],
];
export const BANK = 8000;
export const TEST_DAY = 28;
export const WINDOW_END_DAY = 35;
export const MAX_ATTEMPTS = 40;
export const MIN_LENGTH = 3;
export const MIN_BIGRAM_COUNT = 2;

const VOWELS = new Set(Array.from("aeiouyáéíóúýàèìòùâêîôûäëïöüãõåæøœ"));
const LATIN_WORD = /^[a-zà-ÿœæ]+$/;

export type SegmentKind = "o" | "n" | "c";

export interface Syllable {
  o: string;
  n: string;
  c: string;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeWord(w: string): string {
  return w.normalize("NFC").toLowerCase().trim();
}

export function syllabify(word: string): Syllable[] | null {
  const w = normalizeWord(word);
  if (!LATIN_WORD.test(w)) return null;
  const chars = Array.from(w);
  const runs: { v: boolean; s: string }[] = [];
  for (const ch of chars) {
    const v = VOWELS.has(ch);
    const last = runs[runs.length - 1];
    if (last && last.v === v) last.s += ch;
    else runs.push({ v, s: ch });
  }
  const nuclei = runs.filter((r) => r.v).length;
  if (!nuclei) return null;
  const out: Syllable[] = [];
  let onset = "";
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (!r.v) {
      if (!out.length && !onset) onset = r.s;
      continue;
    }
    const syl: Syllable = { o: onset, n: r.s, c: "" };
    onset = "";
    const next = runs[i + 1];
    if (next && !next.v) {
      const cs = Array.from(next.s);
      if (i + 2 >= runs.length) syl.c = next.s;
      else if (cs.length >= 2) {
        syl.c = cs[0];
        onset = cs.slice(1).join("");
      } else onset = next.s;
    }
    out.push(syl);
  }
  return out;
}

export function joinSyllables(s: readonly Syllable[]): string {
  return s.map((x) => x.o + x.n + x.c).join("");
}

function position(i: number, n: number): string {
  return n === 1 ? "m" : i === 0 ? "i" : i === n - 1 ? "f" : "x";
}

function cmp(a: string, b: string): number {
  const x = Array.from(a).map((c) => c.codePointAt(0)!);
  const y = Array.from(b).map((c) => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

export interface Lexicon {
  words: ReadonlySet<string>;
  segments: ReadonlyMap<string, string[]>;
  bigrams: ReadonlySet<string>;
}

function chain(s: readonly Syllable[]): string[] {
  return ["^", ...s.flatMap((x) => [`o:${x.o}`, `n:${x.n}`, `c:${x.c}`]), "$"];
}

export function buildLexicon(core: readonly string[], reject: readonly string[] = []): Lexicon {
  const set = new Set<string>(reject.map(normalizeWord));
  const seg = new Map<string, Set<string>>();
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const raw of core) {
    const w = normalizeWord(raw);
    if (seen.has(w)) continue;
    seen.add(w);
    set.add(w);
    const s = syllabify(w);
    if (!s) continue;
    s.forEach((x, i) => {
      const p = position(i, s.length);
      for (const k of ["o", "n", "c"] as const) {
        const key = `${p}${k}`;
        if (!seg.has(key)) seg.set(key, new Set());
        seg.get(key)!.add(x[k]);
      }
    });
    const c = chain(s);
    for (let i = 1; i < c.length; i++) counts.set(`${c[i - 1]}|${c[i]}`, (counts.get(`${c[i - 1]}|${c[i]}`) ?? 0) + 1);
  }
  const bigrams = new Set(Array.from(counts.entries()).filter(([, n]) => n >= MIN_BIGRAM_COUNT).map(([k]) => k));
  const segments = new Map(Array.from(seg.entries()).map(([k, v]) => [k, Array.from(v).sort(cmp)] as [string, string[]]));
  return { words: set, segments, bigrams };
}

function legal(s: readonly Syllable[], lex: Lexicon): boolean {
  const c = chain(s);
  for (let i = 1; i < c.length; i++) if (!lex.bigrams.has(`${c[i - 1]}|${c[i]}`)) return false;
  return true;
}

const PLAIN = new Set(Array.from("aeiouy"));

export function marks(w: string): number {
  return Array.from(normalizeWord(w)).filter((c) => VOWELS.has(c) && !PLAIN.has(c)).length;
}

export function pseudoword(reference: string, lex: Lexicon, rand: () => number, taken: ReadonlySet<string> = new Set()): string | null {
  const ref = syllabify(reference);
  if (!ref) return null;
  const kinds: SegmentKind[] = ["o", "n", "c"];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const next = ref.map((x, i) => {
      const k = kinds[Math.floor(rand() * 3)];
      const pool = (lex.segments.get(`${position(i, ref.length)}${k}`) ?? []).filter((v) => v !== x[k]);
      return pool.length ? { ...x, [k]: pool[Math.floor(rand() * pool.length)] } : x;
    });
    const w = joinSyllables(next);
    const len = Array.from(w).length;
    if (len < MIN_LENGTH || Math.abs(len - Array.from(normalizeWord(reference)).length) > 1 || marks(w) !== marks(reference)) continue;
    if (w === normalizeWord(reference) || lex.words.has(w) || taken.has(w) || !syllabify(w) || !legal(next, lex)) continue;
    return w;
  }
  return null;
}

export interface RankedWord {
  word: string;
  rank: number;
}

export interface TestItem {
  word: string;
  real: boolean;
  band: number | null;
}

export function assembleTest(candidates: readonly RankedWord[], exclude: ReadonlySet<string>, seed: number, lex: Lexicon, avoid: ReadonlySet<string> = new Set()): TestItem[] | null {
  const rand = mulberry32(seed);
  const pool = new Map<string, number>();
  for (const c of candidates) {
    const w = normalizeWord(c.word);
    if (!syllabify(w) || exclude.has(w) || avoid.has(w)) continue;
    if (!pool.has(w) || c.rank < pool.get(w)!) pool.set(w, c.rank);
  }
  const per = REAL_WORDS / RANK_BANDS.length;
  const real: TestItem[] = [];
  for (let b = 0; b < RANK_BANDS.length; b++) {
    const [lo, hi] = RANK_BANDS[b];
    const inBand = Array.from(pool.entries()).filter(([, r]) => r >= lo && r <= hi).map(([w]) => w).sort(cmp);
    if (inBand.length < per) return null;
    const picked = new Set<string>();
    while (picked.size < per) picked.add(inBand[Math.floor(rand() * inBand.length)]);
    for (const w of Array.from(picked).sort(cmp)) real.push({ word: w, real: true, band: b });
  }
  const taken = new Set([...real.map((r) => r.word), ...Array.from(avoid)]);
  const pseudo: TestItem[] = [];
  for (let i = 0; pseudo.length < PSEUDOWORDS && i < PSEUDOWORDS * 10; i++) {
    const ref = real[Math.floor(rand() * real.length)].word;
    const p = pseudoword(ref, lex, rand, taken);
    if (!p) continue;
    taken.add(p);
    pseudo.push({ word: p, real: false, band: null });
  }
  if (pseudo.length < PSEUDOWORDS) return null;
  const all = [...real, ...pseudo];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

export interface YesNoScore {
  hits: number;
  words: number;
  falseAlarms: number;
  pseudowords: number;
  known: number;
}

export function yesNoKnown(hits: number, words: number, falseAlarms: number, pseudowords: number, bank: number = BANK): number {
  const h = words ? hits / words : 0;
  const f = pseudowords ? falseAlarms / pseudowords : 0;
  if (f >= 1) return 0;
  return Math.max(0, Math.min(1, (h - f) / (1 - f))) * bank;
}

export function scoreTest(items: readonly TestItem[], yes: ReadonlySet<string>): YesNoScore {
  const real = items.filter((i) => i.real);
  const pseudo = items.filter((i) => !i.real);
  const hits = real.filter((i) => yes.has(i.word)).length;
  const falseAlarms = pseudo.filter((i) => yes.has(i.word)).length;
  return { hits, words: real.length, falseAlarms, pseudowords: pseudo.length, known: yesNoKnown(hits, real.length, falseAlarms, pseudo.length) };
}

const DAY_MS = 86_400_000;

export function testDue(enrolledAt: number | null, now: number, taken: { baseline: boolean; day28: boolean }): "baseline" | "day28" | null {
  if (enrolledAt === null || now < enrolledAt) return null;
  if (!taken.baseline) return "baseline";
  const day = Math.floor((now - enrolledAt) / DAY_MS);
  return !taken.day28 && day >= TEST_DAY && day <= WINDOW_END_DAY ? "day28" : null;
}
