import assert from "node:assert/strict";
import { test } from "node:test";
import type { Metadata } from "next";
import { SITE_BUNDLES, WORD_BUNDLES } from "../i18n";
import { GUIDES } from "./guides";
import { WORDS, word, wordPath } from "./words";
import { OG_DESCRIPTION_MAX } from "./meta";
import { SITE_LANGS, WORD_LOCALES, assertBundles, localWordCopy, localeInfo, orderedForms, validateBundles } from "./word-i18n";
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

test("the sitemap holds every localized word url once", () => {
  const paths = sitemapPaths();
  const base = 1 + SITE_LANGS.length + 5 + GUIDES.length + 1 + WORDS.length;
  assert.equal(paths.length, base + SITE_LANGS.length * (WORDS.length + 1));
  assert.equal(new Set(paths).size, paths.length);
  for (const code of SITE_LANGS) {
    assert.ok(paths.includes(`/${code}/word`));
    for (const w of WORDS) assert.ok(paths.includes(`/${code}${wordPath(w)}`), `${code} ${w.slug}`);
  }
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
