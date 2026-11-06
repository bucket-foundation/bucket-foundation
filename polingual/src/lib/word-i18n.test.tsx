import assert from "node:assert/strict";
import { test } from "node:test";
import type { Metadata } from "next";
import { SITE_BUNDLES, WORD_BUNDLES } from "../i18n";
import { GUIDES } from "./guides";
import { WORDS, word, wordPath } from "./words";
import { OG_DESCRIPTION_MAX } from "./meta";
import { SITE_LANGS, WORD_LOCALES, assertBundles, localWordCopy, localeInfo, orderedForms, rootMates, scriptCount, strings, validateBundles, wordBody } from "./word-i18n";
import { INDEXED_WORD_LOCALES } from "./rollout";
import { renderToStaticMarkup } from "react-dom/server";
import LocaleLayout from "../app/(intl)/[lang]/layout";
import SiteLayout from "../app/(site)/layout";
import { WordIndexView, WordView } from "../app/(site)/word/views";
import { wordIndexMeta, wordMeta } from "./word-meta";
import { SITEMAP_MAX_URLS, chunkUrls, sitemapPaths } from "./sitemap-paths";
import { sitemapChildUrls, sitemapIndexXml } from "./sitemap-index";

const SITE = "https://www.polingual.com";

function langs(m: Metadata): Record<string, string> {
  return (m.alternates?.languages ?? {}) as Record<string, string>;
}

function og(m: Metadata) {
  return m.openGraph as { url?: string; locale?: string; title?: string; description?: string };
}

test("there are 24 site languages plus English", () => {
  assert.equal(SITE_LANGS.length, 24);
  assert.equal(WORD_LOCALES.length, 25);
});

test("every shipped bundle has every key and placeholder", () => {
  assert.deepEqual(validateBundles(WORD_BUNDLES, WORD_LOCALES), []);
  assert.doesNotThrow(() => assertBundles(WORD_BUNDLES, SITE_BUNDLES, SITE_LANGS));
});

test("a missing key fails the bundle check that runs at build time", () => {
  const broken = structuredClone(WORD_BUNDLES) as Record<string, Record<string, unknown>>;
  delete broken.fr.cta;
  assert.throws(() => assertBundles(broken, SITE_BUNDLES, SITE_LANGS), /fr: missing key cta/);
  const theme = structuredClone(WORD_BUNDLES) as Record<string, Record<string, Record<string, string>>>;
  delete theme.ja.themes.verb;
  assert.throws(() => assertBundles(theme, SITE_BUNDLES, SITE_LANGS), /ja: missing key themes.verb/);
  const placeholder = structuredClone(WORD_BUNDLES) as Record<string, Record<string, string>>;
  placeholder.de.title = "{Form}: das Wort in Sprachen";
  assert.throws(() => assertBundles(placeholder, SITE_BUNDLES, SITE_LANGS), /de: title placeholders/);
  const site = structuredClone(SITE_BUNDLES) as Record<string, Record<string, unknown>>;
  delete site.es.hreflang;
  assert.throws(() => assertBundles(WORD_BUNDLES, site, SITE_LANGS), /es: missing key hreflang/);
});

test("a localized title leads with the page language form", () => {
  const night = word("night")!;
  assert.equal(localWordCopy("es", night).title, `Noche: la palabra night en ${night.forms.length} idiomas`);
  assert.equal(orderedForms(night, "ja")[0].lang, "ja");
  assert.equal(orderedForms(night, "es")[0].word, "noche");
  for (const code of SITE_LANGS) {
    const copy = localWordCopy(code, night);
    assert.ok(copy.description.length <= OG_DESCRIPTION_MAX + 40, `${code}: ${copy.description.length}`);
    assert.ok(!copy.title.includes("{"), copy.title);
  }
});

test("hreflang alternates are reciprocal across all 25 versions of every page", () => {
  const pages = new Map<string, Record<string, string>>();
  for (const code of WORD_LOCALES) {
    pages.set(og(wordIndexMeta(code)).url!, langs(wordIndexMeta(code)));
    for (const w of WORDS) {
      const m = wordMeta(code, w);
      pages.set(og(m).url!, langs(m));
    }
  }
  assert.equal(pages.size, 25 * (WORDS.length + 1));
  for (const [url, alts] of pages) {
    assert.equal(Object.keys(alts).length, 26, url);
    assert.ok(Object.values(alts).includes(url), `${url} lists itself`);
    assert.equal(alts["x-default"], alts.en);
    for (const target of Object.values(alts)) {
      const back = pages.get(target);
      assert.ok(back, `${url} points at unknown ${target}`);
      assert.deepEqual(back, alts, `${target} does not point back to ${url}`);
    }
  }
});

test("each locale has a self canonical and its own og:locale", () => {
  const night = word("night")!;
  const seen = new Set<string>();
  for (const code of WORD_LOCALES) {
    const m = wordMeta(code, night);
    const url = `${SITE}${code === "en" ? "" : `/${code}`}${wordPath(night)}`;
    assert.equal(m.alternates?.canonical, url);
    assert.equal(og(m).url, url);
    assert.equal(og(m).locale, localeInfo(code).locale);
    assert.equal(langs(m)[localeInfo(code).hreflang], url);
    seen.add(og(m).locale!);
  }
  assert.equal(seen.size, 25);
});

test("the sitemap lists localized word urls only for the indexed rollout locales", () => {
  const paths = sitemapPaths();
  const base = 1 + SITE_LANGS.length + 5 + GUIDES.length + 1 + WORDS.length;
  assert.deepEqual(INDEXED_WORD_LOCALES, ["es", "fr", "de", "pt", "it", "ja", "ar", "hi"]);
  assert.equal(paths.length, base + INDEXED_WORD_LOCALES.length * (WORDS.length + 1));
  assert.equal(new Set(paths).size, paths.length);
  for (const code of SITE_LANGS) {
    const listed = INDEXED_WORD_LOCALES.includes(code);
    assert.equal(paths.includes(`/${code}/word`), listed, code);
    for (const w of WORDS) assert.equal(paths.includes(`/${code}${wordPath(w)}`), listed, `${code} ${w.slug}`);
  }
  assert.ok(Object.values(langs(wordMeta("en", word("night")!))).includes(`${SITE}/ko/word/night`));
});

test("hreflang uses bare es and pt and keeps zh-Hans", () => {
  const keys = Object.keys(langs(wordMeta("en", word("night")!)));
  for (const k of ["es", "pt", "zh-Hans", "en", "x-default"]) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes("es-US") && !keys.includes("pt-BR"));
  assert.equal(og(wordMeta("es", word("night")!)).locale, "es_US");
});

test("every locale layout sets html lang and dir", async () => {
  for (const code of SITE_LANGS) {
    const el = (await LocaleLayout({ children: null, params: Promise.resolve({ lang: code }) })) as unknown as { props: { lang: string; dir: string } };
    assert.equal(el.props.lang, localeInfo(code).hreflang);
    assert.equal(el.props.dir, ["ar", "fa", "he"].includes(code) ? "rtl" : "ltr");
  }
  const site = SiteLayout({ children: null }) as unknown as { props: { lang: string } };
  assert.equal(site.props.lang, "en");
});

test("the body paragraph is built from the word data in the page language", () => {
  const night = word("night")!;
  const es = wordBody("es", night).join(" ");
  assert.ok(es.includes(`${scriptCount(night)} sistemas de escritura`), es);
  const own = night.forms.find((f) => f.lang === "es")!;
  assert.ok(es.includes(`/${own.ipa}/`), es);
  const mates = rootMates(night, "es");
  if (mates.length > 0) assert.ok(es.includes(mates[0].word), es);
  else assert.ok(es.includes("Ninguna otra forma"), es);
  const bodies = new Set(SITE_LANGS.map((c) => wordBody(c, night).join(" ")));
  assert.equal(bodies.size, SITE_LANGS.length);
  assert.notEqual(wordBody("es", night).join(" "), wordBody("es", word("water")!).join(" "));
});

test("og alt, footer and the json-ld set name follow the page language", () => {
  const night = word("night")!;
  const alt = (wordMeta("fr", night).openGraph as { images: { alt: string }[] }).images[0].alt;
  assert.ok(alt.startsWith("Le mot night en"), alt);
  const page = renderToStaticMarkup(<WordView w={night} code="ja" />);
  assert.ok(page.includes(strings("ja").footerTagline));
  assert.ok(page.includes(strings("ja").footerData));
  const index = renderToStaticMarkup(<WordIndexView code="de" />);
  assert.ok(index.includes(`"name":"${strings("de").setName}"`));
});

test("the sitemap splits into an index past 45k urls or 45 MB", () => {
  const urls = Array.from({ length: 100_001 }, (_, i) => `${SITE}/es/word/w${i}`);
  assert.deepEqual(chunkUrls(urls).map((c) => c.length), [SITEMAP_MAX_URLS, SITEMAP_MAX_URLS, 10_001]);
  const big = Array.from({ length: 10 }, (_, i) => `${SITE}/${"x".repeat(1000)}${i}`);
  assert.deepEqual(chunkUrls(big, 45_000, 4_000).map((c) => c.length), [3, 3, 3, 1]);
  assert.equal(chunkUrls(sitemapPaths().map((p) => SITE + p)).length, 1);
  assert.deepEqual(sitemapChildUrls(), [`${SITE}/sitemap/0.xml`]);
  assert.match(sitemapIndexXml(), /<sitemapindex[^>]*><sitemap><loc>https:\/\/www\.polingual\.com\/sitemap\/0\.xml<\/loc><\/sitemap><\/sitemapindex>/);
});
