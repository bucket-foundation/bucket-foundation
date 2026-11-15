import data from "../data/words.json";
import { SITE } from "./facts";

type WordAudio = { src: string; file: string; license: string; by?: string; licenseUrl?: string };
export type WordForm = { lang: string; word: string; ipa?: string; roman?: string; kana?: string; audio?: WordAudio };
export type RootCluster = { root: string; langs: string[] };
export type Word = { slug: string; en: string; gloss: string; category: string; tier: number; forms: WordForm[]; note?: string; roots?: RootCluster[] };

export const WORDS = data as Word[];

const BY_SLUG = new Map(WORDS.map((w) => [w.slug, w]));

export function word(slug: string): Word | undefined {
  return BY_SLUG.get(slug);
}

export const LANGS: Record<string, { name: string; script: string; rtl?: boolean }> = {
  en: { name: "English", script: "Latin" },
  es: { name: "Spanish", script: "Latin" },
  fr: { name: "French", script: "Latin" },
  it: { name: "Italian", script: "Latin" },
  pt: { name: "Portuguese", script: "Latin" },
  de: { name: "German", script: "Latin" },
  nl: { name: "Dutch", script: "Latin" },
  sv: { name: "Swedish", script: "Latin" },
  ru: { name: "Russian", script: "Cyrillic" },
  ja: { name: "Japanese", script: "Kanji and kana" },
  ar: { name: "Arabic", script: "Arabic", rtl: true },
  el: { name: "Greek", script: "Greek" },
  fi: { name: "Finnish", script: "Latin" },
  hi: { name: "Hindi", script: "Devanagari" },
  ko: { name: "Korean", script: "Hangul" },
  pl: { name: "Polish", script: "Latin" },
  zh: { name: "Chinese", script: "Han" },
  ang: { name: "Old English", script: "Latin" },
  cs: { name: "Czech", script: "Latin" },
  fa: { name: "Persian", script: "Arabic", rtl: true },
  grc: { name: "Ancient Greek", script: "Greek" },
  he: { name: "Hebrew", script: "Hebrew", rtl: true },
  id: { name: "Indonesian", script: "Latin" },
  la: { name: "Latin", script: "Latin" },
  sa: { name: "Sanskrit", script: "Devanagari" },
  ta: { name: "Tamil", script: "Tamil" },
  th: { name: "Thai", script: "Thai" },
  tr: { name: "Turkish", script: "Latin" },
  vi: { name: "Vietnamese", script: "Latin" },
};

export const THEMES: { id: string; name: string }[] = [
  { id: "number", name: "Numbers" },
  { id: "color", name: "Colors" },
  { id: "family", name: "Family and people" },
  { id: "animal", name: "Animals" },
  { id: "body", name: "The body" },
  { id: "food", name: "Food and drink" },
  { id: "nature", name: "Nature" },
  { id: "time", name: "Time" },
  { id: "object", name: "Things" },
  { id: "adjective", name: "Describing words" },
  { id: "verb", name: "Verbs" },
];

export const OG_LANGS = ["es", "ru", "el", "ja", "ko", "th"];

export function wordsByTheme(): { id: string; name: string; words: Word[] }[] {
  return THEMES.map((t) => ({ ...t, words: WORDS.filter((w) => w.category === t.id).sort((a, b) => a.en.localeCompare(b.en)) })).filter((t) => t.words.length);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function translations(w: Word): WordForm[] {
  return w.forms.filter((f) => f.lang !== "en");
}

const TITLE_POOL = ["fr", "ja", "de", "it", "ru", "ar", "ko", "hi", "pt", "zh", "el", "he", "la"];

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function titleLangs(w: Word): string[] {
  const have = new Set(w.forms.map((f) => f.lang));
  const pool = TITLE_POOL.filter((l) => have.has(l));
  const start = hash(w.slug) % pool.length;
  const picked = [pool[start], pool[(start + 1) % pool.length]];
  return (have.has("es") ? ["es", ...picked] : [...picked, pool[(start + 2) % pool.length]]).map((l) => LANGS[l].name);
}

export function wordTitle(w: Word): string {
  return `${capitalize(w.en)} in ${w.forms.length} languages: ${titleLangs(w).join(", ")} and more`;
}

export const DESCRIPTION_MAX = 155;

export function wordDescription(w: Word): string {
  const samples = ["es", "fr", "ja", "ar", "hi", "ru"]
    .map((l) => w.forms.find((f) => f.lang === l))
    .filter((f) => f !== undefined)
    .map((f) => `${LANGS[f.lang].name} ${f.word}`);
  const build = (n: number) => `How to say ${w.en} in ${w.forms.length} languages${n ? `: ${samples.slice(0, n).join(", ")}` : ""}. Learn them together in Polingual.`;
  let n = samples.length;
  while (n > 0 && build(n).length > DESCRIPTION_MAX) n--;
  return build(n);
}

export function wordPath(w: Word): string {
  return `/word/${w.slug}`;
}

export function ctaHref(w: Word): string {
  return `/?utm_source=seo&utm_campaign=word_${w.slug}`;
}

export function relatedWords(w: Word, n = 6): Word[] {
  const same = WORDS.filter((x) => x.slug !== w.slug && x.category === w.category).sort((a, b) => Math.abs(a.tier - w.tier) - Math.abs(b.tier - w.tier) || a.en.localeCompare(b.en));
  const rest = WORDS.filter((x) => x.slug !== w.slug && x.category !== w.category && x.tier === w.tier);
  return [...same, ...rest].slice(0, n);
}

export function wordJsonLd(w: Word) {
  const url = `${SITE}${wordPath(w)}`;
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": url,
    name: w.en,
    description: `${capitalize(w.gloss)}. ${translations(w).map((f) => `${LANGS[f.lang]?.name ?? f.lang}: ${f.word}`).join("; ")}.`,
    inLanguage: "en",
    url,
    termCode: w.slug,
    sameAs: `https://en.wiktionary.org/wiki/${encodeURIComponent(w.en)}`,
    inDefinedTermSet: { "@type": "DefinedTermSet", "@id": `${SITE}/word`, name: "Polingual words", url: `${SITE}/word` },
  };
}

export function breadcrumbJsonLd(w: Word) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Polingual", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Words", item: `${SITE}/word` },
      { "@type": "ListItem", position: 3, name: capitalize(w.en), item: `${SITE}${wordPath(w)}` },
    ],
  };
}
