import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Metadata } from "next";
import * as indexPage from "../app/(site)/compare/page";
import * as rivalPage from "../app/(site)/compare/[slug]/page";
import { CompareIndexView, RivalView } from "../app/(site)/compare/views";
import { COMPARE_CHECKED, COMPARE_INDEX, RIVALS, TRADEMARK_LINE, comparePaths, rivalPath, type Rival } from "./compare";
import { APP_STORE_URL, FACTS, SITE } from "./facts";
import FOOTER_LINKS from "./footer-links.json";
import { sitemapPaths } from "./sitemap-paths";
import { HEADING_FAULT, voiceFaults } from "./voice-check";

const LLMS = readFileSync(join(__dirname, "../../public/llms.txt"), "utf8");
const OWN_HOSTS: Record<string, RegExp> = {
  duolingo: /^https:\/\/blog\.duolingo\.com\//,
  babbel: /^https:\/\/(www\.babbel\.com|apps\.apple\.com\/us\/app\/babbel-)/,
  busuu: /^https:\/\/www\.busuu\.com\//,
  lingq: /^https:\/\/(www|forum)\.lingq\.com\//,
};

function prose(r: Rival): string[] {
  return [r.title, r.description, r.lede, ...r.rows.flatMap((x) => [x.topic, x.polingual, x.other]), ...r.strengths, r.otherFits, r.polingualFits, r.together, ...r.faq.flatMap((f) => [f.q, f.a])];
}

test("the four comparison pages cover Duolingo, Babbel, Busuu and LingQ", () => {
  assert.deepEqual(comparePaths(), ["/compare", "/compare/duolingo", "/compare/babbel", "/compare/busuu", "/compare/lingq"]);
  assert.deepEqual(rivalPage.generateStaticParams(), RIVALS.map((r) => ({ slug: r.slug })));
});

test("each comparison page renders its table, strengths, questions and structured data", () => {
  for (const r of RIVALS) {
    const html = renderToStaticMarkup(<RivalView r={r} />);
    assert.ok(html.includes(`<h1>${r.title}</h1>`));
    assert.match(html, /<th scope="col">Polingual<\/th>/);
    assert.ok(html.includes(`<th scope="col">${r.name}</th>`));
    assert.ok(html.includes(`<h2>What ${r.name} does well</h2>`));
    assert.equal(r.strengths.length, 4);
    assert.equal(r.rows.length, 6);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.match(html, /"@type":"MobileApplication"/);
    assert.ok(html.includes(`href="${APP_STORE_URL}"`));
    assert.ok(html.includes('href="/play"'));
    assert.ok(html.includes('href="/compare"'));
    for (const other of RIVALS) if (other !== r) assert.ok(html.includes(`href="${rivalPath(other)}"`));
    assert.match(r.title, /two languages at once/);
    assert.match(r.rows[1].topic, /Two or more languages/);
  }
});

test("every fact about another app has a source on that company's pages with the date checked", () => {
  for (const r of RIVALS) {
    const html = renderToStaticMarkup(<RivalView r={r} />);
    const list = html.slice(html.indexOf('data-testid="sources"'));
    assert.ok(r.sources.length >= 2, r.slug);
    for (const s of r.sources) {
      assert.match(s.url, OWN_HOSTS[r.slug], s.url);
      assert.equal(s.checked, COMPARE_CHECKED);
      assert.ok(list.includes(`href="${s.url}"`), s.url);
    }
    assert.ok(list.includes(`checked ${COMPARE_CHECKED}`));
    assert.match(COMPARE_CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("other apps appear as plain text with no logo, no price figure and the ownership line", () => {
  for (const r of RIVALS) {
    const html = renderToStaticMarkup(<RivalView r={r} />);
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    assert.doesNotMatch(main, /<img|<svg[^>]*aria-label="(Duolingo|Babbel|Busuu|LingQ)/);
    assert.ok(main.includes(TRADEMARK_LINE));
    for (const x of r.rows) assert.doesNotMatch(x.other, /[$€£]\s?\d/, x.other);
    for (const t of [...r.strengths, r.otherFits, r.together]) assert.doesNotMatch(t, /[$€£]\s?\d/);
  }
  for (const r of RIVALS) assert.ok(TRADEMARK_LINE.includes(r.name));
  assert.match(TRADEMARK_LINE, /trademarks of their owners/);
});

test("the Polingual column matches the facts file and llms.txt", () => {
  for (const r of RIVALS) {
    const price = r.rows.find((x) => x.topic === "Price")!;
    assert.equal(price.polingual, FACTS.price);
    assert.ok(r.rows[0].polingual.includes(String(FACTS.languageCount)));
    assert.ok(r.rows[1].polingual.includes(`Up to ${FACTS.setLimit} languages`));
  }
  assert.ok(LLMS.includes(`Price: ${FACTS.price}.`));
});

test("comparison copy follows the voice rules", () => {
  for (const r of RIVALS) {
    for (const t of prose(r)) assert.deepEqual(voiceFaults(t), []);
    assert.doesNotMatch(r.title, HEADING_FAULT);
  }
  for (const t of [COMPARE_INDEX.title, COMPARE_INDEX.description, COMPARE_INDEX.lede, TRADEMARK_LINE]) assert.deepEqual(voiceFaults(t), []);
});

test("the index lists every comparison and has its own canonical", () => {
  const html = renderToStaticMarkup(<CompareIndexView />);
  assert.ok(html.includes(`<h1>${COMPARE_INDEX.title}</h1>`));
  for (const r of RIVALS) assert.ok(html.includes(`href="${rivalPath(r)}"`), r.slug);
  assert.ok(html.includes('href="/compare/duolingo-three-languages"'));
  assert.ok(html.includes(TRADEMARK_LINE));
  assert.equal((indexPage.metadata as Metadata).alternates?.canonical, `${SITE}/compare`);
});

test("every comparison url is in the sitemap and llms.txt with its own canonical", async () => {
  const paths = sitemapPaths();
  for (const p of comparePaths()) {
    assert.ok(paths.includes(p), p);
    assert.ok(LLMS.includes(`${SITE}${p})`), p);
  }
  for (const r of RIVALS) {
    const m = await rivalPage.generateMetadata({ params: Promise.resolve({ slug: r.slug }) });
    assert.equal(m.alternates?.canonical, `${SITE}${rivalPath(r)}`);
    assert.equal((m.openGraph as { type?: string }).type, "article");
  }
  assert.deepEqual(await rivalPage.generateMetadata({ params: Promise.resolve({ slug: "nope" }) }), {});
});

test("the pinned footer list stays as it was", () => {
  assert.deepEqual(FOOTER_LINKS.map((l) => l.key), ["play", "words", "guides", "teachers", "privacy", "terms", "support", "appstore"]);
});
