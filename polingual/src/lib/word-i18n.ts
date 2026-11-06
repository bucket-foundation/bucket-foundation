import SITE_LANGS_JSON from "./site-langs.json";
import { SITE_BUNDLES, WORD_BUNDLES } from "../i18n";
import { LANGS, THEMES, WORDS, wordPath, type Word, type WordForm } from "./words";
import { INDEXED_WORD_LOCALES } from "./rollout";
import { wordOgForms, wordOgImage } from "./word-og";
import type { OgImage } from "./meta";
import { FACTS, SITE } from "./facts";
import { OG_DESCRIPTION_MAX } from "./meta";

export const SITE_LANGS = SITE_LANGS_JSON as string[];
export const WORD_LOCALES = ["en", ...SITE_LANGS];

export type WordStrings = {
  sep: string;
  words: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  colLanguage: string;
  colWord: string;
  colPronunciation: string;
  cta: string;
  roots: string;
  related: string;
  indexTitle: string;
  indexDescription: string;
  indexCta: string;
  credits: string;
  footerTagline: string;
  footerData: string;
  footerPublished: string;
  setName: string;
  ogAlt: string;
  bodyScripts: string;
  bodyRoot: string;
  bodyNoRoot: string;
  bodySay: string;
  themes: Record<string, string>;
};

export type LocaleInfo = { code: string; name: string; locale: string; hreflang: string; rtl: boolean; labels: SiteLabels };
export type SiteLabels = { beta: string; support: string; privacy: string; terms: string };

const PLACEHOLDER = /\{(\w+)\}/g;
const RTL_LOCALES = new Set(["ar", "fa", "he"]);

function placeholders(s: string): string[] {
  return [...s.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
}

export function validateBundles(bundles: Record<string, unknown>, locales: string[], reference = "en"): string[] {
  const ref = bundles[reference] as Record<string, unknown> | undefined;
  if (!ref) return [`${reference}: reference bundle missing`];
  const problems: string[] = [];
  const themeIds = THEMES.map((t) => t.id);
  for (const code of locales) {
    const b = bundles[code] as Record<string, unknown> | undefined;
    if (!b) {
      problems.push(`${code}: bundle missing`);
      continue;
    }
    for (const key of Object.keys(ref)) {
      if (key === "themes") continue;
      const v = b[key];
      if (typeof v !== "string" || v.length === 0) {
        problems.push(`${code}: missing key ${key}`);
        continue;
      }
      const want = placeholders(ref[key] as string).join(",");
      if (placeholders(v).join(",") !== want) problems.push(`${code}: ${key} placeholders ${placeholders(v).join(",")} != ${want}`);
    }
    const themes = (b.themes ?? {}) as Record<string, unknown>;
    for (const id of themeIds) if (typeof themes[id] !== "string" || !themes[id]) problems.push(`${code}: missing key themes.${id}`);
  }
  return problems;
}

export function validateSiteBundles(bundles: Record<string, unknown>, locales: string[]): string[] {
  const problems: string[] = [];
  for (const code of locales) {
    const b = bundles[code] as { name?: string; locale?: string; hreflang?: string; page?: Record<string, string> } | undefined;
    if (!b) {
      problems.push(`${code}: site bundle missing`);
      continue;
    }
    for (const k of ["name", "locale", "hreflang"] as const) if (!b[k]) problems.push(`${code}: missing key ${k}`);
    for (const k of [">Join the beta<", ">Support<", ">Privacy<", ">Terms<"]) if (!b.page?.[k]) problems.push(`${code}: missing key page.${k}`);
  }
  return problems;
}

export function assertBundles(words: Record<string, unknown>, site: Record<string, unknown>, locales: string[]): void {
  const problems = [...validateBundles(words, ["en", ...locales]), ...validateSiteBundles(site, locales)];
  if (problems.length > 0) throw new Error(`Polingual word i18n is incomplete:\n${problems.join("\n")}`);
}

assertBundles(WORD_BUNDLES, SITE_BUNDLES, SITE_LANGS);

export function strings(code: string): WordStrings {
  return WORD_BUNDLES[code] as WordStrings;
}

function stripTag(s: string): string {
  return s.replace(/^>|<$/g, "");
}

export function bareHreflang(tag: string): string {
  const [lang, sub] = tag.split("-");
  return sub && sub.length === 4 ? `${lang}-${sub}` : lang;
}

export function localeInfo(code: string): LocaleInfo {
  if (code === "en") return { code, name: "English", locale: "en_US", hreflang: "en", rtl: false, labels: { beta: "Join the beta", support: "Support", privacy: "Privacy", terms: "Terms" } };
  const b = SITE_BUNDLES[code] as { name: string; locale: string; hreflang: string; page: Record<string, string> };
  return {
    code,
    name: b.name,
    locale: b.locale,
    hreflang: bareHreflang(b.hreflang),
    rtl: RTL_LOCALES.has(code),
    labels: { beta: stripTag(b.page[">Join the beta<"]), support: stripTag(b.page[">Support<"]), privacy: stripTag(b.page[">Privacy<"]), terms: stripTag(b.page[">Terms<"]) },
  };
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(PLACEHOLDER, (_, k: string) => (k in values ? String(values[k]) : `{${k}}`));
}

const NAMES = new Map<string, Intl.DisplayNames>();

export function langLabel(code: string, inLocale: string): string {
  if (inLocale === "en") return LANGS[code]?.name ?? code;
  let dn = NAMES.get(inLocale);
  if (!dn) {
    dn = new Intl.DisplayNames([inLocale], { type: "language", fallback: "none" });
    NAMES.set(inLocale, dn);
  }
  const name = dn.of(code);
  return name && name.toLowerCase() !== code ? name : LANGS[code]?.name ?? code;
}

export function capitalizeIn(s: string, locale: string): string {
  const first = [...s][0] ?? "";
  return first.toLocaleUpperCase(locale) + s.slice(first.length);
}

export function localPath(code: string, path: string): string {
  return code === "en" ? path : `/${code}${path}`;
}

export function wordLocalPath(code: string, w: Word): string {
  return localPath(code, wordPath(w));
}

export function formIn(w: Word, code: string): WordForm | undefined {
  return w.forms.find((f) => f.lang === code);
}

export function orderedForms(w: Word, code: string): WordForm[] {
  const own = formIn(w, code);
  return own ? [own, ...w.forms.filter((f) => f !== own)] : w.forms;
}

const SAMPLE_LANGS = ["en", "es", "fr", "ja", "ar", "hi", "ru", "de", "zh"];

export function localWordCopy(code: string, w: Word) {
  const s = strings(code);
  const own = formIn(w, code)?.word ?? w.en;
  const values = { Form: capitalizeIn(own, code), form: own, en: w.en, n: w.forms.length };
  const samples = SAMPLE_LANGS.filter((l) => l !== code)
    .map((l) => formIn(w, l))
    .filter((f): f is WordForm => f !== undefined)
    .map((f) => `${capitalizeIn(langLabel(f.lang, code), code)} ${f.word}`);
  let k = samples.length;
  const describe = (m: number) => fill(s.description, { ...values, samples: samples.slice(0, m).join(s.sep) });
  while (k > 1 && describe(k).length > OG_DESCRIPTION_MAX) k--;
  return {
    title: fill(s.title, values),
    h1: fill(s.h1, values),
    description: describe(k),
    intro: fill(s.intro, values),
    cta: fill(s.cta, values),
    body: wordBody(code, w),
  };
}

export function scriptCount(w: Word): number {
  return new Set(w.forms.map((f) => LANGS[f.lang]?.script ?? f.lang)).size;
}

export function rootMates(w: Word, code: string): WordForm[] {
  const langs = new Set((w.roots ?? []).filter((r) => r.langs.includes(code)).flatMap((r) => r.langs));
  langs.delete(code);
  return w.forms.filter((f) => langs.has(f.lang));
}

export function wordBody(code: string, w: Word): string[] {
  const s = strings(code);
  const own = formIn(w, code);
  const form = own?.word ?? w.en;
  const values = { Form: capitalizeIn(form, code), form, n: w.forms.length };
  const out = [fill(s.bodyScripts, { ...values, scripts: scriptCount(w) })];
  if (!own) return out;
  const mates = rootMates(w, code);
  out.push(mates.length > 0 ? fill(s.bodyRoot, { ...values, list: mates.map((f) => `${langLabel(f.lang, code)} ${f.word}`).join(s.sep) }) : fill(s.bodyNoRoot, values));
  const say = own.ipa ? `/${own.ipa}/` : own.roman;
  if (say) out.push(fill(s.bodySay, { ...values, lang: langLabel(code, code), say }));
  return out;
}

export function localOgImage(code: string, w: Word): OgImage {
  const image = wordOgImage(w);
  if (code === "en") return image;
  const s = strings(code);
  const samples = wordOgForms(w).map((f) => `${langLabel(f.lang, code)} ${f.word}`).join(s.sep);
  return { ...image, alt: fill(s.ogAlt, { en: w.en, n: w.forms.length, samples }) };
}

export function localIndexCopy(code: string) {
  const s = strings(code);
  const n = FACTS.languageCount;
  return { title: fill(s.indexTitle, { count: WORDS.length, n }), description: fill(s.indexDescription, { n }), cta: s.indexCta };
}

export function hreflangAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const code of WORD_LOCALES) out[localeInfo(code).hreflang] = `${SITE}${localPath(code, path)}`;
  out["x-default"] = `${SITE}${path}`;
  return out;
}

export function localWordPaths(codes: string[] = INDEXED_WORD_LOCALES): string[] {
  return codes.flatMap((code) => [localPath(code, "/word"), ...WORDS.map((w) => wordLocalPath(code, w))]);
}

