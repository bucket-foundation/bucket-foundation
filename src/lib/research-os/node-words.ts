export interface ChainStep {
  lang: string;
  form: string;
  rel: string;
  gloss: string;
  components?: { form: string; gloss: string }[];
  chain?: ChainStep[];
}

export interface RootText {
  corpus: string;
  source: string;
  count: number;
  samples: { ref: string; text: string }[];
}

export interface NodeWord {
  lang: string;
  langName: string;
  word: string;
  roman: string | null;
  gloss: string | null;
  rootLang: string | null;
  rootLangName: string | null;
  rootForm: string | null;
  rootGloss: string | null;
  chain: ChainStep[];
  rootTexts: RootText[];
  enTerm: string | null;
  sense: string | null;
  confidence: number;
  uncertain: boolean;
  rootConfidence: number;
  rootUncertain: boolean;
  rootSource: string | null;
  hanParts?: import("./han-components").HanChar[];
  source: string;
}

export interface NodeWordRow {
  lang: string;
  word: string;
  roman: string | null;
  gloss: string | null;
  root_lang: string | null;
  root_form: string | null;
  root_gloss: string | null;
  chain: unknown;
  root_texts: unknown;
  en_term: string | null;
  sense: string | null;
  confidence: number | string | null;
  root_confidence?: number | string | null;
  root_source?: string | null;
  source: string;
}

export const HIDE_BELOW = 0.5;
export const UNCERTAIN_BELOW = 0.75;

export const LANG_NAMES: Record<string, string> = {
  en: "English", he: "Hebrew", ar: "Arabic", zh: "Chinese", sa: "Sanskrit", la: "Latin", grc: "Ancient Greek",
  el: "Greek", akk: "Akkadian", sux: "Sumerian", egy: "Egyptian", cop: "Coptic", got: "Gothic", ang: "Old English",
  non: "Old Norse", fa: "Persian", hi: "Hindi", ta: "Tamil", ja: "Japanese", ko: "Korean", ru: "Russian", de: "German",
  fr: "French", es: "Spanish", it: "Italian", pt: "Portuguese", nl: "Dutch", sv: "Swedish", pl: "Polish", cs: "Czech",
  tr: "Turkish", fi: "Finnish", id: "Indonesian", th: "Thai", vi: "Vietnamese", enm: "Middle English", fro: "Old French",
  frm: "Middle French", "la-lat": "Late Latin", "la-med": "Medieval Latin", "la-vul": "Vulgar Latin", gmh: "Middle High German",
  goh: "Old High German", dum: "Middle Dutch", ota: "Ottoman Turkish", pi: "Pali", och: "Old Chinese", ltc: "Middle Chinese",
  arc: "Aramaic", hbo: "Biblical Hebrew", peo: "Old Persian", pal: "Middle Persian", ine: "Indo-European", mixed: "several",
  "ine-pro": "Proto-Indo-European", "gem-pro": "Proto-Germanic", "gmw-pro": "Proto-West Germanic", "itc-pro": "Proto-Italic",
  "grk-pro": "Proto-Hellenic", "sem-pro": "Proto-Semitic", "sit-pro": "Proto-Sino-Tibetan", "iir-pro": "Proto-Indo-Iranian",
  "inc-pro": "Proto-Indo-Aryan", "sla-pro": "Proto-Slavic", "ine-bsl-pro": "Proto-Balto-Slavic", "cel-pro": "Proto-Celtic",
  "urj-pro": "Proto-Uralic", "urj-fin-pro": "Proto-Finnic", "fiu-fin-pro": "Proto-Finnic", "trk-pro": "Proto-Turkic",
  "dra-pro": "Proto-Dravidian", "afa-pro": "Proto-Afroasiatic", "ira-pro": "Proto-Iranian", "gmq-pro": "Proto-Norse",
  "poz-pro": "Proto-Malayo-Polynesian", "map-pro": "Proto-Austronesian", "ko-pro": "Proto-Koreanic", "ja-pro": "Proto-Japonic",
  "tai-pro": "Proto-Tai", "mkh-pro": "Proto-Mon-Khmer",
};

const ORDER = ["en", "he", "ar", "sa", "zh", "grc", "la", "akk", "sux", "egy", "cop", "got", "ang", "non", "el", "fa", "hi", "ta", "ja", "ko"];

export function langName(code: string | null | undefined): string {
  if (!code) return "";
  return LANG_NAMES[code] ?? code;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function readConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

export function toNodeWord(row: NodeWordRow): NodeWord {
  const confidence = readConfidence(row.confidence);
  const rootConfidence = row.root_form ? (row.root_confidence === undefined ? confidence : readConfidence(row.root_confidence)) : 0;
  const keepRoot = Boolean(row.root_form) && rootConfidence >= HIDE_BELOW;
  return {
    lang: row.lang,
    langName: langName(row.lang),
    word: row.word,
    roman: row.roman || null,
    gloss: row.gloss || null,
    rootLang: keepRoot ? row.root_lang || null : null,
    rootLangName: keepRoot && row.root_lang ? langName(row.root_lang) : null,
    rootForm: keepRoot ? row.root_form || null : null,
    rootGloss: keepRoot ? row.root_gloss || null : null,
    chain: keepRoot ? asArray<ChainStep>(row.chain) : [],
    rootTexts: rootTextsFor(row.root_texts, keepRoot),
    enTerm: row.en_term || null,
    sense: row.sense || null,
    confidence,
    uncertain: confidence < UNCERTAIN_BELOW,
    rootConfidence,
    rootUncertain: keepRoot && rootConfidence < UNCERTAIN_BELOW,
    rootSource: keepRoot ? row.root_source || null : null,
    source: row.source,
  };
}

export function shownWords(words: NodeWord[]): NodeWord[] {
  return words.filter((w) => w.confidence >= HIDE_BELOW);
}

export function orderWords(words: NodeWord[]): NodeWord[] {
  const rank = (w: NodeWord) => {
    const i = ORDER.indexOf(w.lang);
    return i === -1 ? ORDER.length : i;
  };
  return words.slice().sort((a, b) => rank(a) - rank(b) || a.langName.localeCompare(b.langName) || a.word.localeCompare(b.word));
}

export function hasRoot(w: NodeWord): boolean {
  return Boolean(w.rootForm);
}

export const OSHB_ATTRIBUTION = {
  text: "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb",
  href: "https://github.com/openscriptures/morphhb",
  license: "https://creativecommons.org/licenses/by/4.0/",
  wlc: "Based on the Westminster Leningrad Codex, which is in the public domain.",
};

export const HEBREW_BIBLE = "Hebrew Bible";

export function rootTextsFor(raw: unknown, keepRoot: boolean): RootText[] {
  return asArray<RootText>(raw).filter((t) => t && Array.isArray(t.samples) && (keepRoot || t.corpus !== HEBREW_BIBLE));
}

export function rootTextLine(t: RootText): string {
  const what = t.corpus === HEBREW_BIBLE ? "this root" : "this word";
  return `In the ${t.corpus}: ${t.count} ${t.count === 1 ? "verse carries" : "verses carry"} ${what}.`;
}

export function rootTextUncertain(t: RootText, w: { uncertain: boolean; rootUncertain: boolean }): boolean {
  return t.corpus === HEBREW_BIBLE && (w.uncertain || w.rootUncertain);
}

export const KAIKKI_ATTRIBUTION = {
  text: "Words, meanings and etymologies from Wiktionary, via Kaikki.org, under CC BY-SA 4.0.",
  wiktionary: "https://en.wiktionary.org/",
  kaikki: "https://kaikki.org/",
  license: "https://creativecommons.org/licenses/by-sa/4.0/",
};
