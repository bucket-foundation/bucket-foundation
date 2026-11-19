import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import LearnPage from "../app/(site)/learn/page";
import { GuideView } from "../app/(site)/learn/views";
import * as localPage from "../app/(intl)/[lang]/learn/[slug]/page";
import { SITE } from "./facts";
import { guideMeta } from "./guide-meta";
import { SOURCES_CHECKED } from "./guide-sources";
import { wordForm } from "./guide-words";
import { GUIDES, LOCAL_GUIDES, guide, guideAlternates, guidePair, guidePath, guideWordCount, type Guide } from "./guides";
import { ES_GUIDES } from "./guides-es";
import { LONG_GUIDES } from "./guides-long";
import { sitemapPaths } from "./sitemap-paths";
import { HEADING_FAULT, voiceFaults } from "./voice-check";

const NEW_GUIDES: Guide[] = [...LONG_GUIDES, ...ES_GUIDES];
const LLMS = readFileSync(join(__dirname, "../../public/llms.txt"), "utf8");

function prose(g: Guide): string[] {
  return [g.title, g.description, g.lede, ...g.sections.flatMap((s) => [s.h, s.p, ...(s.more ?? []), ...(s.table ? [s.table.caption] : [])]), ...g.faq.flatMap((f) => [f.q, f.a]), ...(g.links ?? []).map((l) => l.label)];
}

test("four English guides and two Spanish guides are published", () => {
  assert.deepEqual(LONG_GUIDES.map((g) => g.slug), ["spanish-and-french-at-the-same-time", "third-language-for-spanish-english-bilinguals", "words-per-cefr-level", "romance-cognates"]);
  assert.deepEqual(LOCAL_GUIDES.map(guidePath), ["/es/learn/tercer-idioma-para-bilingues", "/es/learn/cognados-lenguas-romances"]);
  for (const g of LONG_GUIDES) assert.equal(guide(g.slug), g);
});

test("each new guide runs 500 to 800 words with a table", () => {
  for (const g of NEW_GUIDES) {
    const n = guideWordCount(g);
    assert.ok(n >= 500 && n <= 800, `${g.slug} has ${n} words`);
    assert.ok(g.sections.some((s) => s.table && s.table.rows.length >= 6), g.slug);
    assert.ok(g.faq.length === 4, g.slug);
  }
});

test("each new guide links word pages and the games, all inside the sitemap", () => {
  const paths = sitemapPaths();
  for (const g of NEW_GUIDES) {
    const html = renderToStaticMarkup(<GuideView g={g} />);
    const prefix = g.lang === "es" ? "/es/word/" : "/word/";
    const words = [...html.matchAll(/href="(\/(?:es\/)?word\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(words.length >= 2, g.slug);
    for (const href of words) {
      assert.ok(href.startsWith(prefix), href);
      assert.ok(paths.includes(href), href);
    }
    assert.ok(html.includes('href="/play"'), g.slug);
    for (const l of g.links ?? []) if (l.href !== "/play") assert.ok(paths.includes(l.href), l.href);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"@type":"MobileApplication"/);
    assert.match(html, /<caption>/);
    for (const f of g.faq) assert.ok(html.includes(JSON.stringify(f.q).slice(1, -1)), f.q);
  }
});

test("table words come from the app word data", () => {
  const cognates = guide("romance-cognates")!;
  const cells = cognates.sections.flatMap((s) => s.table?.rows ?? []).map((row) => row.map((c) => (typeof c === "string" ? c : c.text)));
  assert.deepEqual(cells.find((r) => r[0] === "night"), ["night", wordForm("night", "la"), "noche", "nuit", "notte", "noite"]);
  assert.deepEqual(cells.find((r) => r[0] === "rain"), ["rain", "pluvia", "lluvia", "pluie", "pioggia", "chuva"]);
  const es = ES_GUIDES[1].sections[0].table!.rows[0];
  assert.deepEqual(es[0], { text: "mano", href: "/es/word/hand" });
  assert.throws(() => wordForm("night", "xx"));
});

test("the CEFR table carries the published ranges and its source", () => {
  const g = guide("words-per-cefr-level")!;
  const rows = g.sections[0].table!.rows;
  assert.deepEqual(rows.map((r) => [r[0], r[1]]), [["A1", "Under 1,500"], ["A2", "1,500 to 2,500"], ["B1", "2,750 to 3,250"], ["B2", "3,250 to 3,750"], ["C1", "3,750 to 4,500"], ["C2", "4,500 to 5,000"]]);
  assert.match(g.sources![0].url, /^https:\/\/www\.eurosla\.org\//);
  const html = renderToStaticMarkup(<GuideView g={g} />);
  assert.ok(html.includes(g.sources![0].url));
  assert.ok(html.includes(`checked ${SOURCES_CHECKED}`));
});

test("every cited study is listed with its url and the date checked", () => {
  for (const g of NEW_GUIDES) {
    const cites = prose(g).some((t) => /\b(2009|2010|2021)\b/.test(t));
    assert.equal(Boolean(g.sources?.length), cites, g.slug);
    for (const s of g.sources ?? []) {
      assert.match(s.url, /^https:\/\//);
      assert.match(s.checked, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

test("the Spanish guides pair with their English guides through hreflang", async () => {
  for (const g of LOCAL_GUIDES) {
    const en = guidePair(g)!;
    assert.equal(guidePair(en), g);
    assert.deepEqual(guideAlternates(g), guideAlternates(en));
    const m = await localPage.generateMetadata({ params: Promise.resolve({ lang: "es", slug: g.slug }) });
    assert.equal(m.alternates?.canonical, `${SITE}${guidePath(g)}`);
    const langs = m.alternates?.languages as Record<string, string>;
    assert.equal(langs.es, `${SITE}${guidePath(g)}`);
    assert.equal(langs.en, `${SITE}/learn/${en.slug}`);
    assert.equal((m.openGraph as { locale?: string }).locale, "es_US");
    assert.equal(guideMeta(en).alternates?.canonical, `${SITE}/learn/${en.slug}`);
    const html = renderToStaticMarkup(<GuideView g={g} />);
    assert.match(html, /<nav[^>]*aria-label="Principal"/);
    assert.match(html, /<h2>Preguntas<\/h2>/);
    assert.ok(html.includes(`href="/learn/${en.slug}"`));
    assert.ok(renderToStaticMarkup(<GuideView g={en} />).includes(`href="${guidePath(g)}"`));
  }
  assert.deepEqual(localPage.generateStaticParams(), LOCAL_GUIDES.map((g) => ({ lang: "es", slug: g.slug })));
  assert.deepEqual(await localPage.generateMetadata({ params: Promise.resolve({ lang: "fr", slug: LOCAL_GUIDES[0].slug }) }), {});
});

test("every guide is in the sitemap, the guides index and llms.txt", () => {
  const paths = sitemapPaths();
  const index = renderToStaticMarkup(<LearnPage />);
  for (const g of [...GUIDES, ...LOCAL_GUIDES]) {
    assert.ok(paths.includes(guidePath(g)), guidePath(g));
    assert.ok(index.includes(`href="${guidePath(g)}"`), guidePath(g));
    assert.ok(LLMS.includes(`${SITE}${guidePath(g)})`), guidePath(g));
  }
  assert.ok(index.includes('href="/compare"'));
});

test("guide copy follows the voice rules", () => {
  for (const g of NEW_GUIDES) {
    for (const t of prose(g)) assert.deepEqual(voiceFaults(t), []);
    for (const h of [g.title, ...g.sections.map((s) => s.h)]) assert.doesNotMatch(h, HEADING_FAULT);
  }
});
