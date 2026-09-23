import { langName } from "./node-words";

export const MIN_CONFIDENCE = 0.5;

export const NSM_CITATION = {
  text: "Semantic primes and their categories from Goddard, C., and Wierzbicka, A. (2014). Words and Meanings. Oxford University Press, Table 2.1.",
  doi: "https://doi.org/10.1093/acprof:oso/9780199668434.001.0001",
};

export interface NsmPrimeRow {
  id: string;
  label: string;
  category: string;
  english: string[] | null;
  ord: number;
  en_word: string | null;
  en_pos: string | null;
  sense: string | null;
  sense_match: boolean | null;
}

export interface NsmExponentRow {
  prime_id: string;
  lang: string;
  word: string;
  rank: number;
  roman: string | null;
  sense: string | null;
  sense_match: boolean;
  confidence: number | string;
  root_lang: string | null;
  root_form: string | null;
  root_gloss: string | null;
}

export interface NsmExponent {
  lang: string;
  langName: string;
  word: string;
  rank: number;
  roman: string | null;
  confidence: number;
  confirmed: boolean;
  rootLang: string | null;
  rootLangName: string | null;
  rootForm: string | null;
  rootGloss: string | null;
}

export type SenseStatus = "matched" | "fallback" | "none";

export interface NsmPrime {
  id: string;
  label: string;
  category: string;
  english: string[];
  ord: number;
  lookup: string | null;
  sense: string | null;
  senseStatus: SenseStatus;
  exponents: NsmExponent[];
}

export interface NsmCategory {
  category: string;
  primes: NsmPrime[];
}

const LANG = /^[a-z]{2,3}(-[a-z]{2,4})?$/;

export function parseLang(v: string | null): string | null | undefined {
  const s = (v || "").trim();
  if (!s) return null;
  return LANG.test(s) ? s : undefined;
}

export function toExponent(row: NsmExponentRow): NsmExponent {
  const confidence = Number(row.confidence);
  const c = Number.isFinite(confidence) ? confidence : 0;
  return {
    lang: row.lang,
    langName: langName(row.lang),
    word: row.word,
    rank: row.rank,
    roman: row.roman || null,
    confidence: c,
    confirmed: c >= MIN_CONFIDENCE,
    rootLang: row.root_lang || null,
    rootLangName: row.root_lang ? langName(row.root_lang) : null,
    rootForm: row.root_form || null,
    rootGloss: row.root_gloss || null,
  };
}

export function senseStatus(row: NsmPrimeRow): SenseStatus {
  if (row.sense_match === null || !row.sense) return "none";
  return row.sense_match ? "matched" : "fallback";
}

export function assemble(primes: NsmPrimeRow[], exponents: NsmExponentRow[], opts: { includeUnconfirmed?: boolean } = {}): NsmPrime[] {
  const byPrime = new Map<string, NsmExponent[]>();
  for (const row of exponents) {
    const e = toExponent(row);
    if (!opts.includeUnconfirmed && !e.confirmed) continue;
    byPrime.set(row.prime_id, (byPrime.get(row.prime_id) ?? []).concat(e));
  }
  return primes
    .slice()
    .sort((a, b) => a.ord - b.ord)
    .map((p) => ({
      id: p.id,
      label: p.label,
      category: p.category,
      english: Array.isArray(p.english) ? p.english : [],
      ord: p.ord,
      lookup: p.en_word ? [p.en_word, p.en_pos].filter(Boolean).join(", ") : null,
      sense: p.sense || null,
      senseStatus: senseStatus(p),
      exponents: (byPrime.get(p.id) ?? []).sort((a, b) => a.langName.localeCompare(b.langName) || a.rank - b.rank),
    }));
}

export function byCategory(primes: NsmPrime[]): NsmCategory[] {
  const out: NsmCategory[] = [];
  for (const p of primes) {
    const last = out[out.length - 1];
    if (last && last.category === p.category) last.primes.push(p);
    else out.push({ category: p.category, primes: [p] });
  }
  return out;
}

export const NSM_LANGS = [
  "en", "akk", "ang", "ar", "cop", "cs", "de", "egy", "el", "es", "fa", "fi", "fr", "got", "grc", "he", "hi", "id",
  "it", "ja", "ko", "la", "nl", "non", "pl", "pt", "ru", "sa", "sux", "sv", "ta", "th", "tr", "vi", "zh",
] as const;
