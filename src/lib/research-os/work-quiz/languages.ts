import type { PublicQuestion, QuestionWord } from "./types";

export const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  ar: "Arabic",
  cs: "Czech",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  fa: "Persian",
  fi: "Finnish",
  fr: "French",
  he: "Hebrew",
  hi: "Hindi",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  la: "Latin",
  nl: "Dutch",
  pl: "Polish",
  pt: "Portuguese",
  ru: "Russian",
  sa: "Sanskrit",
  sv: "Swedish",
  ta: "Tamil",
  th: "Thai",
  tr: "Turkish",
  vi: "Vietnamese",
  zh: "Chinese",
};

export const LANGUAGE_CODES: readonly string[] = Object.keys(LANGUAGE_NAMES);
export const RTL_LANGUAGES: readonly string[] = ["ar", "he", "fa"];
export const MAX_LANGUAGES = LANGUAGE_CODES.length;
export const LANGUAGES_ERROR = "languages must be a list of codes from the Polingual word set";

const RTL_TEXT = /[\u0590-\u05ff\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/;

export type Dir = "rtl" | "ltr";

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

export function textDir(text: string): Dir {
  return RTL_TEXT.test(text) ? "rtl" : "ltr";
}

export function languageDir(code: string): Dir {
  return RTL_LANGUAGES.includes(code) ? "rtl" : "ltr";
}

export function parseLanguages(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_LANGUAGES) return null;
  const out: string[] = [];
  for (const code of raw) {
    if (typeof code !== "string" || !LANGUAGE_CODES.includes(code)) return null;
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

export function toggleLanguage(languages: readonly string[], code: string): string[] {
  return languages.includes(code) ? languages.filter((l) => l !== code) : [...languages, code];
}

export function languagesByName(codes: readonly string[] = LANGUAGE_CODES): { code: string; name: string }[] {
  return codes.map((code) => ({ code, name: languageName(code) })).sort((a, b) => a.name.localeCompare(b.name));
}

export interface WordCaption {
  language: string | null;
  credit: string;
  href: string | null;
}

export function wordCaption(q: Pick<PublicQuestion, "word">): WordCaption | null {
  const w: QuestionWord | undefined = q.word ?? undefined;
  if (!w) return null;
  const lang = w.lang ?? w.choicesLang;
  return { language: lang ? languageName(lang) : null, credit: w.credit, href: w.href };
}

export function choiceLang(q: Pick<PublicQuestion, "word">): string | undefined {
  return q.word?.choicesLang ?? undefined;
}
