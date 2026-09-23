import { HIDE_BELOW, UNCERTAIN_BELOW, langName } from "./node-words";

export { HIDE_BELOW, UNCERTAIN_BELOW };

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
  confidence: number | string | null;
  root_confidence: number | string | null;
  root_lang: string | null;
  root_form: string | null;
  root_gloss: string | null;
  colex_with?: string[] | null;
  root_source?: string | null;
}

export interface NsmExponent {
  lang: string;
  langName: string;
  word: string;
  rank: number;
  roman: string | null;
  confidence: number;
  hidden: boolean;
  uncertain: boolean;
  rootConfidence: number;
  rootHidden: boolean;
  rootUncertain: boolean;
  rootLang: string | null;
  rootLangName: string | null;
  rootForm: string | null;
  rootGloss: string | null;
  colexWith: string[];
  rootSource: string | null;
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
  colex: NsmColex[];
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

function readConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

export function toExponent(row: NsmExponentRow, opts: { includeHidden?: boolean } = {}): NsmExponent {
  const c = readConfidence(row.confidence);
  const rc = row.root_form ? readConfidence(row.root_confidence) : 0;
  const rootHidden = rc < HIDE_BELOW;
  const keepRoot = Boolean(row.root_form) && (!rootHidden || Boolean(opts.includeHidden));
  return {
    lang: row.lang,
    langName: langName(row.lang),
    word: row.word,
    rank: row.rank,
    roman: row.roman || null,
    confidence: c,
    hidden: c < HIDE_BELOW,
    uncertain: c < UNCERTAIN_BELOW,
    rootConfidence: rc,
    rootHidden,
    rootUncertain: rc < UNCERTAIN_BELOW,
    rootLang: keepRoot ? row.root_lang || null : null,
    rootLangName: keepRoot && row.root_lang ? langName(row.root_lang) : null,
    rootForm: keepRoot ? row.root_form || null : null,
    rootGloss: keepRoot ? row.root_gloss || null : null,
    rootSource: keepRoot ? row.root_source || null : null,
    colexWith: Array.isArray(row.colex_with) ? row.colex_with.filter((x): x is string => typeof x === "string") : [],
  };
}

export const CLICS_ATTRIBUTION = {
  text: "Colexifications from CLICS 4, Tjuka, Forkel, Rzymski and List (2026), under CC BY 4.0.",
  doi: "https://doi.org/10.5281/zenodo.16900179",
  license: "https://creativecommons.org/licenses/by/4.0/",
};

export interface NsmColexRow {
  prime_a: string;
  prime_b: string;
  lang: string;
  form: string;
  family_count: number;
  matched: boolean;
}

export interface NsmColex {
  other: string;
  otherLabel: string;
  lang: string;
  langName: string;
  form: string;
  families: number;
  matched: boolean;
}

export function colexFor(primeId: string, rows: NsmColexRow[], labels: Map<string, string>): NsmColex[] {
  return rows
    .filter((r) => r.prime_a === primeId || r.prime_b === primeId)
    .map((r) => {
      const other = r.prime_a === primeId ? r.prime_b : r.prime_a;
      return { other, otherLabel: labels.get(other) ?? other, lang: r.lang, langName: langName(r.lang), form: r.form, families: r.family_count, matched: r.matched };
    })
    .sort((a, b) => a.otherLabel.localeCompare(b.otherLabel) || a.langName.localeCompare(b.langName));
}

export function senseStatus(row: NsmPrimeRow): SenseStatus {
  if (row.sense_match === null || !row.sense) return "none";
  return row.sense_match ? "matched" : "fallback";
}

export function assemble(primes: NsmPrimeRow[], exponents: NsmExponentRow[], opts: { includeHidden?: boolean; colex?: NsmColexRow[] } = {}): NsmPrime[] {
  const byPrime = new Map<string, NsmExponent[]>();
  for (const row of exponents) {
    const e = toExponent(row, opts);
    if (!opts.includeHidden && e.hidden) continue;
    byPrime.set(row.prime_id, (byPrime.get(row.prime_id) ?? []).concat(e));
  }
  const labels = new Map(primes.map((p) => [p.id, p.label]));
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
      colex: colexFor(p.id, opts.colex ?? [], labels),
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
