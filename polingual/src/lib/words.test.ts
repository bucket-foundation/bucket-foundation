import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DESCRIPTION_MAX, LANGS, OG_LANGS, THEMES, WORDS, ctaHref, titleLangs, relatedWords, word, wordDescription, wordJsonLd, wordTitle, wordsByTheme } from "./words";
import { buildFeed, feedItems, xmlEscape } from "./feed";
import { sitemapPaths } from "./sitemap-paths";
import { GUIDES } from "./guides";
import { fontCssUrl, ttfUrl } from "./og-fonts";

const BANNED = /\u2014|\u2013|\b(genuinely|honestly|truly|really|actually|basically|essentially|literally|obviously|clearly|simply|very|seamless|leverage|unlock)\b/i;

test("every word has a unique url-safe slug and an English form", () => {
  assert.equal(new Set(WORDS.map((w) => w.slug)).size, WORDS.length);
  for (const w of WORDS) {
    assert.match(w.slug, /^[a-z0-9-]+$/);
    assert.equal(w.forms[0].lang, "en");
    assert.ok(w.forms.length >= 20, `${w.slug} has ${w.forms.length} forms`);
  }
});

test("every language and theme in the data has a label", () => {
  for (const w of WORDS) {
    for (const f of w.forms) assert.ok(LANGS[f.lang], `no label for ${f.lang}`);
    assert.ok(THEMES.some((t) => t.id === w.category), `no theme for ${w.category}`);
  }
  assert.equal(wordsByTheme().reduce((n, t) => n + t.words.length, 0), WORDS.length);
});

test("the share card languages cover six scripts", () => {
  assert.equal(new Set(OG_LANGS.map((l) => LANGS[l].script)).size, 6);
  for (const w of WORDS) for (const l of OG_LANGS) assert.ok(w.forms.some((f) => f.lang === l), `${w.slug} lacks ${l}`);
});

test("title, description and cta name the word", () => {
  const night = word("night")!;
  assert.match(wordTitle(night), /^Night in 29 languages: Spanish, \S+, \S+ and more$/);
  assert.match(wordDescription(night), /noche/);
  assert.equal(ctaHref(night), "/?utm_source=seo&utm_campaign=word_night");
});

test("titles name languages the word has and vary across words", () => {
  for (const w of WORDS) {
    const names = new Set(w.forms.map((f) => LANGS[f.lang].name));
    for (const n of titleLangs(w)) assert.ok(names.has(n), `${w.slug}: ${n}`);
    assert.equal(new Set(titleLangs(w)).size, 3);
  }
  assert.ok(new Set(WORDS.map((w) => titleLangs(w).join())).size > 5);
});

test("descriptions stay within the snippet length", () => {
  for (const w of WORDS) assert.ok(wordDescription(w).length <= DESCRIPTION_MAX, `${w.slug}: ${wordDescription(w).length}`);
});

test("photon urls redirect to /photon in raw and encoded form", async () => {
  const { default: config } = await import("../../next.config.js");
  const [rule] = await config.redirects();
  assert.equal(rule.destination, "/photon/:id");
  const pattern = new RegExp(`^${rule.source.replace(":id(", "(")}$`);
  assert.match("/word/photon:word:en:light", pattern);
  assert.match("/word/photon%3Aword%3Aen%3Alight", pattern);
  assert.doesNotMatch("/word/night", pattern);
});

test("related words exclude the word itself and come six at a time", () => {
  for (const w of WORDS) {
    const r = relatedWords(w);
    assert.equal(r.length, 6, w.slug);
    assert.ok(!r.some((x) => x.slug === w.slug));
  }
});

test("word copy and notes follow the voice rules", () => {
  for (const w of WORDS) {
    assert.doesNotMatch(wordTitle(w), BANNED);
    assert.doesNotMatch(wordDescription(w), BANNED);
    if (w.note) assert.doesNotMatch(w.note, /\u2014|\u2013|canon-tier/);
  }
});

test("word json-ld is a DefinedTerm in the word set", () => {
  const ld = wordJsonLd(word("water")!);
  assert.equal(ld["@type"], "DefinedTerm");
  assert.equal(ld.url, "https://www.polingual.com/word/water");
  assert.equal(ld.inDefinedTermSet["@type"], "DefinedTermSet");
});

test("sitemap lists the index, every word and every guide once", () => {
  const paths = sitemapPaths();
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.includes("/word"));
  for (const w of WORDS) assert.ok(paths.includes(`/word/${w.slug}`));
  for (const g of GUIDES) assert.ok(paths.includes(`/learn/${g.slug}`));
});

test("feed carries every guide and word as escaped rss items", () => {
  const xml = buildFeed(new Date("2026-11-06T00:00:00Z"));
  assert.match(xml, /^<\?xml/);
  assert.equal((xml.match(/<item>/g) || []).length, GUIDES.length + WORDS.length);
  assert.equal(feedItems().length, GUIDES.length + WORDS.length);
  assert.equal(xmlEscape(`a & <b> "c"`), "a &amp; &lt;b&gt; &quot;c&quot;");
});

test("llms.txt links the word index", () => {
  assert.match(readFileSync(join(__dirname, "../../public/llms.txt"), "utf8"), /polingual\.com\/word\)/);
});

test("the IndexNow key file holds its own name", () => {
  const dir = join(__dirname, "../../public");
  const keys = readdirSync(dir).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  assert.equal(keys.length, 1);
  assert.equal(readFileSync(join(dir, keys[0]), "utf8").trim(), keys[0].replace(".txt", ""));
});

test("og fonts resolve the truetype url and subset by text", () => {
  const css = `@font-face { font-family: 'Noto Sans JP'; src: url(https://fonts.gstatic.com/l/font?kit=abc) format('truetype'); }`;
  assert.equal(ttfUrl(css), "https://fonts.gstatic.com/l/font?kit=abc");
  assert.equal(ttfUrl("src: url(x.woff2) format('woff2')"), undefined);
  assert.match(fontCssUrl("Noto Sans Thai", 400, "คืน"), /family=Noto\+Sans\+Thai:wght@400&text=%E0/);
});
